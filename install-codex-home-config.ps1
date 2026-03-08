[CmdletBinding()]
param(
    [Parameter()]
    [string]$TargetCodexPath = (Join-Path $HOME '.codex'),

    [Parameter()]
    [ValidateSet('Prompt', 'Update', 'Restore')]
    [string]$Action = 'Prompt'
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

if ($PSVersionTable.PSVersion.Major -lt 7) {
    $pwshExecutable = Get-PowerShell7Executable
    if ([string]::IsNullOrWhiteSpace($pwshExecutable)) {
        throw 'PowerShell 7 or later is required. pwsh.exe was not found.'
    }

    $restartArguments = @('-NoProfile', '-File', $PSCommandPath, '-TargetCodexPath', $TargetCodexPath, '-Action', $Action)
    if ($env:OS -eq 'Windows_NT') {
        $restartArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-TargetCodexPath', $TargetCodexPath, '-Action', $Action)
    }

    & $pwshExecutable @restartArguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    return
}

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoOwner = 'jiangxiaoxu'
$repoName = 'codex-home-config'
$branch = 'main'
$archiveUri = "https://codeload.github.com/$repoOwner/$repoName/zip/refs/heads/$branch"
$userAgent = 'codex-home-config-installer'
$maxBackupVersions = 5

function Get-DownloadRequestHeader {
    return @{
        Accept       = 'application/octet-stream'
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
    if ([string]::IsNullOrWhiteSpace($script:backupSessionPath)) {
        $backupRootPath = Get-BackupRootPath
        $script:backupSessionPath = Join-Path $backupRootPath $timestamp
        $null = New-Item -ItemType Directory -Path $script:backupSessionPath -Force
    }

    return $script:backupSessionPath
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
        Name       = $Name
        RootPath    = $RootPath
        ConfigPath  = (Join-Path $RootPath 'config.toml')
        AgentsPath  = (Join-Path $RootPath 'AGENTS.md')
        SkillPath   = (Join-Path $RootPath 'skills\jiangxiaoxu')
    }
}

function Test-SnapshotInfo {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$SnapshotInfo
    )

    $missingItems = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path -LiteralPath $SnapshotInfo.ConfigPath -PathType Leaf)) {
        $missingItems.Add('config.toml')
    }

    if (-not (Test-Path -LiteralPath $SnapshotInfo.AgentsPath -PathType Leaf)) {
        $missingItems.Add('AGENTS.md')
    }

    if (-not (Test-Path -LiteralPath $SnapshotInfo.SkillPath -PathType Container)) {
        $missingItems.Add('skills\jiangxiaoxu')
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
        [string]$SnapshotLabel
    )

    $validationResult = Test-SnapshotInfo -SnapshotInfo $SnapshotInfo
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

function Show-MenuSection {
    param(
        [Parameter(Mandatory)]
        [string[]]$Lines
    )

    Write-Information '' -InformationAction Continue
    foreach ($line in $Lines) {
        Write-Information $line -InformationAction Continue
    }
}

function Select-MainAction {
    while ($true) {
        Show-MenuSection -Lines @(
            'Select an action:',
            '1. Update config',
            '2. Restore config',
            'Q. Quit'
        )

        $choice = (Read-Host 'Enter choice').Trim()
        switch -Regex ($choice) {
            '^(1|update|u)$' { return 'Update' }
            '^(2|restore|r)$' { return 'Restore' }
            '^(q|quit|exit)$' { return 'Quit' }
            default { Write-Warning "Unsupported choice: $choice" }
        }
    }
}

function Select-BackupSnapshot {
    $backupDirectories = @(Get-BackupVersionDirectory)
    if ($backupDirectories.Count -eq 0) {
        Write-Warning "No backup versions were found under '$(Get-BackupRootPath)'."
        return $null
    }

    Show-MenuSection -Lines @('Available backup versions:')
    for ($index = 0; $index -lt $backupDirectories.Count; $index++) {
        $snapshotInfo = Get-SnapshotInfo -RootPath $backupDirectories[$index].FullName -Name $backupDirectories[$index].Name
        $validationResult = Test-SnapshotInfo -SnapshotInfo $snapshotInfo
        $statusSuffix = ''
        if (-not $validationResult.IsValid) {
            $statusSuffix = " [invalid: missing $($validationResult.MissingItems -join ', ')]"
        }

        Write-Information ('{0}. {1}{2}' -f ($index + 1), $backupDirectories[$index].Name, $statusSuffix) -InformationAction Continue
    }
    Write-Information 'Q. Quit' -InformationAction Continue

    while ($true) {
        $choice = (Read-Host 'Choose a backup version').Trim()
        if ($choice -match '^(q|quit|exit)$') {
            return $null
        }

        $selectedNumber = 0
        if (-not [int]::TryParse($choice, [ref]$selectedNumber)) {
            Write-Warning "Unsupported choice: $choice"
            continue
        }

        if ($selectedNumber -lt 1 -or $selectedNumber -gt $backupDirectories.Count) {
            Write-Warning "Choice must be between 1 and $($backupDirectories.Count)."
            continue
        }

        $selectedDirectory = $backupDirectories[$selectedNumber - 1]
        return Get-SnapshotInfo -RootPath $selectedDirectory.FullName -Name $selectedDirectory.Name
    }
}

function Install-Snapshot {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$SnapshotInfo,

        [switch]$CreateBackup
    )

    $null = New-Item -ItemType Directory -Path $TargetCodexPath -Force

    foreach ($fileInfo in @(
            @{ Name = 'config.toml'; SourcePath = $SnapshotInfo.ConfigPath },
            @{ Name = 'AGENTS.md'; SourcePath = $SnapshotInfo.AgentsPath }
        )) {
        $destinationPath = Join-Path $TargetCodexPath $fileInfo.Name
        if (Test-Path -LiteralPath $destinationPath -PathType Container) {
            throw "Expected file path but found a directory: $destinationPath"
        }

        if ($CreateBackup -and (Test-Path -LiteralPath $destinationPath -PathType Leaf)) {
            $backupPath = Backup-ExistingPath -SourcePath $destinationPath -RelativeBackupPath $fileInfo.Name
            Write-Output "Backed up $destinationPath to $backupPath"
        }

        Copy-Item -LiteralPath $fileInfo.SourcePath -Destination $destinationPath -Force
        Write-Output "Installed $($fileInfo.Name) to $destinationPath"
    }

    $targetSkillsParentPath = Join-Path $TargetCodexPath 'skills'
    $targetSkillPath = Join-Path $targetSkillsParentPath 'jiangxiaoxu'
    if (Test-Path -LiteralPath $targetSkillPath -PathType Leaf) {
        throw "Expected directory path but found a file: $targetSkillPath"
    }

    $null = New-Item -ItemType Directory -Path $targetSkillsParentPath -Force
    if (Test-Path -LiteralPath $targetSkillPath -PathType Container) {
        if ($CreateBackup) {
            $backupSkillPath = Backup-ExistingPath -SourcePath $targetSkillPath -RelativeBackupPath 'skills\jiangxiaoxu' -Recurse
            Write-Output "Backed up $targetSkillPath to $backupSkillPath"
        }

        Remove-Item -LiteralPath $targetSkillPath -Recurse -Force
    }

    Copy-Item -LiteralPath $SnapshotInfo.SkillPath -Destination $targetSkillsParentPath -Recurse -Force
    Write-Output "Installed skills to $targetSkillPath"
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

function Invoke-UpdateAction {
    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-home-config-" + [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $tempRoot 'codex-home-config.zip'
    $extractPath = Join-Path $tempRoot 'extract'
    $null = New-Item -ItemType Directory -Path $tempRoot -Force

    try {
        Invoke-ArchiveDownload -Uri $archiveUri -OutFile $archivePath
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force

        $repositoryPath = Get-ExtractedRepositoryPath -ExtractPath $extractPath
        $managedPath = Join-Path $repositoryPath 'managed'
        $snapshotInfo = Get-SnapshotInfo -RootPath $managedPath -Name 'repository'
        Assert-SnapshotInfo -SnapshotInfo $snapshotInfo -SnapshotLabel 'Repository snapshot'
        Install-Snapshot -SnapshotInfo $snapshotInfo -CreateBackup
        Remove-OldBackupVersion
    }
    finally {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-RestoreAction {
    $snapshotInfo = Select-BackupSnapshot
    if ($null -eq $snapshotInfo) {
        Write-Output 'Restore cancelled.'
        return
    }

    Assert-SnapshotInfo -SnapshotInfo $snapshotInfo -SnapshotLabel "Backup version '$($snapshotInfo.Name)'"
    Install-Snapshot -SnapshotInfo $snapshotInfo
    Write-Output "Restored backup version: $($snapshotInfo.Name)"
}

if (Test-Path -LiteralPath $TargetCodexPath -PathType Leaf) {
    throw "Target path '$TargetCodexPath' points to a file."
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupSessionPath = ''

$selectedAction = $Action
if ($selectedAction -eq 'Prompt') {
    $selectedAction = Select-MainAction
}

switch ($selectedAction) {
    'Update' { Invoke-UpdateAction }
    'Restore' { Invoke-RestoreAction }
    'Quit' { Write-Output 'Operation cancelled.' }
    default { throw "Unexpected action selection: $selectedAction" }
}
