[CmdletBinding()]
param(
    [Parameter()]
    [string]$SourceCodexPath = (Join-Path $HOME '.codex'),

    [Parameter()]
    [string]$RepoPath = '',

    [Parameter()]
    [string]$RepoUrl = 'https://github.com/jiangxiaoxu/codex-home-config.git',

    [Parameter()]
    [string]$CommitMessage = ("Sync Codex home config " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')),

    [Parameter()]
    [ValidateSet('Config', 'AgentFile', 'AgentFolder', 'Skill')]
    [string[]]$Components = @('Config', 'AgentFile', 'AgentFolder', 'Skill'),

    [Parameter(DontShow = $true)]
    [switch]$SkipInitialPull
)

function Get-ComponentSelection {
    param(
        [Parameter(Mandatory)]
        [string[]]$SelectedComponents
    )

    $componentSelection = @{
        Config      = $false
        AgentFile   = $false
        AgentFolder = $false
        Skill       = $false
    }

    foreach ($component in $SelectedComponents) {
        $componentSelection[$component] = $true
    }

    return $componentSelection
}

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

function Sync-ManagedSkillDirectory {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,

        [Parameter(Mandatory)]
        [string]$DestinationPath
    )

    if (Test-Path -LiteralPath $SourcePath -PathType Leaf) {
        throw "Expected directory path but found a file: $SourcePath"
    }

    if (Test-Path -LiteralPath $SourcePath -PathType Container) {
        if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
            throw "Expected directory path but found a file: $DestinationPath"
        }

        if (Test-Path -LiteralPath $DestinationPath -PathType Container) {
            Remove-Item -LiteralPath $DestinationPath -Recurse -Force
        }

        $destinationParentPath = Split-Path -Path $DestinationPath -Parent
        $null = New-Item -ItemType Directory -Path $destinationParentPath -Force
        Copy-Item -LiteralPath $SourcePath -Destination $destinationParentPath -Recurse -Force
        Write-Output "Published skill to $DestinationPath"
        return
    }

    if (-not (Test-Path -LiteralPath $DestinationPath -PathType Container)) {
        return
    }

    if (-not $PSCmdlet.ShouldProcess($DestinationPath, 'Remove managed skill directory')) {
        return
    }

    Remove-Item -LiteralPath $DestinationPath -Recurse -Force
    Write-Output "Removed skill at $DestinationPath"

    $destinationParentPath = Split-Path -Path $DestinationPath -Parent
    if (-not (Test-Path -LiteralPath $destinationParentPath -PathType Container)) {
        return
    }

    $remainingEntries = @(Get-ChildItem -LiteralPath $destinationParentPath -Force)
    if (($remainingEntries.Count -eq 0) -and $PSCmdlet.ShouldProcess($destinationParentPath, 'Remove empty managed skills directory')) {
        Remove-Item -LiteralPath $destinationParentPath -Force
        Write-Output "Removed empty managed skills directory at $destinationParentPath"
    }
}

function Get-RelaunchArgumentList {
    param(
        [Parameter()]
        [switch]$IncludeSkipInitialPull
    )

    $arguments = @('-NoProfile')
    if ($env:OS -eq 'Windows_NT') {
        $arguments += @('-ExecutionPolicy', 'Bypass')
    }

    $arguments += @('-File', $PSCommandPath)

    foreach ($parameterName in @('SourceCodexPath', 'RepoPath', 'RepoUrl', 'CommitMessage', 'Components', 'SkipInitialPull')) {
        if ($script:PSBoundParameters.ContainsKey($parameterName)) {
            $parameterValue = $script:PSBoundParameters[$parameterName]
            if ($parameterValue -is [System.Management.Automation.SwitchParameter] -or $parameterValue -is [bool]) {
                if ([bool]$parameterValue) {
                    $arguments += "-$parameterName"
                }
            }
            elseif ($parameterValue -is [System.Array]) {
                $arguments += "-$parameterName"
                $arguments += @($parameterValue | ForEach-Object { [string]$_ })
            }
            else {
                $arguments += "-$parameterName"
                $arguments += [string]$parameterValue
            }
        }
    }

    if ($IncludeSkipInitialPull -and -not $script:PSBoundParameters.ContainsKey('SkipInitialPull')) {
        $arguments += '-SkipInitialPull'
    }

    return $arguments
}

function Get-NodeExecutable {
    $candidatePaths = [System.Collections.Generic.List[string]]::new()

    $nodeCommand = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $nodeCommand) {
        foreach ($propertyName in @('Source', 'Path')) {
            $property = $nodeCommand.PSObject.Properties[$propertyName]
            if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace($property.Value)) {
                $candidatePaths.Add($property.Value)
            }
        }
    }

    $defaultNodePath = Join-Path $env:ProgramFiles 'nodejs\node.exe'
    if (-not [string]::IsNullOrWhiteSpace($defaultNodePath)) {
        $candidatePaths.Add($defaultNodePath)
    }

    foreach ($candidatePath in @($candidatePaths | Select-Object -Unique)) {
        if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
            return $candidatePath
        }
    }

    return $null
}

function Assert-NodeEnvironment {
    $nodeExecutable = Get-NodeExecutable
    if ([string]::IsNullOrWhiteSpace($nodeExecutable)) {
        throw 'Node.js 18 or later is required. Install Node.js from https://nodejs.org/ and retry.'
    }

    $versionText = (& $nodeExecutable --version 2>$null | Out-String).Trim()
    $versionMatch = [regex]::Match($versionText, '^v?(?<major>\d+)')
    if (-not $versionMatch.Success -or [int]$versionMatch.Groups['major'].Value -lt 18) {
        throw "Node.js 18 or later is required. Found: $versionText"
    }

    return $nodeExecutable
}

function Get-ConfigTomlToolPath {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath
    )

    $toolPath = Join-Path $RepositoryPath 'tools\config-toml-ops.cjs'
    if (-not (Test-Path -LiteralPath $toolPath -PathType Leaf)) {
        throw "Config TOML helper was not found: $toolPath"
    }

    return $toolPath
}

function Invoke-ConfigTomlTool {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath,

        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter(Mandatory)]
        [hashtable]$Arguments
    )

    $nodeExecutable = Assert-NodeEnvironment
    $toolPath = Get-ConfigTomlToolPath -RepositoryPath $RepositoryPath
    $argumentList = @($toolPath, $Command)
    foreach ($argumentName in $Arguments.Keys) {
        $argumentList += "--$argumentName"
        $argumentList += [string]$Arguments[$argumentName]
    }

    & $nodeExecutable @argumentList
    if ($LASTEXITCODE -ne 0) {
        throw "Config TOML helper command failed: $Command"
    }
}

function Get-RepoHeadCommit {
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath
    )

    $headCommit = (& git -C $RepoPath rev-parse HEAD 2>$null).Trim()
    if (($LASTEXITCODE -ne 0) -and ($LASTEXITCODE -ne 128)) {
        throw "git rev-parse HEAD failed in $RepoPath"
    }

    return $headCommit
}

function Copy-ItemIfDifferentPath {
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,

        [Parameter(Mandatory)]
        [string]$DestinationPath
    )

    $sourceFullPath = [System.IO.Path]::GetFullPath($SourcePath)
    $destinationFullPath = [System.IO.Path]::GetFullPath($DestinationPath)

    if ($sourceFullPath -eq $destinationFullPath) {
        return
    }

    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
}

function Get-ConfigTextNewLine {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    if ($Content.Contains("`r`n")) {
        return "`r`n"
    }

    if ($Content.Contains("`n")) {
        return "`n"
    }

    if ($Content.Contains("`r")) {
        return "`r"
    }

    return [Environment]::NewLine
}

function Get-ConfigTextLineRecord {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    $lines = [System.Collections.Generic.List[string]]::new()
    $lineMatches = [regex]::Matches($Content, "[^\r\n]*(?:\r\n|\n|\r|$)")
    foreach ($match in $lineMatches) {
        if ($match.Length -eq 0 -and $match.Index -eq $Content.Length) {
            continue
        }

        $lines.Add($match.Value)
    }

    return @($lines)
}

function Get-TomlSectionName {
    param(
        [Parameter(Mandatory)]
        [string]$Line
    )

    $trimmedLine = $Line.TrimEnd("`r", "`n")
    $match = [regex]::Match(
        $trimmedLine,
        '^\s*\[(?<array>\[)?\s*(?<name>(?:[A-Za-z0-9_-]+|"[^"\r\n]*"|''[^''\r\n]*'')(?:\s*\.\s*(?:[A-Za-z0-9_-]+|"[^"\r\n]*"|''[^''\r\n]*''))*)\s*\](?(array)\])\s*(?:#.*)?$'
    )
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups['name'].Value
}

function Test-ProjectsTomlSection {
    param(
        [Parameter(Mandatory)]
        [string]$SectionName
    )

    return [regex]::IsMatch($SectionName, '^projects(?:\s*$|\s*\.)')
}

function Split-ConfigTomlContent {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    $sharedBlocks = [System.Collections.Generic.List[string]]::new()
    $localOnlyBlocks = [System.Collections.Generic.List[string]]::new()
    $currentBlockLines = [System.Collections.Generic.List[string]]::new()
    $currentBlockIsLocalOnly = $false

    foreach ($line in @(Get-ConfigTextLineRecord -Content $Content)) {
        $sectionName = Get-TomlSectionName -Line $line
        if ($null -ne $sectionName) {
            if ($currentBlockLines.Count -gt 0) {
                $currentBlockContent = [string]::Concat($currentBlockLines.ToArray())
                if ($currentBlockIsLocalOnly) {
                    $localOnlyBlocks.Add($currentBlockContent)
                }
                else {
                    $sharedBlocks.Add($currentBlockContent)
                }

                $currentBlockLines.Clear()
            }

            $currentBlockIsLocalOnly = Test-ProjectsTomlSection -SectionName $sectionName
        }

        $currentBlockLines.Add($line)
    }

    if ($currentBlockLines.Count -gt 0) {
        $currentBlockContent = [string]::Concat($currentBlockLines.ToArray())
        if ($currentBlockIsLocalOnly) {
            $localOnlyBlocks.Add($currentBlockContent)
        }
        else {
            $sharedBlocks.Add($currentBlockContent)
        }
    }

    return [pscustomobject]@{
        NewLine          = Get-ConfigTextNewLine -Content $Content
        SharedContent    = [string]::Concat($sharedBlocks.ToArray())
        LocalOnlyContent = [string]::Concat($localOnlyBlocks.ToArray())
    }
}

function Join-ConfigTomlContent {
    param(
        [Parameter()]
        [AllowEmptyString()]
        [string]$SharedContent = '',

        [Parameter()]
        [AllowEmptyString()]
        [string]$LocalOnlyContent = '',

        [Parameter(Mandatory)]
        [string]$NewLine
    )

    $segments = [System.Collections.Generic.List[string]]::new()
    foreach ($segment in @($SharedContent, $LocalOnlyContent)) {
        if ([string]::IsNullOrWhiteSpace($segment)) {
            continue
        }

        $segments.Add($segment.TrimEnd("`r", "`n"))
    }

    if ($segments.Count -eq 0) {
        return ''
    }

    return ([string]::Join($NewLine + $NewLine, $segments.ToArray()) + $NewLine)
}

function Write-Utf8FileIfDifferent {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    if (Test-Path -LiteralPath $Path -PathType Container) {
        throw "Expected file path but found a directory: $Path"
    }

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        $existingContent = [System.IO.File]::ReadAllText($Path)
        if ($existingContent -ceq $Content) {
            return
        }
    }

    $parentPath = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($parentPath)) {
        $null = New-Item -ItemType Directory -Path $parentPath -Force
    }

    $utf8Encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8Encoding)
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
$null = Assert-NodeEnvironment

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
$sourceAgentDirectoryPath = Join-Path $SourceCodexPath 'agents'
$sourceSkillDirectoryPath = Join-Path $SourceCodexPath 'skills\jiangxiaoxu'
$componentSelection = Get-ComponentSelection -SelectedComponents $Components

foreach ($requiredPath in @(
        @{ Path = $sourceConfigPath; Selected = $componentSelection.Config },
        @{ Path = $sourceAgentsPath; Selected = $componentSelection.AgentFile },
        @{ Path = $sourceAgentDirectoryPath; Selected = $componentSelection.AgentFolder }
    )) {
    if ($requiredPath.Selected -and -not (Test-Path -LiteralPath $requiredPath.Path)) {
        throw "Required source path was not found: $($requiredPath.Path)"
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

if ($SkipInitialPull) {
    $postPullStatusOutput = & git -C $RepoPath status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed in $RepoPath"
    }

    if (-not [string]::IsNullOrWhiteSpace(($postPullStatusOutput | Out-String))) {
        throw "Repository '$RepoPath' has uncommitted changes. Commit or discard them before syncing."
    }
}
else {
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
        $prePullHead = Get-RepoHeadCommit -RepoPath $RepoPath

        & git -C $RepoPath pull --rebase origin main
        if ($LASTEXITCODE -ne 0) {
            throw "git pull --rebase origin main failed in $RepoPath"
        }

        $postPullHead = Get-RepoHeadCommit -RepoPath $RepoPath
        if ($prePullHead -ne $postPullHead) {
            $repoSyncScriptPath = Join-Path $RepoPath 'sync-codex-home-config-repo.ps1'
            if (-not (Test-Path -LiteralPath $repoSyncScriptPath -PathType Leaf)) {
                throw "Updated sync script was not found: $repoSyncScriptPath"
            }

            Write-Output "Repository updated after pull; relaunching latest sync script from $repoSyncScriptPath"

            & $repoSyncScriptPath @(Get-RelaunchArgumentList -IncludeSkipInitialPull)
            if ($LASTEXITCODE -ne 0) {
                exit $LASTEXITCODE
            }

            return
        }
    }
}

$sourceInstallerPath = Join-Path $RepoPath 'install-codex-home-config.ps1'

if (-not [string]::IsNullOrWhiteSpace($PSCommandPath) -and (Test-Path -LiteralPath $PSCommandPath -PathType Leaf)) {
    $sourceSyncScriptPath = $PSCommandPath
}
else {
    $sourceSyncScriptPath = Join-Path $RepoPath 'sync-codex-home-config-repo.ps1'
}

foreach ($requiredScriptPath in @($sourceInstallerPath, $sourceSyncScriptPath)) {
    if (-not (Test-Path -LiteralPath $requiredScriptPath -PathType Leaf)) {
        throw "Required script path was not found: $requiredScriptPath"
    }
}

Copy-ItemIfDifferentPath -SourcePath $sourceInstallerPath -DestinationPath (Join-Path $RepoPath 'install-codex-home-config.ps1')

$repoManagedPath = Join-Path $RepoPath 'managed'
$null = New-Item -ItemType Directory -Path $repoManagedPath -Force
if ($componentSelection.Config) {
    $managedConfigPath = Join-Path $repoManagedPath 'config.toml'
    Invoke-ConfigTomlTool -RepositoryPath $RepoPath -Command 'publish-sync' -Arguments @{
        local   = $sourceConfigPath
        managed = $managedConfigPath
        output  = $managedConfigPath
    }
}

if ($componentSelection.AgentFile) {
    Copy-ItemIfDifferentPath -SourcePath $sourceAgentsPath -DestinationPath (Join-Path $repoManagedPath 'AGENTS.md')
}

if ($componentSelection.AgentFolder) {
    $repoAgentDirectoryPath = Join-Path $repoManagedPath 'agents'
    if (Test-Path -LiteralPath $repoAgentDirectoryPath) {
        Remove-Item -LiteralPath $repoAgentDirectoryPath -Recurse -Force
    }

    Copy-Item -LiteralPath $sourceAgentDirectoryPath -Destination $repoManagedPath -Recurse -Force
}

if ($componentSelection.Skill) {
    Sync-ManagedSkillDirectory -SourcePath $sourceSkillDirectoryPath -DestinationPath (Join-Path $repoManagedPath 'skills\jiangxiaoxu')
}

Copy-ItemIfDifferentPath -SourcePath $sourceSyncScriptPath -DestinationPath (Join-Path $RepoPath 'sync-codex-home-config-repo.ps1')

$legacyConfigPath = Join-Path $RepoPath 'config.toml'
if (Test-Path -LiteralPath $legacyConfigPath -PathType Leaf) {
    Remove-Item -LiteralPath $legacyConfigPath -Force
}

$legacyScriptsPath = Join-Path $RepoPath 'scripts'
if (Test-Path -LiteralPath $legacyScriptsPath -PathType Container) {
    Remove-Item -LiteralPath $legacyScriptsPath -Recurse -Force
}

$legacyRootSkillsPath = Join-Path $RepoPath 'skills'
if (Test-Path -LiteralPath $legacyRootSkillsPath -PathType Container) {
    Remove-Item -LiteralPath $legacyRootSkillsPath -Recurse -Force
}

$legacyRootAgentsPath = Join-Path $RepoPath 'agents'
if (Test-Path -LiteralPath $legacyRootAgentsPath -PathType Container) {
    Remove-Item -LiteralPath $legacyRootAgentsPath -Recurse -Force
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
