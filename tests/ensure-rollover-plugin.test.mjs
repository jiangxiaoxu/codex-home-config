import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const targetHash = (key) => 'hash-for-' + key + (state.revision ? '-revision-' + state.revision : '');
const hook = (key, pluginId, eventName, enabled, trustStatus) => ({
  key, pluginId, eventName, enabled,
  currentHash: targetHash(key), trustStatus,
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
  } else if (args[1] === 'marketplace' && args[2] === 'upgrade') {
    if (args.join(' ') !== 'plugin marketplace upgrade jxx-codex-plugins --json') process.exit(3);
    if (state.upgradeFails) {
      process.stderr.write('mock marketplace upgrade failed\n');
      process.exit(7);
    }
    const upgraded = state.upgradeAvailable;
    const repaired = state.snapshotCorrupt || state.snapshotMissing;
    if (upgraded) {
      state.revision += 1;
      state.upgradeAvailable = false;
    }
    state.snapshotCorrupt = false;
    state.snapshotMissing = false;
    result = { upgradedRoots: upgraded || repaired ? ['jxx-codex-plugins'] : [] };
  } else if (args[1] === 'list') {
    if (args.join(' ') !== 'plugin list --marketplace jxx-codex-plugins --json') process.exit(3);
    if (state.snapshotMissing || state.snapshotCorrupt) {
      const snapshot = state.snapshotCorrupt ? path.join(process.env.CODEX_HOME, 'corrupt-snapshot') : 'cache';
      process.stderr.write('Error: failed to load configured marketplace snapshot(s):\n- \x60jxx-codex-plugins\x60 at ' + snapshot + ': marketplace root does not contain a supported manifest\n');
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
        hook('target-hook', 'context-window-rollover-reminder@jxx-codex-plugins', 'postToolUse', state.hookEnabled, state.trustedHash === targetHash('target-hook') ? 'trusted' : 'untrusted'),
        hook('target-second-hook', 'context-window-rollover-reminder@jxx-codex-plugins', 'sessionStart', state.secondHookEnabled, state.secondTrustedHash === targetHash('target-second-hook') ? 'trusted' : 'untrusted'),
        hook('unrelated-hook', 'another-plugin@other-marketplace', 'postToolUse', state.unrelatedHookEnabled, 'untrusted'),
      ] }] };
    } else if (request.method === 'config/batchWrite') {
      for (const edit of request.params.edits) {
        if (edit.keyPath === 'hooks.state."target-hook".trusted_hash') state.trustedHash = edit.value;
        else if (edit.keyPath === 'hooks.state."target-hook".enabled') state.hookEnabled = edit.value;
        else if (edit.keyPath === 'hooks.state."target-second-hook".trusted_hash') state.secondTrustedHash = edit.value;
        else if (edit.keyPath === 'hooks.state."target-second-hook".enabled') state.secondHookEnabled = edit.value;
        else throw new Error('unexpected hook edit: ' + edit.keyPath);
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
      snapshotCorrupt: false,
      pluginAdded: false,
      pluginEnabled: true,
      hookEnabled: true,
      trustedHash: null,
      secondHookEnabled: true,
      secondTrustedHash: null,
      unrelatedHookEnabled: false,
      revision: 0,
      upgradeAvailable: false,
      upgradeFails: false,
      calls: [],
      cwdCalls: [],
      rpcCalls: [],
      ...initial,
    }), 'utf8');
    if (initial.snapshotCorrupt) {
      mkdirSync(join(target, 'corrupt-snapshot'));
    }
    const run = ({ json = true } = {}) => spawnSync(process.execPath, [
      helper, '--target', target, '--codex-command', command, ...(json ? ['--json'] : []),
    ], {
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

test('installs the marketplace and plugin, then trusts all target hooks only', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state, target }) => {
    const result = run();
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      marketplaceAdded: true, pluginAdded: true, hookTrusted: true,
      upgradeAttempted: true, upgradeSucceeded: true, marketplaceUpgraded: false, marketplaceUpgradeError: null,
    });

    const installed = state();
    assert.equal(installed.marketplaceAdded, true);
    assert.equal(installed.pluginAdded, true);
    assert.equal(installed.trustedHash, 'hash-for-target-hook');
    assert.equal(installed.secondTrustedHash, 'hash-for-target-second-hook');
    assert.equal(installed.unrelatedHookEnabled, false);
    assert.deepEqual(installed.calls.filter((args) => args[0] === 'plugin'), [
      ['plugin', 'marketplace', 'add', marketplaceUrl, '--json'],
      ['plugin', 'marketplace', 'upgrade', 'jxx-codex-plugins', '--json'],
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
      edits: [
        { keyPath: 'hooks.state."target-hook".trusted_hash', value: 'hash-for-target-hook', mergeStrategy: 'replace' },
        { keyPath: 'hooks.state."target-second-hook".trusted_hash', value: 'hash-for-target-second-hook', mergeStrategy: 'replace' },
      ],
      reloadUserConfig: true,
    });
  });
});

test('repeating installation attempts upgrade without adding dependencies or writing hook trust again', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    assert.equal(run().status, 0);
    const before = state();
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      marketplaceAdded: false, pluginAdded: false, hookTrusted: false,
      upgradeAttempted: true, upgradeSucceeded: true, marketplaceUpgraded: false, marketplaceUpgradeError: null,
    });
    const subsequentCalls = state().calls.slice(before.calls.length);
    assert.deepEqual(subsequentCalls.filter((args) => args[0] === 'plugin'), [
      ['plugin', 'marketplace', 'upgrade', 'jxx-codex-plugins', '--json'],
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
    assert.deepEqual(JSON.parse(result.stdout), {
      marketplaceAdded: false, pluginAdded: true, hookTrusted: true,
      upgradeAttempted: true, upgradeSucceeded: true, marketplaceUpgraded: false, marketplaceUpgradeError: null,
    });
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
    const status = JSON.parse(result.stdout);
    assert.deepEqual({ ...status, marketplaceUpgradeError: null }, {
      marketplaceAdded: true, pluginAdded: true, hookTrusted: true,
      upgradeAttempted: true, upgradeSucceeded: false, marketplaceUpgraded: false, marketplaceUpgradeError: null,
    });
    assert.match(status.marketplaceUpgradeError, /mock marketplace upgrade failed/);
    const current = state();
    assert.equal(current.snapshotMissing, false);
    assert.deepEqual(current.calls.filter((args) => args[0] === 'plugin').slice(0, 3), [
      ['plugin', 'marketplace', 'upgrade', 'jxx-codex-plugins', '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
      ['plugin', 'marketplace', 'add', marketplaceUrl, '--json'],
    ]);
  }, { marketplaceAdded: true, snapshotMissing: true, upgradeFails: true });
});

test('upgrades a declared marketplace before reading its corrupt local snapshot', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      marketplaceAdded: false, pluginAdded: true, hookTrusted: true,
      upgradeAttempted: true, upgradeSucceeded: true, marketplaceUpgraded: true, marketplaceUpgradeError: null,
    });
    const current = state();
    assert.equal(current.snapshotCorrupt, false);
    assert.deepEqual(current.calls.filter((args) => args[0] === 'plugin').slice(0, 2), [
      ['plugin', 'marketplace', 'upgrade', 'jxx-codex-plugins', '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
    ]);
  }, { marketplaceAdded: true, snapshotCorrupt: true });
});

test('trusts the updated hook hash when a marketplace upgrade changes revision', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      marketplaceAdded: false, pluginAdded: false, hookTrusted: true,
      upgradeAttempted: true, upgradeSucceeded: true, marketplaceUpgraded: true, marketplaceUpgradeError: null,
    });
    const current = state();
    assert.equal(current.revision, 1);
    assert.equal(current.trustedHash, 'hash-for-target-hook-revision-1');
    assert.equal(current.secondTrustedHash, 'hash-for-target-second-hook-revision-1');
    assert.deepEqual(current.calls.filter((args) => args[0] === 'plugin'), [
      ['plugin', 'marketplace', 'upgrade', 'jxx-codex-plugins', '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
    ]);
    const writes = current.rpcCalls.filter(({ method }) => method === 'config/batchWrite');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].params.edits, [
      { keyPath: 'hooks.state."target-hook".trusted_hash', value: 'hash-for-target-hook-revision-1', mergeStrategy: 'replace' },
      { keyPath: 'hooks.state."target-second-hook".trusted_hash', value: 'hash-for-target-second-hook-revision-1', mergeStrategy: 'replace' },
    ]);
  }, {
    marketplaceAdded: true, pluginAdded: true, trustedHash: 'hash-for-target-hook', upgradeAvailable: true,
  });
});

test('reports marketplace upgrade failure while continuing with an available plugin', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    const status = JSON.parse(result.stdout);
    assert.deepEqual({ ...status, marketplaceUpgradeError: null }, {
      marketplaceAdded: false, pluginAdded: false, hookTrusted: false,
      upgradeAttempted: true, upgradeSucceeded: false, marketplaceUpgraded: false, marketplaceUpgradeError: null,
    });
    assert.match(status.marketplaceUpgradeError, /mock marketplace upgrade failed/);
    assert.match(result.stderr, /mock marketplace upgrade failed/);
    const current = state();
    assert.equal(current.pluginEnabled, true);
    assert.equal(current.trustedHash, 'hash-for-target-hook');
    assert.equal(current.secondTrustedHash, 'hash-for-target-second-hook');
    assert.equal(current.rpcCalls.some(({ method }) => method === 'config/batchWrite'), false);
    assert.deepEqual(current.calls.filter((args) => args[0] === 'plugin'), [
      ['plugin', 'marketplace', 'upgrade', 'jxx-codex-plugins', '--json'],
      ['plugin', 'list', '--marketplace', 'jxx-codex-plugins', '--json'],
    ]);
  }, { marketplaceAdded: true, pluginAdded: true, trustedHash: 'hash-for-target-hook', secondTrustedHash: 'hash-for-target-second-hook', upgradeFails: true });
});

test('enables a disabled target hook and trusts all target hooks without changing another plugin', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    const current = state();
    assert.equal(current.hookEnabled, true);
    assert.equal(current.secondHookEnabled, true);
    assert.equal(current.unrelatedHookEnabled, false);
    assert.equal(current.trustedHash, 'hash-for-target-hook');
    assert.equal(current.secondTrustedHash, 'hash-for-target-second-hook');
    const writes = current.rpcCalls.filter(({ method }) => method === 'config/batchWrite');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].params, {
      edits: [
        { keyPath: 'hooks.state."target-hook".enabled', value: true, mergeStrategy: 'replace' },
        { keyPath: 'hooks.state."target-hook".trusted_hash', value: 'hash-for-target-hook', mergeStrategy: 'replace' },
        { keyPath: 'hooks.state."target-second-hook".trusted_hash', value: 'hash-for-target-second-hook', mergeStrategy: 'replace' },
      ],
      reloadUserConfig: true,
    });
  }, { marketplaceAdded: true, pluginAdded: true, hookEnabled: false });
});

test('enables an already trusted target hook without rewriting trusted hashes', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).hookTrusted, false);
    const current = state();
    assert.equal(current.hookEnabled, true);
    assert.equal(current.secondHookEnabled, true);
    assert.equal(current.unrelatedHookEnabled, false);
    assert.equal(current.trustedHash, 'hash-for-target-hook');
    assert.equal(current.secondTrustedHash, 'hash-for-target-second-hook');
    const writes = current.rpcCalls.filter(({ method }) => method === 'config/batchWrite');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].params, {
      edits: [{ keyPath: 'hooks.state."target-hook".enabled', value: true, mergeStrategy: 'replace' }],
      reloadUserConfig: true,
    });
    assert.equal(current.rpcCalls.filter(({ method }) => method === 'hooks/list').length, 2);
  }, {
    marketplaceAdded: true, pluginAdded: true, hookEnabled: false,
    trustedHash: 'hash-for-target-hook', secondTrustedHash: 'hash-for-target-second-hook',
  });
});

test('fails when the plugin itself is explicitly disabled', { skip: process.platform !== 'win32' }, () => {
  withMock(({ run, state }) => {
    const result = run();
    assert.equal(result.error, undefined, result.error?.message);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /disabled/);
    assert.equal(state().calls.some((args) => args[0] === 'plugin' && args[1] === 'marketplace' && args[2] === 'upgrade'), true);
    assert.equal(state().rpcCalls.some(({ method }) => method === 'config/batchWrite'), false);
    assert.equal(state().trustedHash, null);
  }, { marketplaceAdded: true, pluginAdded: true, pluginEnabled: false });
});
