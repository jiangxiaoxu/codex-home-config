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
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TOML = require('@iarna/toml');
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

function createPublishedReleaseArchive(tempDir) {
  const publishedReleaseRoot = join(tempDir, 'published-release');
  const publishedReleaseSnapshotPath = join(publishedReleaseRoot, 'codex-home-config-release');
  const archivePath = join(tempDir, 'published-release.zip');
  const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
  writeSnapshot(publishedReleaseSnapshotPath, {
    config: 'model = "published-release"\n',
    agents: 'published release instructions\n',
    agent: 'published release agent\n'
  });

  const result = spawnSync(
    pwshPath,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Compress-Archive -LiteralPath ${quotePowerShell(publishedReleaseSnapshotPath)} -DestinationPath ${quotePowerShell(archivePath)} -Force`
    ],
    {
      cwd: tempDir,
      encoding: 'utf8',
      timeout: 30000
    }
  );
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
  return archivePath;
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

function runInstallerWithPublishedReleaseMock(repositoryPath, targetPath, archivePath, args = [], {
  apiFailure = false,
  archiveFailure = false
} = {}) {
  const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
  const commandArguments = args.map((argument) => argument.startsWith('-') ? argument : quotePowerShell(argument));
  const mockCommit = "[pscustomobject]@{ sha = '0123456789abcdef0123456789abcdef01234567'; html_url = 'https://example.invalid/commit/0123456789abcdef0123456789abcdef01234567'; commit = [pscustomobject]@{ message = 'Published release snapshot'; committer = [pscustomobject]@{ name = 'Release Bot'; date = '2026-01-02T03:04:05Z' }; author = [pscustomobject]@{ name = 'Release Bot'; date = '2026-01-02T03:04:05Z' } } }";
  const restMethodMock = apiFailure
    ? "function Invoke-RestMethod { param($Uri, $Headers) throw 'Mocked published release commit API failure' }"
    : `function Invoke-RestMethod { param($Uri, $Headers) return ${mockCommit} }`;
  const webRequestMock = archiveFailure
    ? "function Invoke-WebRequest { param($Uri, $Headers, $OutFile) throw 'Mocked published release archive download failure' }"
    : `function Invoke-WebRequest { param($Uri, $Headers, $OutFile) Copy-Item -LiteralPath ${quotePowerShell(archivePath)} -Destination $OutFile -Force }`;
  const command = [
    restMethodMock,
    webRequestMock,
    ...(apiFailure || archiveFailure ? ['function Start-Sleep { param($Seconds) }'] : []),
    [
      '&',
      quotePowerShell(join(repositoryPath, 'install-codex-home-config.ps1')),
      '-TargetCodexPath',
      quotePowerShell(targetPath),
      '-UsePublishedRelease',
      ...commandArguments
    ].join(' ')
  ].join('; ');

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

function runInstallerFromDynamicScriptBlock(repositoryPath, targetPath, args = []) {
  const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
  const commandArguments = args.map((argument) => argument.startsWith('-') ? argument : quotePowerShell(argument));
  const installerSourceMarker = 'Set-StrictMode -Version Latest';
  const installerSourceReplacement = `$PSScriptRoot = ${quotePowerShell(repositoryPath)}\n${installerSourceMarker}`;
  const command = [
    `$installerContent = Get-Content -LiteralPath ${quotePowerShell(join(repositoryPath, 'install-codex-home-config.ps1'))} -Raw`,
    `$installerContent = $installerContent.Replace(${quotePowerShell(installerSourceMarker)}, ${quotePowerShell(installerSourceReplacement)})`,
    [
      '&([scriptblock]::Create($installerContent))',
      '-TargetCodexPath',
      quotePowerShell(targetPath),
      ...commandArguments
    ].join(' ')
  ].join('; ');

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

test('UsePublishedRelease ignores a dirty local checkout and installs the mocked published release', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const archivePath = createPublishedReleaseArchive(tempDir);
    const targetPath = join(tempDir, 'target');
    writeFileSync(join(localPath, 'managed', 'config.toml'), 'model = "local-checkout"\n', 'utf8');

    const result = runInstallerWithPublishedReleaseMock(localPath, targetPath, archivePath);

    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(readFileSync(join(targetPath, 'config.toml'), 'utf8'), /published-release/);
    assert.equal(readFileSync(join(targetPath, 'AGENTS.md'), 'utf8'), 'published release instructions\n');
    assert.match(result.stdout, /Branch: release/);
    assert.match(result.stdout, /Subject: Published release snapshot/);
    assert.match(result.stdout, /Source: remote published release branch/);
    assert.doesNotMatch(result.stdout, /Pulling latest changes for local branch|Using local repository snapshot/);
  });
});

test('UsePublishedRelease DryRun uses the mocked published release without modifying a dirty local checkout target', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const archivePath = createPublishedReleaseArchive(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalConfig = Buffer.from('model = "target-before"\n', 'utf8');
    writeFileSync(join(localPath, 'managed', 'config.toml'), 'model = "local-checkout"\n', 'utf8');
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), originalConfig);

    const result = runInstallerWithPublishedReleaseMock(localPath, targetPath, archivePath, ['-DryRun']);

    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /\+model = "published-release"/);
    assert.doesNotMatch(result.stdout, /local-checkout|Pulling latest changes for local branch|Using local repository snapshot/);
    assert.deepEqual(readFileSync(join(targetPath, 'config.toml')), originalConfig);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
  });
});

test('UsePublishedRelease fails on a published release commit API error without falling back to a dirty local checkout', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalConfig = Buffer.from('model = "target-before"\n', 'utf8');
    writeFileSync(join(localPath, 'managed', 'config.toml'), 'model = "local-checkout"\n', 'utf8');
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), originalConfig);

    const result = runInstallerWithPublishedReleaseMock(
      localPath,
      targetPath,
      join(tempDir, 'unused-release.zip'),
      [],
      { apiFailure: true }
    );
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

    assert.notEqual(result.status, 0, 'a published release commit API failure must fail the installer');
    assert.match(output, /GitHub API request failed.*Mocked published release commit API failure/i);
    assert.doesNotMatch(output, /uncommitted changes|Using local repository snapshot|local-checkout/i);
    assert.deepEqual(readFileSync(join(targetPath, 'config.toml')), originalConfig);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
  });
});

test('UsePublishedRelease DryRun fails on an archive download error without falling back to a dirty local checkout', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalConfig = Buffer.from('model = "target-before"\n', 'utf8');
    writeFileSync(join(localPath, 'managed', 'config.toml'), 'model = "local-checkout"\n', 'utf8');
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), originalConfig);

    const result = runInstallerWithPublishedReleaseMock(
      localPath,
      targetPath,
      join(tempDir, 'unused-release.zip'),
      ['-DryRun'],
      { archiveFailure: true }
    );
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

    assert.notEqual(result.status, 0, 'a published release archive download failure must fail the installer');
    assert.match(output, /Download request failed.*Mocked published release archive download failure/i);
    assert.doesNotMatch(output, /uncommitted changes|Using local repository snapshot|local-checkout/i);
    assert.deepEqual(readFileSync(join(targetPath, 'config.toml')), originalConfig);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
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
    assert.match(result.stdout, /^models\.local\.json: differs$/m);
    assert.match(result.stdout, /AGENTS\.md/);
    assert.match(result.stdout, /agents[\\/]reviewer\.toml/);
    assert.match(result.stdout, /-model = "old"/);
    assert.match(result.stdout, /\+model = "base"/);
    assert.doesNotMatch(result.stdout, /^(?:diff --git .*models\.local\.json|--- .*models\.local\.json|\+\+\+ .*models\.local\.json)$/m);
    assert.doesNotMatch(result.stdout, /^[+-]\s+"models":/m);
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

test('DryRun supports the GUI dynamic ScriptBlock invocation without script-scoped target state', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const originalConfig = Buffer.from('model = "old"\n', 'utf8');
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), originalConfig);

    const result = runInstallerFromDynamicScriptBlock(localPath, targetPath, ['-DryRun']);

    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /config\.toml/);
    assert.deepEqual(readFileSync(join(targetPath, 'config.toml')), originalConfig);
    assert.ok(!existsSync(join(targetPath, 'sync_codex-home-config_backup')));
  });
});

test('DryRun reports only whether models.local.json differs', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    mkdirSync(join(targetPath, 'agents'), { recursive: true });
    writeFileSync(join(targetPath, 'config.toml'), 'model = "base"\n', 'utf8');
    writeFileSync(join(targetPath, 'models.local.json'), '{\n  "models": ["private-model"]\n}\n', 'utf8');
    writeFileSync(join(targetPath, 'AGENTS.md'), 'base instructions\n', 'utf8');
    writeFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'base agent\n', 'utf8');

    const result = runInstaller(localPath, targetPath, ['-DryRun']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.match(result.stdout, /^models\.local\.json: differs$/m);
    assert.doesNotMatch(result.stdout, /private-model|^diff --git |^--- |^\+\+\+ |No differences would be applied\./m);
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

test('default installation can update a config.toml with an unchanged managed nested table twice', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const managedConfig = [
      '[features]',
      'unified_exec = true',
      '',
      '[features.current_time_reminder]',
      'enabled = true',
      'clock_source = "system"',
      ''
    ].join('\n');
    const targetConfig = [
      '[features]',
      'unified_exec = false',
      'apps = false',
      '',
      '[features.current_time_reminder]',
      'enabled = true',
      'clock_source = "system"',
      ''
    ].join('\n');

    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(localPath, 'managed', 'config.toml'), managedConfig, 'utf8');
    commitAll(localPath, 'Use repeatable managed config test fixture');
    writeFileSync(join(targetPath, 'config.toml'), targetConfig, 'utf8');

    const firstResult = runInstaller(localPath, targetPath);
    assert.equal(firstResult.status, 0, [firstResult.stdout, firstResult.stderr].filter(Boolean).join('\n'));
    const firstInstalledConfig = TOML.parse(readFileSync(join(targetPath, 'config.toml'), 'utf8'));
    assert.deepStrictEqual(firstInstalledConfig.features, {
      unified_exec: true,
      apps: false,
      current_time_reminder: {
        enabled: true,
        clock_source: 'system'
      }
    });

    const secondResult = runInstaller(localPath, targetPath);
    assert.equal(secondResult.status, 0, [secondResult.stdout, secondResult.stderr].filter(Boolean).join('\n'));
    assert.deepStrictEqual(
      TOML.parse(readFileSync(join(targetPath, 'config.toml'), 'utf8')),
      firstInstalledConfig
    );
  });
});

test('default installation leaves config.toml untouched when the TOML semantic guard rejects a mixed inline MCP merge', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    const targetConfigPath = join(targetPath, 'config.toml');
    const targetConfig = Buffer.from(
      "mcp_servers = { managed = { command = 'stale.exe' }, node_repl = { command = 'node-repl.exe' } }\r\n",
      'utf8'
    );

    mkdirSync(targetPath, { recursive: true });
    writeFileSync(join(localPath, 'managed', 'config.toml'), '[mcp_servers.managed]\ncommand = "managed.exe"\n', 'utf8');
    commitAll(localPath, 'Use mixed inline MCP semantic guard fixture');
    writeFileSync(targetConfigPath, targetConfig);

    const result = runInstaller(localPath, targetPath);
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    assert.notEqual(result.status, 0);
    assert.match(output, /Config TOML helper command failed: merge-install/);
    assert.match(output, /unexpected semantics/);
    assert.deepStrictEqual(readFileSync(targetConfigPath), targetConfig);
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
