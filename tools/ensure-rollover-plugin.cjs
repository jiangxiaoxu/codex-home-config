#!/usr/bin/env node

'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MARKETPLACE = 'jxx-codex-plugins';
const MARKETPLACE_URL = 'https://github.com/jiangxiaoxu/jxx-codex-plugins.git';
const PLUGIN_ID = 'context-window-rollover-reminder@jxx-codex-plugins';
const CLI_TIMEOUT_MS = 180_000;
const RPC_TIMEOUT_MS = 30_000;
const OUTPUT_LIMIT = 8 * 1024 * 1024;

function parseArgs(argv) {
  let target;
  let command;
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!value || (option !== '--target' && option !== '--codex-command')) {
      throw new Error('Usage: ensure-rollover-plugin.cjs --target <absolute Codex home> [--codex-command <absolute Codex CLI path>]');
    }
    if (option === '--target' && target === undefined) target = value;
    else if (option === '--codex-command' && command === undefined) command = value;
    else throw new Error(`Duplicate option: ${option}`);
  }
  if (!target || !path.isAbsolute(target)) throw new Error('--target must be an absolute path');
  if (command && !path.isAbsolute(command)) throw new Error('--codex-command must be an absolute path');
  return { target: path.resolve(target), command };
}

function findCodexCommand() {
  const names = process.platform === 'win32' ? ['codex.cmd', 'codex.exe'] : ['codex'];
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    if (!directory) continue;
    for (const name of names) {
      const candidate = path.resolve(directory, name);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch { /* Keep searching PATH. */ }
    }
  }
  throw new Error('Codex CLI not found on PATH. Install Codex CLI or pass --codex-command.');
}

function commandSpec(command, args) {
  if (process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command)) {
    // The arguments here are fixed literals. Invoke the shim through cmd.exe so
    // paths containing spaces work on Node versions that cannot spawn .cmd files.
    const quoted = [command, ...args].map((part) => `"${part.replace(/"/g, '""')}"`).join(' ');
    return { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', `"${quoted}"`], windowsVerbatimArguments: true };
  }
  return { file: command, args };
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  if (!child.pid) { child.kill(); return; }
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.on('error', () => child.kill());
  } else {
    child.kill('SIGKILL');
  }
}

function runJsonCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const spec = commandSpec(command, args);
    const child = spawn(spec.file, spec.args, { cwd: env.CODEX_HOME, env, windowsHide: true, windowsVerbatimArguments: spec.windowsVerbatimArguments, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stopProcess(child);
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error(`Codex CLI timed out: ${args.join(' ')}`)), CLI_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > OUTPUT_LIMIT) fail(new Error('Codex CLI output exceeded limit'));
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > OUTPUT_LIMIT) fail(new Error('Codex CLI error output exceeded limit'));
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`Codex CLI ${args.join(' ')} failed (exit ${code}): ${stderr.trim() || stdout.trim()}`));
      try { resolve(JSON.parse(stdout)); }
      catch { reject(new Error(`Codex CLI ${args.join(' ')} did not return valid JSON`)); }
    });
  });
}

function checkPython(env) {
  return new Promise((resolve, reject) => {
    const child = spawn('python', ['--version'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stopProcess(child);
      reject(new Error('Python 3.10+ is required for the context-window-rollover-reminder hook'));
    };
    const timer = setTimeout(fail, 10_000);
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => { output += chunk; });
    }
    child.on('error', fail);
    child.on('close', (code) => {
      if (settled) return;
      if (code !== 0) return fail();
      const match = /Python\s+(\d+)\.(\d+)(?:\.\d+)?/i.exec(output);
      if (!match || Number(match[1]) < 3 || (Number(match[1]) === 3 && Number(match[2]) < 10)) return fail();
      settled = true;
      clearTimeout(timer);
      resolve();
    });
  });
}

class RpcClient {
  constructor(command, env) {
    const spec = commandSpec(command, ['app-server', '--stdio']);
    this.child = spawn(spec.file, spec.args, { cwd: env.CODEX_HOME, env, windowsHide: true, windowsVerbatimArguments: spec.windowsVerbatimArguments, stdio: ['pipe', 'pipe', 'pipe'] });
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.stderr = '';
    this.closed = false;
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => this.receive(chunk));
    this.child.stdin.on('error', (error) => this.failAll(error));
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => { this.stderr = (this.stderr + chunk).slice(-8192); });
    this.child.on('error', (error) => this.failAll(error));
    this.child.on('close', (code) => this.failAll(new Error(`Codex app-server exited (${code}): ${this.stderr.trim()}`)));
  }

  failAll(error) {
    this.closed = true;
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    this.pending.clear();
  }

  receive(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > OUTPUT_LIMIT) {
      this.failAll(new Error('Codex app-server output exceeded limit'));
      stopProcess(this.child);
      return;
    }
    let end;
    while ((end = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); }
      catch { this.failAll(new Error('Codex app-server returned invalid JSON')); stopProcess(this.child); return; }
      if (!Object.prototype.hasOwnProperty.call(message, 'id')) continue;
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method}: ${JSON.stringify(message.error)}`));
      else pending.resolve(message.result);
    }
  }

  send(message) {
    if (this.closed) throw new Error('Codex app-server is closed');
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex app-server ${method} timed out`));
        stopProcess(this.child);
      }, RPC_TIMEOUT_MS);
      this.pending.set(id, { method, resolve, reject, timer });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method, params) { this.send({ jsonrpc: '2.0', method, params }); }

  close() {
    if (this.closed) return;
    this.child.stdin.end();
    const timer = setTimeout(() => stopProcess(this.child), 1000);
    timer.unref();
  }
}

function findHook(result) {
  if (!Array.isArray(result?.data)) throw new Error('hooks/list returned an unexpected response');
  const hooks = result.data.flatMap((entry) => Array.isArray(entry.hooks) ? entry.hooks : []);
  const matches = hooks.filter((hook) => hook.pluginId === PLUGIN_ID && hook.eventName === 'postToolUse');
  if (matches.length !== 1) throw new Error(`Expected one PostToolUse hook for ${PLUGIN_ID}; found ${matches.length}`);
  const hook = matches[0];
  if (typeof hook.key !== 'string' || !hook.key || typeof hook.currentHash !== 'string' || !hook.currentHash) {
    throw new Error('Target hook is missing key or currentHash');
  }
  return hook;
}

function isExpectedMarketplace(item) {
  const marketplaceSource = item?.marketplaceSource || item;
  if (marketplaceSource?.sourceType !== undefined && marketplaceSource.sourceType !== 'git') return false;
  if (marketplaceSource?.source_type !== undefined && marketplaceSource.source_type !== 'git') return false;
  const source = marketplaceSource?.source?.replace(/\.git\/?$/i, '').replace(/\/$/, '').toLowerCase();
  return source === MARKETPLACE_URL.replace(/\.git$/, '').toLowerCase();
}

async function readMarketplaceDeclaration(command, env, target) {
  const rpc = new RpcClient(command, env);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'codex-home-config-installer', version: '1' }, capabilities: { experimentalApi: true } });
    rpc.notify('initialized', {});
    const result = await rpc.request('config/read', { cwd: target, includeLayers: false });
    if (!result?.config || typeof result.config !== 'object') throw new Error('config/read returned an unexpected response');
    const marketplaces = result.config.marketplaces;
    if (marketplaces != null && (typeof marketplaces !== 'object' || Array.isArray(marketplaces))) {
      throw new Error('config/read returned invalid marketplaces');
    }
    return marketplaces?.[MARKETPLACE];
  } finally {
    rpc.close();
  }
}

function isMissingMarketplaceSnapshot(error) {
  if (!error.message.includes('failed to load configured marketplace snapshot(s):')) return false;
  const issue = error.message.match(/- `jxx-codex-plugins` at (.*): marketplace root does not contain a supported manifest/);
  return issue !== null && !fs.existsSync(issue[1]);
}

async function ensurePlugin({ target, command }) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error(`Codex home does not exist: ${target}`);
  const codex = command || findCodexCommand();
  if (!fs.existsSync(codex)) throw new Error(`Codex CLI does not exist: ${codex}`);
  const env = { ...process.env, CODEX_HOME: target };
  await checkPython(env);
  const status = {
    marketplaceAdded: false,
    pluginAdded: false,
    hookTrusted: false,
    upgradeAttempted: false,
    upgradeSucceeded: false,
    marketplaceUpgraded: false,
    marketplaceUpgradeError: null,
  };

  const marketplace = await readMarketplaceDeclaration(codex, env, target);
  if (marketplace && !isExpectedMarketplace(marketplace)) {
    throw new Error(`Marketplace ${MARKETPLACE} exists with a different source`);
  }
  if (!marketplace) {
    await runJsonCommand(codex, ['plugin', 'marketplace', 'add', MARKETPLACE_URL, '--json'], env);
    status.marketplaceAdded = true;
  }

  status.upgradeAttempted = true;
  try {
    const upgrade = await runJsonCommand(codex, ['plugin', 'marketplace', 'upgrade', MARKETPLACE, '--json'], env);
    status.upgradeSucceeded = true;
    status.marketplaceUpgraded = Array.isArray(upgrade?.upgradedRoots) && upgrade.upgradedRoots.length > 0;
  } catch (error) {
    status.marketplaceUpgradeError = error.message;
    process.stderr.write(`Marketplace ${MARKETPLACE} upgrade failed; checking the existing plugin: ${error.message}\n`);
  }

  const listPlugins = () => runJsonCommand(codex, ['plugin', 'list', '--marketplace', MARKETPLACE, '--json'], env);
  let plugins;
  try {
    plugins = await listPlugins();
  } catch (error) {
    if (!marketplace || !isMissingMarketplaceSnapshot(error)) throw error;
    await runJsonCommand(codex, ['plugin', 'marketplace', 'add', marketplace.source, '--json'], env);
    status.marketplaceAdded = true;
    plugins = await listPlugins();
  }
  if (!Array.isArray(plugins?.installed)) throw new Error('Plugin list returned an unexpected response');
  let plugin = plugins.installed.find((item) => item.pluginId === PLUGIN_ID && item.installed);
  if (!plugin) {
    await runJsonCommand(codex, ['plugin', 'add', PLUGIN_ID, '--json'], env);
    status.pluginAdded = true;
    plugins = await listPlugins();
    if (!Array.isArray(plugins?.installed)) throw new Error('Plugin list returned an unexpected response after installation');
    plugin = plugins.installed.find((item) => item.pluginId === PLUGIN_ID && item.installed);
    if (!plugin) throw new Error(`Plugin installation did not register ${PLUGIN_ID}`);
  }
  if (plugin.enabled !== true) throw new Error(`Plugin ${PLUGIN_ID} is disabled; enable it explicitly before installation can trust its hook`);

  const rpc = new RpcClient(codex, env);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'codex-home-config-installer', version: '1' }, capabilities: { experimentalApi: true } });
    rpc.notify('initialized', {});
    const listHooks = () => rpc.request('hooks/list', { cwds: [target] });
    let hook = findHook(await listHooks());
    if (hook.enabled !== true) throw new Error(`Hook ${hook.key} is disabled; enable it explicitly before installation can trust it`);
    if (hook.trustStatus !== 'trusted') {
      const keyPath = `hooks.state.${JSON.stringify(hook.key)}.trusted_hash`;
      await rpc.request('config/batchWrite', {
        edits: [{ keyPath, value: hook.currentHash, mergeStrategy: 'replace' }],
        reloadUserConfig: true,
      });
      status.hookTrusted = true;
      hook = findHook(await listHooks());
    }
    if (hook.enabled !== true || hook.trustStatus !== 'trusted') {
      throw new Error(`Hook ${hook.key} is not enabled and trusted after configuration`);
    }
    return status;
  } finally {
    rpc.close();
  }
}

if (require.main === module) {
  Promise.resolve().then(() => ensurePlugin(parseArgs(process.argv.slice(2))))
    .then((status) => { process.stdout.write(`${JSON.stringify(status)}\n`); })
    .catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}

module.exports = { parseArgs, findCodexCommand, commandSpec, findHook, isExpectedMarketplace, isMissingMarketplaceSnapshot, ensurePlugin, RpcClient, checkPython };
