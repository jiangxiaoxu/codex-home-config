import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
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

function writeSnapshot(rootPath, { config = 'model = "base"\n', agents = 'base instructions\n', agent = 'base agent\n' } = {}) {
  mkdirSync(join(rootPath, 'managed', 'agents'), { recursive: true });
  mkdirSync(join(rootPath, 'tools'), { recursive: true });
  cpSync(installerPath, join(rootPath, 'install-codex-home-config.ps1'));
  cpSync(configToolPath, join(rootPath, 'tools', 'config-toml-ops.cjs'));
  writeFileSync(join(rootPath, 'managed', 'config.toml'), config, 'utf8');
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

test('installer defaults directly to Update and has no main action menu', () => {
  const installer = readFileSync(installerPath, 'utf8');

  assert.match(installer, /\[string\]\$Action\s*=\s*'Update'/);
  assert.doesNotMatch(installer, /'Prompt'/);
  assert.doesNotMatch(installer, /function\s+Select-MainAction\b/);
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
    assert.match(result.stdout, /git pull|Pulling|Updating|repository/i);
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

test('installation updates selected files without printing a diff', { skip: !hasPwsh }, () => {
  withTempDir((tempDir) => {
    const { localPath } = createLocalRepository(tempDir);
    const targetPath = join(tempDir, 'target');
    mkdirSync(join(targetPath, 'agents'), { recursive: true });
    writeFileSync(join(targetPath, 'AGENTS.md'), 'old instructions\n', 'utf8');
    writeFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'old agent\n', 'utf8');

    const result = runInstaller(localPath, targetPath, ['-Components', 'AgentFile', 'AgentFolder']);
    assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
    assert.equal(readFileSync(join(targetPath, 'AGENTS.md'), 'utf8'), 'base instructions\n');
    assert.equal(readFileSync(join(targetPath, 'agents', 'reviewer.toml'), 'utf8'), 'base agent\n');
    assert.doesNotMatch(result.stdout, /Installation diff:|diff --git|Binary files/);
  });
});

test('installer and sync keep pull and confirmation behavior without diff output helpers', () => {
  const installer = readFileSync(installerPath, 'utf8');
  const syncScript = readFileSync(syncScriptPath, 'utf8');

  assert.match(installer, /function\s+Invoke-LocalRepositoryPull\b/);
  assert.match(installer, /pull\s+--rebase\s+origin/);
  assert.doesNotMatch(installer, /Show-InstallationDiff|Installation diff:|diff\s+--no-index/);
  assert.ok(installer.indexOf('Invoke-LocalRepositoryPull') < installer.indexOf('Install-Snapshot'));
  assert.doesNotMatch(syncScript, /Write-PendingRepositoryDiff|diff\s+--no-index|Tracked file diff|Untracked file diffs/);
  assert.match(syncScript, /Read-YesOrEnterChoice -Prompt 'Continue with committing and publishing these changes\?'/);
  assert.match(syncScript, /Read-EnterAcceptChoice -Prompt "Also publish this same commit to origin\/\$\{releaseBranch\}\?"/);
});
