[CmdletBinding()]
param(
    [Parameter()]
    [string]$TargetCodexPath = (Join-Path $HOME '.codex'),

    [Parameter()]
    [switch]$DryRun,

    [Parameter(DontShow = $true)]
    [switch]$SkipRepositoryPull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoOwner = 'jiangxiaoxu'
$repoName = 'codex-home-config'
$releaseBranch = 'release'
$archiveUri = "https://codeload.github.com/$repoOwner/$repoName/zip/refs/heads/$releaseBranch"
$publishedCommitApiUri = "https://api.github.com/repos/$repoOwner/$repoName/commits/$releaseBranch"
$userAgent = 'codex-home-config-installer'
$maxBackupVersions = 5
$backupState = [pscustomobject]@{
    SessionPath = ''
}
$runtimeState = [pscustomobject]@{
    SupportRepositoryRoot = ''
    SupportTempRoot       = ''
    NodeExecutable        = ''
    NodeVersionText       = ''
    PublishedCommitInfo   = $null
    GitExecutable         = ''
    RelaunchedInstaller   = $false
}

function Write-StageMessage {
    param(
        [Parameter(Mandatory)]
        [string]$Message
    )

    if (-not $DryRun) {
        Write-Information "[codex-home-config] $Message" -InformationAction Continue
    }
}

function Test-InteractivePauseAvailable {
    try {
        return ([Environment]::UserInteractive -and -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected)
    }
    catch {
        return $false
    }
}

function Get-ErrorDisplayMessage {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    if ($null -ne $ErrorRecord.Exception -and -not [string]::IsNullOrWhiteSpace($ErrorRecord.Exception.Message)) {
        return $ErrorRecord.Exception.Message.Trim()
    }

    return $ErrorRecord.ToString().Trim()
}

function Wait-OnFatalError {
    param(
        [Parameter()]
        [string]$Prompt = 'Press Enter to exit'
    )

    if (-not (Test-InteractivePauseAvailable)) {
        return
    }

    try {
        [void](Read-Host $Prompt)
    }
    catch {
        Write-Verbose 'Failed to wait for user input before exit.'
    }
}

function Get-ComponentSelection {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$SelectedComponents
    )

    $componentSelection = @{
        Config      = $false
        AgentFile   = $false
        AgentFolder = $false
        ModelsLocalFile = $false
        Skill       = $false
    }

    foreach ($component in $SelectedComponents) {
        $componentSelection[$component] = $true
    }

    return $componentSelection
}

function Get-DownloadRequestHeader {
    return @{
        Accept       = 'application/octet-stream'
        'User-Agent' = $userAgent
    }
}

function Get-GitHubApiRequestHeader {
    return @{
        Accept       = 'application/vnd.github+json'
        'User-Agent' = $userAgent
    }
}

function Get-ApiErrorMessage {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    $errorDetails = $ErrorRecord.ErrorDetails
    if ($null -ne $errorDetails -and -not [string]::IsNullOrWhiteSpace($errorDetails.Message)) {
        return $errorDetails.Message.Trim()
    }

    $exception = $ErrorRecord.Exception
    if ($null -ne $exception) {
        $responseProperty = $exception.PSObject.Properties['Response']
        if ($null -ne $responseProperty) {
            $response = $responseProperty.Value
            if ($null -ne $response) {
                $contentProperty = $response.PSObject.Properties['Content']
                if ($null -ne $contentProperty -and $null -ne $contentProperty.Value) {
                    try {
                        $responseText = $contentProperty.Value.ReadAsStringAsync().GetAwaiter().GetResult()
                        if (-not [string]::IsNullOrWhiteSpace($responseText)) {
                            return $responseText.Trim()
                        }
                    }
                    catch {
                        Write-Verbose 'Failed to read the download error response body.'
                    }
                }
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($exception.Message)) {
            return $exception.Message.Trim()
        }
    }

    return $ErrorRecord.ToString().Trim()
}

function Get-NodeExecutable {
    if (-not [string]::IsNullOrWhiteSpace($runtimeState.NodeExecutable)) {
        return $runtimeState.NodeExecutable
    }

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
            $runtimeState.NodeExecutable = $candidatePath
            return $candidatePath
        }
    }

    return $null
}

function Get-GitExecutable {
    if (-not [string]::IsNullOrWhiteSpace($runtimeState.GitExecutable)) {
        return $runtimeState.GitExecutable
    }

    $gitCommand = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $gitCommand) {
        return $null
    }

    foreach ($propertyName in @('Source', 'Path')) {
        $property = $gitCommand.PSObject.Properties[$propertyName]
        if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace($property.Value)) {
            $runtimeState.GitExecutable = $property.Value
            return $runtimeState.GitExecutable
        }
    }

    return $null
}

function Assert-GitEnvironment {
    $gitExecutable = Get-GitExecutable
    if ([string]::IsNullOrWhiteSpace($gitExecutable)) {
        throw 'Git is required to update a local repository checkout. Install Git and retry.'
    }

    return $gitExecutable
}

function Assert-NodeEnvironment {
    if (-not [string]::IsNullOrWhiteSpace($runtimeState.NodeExecutable) -and -not [string]::IsNullOrWhiteSpace($runtimeState.NodeVersionText)) {
        return $runtimeState.NodeExecutable
    }

    Write-StageMessage 'Checking Node.js runtime...'
    $nodeExecutable = Get-NodeExecutable
    if ([string]::IsNullOrWhiteSpace($nodeExecutable)) {
        throw 'Node.js 18 or later is required. Install Node.js from https://nodejs.org/ and retry.'
    }

    $versionText = (& $nodeExecutable --version 2>$null | Out-String).Trim()
    $versionMatch = [regex]::Match($versionText, '^v?(?<major>\d+)')
    if (-not $versionMatch.Success -or [int]$versionMatch.Groups['major'].Value -lt 18) {
        throw "Node.js 18 or later is required. Found: $versionText"
    }

    $runtimeState.NodeExecutable = $nodeExecutable
    $runtimeState.NodeVersionText = $versionText
    Write-StageMessage "Using Node.js runtime: $versionText"
    return $nodeExecutable
}

function Get-GitBranchName {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath
    )

    try {
        $branchName = (& git -C $RepositoryPath branch --show-current 2>$null | Out-String).Trim()
        if (($LASTEXITCODE -eq 0) -and -not [string]::IsNullOrWhiteSpace($branchName)) {
            return $branchName
        }
    }
    catch {
        Write-Verbose "Failed to inspect git branch for $RepositoryPath"
    }

    return $null
}

function Get-LocalRepositoryRoot {
    $candidateRoots = [System.Collections.Generic.List[string]]::new()
    foreach ($candidateRoot in @($PSScriptRoot, $(if (-not [string]::IsNullOrWhiteSpace($PSCommandPath)) { Split-Path -Parent $PSCommandPath }))) {
        if ([string]::IsNullOrWhiteSpace($candidateRoot)) {
            continue
        }

        $candidateRoots.Add($candidateRoot)
    }

    foreach ($candidateRoot in @($candidateRoots | Select-Object -Unique)) {
        $toolPath = Join-Path $candidateRoot 'tools\config-toml-ops.cjs'
        $gitPath = Join-Path $candidateRoot '.git'
        if (-not (Test-Path -LiteralPath $toolPath -PathType Leaf) -or -not (Test-Path -LiteralPath $gitPath)) {
            continue
        }

        return $candidateRoot
    }

    return $null
}

function Get-GitHeadCommit {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath
    )

    $gitExecutable = Assert-GitEnvironment
    $headCommit = (& $gitExecutable -C $RepositoryPath rev-parse HEAD 2>$null | Out-String).Trim()
    if (($LASTEXITCODE -ne 0) -or [string]::IsNullOrWhiteSpace($headCommit)) {
        throw "git rev-parse HEAD failed in $RepositoryPath"
    }

    return $headCommit
}

function Get-PowerShellExecutablePath {
    foreach ($candidateName in @('pwsh.exe', 'powershell.exe', 'pwsh', 'powershell')) {
        $candidatePath = Join-Path $PSHOME $candidateName
        if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
            return $candidatePath
        }
    }

    throw "Unable to find the current PowerShell executable under $PSHOME"
}

function Invoke-LatestInstaller {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath,

        [switch]$DryRun
    )

    $installerPath = Join-Path $RepositoryPath 'install-codex-home-config.ps1'
    if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
        throw "Updated installer was not found: $installerPath"
    }

    $argumentList = [System.Collections.Generic.List[string]]::new()
    $argumentList.Add('-NoProfile')
    if ($env:OS -eq 'Windows_NT') {
        $argumentList.Add('-ExecutionPolicy')
        $argumentList.Add('Bypass')
    }

    $installerLiteral = "'" + $installerPath.Replace("'", "''") + "'"
    $targetLiteral = "'" + $TargetCodexPath.Replace("'", "''") + "'"
    $commandText = "& $installerLiteral -TargetCodexPath $targetLiteral -SkipRepositoryPull"
    if ($DryRun) {
        $commandText += ' -DryRun'
    }
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($commandText))
    $argumentList.Add('-EncodedCommand')
    $argumentList.Add($encodedCommand)

    Write-StageMessage "Repository updated; relaunching the latest installer from $installerPath"
    $powerShellExecutable = Get-PowerShellExecutablePath
    & $powerShellExecutable @($argumentList)
    if ($LASTEXITCODE -ne 0) {
        throw "Relaunched installer failed with exit code $LASTEXITCODE."
    }

    $runtimeState.RelaunchedInstaller = $true
}

function Invoke-LocalRepositoryPull {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath,

        [switch]$DryRun
    )

    $gitExecutable = Assert-GitEnvironment
    $statusOutput = & $gitExecutable -C $RepositoryPath status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed in $RepositoryPath"
    }

    if (-not [string]::IsNullOrWhiteSpace(($statusOutput | Out-String))) {
        throw "Repository '$RepositoryPath' has uncommitted changes. Commit or discard them before installing."
    }

    $branchName = (& $gitExecutable -C $RepositoryPath branch --show-current 2>$null | Out-String).Trim()
    if (($LASTEXITCODE -ne 0) -or [string]::IsNullOrWhiteSpace($branchName)) {
        throw "The current branch could not be determined in $RepositoryPath. Check out a branch before installing."
    }

    $prePullHead = Get-GitHeadCommit -RepositoryPath $RepositoryPath
    Write-StageMessage "Pulling latest changes for local branch '$branchName'..."
    & $gitExecutable -C $RepositoryPath pull --rebase origin $branchName
    if ($LASTEXITCODE -ne 0) {
        throw "git pull --rebase origin $branchName failed in $RepositoryPath. Resolve or abort any rebase conflict before retrying."
    }

    $postPullHead = Get-GitHeadCommit -RepositoryPath $RepositoryPath
    if ($prePullHead -ne $postPullHead) {
        Invoke-LatestInstaller -RepositoryPath $RepositoryPath -DryRun:$DryRun
        return
    }

    Write-StageMessage "Local branch '$branchName' is up to date."
}

function Invoke-GitHubApiRequest {
    param(
        [Parameter(Mandatory)]
        [string]$Uri
    )

    $maxAttempts = 3
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            return Invoke-RestMethod -Uri $Uri -Headers (Get-GitHubApiRequestHeader)
        }
        catch {
            if ($attempt -ge $maxAttempts) {
                $apiErrorMessage = Get-ApiErrorMessage -ErrorRecord $_
                throw "GitHub API request failed for $Uri. $apiErrorMessage"
            }

            Start-Sleep -Seconds 2
        }
    }
}

function Split-CommitMessage {
    param(
        [Parameter()]
        [AllowEmptyString()]
        [string]$Message
    )

    if ($null -eq $Message) {
        $Message = ''
    }

    $normalizedMessage = ($Message.Replace("`r`n", "`n").Replace("`r", "`n")).Trim()
    if ([string]::IsNullOrWhiteSpace($normalizedMessage)) {
        return [pscustomobject]@{
            Subject     = ''
            Description = ''
        }
    }

    $messageLines = @($normalizedMessage -split "`n")
    $subject = $messageLines[0].Trim()
    $description = ''
    if ($messageLines.Count -gt 1) {
        $description = (($messageLines | Select-Object -Skip 1) -join [Environment]::NewLine).Trim()
    }

    return [pscustomobject]@{
        Subject     = $subject
        Description = $description
    }
}

function Convert-CommitDateText {
    param(
        [Parameter()]
        [AllowEmptyString()]
        [string]$DateText
    )

    if ([string]::IsNullOrWhiteSpace($DateText)) {
        return ''
    }

    try {
        $parsedDate = [datetimeoffset]::Parse($DateText, [System.Globalization.CultureInfo]::InvariantCulture)
        return $parsedDate.ToString('yyyy-MM-dd HH:mm:ss zzz')
    }
    catch {
        return $DateText
    }
}

function Get-LocalInstallCommitInfo {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryPath
    )

    $sha = (& git -C $RepositoryPath rev-parse HEAD 2>$null | Out-String).Trim()
    if (($LASTEXITCODE -ne 0) -or [string]::IsNullOrWhiteSpace($sha)) {
        throw "git rev-parse HEAD failed in $RepositoryPath"
    }

    $message = (& git -C $RepositoryPath log -1 --format=%B 2>$null | Out-String).TrimEnd()
    if ($LASTEXITCODE -ne 0) {
        throw "git log failed in $RepositoryPath"
    }

    $committerName = (& git -C $RepositoryPath log -1 --format=%cn 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "git log committer lookup failed in $RepositoryPath"
    }

    $committerDate = (& git -C $RepositoryPath log -1 --format=%cI 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "git log commit date lookup failed in $RepositoryPath"
    }

    $messageParts = Split-CommitMessage -Message $message
    return [pscustomobject]@{
        Sha             = $sha
        ShortSha        = $sha.Substring(0, [Math]::Min(12, $sha.Length))
        Subject         = $messageParts.Subject
        Description     = $messageParts.Description
        CommitterName   = $committerName
        CommitDateText  = Convert-CommitDateText -DateText $committerDate
        HtmlUrl         = "https://github.com/$repoOwner/$repoName/commit/$sha"
        Source          = 'local repository branch'
        Branch          = (Get-GitBranchName -RepositoryPath $RepositoryPath)
    }
}

function Get-RemoteInstallCommitInfo {
    $commitResponse = Invoke-GitHubApiRequest -Uri $publishedCommitApiUri
    $messageParts = Split-CommitMessage -Message $commitResponse.commit.message
    $commitDate = $commitResponse.commit.committer.date
    if ([string]::IsNullOrWhiteSpace($commitDate)) {
        $commitDate = $commitResponse.commit.author.date
    }

    $committerName = $commitResponse.commit.committer.name
    if ([string]::IsNullOrWhiteSpace($committerName)) {
        $committerName = $commitResponse.commit.author.name
    }

    $sha = [string]$commitResponse.sha
    return [pscustomobject]@{
        Sha             = $sha
        ShortSha        = $sha.Substring(0, [Math]::Min(12, $sha.Length))
        Subject         = $messageParts.Subject
        Description     = $messageParts.Description
        CommitterName   = $committerName
        CommitDateText  = Convert-CommitDateText -DateText $commitDate
        HtmlUrl         = [string]$commitResponse.html_url
        Source          = 'remote published release branch'
        Branch          = $releaseBranch
    }
}

function Get-InstallCommitInfo {
    if ($null -ne $runtimeState.PublishedCommitInfo) {
        return $runtimeState.PublishedCommitInfo
    }

    $localRepositoryRoot = Get-LocalRepositoryRoot
    if (-not [string]::IsNullOrWhiteSpace($localRepositoryRoot)) {
        try {
            $runtimeState.PublishedCommitInfo = Get-LocalInstallCommitInfo -RepositoryPath $localRepositoryRoot
            return $runtimeState.PublishedCommitInfo
        }
        catch {
            Write-Warning "Failed to read local install commit info from $localRepositoryRoot. Falling back to the published '$releaseBranch' branch."
        }
    }

    $runtimeState.PublishedCommitInfo = Get-RemoteInstallCommitInfo
    return $runtimeState.PublishedCommitInfo
}

function Show-InstallCommitInfo {
    try {
        $commitInfo = Get-InstallCommitInfo
    }
    catch {
        Write-Warning "Failed to load install source commit info. Install will continue without commit metadata."
        return
    }

    Write-Output "Install source commit:"
    if (-not [string]::IsNullOrWhiteSpace($commitInfo.Branch)) {
        Write-Output "  Branch: $($commitInfo.Branch)"
    }

    Write-Output "  SHA: $($commitInfo.Sha)"
    Write-Output "  Short SHA: $($commitInfo.ShortSha)"
    if (-not [string]::IsNullOrWhiteSpace($commitInfo.Subject)) {
        Write-Output "  Subject: $($commitInfo.Subject)"
    }

    if (-not [string]::IsNullOrWhiteSpace($commitInfo.Description)) {
        Write-Output '  Description:'
        foreach ($line in @($commitInfo.Description -split "(`r`n|`n|`r)")) {
            if ([string]::IsNullOrWhiteSpace($line)) {
                continue
            }

            Write-Output "    $line"
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($commitInfo.CommitterName)) {
        Write-Output "  Committer: $($commitInfo.CommitterName)"
    }

    if (-not [string]::IsNullOrWhiteSpace($commitInfo.CommitDateText)) {
        Write-Output "  Committed at: $($commitInfo.CommitDateText)"
    }

    if (-not [string]::IsNullOrWhiteSpace($commitInfo.HtmlUrl)) {
        Write-Output "  URL: $($commitInfo.HtmlUrl)"
    }

    Write-Output "  Source: $($commitInfo.Source)"
}

function Get-RepositorySupportRoot {
    if (-not [string]::IsNullOrWhiteSpace($runtimeState.SupportRepositoryRoot)) {
        return $runtimeState.SupportRepositoryRoot
    }

    $localRepositoryRoot = Get-LocalRepositoryRoot
    if (-not [string]::IsNullOrWhiteSpace($localRepositoryRoot)) {
        $localBranch = Get-GitBranchName -RepositoryPath $localRepositoryRoot
        if ([string]::IsNullOrWhiteSpace($localBranch)) {
            Write-StageMessage 'Using local repository snapshot.'
        }
        else {
            Write-StageMessage "Using local repository snapshot from branch '$localBranch'."
        }

        $runtimeState.SupportRepositoryRoot = $localRepositoryRoot
        return $localRepositoryRoot
    }

    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-home-config-support-" + [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $tempRoot 'codex-home-config.zip'
    $extractPath = Join-Path $tempRoot 'extract'
    $null = New-Item -ItemType Directory -Path $tempRoot -Force

    try {
        Write-StageMessage "Downloading published '$releaseBranch' snapshot..."
        Invoke-ArchiveDownload -Uri $archiveUri -OutFile $archivePath
        Write-StageMessage "Extracting published '$releaseBranch' snapshot..."
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force

        $repositoryPath = Get-ExtractedRepositoryPath -ExtractPath $extractPath
        $toolPath = Join-Path $repositoryPath 'tools\config-toml-ops.cjs'
        if (-not (Test-Path -LiteralPath $toolPath -PathType Leaf)) {
            throw "Repository support file was not found: $toolPath"
        }

        $runtimeState.SupportRepositoryRoot = $repositoryPath
        $runtimeState.SupportTempRoot = $tempRoot
        Write-StageMessage 'Loaded repository support files.'
        return $repositoryPath
    }
    catch {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        throw
    }
}

function Get-ConfigTomlToolPath {
    $supportRoot = Get-RepositorySupportRoot
    $toolPath = Join-Path $supportRoot 'tools\config-toml-ops.cjs'
    if (-not (Test-Path -LiteralPath $toolPath -PathType Leaf)) {
        throw "Config TOML helper was not found: $toolPath"
    }

    return $toolPath
}

function Invoke-ConfigTomlTool {
    param(
        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter(Mandatory)]
        [hashtable]$Arguments
    )

    $nodeExecutable = Assert-NodeEnvironment
    $toolPath = Get-ConfigTomlToolPath
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

function Remove-RepositorySupportTempRoot {
    [CmdletBinding(SupportsShouldProcess)]
    param()

    if (-not [string]::IsNullOrWhiteSpace($runtimeState.SupportTempRoot) -and (Test-Path -LiteralPath $runtimeState.SupportTempRoot -PathType Container)) {
        if ($PSCmdlet.ShouldProcess($runtimeState.SupportTempRoot, 'Remove temporary repository support files')) {
            Remove-Item -LiteralPath $runtimeState.SupportTempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    $runtimeState.SupportRepositoryRoot = ''
    $runtimeState.SupportTempRoot = ''
}

function Invoke-ArchiveDownload {
    param(
        [Parameter(Mandatory)]
        [string]$Uri,

        [Parameter(Mandatory)]
        [string]$OutFile
    )

    $maxAttempts = 3
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            Invoke-WebRequest -Uri $Uri -Headers (Get-DownloadRequestHeader) -OutFile $OutFile | Out-Null
            return
        }
        catch {
            if ($attempt -ge $maxAttempts) {
                $apiErrorMessage = Get-ApiErrorMessage -ErrorRecord $_
                throw "Download request failed for $Uri. $apiErrorMessage"
            }

            Start-Sleep -Seconds 2
        }
    }
}

function Get-BackupRootPath {
    return Join-Path $TargetCodexPath 'sync_codex-home-config_backup'
}

function Get-BackupSessionPath {
    if ([string]::IsNullOrWhiteSpace($backupState.SessionPath)) {
        $backupRootPath = Get-BackupRootPath
        $backupState.SessionPath = Join-Path $backupRootPath $timestamp
        $null = New-Item -ItemType Directory -Path $backupState.SessionPath -Force
    }

    return $backupState.SessionPath
}

function Backup-ExistingPath {
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,

        [Parameter(Mandatory)]
        [string]$RelativeBackupPath,

        [switch]$Recurse
    )

    $backupPath = Join-Path (Get-BackupSessionPath) $RelativeBackupPath
    $backupParentPath = Split-Path -Parent $backupPath
    if (-not [string]::IsNullOrWhiteSpace($backupParentPath)) {
        $null = New-Item -ItemType Directory -Path $backupParentPath -Force
    }

    if ($Recurse) {
        Copy-Item -LiteralPath $SourcePath -Destination $backupPath -Recurse -Force
    }
    else {
        Copy-Item -LiteralPath $SourcePath -Destination $backupPath -Force
    }

    return $backupPath
}

function Backup-CurrentSnapshot {
    param(
        [Parameter(Mandatory)]
        [string[]]$SelectedComponents
    )

    $currentSnapshot = Get-SnapshotInfo -RootPath $TargetCodexPath -Name 'current'
    $componentSelection = Get-ComponentSelection -SelectedComponents $SelectedComponents

    foreach ($fileInfo in @(
            @{ Name = 'config.toml'; SourcePath = $currentSnapshot.ConfigPath; RelativeBackupPath = 'config.toml'; Component = 'Config' },
            @{ Name = 'AGENTS.md'; SourcePath = $currentSnapshot.AgentsPath; RelativeBackupPath = 'AGENTS.md'; Component = 'AgentFile' },
            @{ Name = 'models.local.json'; SourcePath = $currentSnapshot.ModelsLocalFilePath; RelativeBackupPath = 'models.local.json'; Component = 'ModelsLocalFile' }
        )) {
        if (-not $componentSelection[$fileInfo.Component]) {
            continue
        }

        if (Test-Path -LiteralPath $fileInfo.SourcePath -PathType Leaf) {
            $backupPath = Backup-ExistingPath -SourcePath $fileInfo.SourcePath -RelativeBackupPath $fileInfo.RelativeBackupPath
            Write-Output "Backed up $(Join-Path $TargetCodexPath $fileInfo.Name) to $backupPath"
        }
    }

    if ($componentSelection.AgentFolder -and (Test-Path -LiteralPath $currentSnapshot.AgentDirectoryPath -PathType Container)) {
        $backupAgentDirectoryPath = Backup-ExistingPath -SourcePath $currentSnapshot.AgentDirectoryPath -RelativeBackupPath 'agents' -Recurse
        Write-Output "Backed up $($currentSnapshot.AgentDirectoryPath) to $backupAgentDirectoryPath"
    }

    if ($componentSelection.Skill -and (Test-Path -LiteralPath $currentSnapshot.SkillDirectoryPath -PathType Container)) {
        $backupSkillDirectoryPath = Backup-ExistingPath -SourcePath $currentSnapshot.SkillDirectoryPath -RelativeBackupPath 'skills\jiangxiaoxu' -Recurse
        Write-Output "Backed up $($currentSnapshot.SkillDirectoryPath) to $backupSkillDirectoryPath"
    }
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

function Write-Utf8File {
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

    $parentPath = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($parentPath)) {
        $null = New-Item -ItemType Directory -Path $parentPath -Force
    }

    $utf8Encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8Encoding)
}

function ConvertTo-LfLineEnding {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $textExtensions = New-Object 'System.Collections.Generic.HashSet[string]' -ArgumentList @(
        [string[]]@(
            '.cfg', '.cjs', '.conf', '.cs', '.css', '.fs', '.fsx', '.go', '.htm', '.html',
            '.ini', '.java', '.js', '.json', '.jsx', '.kt', '.kts', '.md', '.mjs', '.properties',
            '.ps1', '.psd1', '.psm1', '.py', '.rs', '.scss', '.sh', '.sql', '.toml', '.ts',
            '.tsx', '.txt', '.xml', '.yaml', '.yml'
        ),
        [System.StringComparer]::OrdinalIgnoreCase
    )

    if (Test-Path -LiteralPath $Path -PathType Container) {
        $files = @(Get-ChildItem -LiteralPath $Path -File -Recurse -Force)
    }
    elseif (Test-Path -LiteralPath $Path -PathType Leaf) {
        $files = @((Get-Item -LiteralPath $Path -Force))
    }
    else {
        throw "Path to normalize was not found: $Path"
    }

    foreach ($file in $files) {
        if (-not $textExtensions.Contains($file.Extension)) {
            continue
        }

        $content = [System.IO.File]::ReadAllBytes($file.FullName)
        if (($content.Length -lt 2) -or $content.Contains([byte]0)) {
            continue
        }

        try {
            $strictUtf8 = New-Object System.Text.UTF8Encoding -ArgumentList $false, $true
            [void]$strictUtf8.GetString($content)
        }
        catch [System.Text.DecoderFallbackException] {
            continue
        }

        $normalized = New-Object System.IO.MemoryStream -ArgumentList $content.Length
        try {
            $changed = $false
            for ($index = 0; $index -lt $content.Length; $index++) {
                if ($content[$index] -eq 13) {
                    $changed = $true
                    if (($index + 1 -lt $content.Length) -and ($content[$index + 1] -eq 10)) {
                        continue
                    }

                    $normalized.WriteByte(10)
                    continue
                }

                $normalized.WriteByte($content[$index])
            }

            if ($changed) {
                [System.IO.File]::WriteAllBytes($file.FullName, $normalized.ToArray())
            }
        }
        finally {
            $normalized.Dispose()
        }
    }
}

function Install-ConfigFile {
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,

        [Parameter(Mandatory)]
        [string]$DestinationPath
    )

    if (Test-Path -LiteralPath $DestinationPath -PathType Container) {
        throw "Expected file path but found a directory: $DestinationPath"
    }

    Invoke-ConfigTomlTool -Command 'merge-install' -Arguments @{
        source = $SourcePath
        target = $DestinationPath
        output = $DestinationPath
    }
}

function Get-ExtractedRepositoryPath {
    param(
        [Parameter(Mandatory)]
        [string]$ExtractPath
    )

    $directories = @(Get-ChildItem -LiteralPath $ExtractPath -Directory)
    if ($directories.Count -ne 1) {
        throw "Expected exactly one extracted repository directory under '$ExtractPath'."
    }

    return $directories[0].FullName
}

function Get-SnapshotInfo {
    param(
        [Parameter(Mandatory)]
        [string]$RootPath,

        [Parameter(Mandatory)]
        [string]$Name
    )

    return [pscustomobject]@{
        Name               = $Name
        RootPath           = $RootPath
        ConfigPath         = (Join-Path $RootPath 'config.toml')
        AgentsPath         = (Join-Path $RootPath 'AGENTS.md')
        AgentDirectoryPath = (Join-Path $RootPath 'agents')
        ModelsLocalFilePath = (Join-Path $RootPath 'models.local.json')
        SkillDirectoryPath = (Join-Path $RootPath 'skills\jiangxiaoxu')
    }
}

function Test-SnapshotInfo {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$SnapshotInfo,

        [Parameter()]
        [string[]]$SelectedComponents = @('Config', 'AgentFile', 'AgentFolder', 'ModelsLocalFile', 'Skill')
    )

    $missingItems = [System.Collections.Generic.List[string]]::new()
    $componentSelection = Get-ComponentSelection -SelectedComponents $SelectedComponents

    if ($componentSelection.Config -and -not (Test-Path -LiteralPath $SnapshotInfo.ConfigPath -PathType Leaf)) {
        $missingItems.Add('config.toml')
    }

    if ($componentSelection.AgentFile -and -not (Test-Path -LiteralPath $SnapshotInfo.AgentsPath -PathType Leaf)) {
        $missingItems.Add('AGENTS.md')
    }

    if ($componentSelection.AgentFolder -and -not (Test-Path -LiteralPath $SnapshotInfo.AgentDirectoryPath -PathType Container)) {
        $missingItems.Add('agents')
    }

    return [pscustomobject]@{
        SnapshotInfo = $SnapshotInfo
        IsValid      = ($missingItems.Count -eq 0)
        MissingItems = @($missingItems)
    }
}

function Assert-SnapshotInfo {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$SnapshotInfo,

        [Parameter(Mandatory)]
        [string]$SnapshotLabel,

        [Parameter()]
        [string[]]$SelectedComponents = @('Config', 'AgentFile', 'AgentFolder', 'ModelsLocalFile', 'Skill')
    )

    $validationResult = Test-SnapshotInfo -SnapshotInfo $SnapshotInfo -SelectedComponents $SelectedComponents
    if (-not $validationResult.IsValid) {
        $missingText = $validationResult.MissingItems -join ', '
        throw "$SnapshotLabel is incomplete. Missing: $missingText"
    }
}

function Get-BackupVersionDirectory {
    $backupRootPath = Get-BackupRootPath
    if (-not (Test-Path -LiteralPath $backupRootPath -PathType Container)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $backupRootPath -Directory | Where-Object {
            $_.Name -match '^\d{8}_\d{6}$'
        } | Sort-Object Name -Descending)
}

function Install-Snapshot {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$SnapshotInfo,

        [Parameter()]
        [string[]]$SelectedComponents = @('Config', 'AgentFile', 'AgentFolder', 'ModelsLocalFile', 'Skill'),

        [switch]$CreateBackup
    )

    $null = New-Item -ItemType Directory -Path $TargetCodexPath -Force
    $effectiveSelectedComponents = @(
        $SelectedComponents | Where-Object {
            $_ -ne 'ModelsLocalFile' -or (Test-Path -LiteralPath $SnapshotInfo.ModelsLocalFilePath -PathType Leaf)
        }
    )
    $componentSelection = Get-ComponentSelection -SelectedComponents $effectiveSelectedComponents

    if ($CreateBackup -and $effectiveSelectedComponents.Count -gt 0) {
        Backup-CurrentSnapshot -SelectedComponents $effectiveSelectedComponents
    }

    foreach ($fileInfo in @(
            @{ Name = 'config.toml'; SourcePath = $SnapshotInfo.ConfigPath; Component = 'Config' },
            @{ Name = 'AGENTS.md'; SourcePath = $SnapshotInfo.AgentsPath; Component = 'AgentFile' },
            @{ Name = 'models.local.json'; SourcePath = $SnapshotInfo.ModelsLocalFilePath; Component = 'ModelsLocalFile' }
        )) {
        if (-not $componentSelection[$fileInfo.Component]) {
            continue
        }

        if ($fileInfo.Component -eq 'ModelsLocalFile' -and -not (Test-Path -LiteralPath $fileInfo.SourcePath -PathType Leaf)) {
            continue
        }

        $destinationPath = Join-Path $TargetCodexPath $fileInfo.Name
        if (Test-Path -LiteralPath $destinationPath -PathType Container) {
            throw "Expected file path but found a directory: $destinationPath"
        }

        Write-StageMessage "Installing $($fileInfo.Name)..."
        if ($fileInfo.Component -eq 'Config') {
            Install-ConfigFile -SourcePath $fileInfo.SourcePath -DestinationPath $destinationPath
        }
        elseif ($fileInfo.Component -eq 'ModelsLocalFile') {
            Copy-Item -LiteralPath $fileInfo.SourcePath -Destination $destinationPath -Force
        }
        else {
            Copy-Item -LiteralPath $fileInfo.SourcePath -Destination $destinationPath -Force
            ConvertTo-LfLineEnding -Path $destinationPath
        }

        if (-not $DryRun) {
            Write-Output "Installed $($fileInfo.Name) to $destinationPath"
        }
    }

    if ($componentSelection.AgentFolder) {
        $targetAgentDirectoryPath = Join-Path $TargetCodexPath 'agents'
        if (Test-Path -LiteralPath $targetAgentDirectoryPath -PathType Leaf) {
            throw "Expected directory path but found a file: $targetAgentDirectoryPath"
        }

        if (Test-Path -LiteralPath $targetAgentDirectoryPath -PathType Container) {
            Remove-Item -LiteralPath $targetAgentDirectoryPath -Recurse -Force
        }

        Write-StageMessage 'Installing agents...'
        Copy-Item -LiteralPath $SnapshotInfo.AgentDirectoryPath -Destination $TargetCodexPath -Recurse -Force
        ConvertTo-LfLineEnding -Path $targetAgentDirectoryPath
        if (-not $DryRun) {
            Write-Output "Installed agents to $targetAgentDirectoryPath"
        }
    }

    if ($componentSelection.Skill) {
        $targetSkillDirectoryPath = Join-Path $TargetCodexPath 'skills\jiangxiaoxu'
        Sync-SkillDirectory -SourcePath $SnapshotInfo.SkillDirectoryPath -DestinationPath $targetSkillDirectoryPath
        if (Test-Path -LiteralPath $targetSkillDirectoryPath -PathType Container) {
            ConvertTo-LfLineEnding -Path $targetSkillDirectoryPath
        }
    }
}

function Sync-SkillDirectory {
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

        Write-StageMessage 'Installing skill...'
        $destinationParentPath = Split-Path -Path $DestinationPath -Parent
        $null = New-Item -ItemType Directory -Path $destinationParentPath -Force
        Copy-Item -LiteralPath $SourcePath -Destination $destinationParentPath -Recurse -Force
        if (-not $DryRun) {
            Write-Output "Installed skill to $DestinationPath"
        }
        return
    }

    if (Test-Path -LiteralPath $DestinationPath -PathType Container) {
        Write-StageMessage 'Removing skill...'
        if (-not $PSCmdlet.ShouldProcess($DestinationPath, 'Remove skill directory')) {
            return
        }

        Remove-Item -LiteralPath $DestinationPath -Recurse -Force
        if (-not $DryRun) {
            Write-Output "Removed skill at $DestinationPath"
        }

        $destinationParentPath = Split-Path -Path $DestinationPath -Parent
        if (-not (Test-Path -LiteralPath $destinationParentPath -PathType Container)) {
            return
        }

        $remainingEntries = @(Get-ChildItem -LiteralPath $destinationParentPath -Force)
        if (($remainingEntries.Count -eq 0) -and $PSCmdlet.ShouldProcess($destinationParentPath, 'Remove empty skills directory')) {
            Remove-Item -LiteralPath $destinationParentPath -Force
            if (-not $DryRun) {
                Write-Output "Removed empty skills directory at $destinationParentPath"
            }
        }
    }
}

function Move-DirectoryToRecycleBin {
    param(
        [Parameter(Mandatory)]
        [string]$DirectoryPath
    )

    Add-Type -AssemblyName Microsoft.VisualBasic
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(
        $DirectoryPath,
        [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
        [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin
    )
}

function Remove-OldBackupVersion {
    [CmdletBinding(SupportsShouldProcess)]
    param()

    $backupDirectories = @(Get-BackupVersionDirectory)
    if ($backupDirectories.Count -le $maxBackupVersions) {
        return
    }

    $directoriesToRemove = @($backupDirectories | Sort-Object Name | Select-Object -First ($backupDirectories.Count - $maxBackupVersions))
    foreach ($directory in $directoriesToRemove) {
        if ($PSCmdlet.ShouldProcess($directory.FullName, 'Remove old backup version')) {
            try {
                Move-DirectoryToRecycleBin -DirectoryPath $directory.FullName
                Write-Output "Moved old backup version to Recycle Bin: $($directory.FullName)"
            }
            catch {
                Write-Warning "Failed to move old backup version to Recycle Bin: $($directory.FullName). Falling back to permanent deletion."
                Remove-Item -LiteralPath $directory.FullName -Recurse -Force
                Write-Output "Deleted old backup version: $($directory.FullName)"
            }
        }
    }
}

function Copy-DryRunManagedTargetContents {
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,

        [Parameter(Mandatory)]
        [string]$DestinationPath
    )

    $null = New-Item -ItemType Directory -Path $DestinationPath -Force
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Container)) {
        return
    }

    foreach ($relativePath in @(
            'config.toml',
            'AGENTS.md',
            'models.local.json',
            'agents',
            'skills\jiangxiaoxu'
        )) {
        $sourceItemPath = Join-Path $SourcePath $relativePath
        if (-not (Test-Path -LiteralPath $sourceItemPath)) {
            continue
        }

        $destinationItemPath = Join-Path $DestinationPath $relativePath
        $destinationParentPath = Split-Path -Path $destinationItemPath -Parent
        $null = New-Item -ItemType Directory -Path $destinationParentPath -Force
        Copy-Item -LiteralPath $sourceItemPath -Destination $destinationItemPath -Recurse -Force
    }
}

function Get-DryRunRelativePath {
    param(
        [Parameter(Mandatory)]
        [string]$RootPath,

        [Parameter(Mandatory)]
        [string]$ItemPath
    )

    $rootFullPath = [System.IO.Path]::GetFullPath($RootPath).TrimEnd([char[]]@('\', '/'))
    $itemFullPath = [System.IO.Path]::GetFullPath($ItemPath)
    $relativePath = $itemFullPath.Substring($rootFullPath.Length).TrimStart([char[]]@('\', '/'))
    return $relativePath.Replace('\', '/')
}

function Add-DryRunTreeEntries {
    param(
        [Parameter(Mandatory)]
        [string]$RootPath,

        [Parameter(Mandatory)]
        [hashtable]$Entries
    )

    if (-not (Test-Path -LiteralPath $RootPath -PathType Container)) {
        return
    }

    foreach ($item in @(Get-ChildItem -LiteralPath $RootPath -Force -Recurse)) {
        $relativePath = Get-DryRunRelativePath -RootPath $RootPath -ItemPath $item.FullName
        $Entries[$relativePath] = $item
    }
}

function Test-DryRunFileContentEqual {
    param(
        [Parameter(Mandatory)]
        [string]$BeforePath,

        [Parameter(Mandatory)]
        [string]$AfterPath
    )

    $beforeFile = Get-Item -LiteralPath $BeforePath -Force
    $afterFile = Get-Item -LiteralPath $AfterPath -Force
    if ($beforeFile.Length -ne $afterFile.Length) {
        return $false
    }

    $beforeBytes = [System.IO.File]::ReadAllBytes($BeforePath)
    $afterBytes = [System.IO.File]::ReadAllBytes($AfterPath)
    for ($index = 0; $index -lt $beforeBytes.Length; $index++) {
        if ($beforeBytes[$index] -ne $afterBytes[$index]) {
            return $false
        }
    }

    return $true
}

function Get-DryRunTextFileContent {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $content = [System.IO.File]::ReadAllBytes($Path)
    if ($content.Contains([byte]0)) {
        return [pscustomobject]@{
            IsText = $false
            Lines  = @()
        }
    }

    try {
        $strictUtf8 = New-Object System.Text.UTF8Encoding -ArgumentList $false, $true
        $text = $strictUtf8.GetString($content)
    }
    catch [System.Text.DecoderFallbackException] {
        return [pscustomobject]@{
            IsText = $false
            Lines  = @()
        }
    }

    return [pscustomobject]@{
        IsText = $true
        Lines  = @([regex]::Split($text, "`r`n|`n|`r"))
    }
}

function Write-DryRunFallbackFileDiff {
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath,

        [string]$BeforePath,

        [string]$AfterPath
    )

    $beforeText = if ([string]::IsNullOrWhiteSpace($BeforePath)) { $null } else { Get-DryRunTextFileContent -Path $BeforePath }
    $afterText = if ([string]::IsNullOrWhiteSpace($AfterPath)) { $null } else { Get-DryRunTextFileContent -Path $AfterPath }
    if (($null -ne $beforeText -and -not $beforeText.IsText) -or ($null -ne $afterText -and -not $afterText.IsText)) {
        Write-Output "Binary files differ: $RelativePath"
        return
    }

    Write-Output "--- target/$RelativePath"
    Write-Output "+++ would-install/$RelativePath"
    if ($null -eq $beforeText) {
        foreach ($line in $afterText.Lines) {
            Write-Output "+ $line"
        }

        return
    }

    if ($null -eq $afterText) {
        foreach ($line in $beforeText.Lines) {
            Write-Output "- $line"
        }

        return
    }

    foreach ($difference in @(Compare-Object -ReferenceObject $beforeText.Lines -DifferenceObject $afterText.Lines)) {
        if ($difference.SideIndicator -eq '<=') {
            Write-Output "- $($difference.InputObject)"
        }
        else {
            Write-Output "+ $($difference.InputObject)"
        }
    }
}

function Write-DryRunFallbackDiff {
    param(
        [Parameter(Mandatory)]
        [string]$BeforePath,

        [Parameter(Mandatory)]
        [string]$AfterPath
    )

    $beforeEntries = @{}
    $afterEntries = @{}
    Add-DryRunTreeEntries -RootPath $BeforePath -Entries $beforeEntries
    Add-DryRunTreeEntries -RootPath $AfterPath -Entries $afterEntries
    $allPaths = @($beforeEntries.Keys + $afterEntries.Keys | Sort-Object -Unique)
    $hasDifferences = $false

    foreach ($relativePath in $allPaths) {
        $hasBefore = $beforeEntries.ContainsKey($relativePath)
        $hasAfter = $afterEntries.ContainsKey($relativePath)
        if (-not $hasBefore) {
            $hasDifferences = $true
            if ($afterEntries[$relativePath].PSIsContainer) {
                Write-Output "Added directory: $relativePath"
            }
            else {
                Write-DryRunFallbackFileDiff -RelativePath $relativePath -AfterPath $afterEntries[$relativePath].FullName
            }

            continue
        }

        if (-not $hasAfter) {
            $hasDifferences = $true
            if ($beforeEntries[$relativePath].PSIsContainer) {
                Write-Output "Removed directory: $relativePath"
            }
            else {
                Write-DryRunFallbackFileDiff -RelativePath $relativePath -BeforePath $beforeEntries[$relativePath].FullName
            }

            continue
        }

        if ($beforeEntries[$relativePath].PSIsContainer -ne $afterEntries[$relativePath].PSIsContainer) {
            $hasDifferences = $true
            Write-Output "Changed entry type: $relativePath"
            continue
        }

        if ($beforeEntries[$relativePath].PSIsContainer -or (Test-DryRunFileContentEqual -BeforePath $beforeEntries[$relativePath].FullName -AfterPath $afterEntries[$relativePath].FullName)) {
            continue
        }

        $hasDifferences = $true
        Write-DryRunFallbackFileDiff -RelativePath $relativePath -BeforePath $beforeEntries[$relativePath].FullName -AfterPath $afterEntries[$relativePath].FullName
    }

    if (-not $hasDifferences) {
        Write-Output 'No differences would be applied.'
    }
}

function Write-DryRunDiff {
    param(
        [Parameter(Mandatory)]
        [string]$BeforePath,

        [Parameter(Mandatory)]
        [string]$AfterPath
    )

    $gitExecutable = Get-GitExecutable
    if (-not [string]::IsNullOrWhiteSpace($gitExecutable)) {
        $beforeParentPath = Split-Path -Parent $BeforePath
        $afterParentPath = Split-Path -Parent $AfterPath
        if ($beforeParentPath.Equals($afterParentPath, [System.StringComparison]::OrdinalIgnoreCase)) {
            $gitDiffArguments = @(
                '-C',
                $beforeParentPath,
                'diff',
                '--no-index',
                '--no-ext-diff',
                '--no-prefix',
                '--unified=0',
                '--',
                (Split-Path -Leaf $BeforePath),
                (Split-Path -Leaf $AfterPath)
            )
        }
        else {
            $gitDiffArguments = @(
                'diff',
                '--no-index',
                '--no-ext-diff',
                '--no-prefix',
                '--unified=0',
                '--',
                $BeforePath,
                $AfterPath
            )
        }

        $diffOutput = @(& $gitExecutable @gitDiffArguments 2>&1)
        $diffExitCode = $LASTEXITCODE
        if ($diffExitCode -eq 0) {
            Write-Output 'No differences would be applied.'
            return
        }

        if ($diffExitCode -eq 1) {
            Write-Output $diffOutput
            return
        }

        Write-Warning "git diff --no-index failed with exit code $diffExitCode. Falling back to a PowerShell diff."
    }
    else {
        Write-StageMessage 'Git is unavailable; using the PowerShell dry-run diff fallback.'
    }

    Write-DryRunFallbackDiff -BeforePath $BeforePath -AfterPath $AfterPath
}

function Normalize-DryRunConfigFile {
    param(
        [Parameter(Mandatory)]
        [string]$ConfigPath,

        [Parameter(Mandatory)]
        [string]$NormalizedPath
    )

    if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
        return
    }

    Invoke-ConfigTomlTool -Command 'merge-install' -Arguments @{
        source = $ConfigPath
        target = $ConfigPath
        output = $NormalizedPath
    }
    Copy-Item -LiteralPath $NormalizedPath -Destination $ConfigPath -Force
}

function Invoke-DryRunInstallation {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$SnapshotInfo,

        [Parameter(Mandatory)]
        [string[]]$SelectedComponents
    )

    $originalTargetCodexPath = $script:TargetCodexPath
    $dryRunTempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-home-config-dry-run-" + [guid]::NewGuid().ToString('N'))
    $beforePath = Join-Path $dryRunTempRoot 'target'
    $baselinePath = Join-Path $dryRunTempRoot 'would-install'
    $normalizedBeforeConfigPath = Join-Path $dryRunTempRoot 'normalized-target-config.toml'
    $normalizedBaselineConfigPath = Join-Path $dryRunTempRoot 'normalized-would-install-config.toml'

    try {
        Copy-DryRunManagedTargetContents -SourcePath $originalTargetCodexPath -DestinationPath $beforePath
        Copy-DryRunManagedTargetContents -SourcePath $beforePath -DestinationPath $baselinePath
        $script:TargetCodexPath = $baselinePath
        Install-Snapshot -SnapshotInfo $SnapshotInfo -SelectedComponents $SelectedComponents
        Write-StageMessage 'Normalizing temporary config.toml files before comparing the dry-run result.'
        Normalize-DryRunConfigFile -ConfigPath (Join-Path $beforePath 'config.toml') -NormalizedPath $normalizedBeforeConfigPath
        Normalize-DryRunConfigFile -ConfigPath (Join-Path $baselinePath 'config.toml') -NormalizedPath $normalizedBaselineConfigPath
        Write-DryRunDiff -BeforePath $beforePath -AfterPath $baselinePath
    }
    finally {
        $script:TargetCodexPath = $originalTargetCodexPath
        if (Test-Path -LiteralPath $dryRunTempRoot -PathType Container) {
            Remove-Item -LiteralPath $dryRunTempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-UpdateAction {
    param(
        [switch]$DryRun
    )

    $defaultComponents = @('Config', 'AgentFile', 'AgentFolder', 'ModelsLocalFile', 'Skill')
    if (-not $DryRun) {
        Show-InstallCommitInfo
    }
    Write-StageMessage 'Preparing repository snapshot...'
    $repositoryPath = Get-RepositorySupportRoot
    $managedPath = Join-Path $repositoryPath 'managed'
    $snapshotInfo = Get-SnapshotInfo -RootPath $managedPath -Name 'repository'
    Assert-SnapshotInfo -SnapshotInfo $snapshotInfo -SnapshotLabel 'Repository snapshot' -SelectedComponents $defaultComponents
    if ($DryRun) {
        Write-StageMessage 'Dry run enabled; simulating the default installation in a temporary directory.'
        Invoke-DryRunInstallation -SnapshotInfo $snapshotInfo -SelectedComponents $defaultComponents
        return
    }

    Write-StageMessage 'Installing default components...'
    Install-Snapshot -SnapshotInfo $snapshotInfo -SelectedComponents $defaultComponents -CreateBackup
    Remove-OldBackupVersion
}

try {
    if (Test-Path -LiteralPath $TargetCodexPath -PathType Leaf) {
        throw "Target path '$TargetCodexPath' points to a file."
    }

    $localRepositoryRoot = Get-LocalRepositoryRoot
    if ($DryRun -and -not [string]::IsNullOrWhiteSpace($localRepositoryRoot)) {
        Write-StageMessage 'Dry run enabled; skipping local repository pull to avoid changing repository state.'
    }
    elseif (-not $SkipRepositoryPull -and -not [string]::IsNullOrWhiteSpace($localRepositoryRoot)) {
        Invoke-LocalRepositoryPull -RepositoryPath $localRepositoryRoot -DryRun:$DryRun
        if ($runtimeState.RelaunchedInstaller) {
            return
        }
    }

    $null = Assert-NodeEnvironment
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

    try {
        Invoke-UpdateAction -DryRun:$DryRun
    }
    finally {
        Remove-RepositorySupportTempRoot
    }
}
catch {
    Write-Error "[codex-home-config] $(Get-ErrorDisplayMessage -ErrorRecord $_)"
    Wait-OnFatalError
    exit 1
}
