[CmdletBinding()]
param(
    [Parameter()]
    [string]$SourceCodexPath = (Join-Path $HOME '.codex'),

    [Parameter()]
    [string]$RepoPath = (Join-Path $HOME 'codex-home-config'),

    [Parameter()]
    [string]$RepoUrl = 'https://github.com/jiangxiaoxu/codex-home-config.git',

    [Parameter()]
    [string]$CommitMessage = ("Sync Codex home config " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceInstallerPath = Join-Path $SourceCodexPath 'install-codex-home-config.ps1'
$sourceSyncScriptPath = Join-Path $SourceCodexPath 'sync-codex-home-config-repo.ps1'
$sourceConfigPath = Join-Path $SourceCodexPath 'config.toml'
$sourceAgentsPath = Join-Path $SourceCodexPath 'AGENTS.md'
$sourceSkillPath = Join-Path $SourceCodexPath 'skills\\jiangxiaoxu'

foreach ($requiredPath in @($sourceInstallerPath, $sourceSyncScriptPath, $sourceConfigPath, $sourceAgentsPath, $sourceSkillPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required source path was not found: $requiredPath"
    }
}

if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) {
    & git clone $RepoUrl $RepoPath
    if ($LASTEXITCODE -ne 0) {
        throw "git clone failed for $RepoUrl"
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $RepoPath '.git') -PathType Container)) {
    throw "Target repo path is not a git repository: $RepoPath"
}

$currentBranch = (& git -C $RepoPath branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "git branch --show-current failed in $RepoPath"
}

if ($currentBranch -ne 'main') {
    & git -C $RepoPath checkout -B main
    if ($LASTEXITCODE -ne 0) {
        throw "git checkout -B main failed in $RepoPath"
    }
}

Copy-Item -LiteralPath $sourceConfigPath -Destination (Join-Path $RepoPath 'config.toml') -Force
Copy-Item -LiteralPath $sourceAgentsPath -Destination (Join-Path $RepoPath 'AGENTS.md') -Force
Copy-Item -LiteralPath $sourceInstallerPath -Destination (Join-Path $RepoPath 'install-codex-home-config.ps1') -Force

$repoScriptsPath = Join-Path $RepoPath 'scripts'
$null = New-Item -ItemType Directory -Path $repoScriptsPath -Force
Copy-Item -LiteralPath $sourceSyncScriptPath -Destination (Join-Path $repoScriptsPath 'sync-codex-home-config-repo.ps1') -Force

$repoSkillsParentPath = Join-Path $RepoPath 'skills'
$repoSkillPath = Join-Path $repoSkillsParentPath 'jiangxiaoxu'
if (Test-Path -LiteralPath $repoSkillPath) {
    Remove-Item -LiteralPath $repoSkillPath -Recurse -Force
}

$null = New-Item -ItemType Directory -Path $repoSkillsParentPath -Force
Copy-Item -LiteralPath $sourceSkillPath -Destination $repoSkillsParentPath -Recurse -Force

$statusOutput = & git -C $RepoPath status --porcelain
if ($LASTEXITCODE -ne 0) {
    throw "git status failed in $RepoPath"
}

if ([string]::IsNullOrWhiteSpace(($statusOutput | Out-String))) {
    Write-Output "No changes to publish in $RepoPath"
    return
}

& git -C $RepoPath add --all
if ($LASTEXITCODE -ne 0) {
    throw "git add failed in $RepoPath"
}

& git -C $RepoPath commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed in $RepoPath"
}

& git -C $RepoPath push origin main
if ($LASTEXITCODE -ne 0) {
    throw "git push failed in $RepoPath"
}

Write-Output "Published repository: $RepoPath"
Write-Output "Remote URL: $RepoUrl"
