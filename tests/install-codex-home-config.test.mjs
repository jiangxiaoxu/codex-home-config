import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const installerPath = join(repositoryRoot, 'install-codex-home-config.ps1');
const syncScriptPath = join(repositoryRoot, 'sync-codex-home-config-repo.ps1');
const configToolPath = join(repositoryRoot, 'tools', 'config-toml-ops.cjs');
const pwshPath = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh';
const hasPwsh = spawnSync(pwshPath, ['-NoLogo', '-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'], {
  encoding: 'utf8'
}).status === 0;
const modelsLocalFixture = Buffer.from('\uFEFF{\r\n  "models": []\r\n}\r\n', 'utf8');

function withTempDir(callback) {
  const tempDir = mkdtempSync(join(tmpdir(), 'codex-home-config-installer-test-'));
  try {
    callback(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 3 });
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
  return result;
}

function writeSnapshot(rootPath, {
  config = 'model = "base"\n',
  modelsLocal = modelsLocalFixture,
  agents = 'base instructions\n',
  agent = 'base agent\n'
} = {}) {
  mkdirSync(join(rootPath, 'managed', 'agents'), { recursive: true });
  mkdirSync(join(rootPath, 'tools'), { recursive: true });
  cpSync(installerPath, join(rootPath, 'install-codex-home-config.ps1'));
  cpSync(configToolPath, join(rootPath, 'tools', 'config-toml-ops.cjs'));
  writeFileSync(join(rootPath, 'managed', 'config.toml'), config, 'utf8');
  writeFileSync(join(rootPath, 'managed', 'models.local.json'), modelsLocal);
  writeFileSync(join(rootPath, 'managed', 'AGENTS.md'), agents, 'utf8');
  writeFileSync(join(rootPath, 'managed', 'agents', 'reviewer.toml'), agent, 'utf8');
}

function commitAll(repositoryPath, message) {
  run('git', ['add', '--all'], repositoryPath);
  run('git', ['-c', 'user.name=Installer Test', '-c', 'user.email=installer-test@example.invalid', 'commit', '-m', message], repositoryPath);
}

function createLocalRepository(tempDir) {
  const remotePath = join(tempDir, 'remote.git');
  const seedPath = join(tempDir, 'seed');
  const localPath = join(tempDir, 'local');
  mkdirSync(seedPath, { recursive: true });
  writeSnapshot(seedPath);
  run('git', ['init', '--initial-branch=main'], seedPath);
  commitAll(seedPath, 'Initial installer snapshot');
  run('git', ['init', '--bare', '--initial-branch=main', remotePath], tempDir);
  run('git', ['remote', 'add', 'origin', remotePath], seedPath);
  run('git', ['push', '--set-upstream', 'origin', 'main'], seedPath);
  run('git', ['clone', remotePath, localPath], tempDir);
  return { localPath, seedPath };
}

function runInstaller(repositoryPath, targetPath, args = []) {
  const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
  const commandArguments = args.map((argument) => argument.startsWith('-') ? argument : quotePowerShell(argument));
  const command = [
    '&',
    quotePowerShell(join(repositoryPath, 'install-codex-home-config.ps1')),
    '-TargetCodexPath',
    quotePowerShell(targetPath),
    ...commandArguments
  ].join(' ');

  return spawnSync(
    pwshPath,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      command
    ],
    {
      cwd: repositoryPath,
      encoding: 'utf8',
      timeout: 30000
    }
  );
}

function runSync(repositoryPath, sourcePath, args = []) {
  const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
  const componentsIndex = args.indexOf('-Components');
  const commandArguments = componentsIndex === -1
    ? args.map((argument) => argument.startsWith('-') ? argument : quotePowerShell(argument))
    : [
      ...args.slice(0, componentsIndex).map((argument) => argument.startsWith('-') ? argument : quotePowerShell(argument)),
      '-Components',
      args.slice(componentsIndex + 1).map(quotePowerShell).join(',')
    ];
  const command = [
    '&',
    quotePowerShell(syncScriptPath),
    '-SourceCodexPath',
    quotePowerShell(sourcePath),
    '-RepoPath',
    quotePowerShell(repositoryPath),
    '-SkipInitialPull',
    ...commandArguments
  ].join(' ');

  return spawnSync(
    pwshPath,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      command
    ],
    {
      cwd: repositoryPath,
      encoding: 'utf8',
      timeout: 30000
    }
  );
}

test('installer always performs the default installation with no action or component selection', () => {
  const installer = readFileSync(installerPath, 'utf8');

  assert.doesNotMatch(installer, /\$Action\b|\b-Action\b|\bRestore\b/);
  assert.doesNotMatch(installer, /\$Components\b|\b-Components\b/);
});

test('local repository pull happens before default installation and installs the pulled snapshot', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath, seedPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');

    writeFileSync(join(seedPath, 'managed', 'config.toml'), 'model = "pulled-latest"\n', 'utf8');
    commitAll(seedPath, 'Publish newer configuration');
    run('git', ['push'], seedPath);

    const result = runInstaller(localPath, targetPath);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(readFileSync(join(targetPath, 'config.toml'), 'utf8'), /pulled-latest/);
    assert.deepEqual(readFileSync(join(targetPath, 'models.local.json')), modelsLocalFixture);
    assert.match(result.stdout, /git pull|Pulling|Updating|repository/i);
  });
});

test('default installation tolerates a snapshot without models.local.json and preserves the local file', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath, seedPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalModelsLocal = Buffer.from('\uFEFF{\r\n  "models": ["local-only"]\r\n}\r\n', 'utf8');
    rmSync(join(seedPath, 'managed', 'models.local.json'));
    commitAll(seedPath, 'Publish snapshot without local models');
    run('git', ['push'], seedPath);
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(targetPath, 'models.local.json'), originalModelsLocal);

    const result = runInstaller(localPath, targetPath);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.deepEqual(readFileSync(join(targetPath, 'models.local.json')), originalModelsLocal);

    const backupRoot = join(targetPath, 'sync_codex-home-config_backup');
    assert.ok(
      !existsSync(backupRoot) || readdirSync(backupRoot).every(
        (backupVersion) => !existsSync(join(backupRoot, backupVersion, 'models.local.json'))
      ),
      'a missing managed models.local.json must not create a models-only backup'
    );
  });
});

test('a failed local git pull stops before touching the install target', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath, seedPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), 'model = "must-not-change"\n', 'utf8');

    writeFileSync(join(seedPath, 'managed', 'config.toml'), 'model = "remote-change"\n', 'utf8');
    commitAll(seedPath, 'Remote conflicting configuration');
    run('git', ['push'], seedPath);

    writeFileSync(join(localPath, 'managed', 'config.toml'), 'model = "local-change"\n', 'utf8');
    commitAll(localPath, 'Local conflicting configuration');

    const result = runInstaller(localPath, targetPath);
    assert.notEqual(result.status, 0, 'git pull conflict must fail the installer');
    assert.match([result.stdout, result.stderr].filter(Boolean).join('\n'), /git pull|rebase|conflict/i);
    assert.equal(readFileSync(join(targetPath, 'config.toml'), 'utf8'), 'model = "must-not-change"\n');
  });
});

test('default installation updates every managed component, including models.local.json, without printing a diff', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalModelsLocal = Buffer.from('\uFEFF{\r\n  "models": ["old"]\r\n}\r\n', 'utf8');
    mkdirSync(join(targetPath, 'agents'), { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), 'model = "old"\n', 'utf8');
    writeFileSync(join(targetPath, 'models.local.json'), originalModelsLocal);
    writeFileSync(join(targetPath, 'AGENTS.md'), 'old instructions\n', 'utf8');
    writeFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'old agent\n', 'utf8');

    const result = runInstaller(localPath, targetPath);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(readFileSync(join(targetPath, 'config.toml'), 'utf8'), /model = "base"/);
    assert.deepEqual(readFileSync(join(targetPath, 'models.local.json')), modelsLocalFixture);
    assert.equal(readFileSync(join(targetPath, 'AGENTS.md'), 'utf8'), 'base instructions\n');
    assert.equal(readFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'utf8'), 'base agent\n');
    assert.doesNotMatch(result.stdout, /Installation diff:|diff --git|Binary files/);

    const backupRoot = join(targetPath, 'sync_codex-home-config_backup');
    const backupVersions = readdirSync(backupRoot);
    assert.equal(backupVersions.length, 1);
    assert.deepEqual(
      readFileSync(join(backupRoot, backupVersions[0], 'models.local.json')),
      originalModelsLocal
    );
  });
});

test('DryRun prints actual managed file diffs without modifying the target or creating a backup', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalFiles = {
      config: Buffer.from('model = "old"\n', 'utf8'),
      modelsLocal: Buffer.from('\uFEFF{\r\n  "models": ["old"]\r\n}\r\n', 'utf8'),
      agents: Buffer.from('old instructions\n', 'utf8'),
      agent: Buffer.from('old agent\n', 'utf8')
    };
    mkdirSync(join(targetPath, 'agents'), { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), originalFiles.config);
    writeFileSync(join(targetPath, 'models.local.json'), originalFiles.modelsLocal);
    writeFileSync(join(targetPath, 'AGENTS.md'), originalFiles.agents);
    writeFileSync(join(targetPath, 'agents', 'reviewer.toml'), originalFiles.agent);

    const result = runInstaller(localPath, targetPath, ['-DryRun']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /^(?:diff --git|--- |@@ )/m);
    assert.match(result.stdout, /config\.toml/);
    assert.match(result.stdout, /models\.local\.json/);
    assert.match(result.stdout, /AGENTS\.md/);
    assert.match(result.stdout, /agents[\\/]reviewer\.toml/);
    assert.match(result.stdout, /-model = "old"/);
    assert.match(result.stdout, /\+model = "base"/);
    assert.match(result.stdout, /-  "models": \["old"\]/);
    assert.match(result.stdout, /\+  "models": \[\]/);
    assert.match(result.stdout, /-old instructions/);
    assert.match(result.stdout, /\+base instructions/);
    assert.match(result.stdout, /-old agent/);
    assert.match(result.stdout, /\+base agent/);
    assert.doesNotMatch(result.stdout, /\[codex-home-config\]\s+(?:Checking Node\.js runtime|Using Node\.js runtime|Preparing repository snapshot|Using local repository snapshot|Dry run enabled|Installing |Normalizing temporary config\.toml)/);
    assert.doesNotMatch(result.stdout, /^(?:Install source commit:|Installed |Removed )/m);

    assert.deepEqual(readFileSync(join(targetPath, 'config.toml')), originalFiles.config);
    assert.deepEqual(readFileSync(join(targetPath, 'models.local.json')), originalFiles.modelsLocal);
    assert.deepEqual(readFileSync(join(targetPath, 'AGENTS.md')), originalFiles.agents);
    assert.deepEqual(readFileSync(join(targetPath, 'agents', 'reviewer.toml')), originalFiles.agent);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
  });
});

test('DryRun ignores large unrelated target files outside the managed installation scope', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const sessionsPath = join(targetPath, 'sessions');
    const unrelatedPath = join(sessionsPath, 'unrelated.bin');
    const originalConfig = Buffer.from('model = "old"\n', 'utf8');
    const originalUnrelatedFile = Buffer.alloc(1024 * 1024, 0xA5);
    mkdirSync(sessionsPath, { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), originalConfig);
    writeFileSync(unrelatedPath, originalUnrelatedFile);

    const result = runInstaller(localPath, targetPath, ['-DryRun']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /config\.toml/);
    assert.doesNotMatch(result.stdout, /sessions[\\/]unrelated\.bin|unrelated\.bin/i);
    assert.deepEqual(readFileSync(join(targetPath, 'config.toml')), originalConfig);
    assert.deepEqual(readFileSync(unrelatedPath), originalUnrelatedFile);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
  });
});

test('DryRun hides TOML serializer-only node_repl changes while showing managed config changes', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    mkdirSync(join(targetPath, 'agents'), { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), [
      'model = "old"',
      "node_repl='node'",
      ''
    ].join('\n'), 'utf8');
    writeFileSync(join(targetPath, 'models.local.json'), modelsLocalFixture);
    writeFileSync(join(targetPath, 'AGENTS.md'), 'base instructions\n', 'utf8');
    writeFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'base agent\n', 'utf8');

    const result = runInstaller(localPath, targetPath, ['-DryRun']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /-model = "old"/);
    assert.match(result.stdout, /\+model = "base"/);
    assert.doesNotMatch(result.stdout, /^[+-]\s*node_repl\s*=/m);
  });
});

test('DryRun reports when the target already matches the managed snapshot', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    mkdirSync(join(targetPath, 'agents'), { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), 'model = "base"\n', 'utf8');
    writeFileSync(join(targetPath, 'models.local.json'), modelsLocalFixture);
    writeFileSync(join(targetPath, 'AGENTS.md'), 'base instructions\n', 'utf8');
    writeFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'base agent\n', 'utf8');

    const result = runInstaller(localPath, targetPath, ['-DryRun']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /No changes|No differences|No diff/i);
    assert.doesNotMatch(result.stdout, /^diff --git /m);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
  });
});

test('ModelsLocalFile sync preserves the source JSON bytes', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const sourcePath = join(tempDir, 'source');
    const sourceModelsLocal = Buffer.from('\uFEFF{\r\n  "models": ["synced"]\r\n}\r\n', 'utf8');
    mkdirSync(sourcePath, { recursive: true });
    writeFileSync(join(sourcePath, 'models.local.json'), sourceModelsLocal);

    const result = runSync(localPath, sourcePath, ['-Components', 'ModelsLocalFile']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.deepEqual(readFileSync(join(localPath, 'managed', 'models.local.json')), sourceModelsLocal);
  });
});

test('default installation preserves local apps and protected feature values while backing up config.toml unchanged', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(localPath, 'managed', 'config.toml'), [
      '[features]',
      'unified_exec = true',
      ''
    ].join('\n'), 'utf8');
    commitAll(localPath, 'Use managed config for local-only test');
    const originalConfig = [
      '[apps._default]',
      'enabled = false',
      '',
      '[features]',
      'workspace_dependencies = false',
      'apps = false',
      'local_before_update = true',
      ''
    ].join('\n');
    writeFileSync(join(targetPath, 'config.toml'), originalConfig, 'utf8');

    const result = runInstaller(localPath, targetPath);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));

    const installedConfig = readFileSync(join(targetPath, 'config.toml'), 'utf8');
    assert.match(installedConfig, /\[apps\._default\][\s\S]*enabled = false/);
    assert.match(installedConfig, /workspace_dependencies = false/);
    assert.match(installedConfig, /apps = false/);
    assert.match(installedConfig, /unified_exec = true/);

    const backupRoot = join(targetPath, 'sync_codex-home-config_backup');
    const backupVersions = readdirSync(backupRoot);
    assert.equal(backupVersions.length, 1);
    const backupConfig = readFileSync(join(backupRoot, backupVersions[0], 'config.toml'), 'utf8');
    assert.equal(backupConfig, originalConfig);
  });
});

test('installer and sync keep pull and confirmation behavior', () => {
  const installer = readFileSync(installerPath, 'utf8');
  const syncScript = readFileSync(syncScriptPath, 'utf8');

  assert.match(syncScript, /\[ValidateSet\([^)]*'ModelsLocalFile'/);
  assert.match(installer, /function\s+Invoke-LocalRepositoryPull\b/);
  assert.match(installer, /pull\s+--rebase\s+origin/);
  assert.match(installer, /\[switch\]\s*\$DryRun\b/);
  assert.ok(installer.indexOf('Invoke-LocalRepositoryPull') < installer.indexOf('Install-Snapshot'));
  assert.doesNotMatch(syncScript, /Write-PendingRepositoryDiff|diff\s+--no-index|Tracked file diff|Untracked file diffs/);
  assert.match(syncScript, /Read-YesOrEnterChoice -Prompt 'Continue with committing and publishing these changes\?'/);
  assert.match(syncScript, /Read-EnterAcceptChoice -Prompt "Also publish this same commit to origin\/\$\{releaseBranch\}\?"/);
});
