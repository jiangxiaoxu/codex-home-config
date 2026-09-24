import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const helper = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'ensure-rollover-plugin.cjs');
const pluginId = 'context-window-rollover-reminder@jxx-codex-plugins';
const marketplaceUrl = 'https://github.com/jiangxiaoxu/jxx-codex-plugins.git';

const mockCli = String.raw`const fs = require('node:fs');
const path = require('node:path');
const statePath = path.join(process.env.CODEX_HOME, 'mock-cli-state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const args = process.argv.slice(2);
state.calls.push(args);
state.cwdCalls.push(process.cwd());
save();

const hook = (key, pluginId, trustStatus) => ({
  key, pluginId, eventName: 'postToolUse', enabled: state.hookEnabled,
  currentHash: 'hash-for-' + key, trustStatus,
});

if (args[0] === 'plugin') {
  let result;
  if (args[1] === 'marketplace' && args[2] === 'list') {
    process.stderr.write('global marketplace list is forbidden in this test\n');
    process.exit(5);
  } else if (args[1] === 'marketplace' && args[2] === 'add') {
    if (args[3] !== 'https://github.com/jiangxiaoxu/jxx-codex-plugins.git') process.exit(3);
    state.marketplaceAdded = true;
    state.snapshotMissing = false;
    result = {};
  } else if (args[1] === 'list') {
    if (args.join(' ') !== 'plugin list --marketplace jxx-codex-plugins --json') process.exit(3);
    if (state.snapshotMissing) {
      process.stderr.write('Error: failed to load configured marketplace snapshot(s):\n- \x60jxx-codex-plugins\x60 at cache: marketplace root does not contain a supported manifest\n');
      process.exit(6);
    }
    result = { installed: state.pluginAdded ? [{ pluginId: 'context-window-rollover-reminder@jxx-codex-plugins', installed: true, enabled: state.pluginEnabled }] : [] };
  } else if (args[1] === 'add') {
    if (args[2] !== 'context-window-rollover-reminder@jxx-codex-plugins') process.exit(3);
    state.pluginAdded = true;
    result = {};
  } else {
    process.exit(3);
  }
  save();
  process.stdout.write(JSON.stringify(result) + '\n');
} else if (args[0] === 'app-server' && args[1] === '--stdio') {
  const readline = require('node:readline');
  readline.createInterface({ input: process.stdin }).on('line', (line) => {
    const request = JSON.parse(line);
    state.rpcCalls.push(request);
    let result;
    if (request.method === 'initialize') result = {};
    else if (request.method === 'initialized') { save(); return; }
    else if (request.method === 'config/read') {
      result = { config: { marketplaces: state.marketplaceAdded ? {
        'jxx-codex-plugins': { source_type: 'git', source: state.marketplaceSource },
      } : {} } };
    }
    else if (request.method === 'hooks/list') {
      result = { data: [{ hooks: [
        hook('target-hook', 'context-window-rollover-reminder@jxx-codex-plugins', state.trustedHash === 'hash-for-target-hook' ? 'trusted' : 'untrusted'),
        hook('unrelated-hook', 'another-plugin@other-marketplace', 'untrusted'),
      ] }] };
    } else if (request.method === 'config/batchWrite') {
      for (const edit of request.params.edits) {
        if (edit.keyPath === 'hooks.state."target-hook".trusted_hash') state.trustedHash = edit.value;
      }
      result = {};
    } else process.exit(4);
    save();
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
  });
} else process.exit(3);
`;

function withMock(callback, initial = {}) {
  const target = mkdtempSync(join(tmpdir(), 'codex-rollover-plugin-test-'));
  const command = join(target, 'mock-codex.cmd');
  try {
    writeFileSync(join(target, 'mock-cli.cjs'), mockCli, 'utf8');
    writeFileSync(command, '@echo off\r\nnode "%~dp0mock-cli.cjs" %*\r\n', 'utf8');
    writeFileSync(join(target, 'mock-cli-state.json'), JSON.stringify({
      marketplaceAdded: false,
      marketplaceSource: marketplaceUrl,
      snapshotMissing: false,
      pluginAdded: false,
      pluginEnabled: true,
      hookEnabled: true,
      trustedHash: null,
      calls: [],
      cwdCalls: [],
      rpcCalls: [],
      ...initial,
    }), 'utf8');
    const run = () => spawnSync(process.execPath, [helper, '--target', target, '--codex-command', command], {
      encoding: 'utf8', timeout: 30000,
    });
    const state = () => {
      const current = JSON.parse(readFileSync(join(target, 'mock-cli-state.json'), 'utf8'));
      assert.deepEqual(current.cwdCalls, current.calls.map(() => target));
      return current;
    };
    callback({ run, state, target });
  } finally {
    rmSync(target, { recursive: true, force: true, maxRetries: 3 });
  }
}

test('installs the marketplace and plugin, then trusts only its PostToolUse hook', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state, target }) => {
    const result = run();
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { marketplaceAdded: true, pluginAdded: true, hookTrusted: true });

    const installed = state();
    assert.equal(installed.marketplaceAdded, true);
    assert.equal(installed.pluginAdded, true);
    assert.equal(installed.trustedHash, 'hash-for-target-hook');
    assert.deepEqual(installed.calls.filter((args) => args[0] === 'plugin'), [
      ['plugin', 'marketplace', 'add', marketplaceUrl, '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
      ['plugin', 'add', pluginId, '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
    ]);
    assert.ok(installed.rpcCalls.some(({ method }) => method === 'config/read'));
    const hookLists = installed.rpcCalls.filter(({ method }) => method === 'hooks/list');
    assert.equal(hookLists.length, 2);
    assert.deepEqual(hookLists[0].params, { cwds: [target] });
    const writes = installed.rpcCalls.filter(({ method }) => method === 'config/batchWrite');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].params, {
      edits: [{ keyPath: 'hooks.state."target-hook".trusted_hash', value: 'hash-for-target-hook', mergeStrategy: 'replace' }],
      reloadUserConfig: true,
    });
  });
});

test('repeating installation does not add dependencies or write hook trust again', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    assert.equal(run().status, 0);
    const before = state();
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { marketplaceAdded: false, pluginAdded: false, hookTrusted: false });
    const subsequentCalls = state().calls.slice(before.calls.length);
    assert.deepEqual(subsequentCalls.filter((args) => args[0] === 'plugin'), [
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
    ]);
    const subsequentRpcCalls = state().rpcCalls.slice(before.rpcCalls.length);
    assert.ok(subsequentRpcCalls.some(({ method }) => method === 'config/read'));
    assert.equal(subsequentRpcCalls.filter(({ method }) => method === 'hooks/list').length, 1);
    assert.equal(subsequentRpcCalls.some(({ method }) => method === 'config/batchWrite'), false);
  });
});

test('accepts an existing marketplace URL without the .git suffix', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { marketplaceAdded: false, pluginAdded: true, hookTrusted: true });
    assert.equal(state().calls.some((args) => args[0] === 'plugin' && args[1] === 'marketplace' && args[2] === 'add'), false);
  }, {
    marketplaceAdded: true,
    marketplaceSource: 'https://github.com/jiangxiaoxu/jxx-codex-plugins',
  });
});

test('materializes a declared marketplace when its local snapshot is missing', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { marketplaceAdded: true, pluginAdded: true, hookTrusted: true });
    const current = state();
    assert.equal(current.snapshotMissing, false);
    assert.deepEqual(current.calls.filter((args) => args[0] === 'plugin').slice(0, 3), [
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
      ['plugin', 'marketplace', 'add', marketplaceUrl, '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
    ]);
  }, { marketplaceAdded: true, snapshotMissing: true });
});

for (const [name, disabledState] of [
  ['plugin', { marketplaceAdded: true, pluginAdded: true, pluginEnabled: false }],
  ['hook', { marketplaceAdded: true, pluginAdded: true, hookEnabled: false }],
]) {
  test(`fails when the ${name} is explicitly disabled`, { skip: process.platform !== 'win32' }, () => {
    withMock(({ run, state }) => {
      const result = run();
      assert.equal(result.error, undefined, result.error?.message);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /disabled/);
      assert.equal(state().rpcCalls.some(({ method }) => method === 'config/batchWrite'), false);
      assert.equal(state().trustedHash, null);
    }, disabledState);
  });
}
