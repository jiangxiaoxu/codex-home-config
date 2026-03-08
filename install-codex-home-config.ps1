[CmdletBinding()]
param(
    [Parameter()]
    [string]$TargetCodexPath = (Join-Path $HOME '.codex')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoOwner = 'jiangxiaoxu'
$repoName = 'codex-home-config'
$branch = 'main'
$archiveUri = "https://codeload.github.com/$repoOwner/$repoName/zip/refs/heads/$branch"
$userAgent = 'codex-home-config-installer'

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

function Get-BackupSessionPath {
    if ([string]::IsNullOrWhiteSpace($script:backupSessionPath)) {
        $backupRootPath = Join-Path $TargetCodexPath 'sync_codex-home-config_backup'
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

if (Test-Path -LiteralPath $TargetCodexPath -PathType Leaf) {
    throw "Target path '$TargetCodexPath' points to a file."
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-home-config-" + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $tempRoot 'codex-home-config.zip'
$extractPath = Join-Path $tempRoot 'extract'
$backupSessionPath = ''
$null = New-Item -ItemType Directory -Path $tempRoot -Force

try {
    Invoke-ArchiveDownload -Uri $archiveUri -OutFile $archivePath
    Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force

    $repositoryPath = Get-ExtractedRepositoryPath -ExtractPath $extractPath
    $managedPath = Join-Path $repositoryPath 'managed'
    $sourceConfigPath = Join-Path $managedPath 'config.toml'
    $sourceAgentsPath = Join-Path $managedPath 'AGENTS.md'
    $sourceSkillPath = Join-Path $managedPath 'skills\\jiangxiaoxu'

    foreach ($requiredPath in @($sourceConfigPath, $sourceAgentsPath, $sourceSkillPath)) {
        if (-not (Test-Path -LiteralPath $requiredPath)) {
            throw "Required repository content was not found: $requiredPath"
        }
    }

    $null = New-Item -ItemType Directory -Path $TargetCodexPath -Force

    foreach ($fileName in @('config.toml', 'AGENTS.md')) {
        $destinationPath = Join-Path $TargetCodexPath $fileName
        if (Test-Path -LiteralPath $destinationPath -PathType Container) {
            throw "Expected file path but found a directory: $destinationPath"
        }

        if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
            $backupPath = Backup-ExistingPath -SourcePath $destinationPath -RelativeBackupPath $fileName
            Write-Output "Backed up $destinationPath to $backupPath"
        }

        $sourcePath = switch ($fileName) {
            'config.toml' { $sourceConfigPath }
            'AGENTS.md' { $sourceAgentsPath }
            default { throw "Unhandled managed file: $fileName" }
        }

        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
        Write-Output "Installed $fileName to $destinationPath"
    }

    $targetSkillsParentPath = Join-Path $TargetCodexPath 'skills'
    $targetSkillPath = Join-Path $targetSkillsParentPath 'jiangxiaoxu'
    if (Test-Path -LiteralPath $targetSkillPath -PathType Leaf) {
        throw "Expected directory path but found a file: $targetSkillPath"
    }

    $null = New-Item -ItemType Directory -Path $targetSkillsParentPath -Force
    if (Test-Path -LiteralPath $targetSkillPath -PathType Container) {
        $backupSkillPath = Backup-ExistingPath -SourcePath $targetSkillPath -RelativeBackupPath 'skills\jiangxiaoxu' -Recurse
        Remove-Item -LiteralPath $targetSkillPath -Recurse -Force
        Write-Output "Backed up $targetSkillPath to $backupSkillPath"
    }

    Copy-Item -LiteralPath $sourceSkillPath -Destination $targetSkillsParentPath -Recurse -Force
    Write-Output "Installed skills to $targetSkillPath"
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
