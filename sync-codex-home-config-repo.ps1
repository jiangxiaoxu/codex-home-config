[CmdletBinding()]
param(
    [Parameter()]
    [string]$SourceCodexPath = (Join-Path $HOME '.codex'),

    [Parameter()]
    [string]$RepoPath = '',

    [Parameter()]
    [string]$RepoUrl = 'https://github.com/jiangxiaoxu/codex-home-config.git',

    [Parameter()]
    [string]$CommitMessage = ("Sync Codex home config " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
)

function Get-PowerShell7Executable {
    $candidatePaths = [System.Collections.Generic.List[string]]::new()

    $pwshCommand = Get-Command pwsh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $pwshCommand) {
        foreach ($propertyName in @('Source', 'Path')) {
            $property = $pwshCommand.PSObject.Properties[$propertyName]
            if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace($property.Value)) {
                $candidatePaths.Add($property.Value)
            }
        }
    }

    $defaultPwshPath = Join-Path $env:ProgramFiles 'PowerShell\7\pwsh.exe'
    if (-not [string]::IsNullOrWhiteSpace($defaultPwshPath)) {
        $candidatePaths.Add($defaultPwshPath)
    }

    foreach ($candidatePath in @($candidatePaths | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) {
            continue
        }

        try {
            $versionMajor = & $candidatePath -NoProfile -Command '$PSVersionTable.PSVersion.Major'
            if ($LASTEXITCODE -eq 0 -and [int]$versionMajor -ge 7) {
                return $candidatePath
            }
        }
        catch {
            Write-Verbose "Failed to inspect candidate pwsh executable: $candidatePath"
        }
    }

    return $null
}

function Get-RelaunchArgumentList {
    $arguments = @('-NoProfile')
    if ($env:OS -eq 'Windows_NT') {
        $arguments += @('-ExecutionPolicy', 'Bypass')
    }

    $arguments += @('-File', $PSCommandPath)

    foreach ($parameterName in @('SourceCodexPath', 'RepoPath', 'RepoUrl', 'CommitMessage')) {
        if ($PSBoundParameters.ContainsKey($parameterName)) {
            $arguments += @("-$parameterName", [string]$PSBoundParameters[$parameterName])
        }
    }

    return $arguments
}

if ($PSVersionTable.PSVersion.Major -lt 7) {
    $pwshExecutable = Get-PowerShell7Executable
    if ([string]::IsNullOrWhiteSpace($pwshExecutable)) {
        throw 'PowerShell 7 or later is required. pwsh.exe was not found.'
    }

    & $pwshExecutable @(Get-RelaunchArgumentList)
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    return
}

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        $RepoPath = $PSScriptRoot
    }
    else {
        $RepoPath = Join-Path $HOME 'codex-home-config'
    }
}

$sourceConfigPath = Join-Path $SourceCodexPath 'config.toml'
$sourceAgentsPath = Join-Path $SourceCodexPath 'AGENTS.md'
$sourceSkillPath = Join-Path $SourceCodexPath 'skills\\jiangxiaoxu'

foreach ($requiredPath in @($sourceConfigPath, $sourceAgentsPath, $sourceSkillPath)) {
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

$sourceInstallerPath = Join-Path $SourceCodexPath 'install-codex-home-config.ps1'
if (-not (Test-Path -LiteralPath $sourceInstallerPath -PathType Leaf)) {
    $sourceInstallerPath = Join-Path $RepoPath 'install-codex-home-config.ps1'
}

$sourceSyncScriptPath = Join-Path $SourceCodexPath 'sync-codex-home-config-repo.ps1'
if (-not (Test-Path -LiteralPath $sourceSyncScriptPath -PathType Leaf)) {
    if (-not [string]::IsNullOrWhiteSpace($PSCommandPath) -and (Test-Path -LiteralPath $PSCommandPath -PathType Leaf)) {
        $sourceSyncScriptPath = $PSCommandPath
    }
    else {
        $sourceSyncScriptPath = Join-Path $RepoPath 'sync-codex-home-config-repo.ps1'
    }
}

foreach ($requiredScriptPath in @($sourceInstallerPath, $sourceSyncScriptPath)) {
    if (-not (Test-Path -LiteralPath $requiredScriptPath -PathType Leaf)) {
        throw "Required script path was not found: $requiredScriptPath"
    }
}

$preSyncStatusOutput = & git -C $RepoPath status --porcelain
if ($LASTEXITCODE -ne 0) {
    throw "git status failed in $RepoPath"
}

if (-not [string]::IsNullOrWhiteSpace(($preSyncStatusOutput | Out-String))) {
    throw "Repository '$RepoPath' has uncommitted changes. Commit or discard them before syncing."
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

& git -C $RepoPath ls-remote --exit-code --heads origin main *> $null
$remoteMainCheckExitCode = $LASTEXITCODE
if (($remoteMainCheckExitCode -ne 0) -and ($remoteMainCheckExitCode -ne 2)) {
    throw "git ls-remote failed for origin/main in $RepoPath"
}

if ($remoteMainCheckExitCode -eq 0) {
    & git -C $RepoPath pull --rebase origin main
    if ($LASTEXITCODE -ne 0) {
        throw "git pull --rebase origin main failed in $RepoPath"
    }
}

Copy-Item -LiteralPath $sourceInstallerPath -Destination (Join-Path $RepoPath 'install-codex-home-config.ps1') -Force

$repoManagedPath = Join-Path $RepoPath 'managed'
$null = New-Item -ItemType Directory -Path $repoManagedPath -Force
Copy-Item -LiteralPath $sourceConfigPath -Destination (Join-Path $repoManagedPath 'config.toml') -Force
Copy-Item -LiteralPath $sourceAgentsPath -Destination (Join-Path $repoManagedPath 'AGENTS.md') -Force
Copy-Item -LiteralPath $sourceSyncScriptPath -Destination (Join-Path $RepoPath 'sync-codex-home-config-repo.ps1') -Force

$legacyConfigPath = Join-Path $RepoPath 'config.toml'
if (Test-Path -LiteralPath $legacyConfigPath -PathType Leaf) {
    Remove-Item -LiteralPath $legacyConfigPath -Force
}

$legacyScriptsPath = Join-Path $RepoPath 'scripts'
if (Test-Path -LiteralPath $legacyScriptsPath -PathType Container) {
    Remove-Item -LiteralPath $legacyScriptsPath -Recurse -Force
}

$repoSkillsParentPath = Join-Path $repoManagedPath 'skills'
$repoSkillPath = Join-Path $repoSkillsParentPath 'jiangxiaoxu'
if (Test-Path -LiteralPath $repoSkillPath) {
    Remove-Item -LiteralPath $repoSkillPath -Recurse -Force
}

$null = New-Item -ItemType Directory -Path $repoSkillsParentPath -Force
Copy-Item -LiteralPath $sourceSkillPath -Destination $repoSkillsParentPath -Recurse -Force

$legacyRootSkillsPath = Join-Path $RepoPath 'skills'
if (Test-Path -LiteralPath $legacyRootSkillsPath -PathType Container) {
    Remove-Item -LiteralPath $legacyRootSkillsPath -Recurse -Force
}

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
