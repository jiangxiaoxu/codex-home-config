# codex-home-config

Public Codex home configuration for the installable content under `managed/` and the repository workflow instructions in the root `AGENTS.md`.

## Install

Run this in PowerShell:

```powershell
Invoke-Expression (Invoke-RestMethod -Headers @{ 'User-Agent' = 'codex-home-config-installer' } -Uri 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/main/install-codex-home-config.ps1')
```

The installer starts with an interactive menu:

- `1. Update config`
- `2. Restore config`
- `Q. Quit`

`Update config` writes into `$HOME/.codex`, backs up existing `config.toml` and `AGENTS.md`, installs `managed/AGENTS.md` as `.codex/AGENTS.md`, and replaces `managed/skills/jiangxiaoxu` into `.codex/skills/jiangxiaoxu`.
`Restore config` restores a full local backup snapshot of `config.toml`, `AGENTS.md`, and `skills/jiangxiaoxu`.
All backups created during one update run are grouped under `.codex/sync_codex-home-config_backup/<timestamp>/`.
After a successful update, the installer keeps only the latest 5 backup versions and moves older ones to the Recycle Bin when possible.

For non-interactive update, use:

```powershell
.\install-codex-home-config.ps1 -Action Update
```

For non-interactive restore entry, use:

```powershell
.\install-codex-home-config.ps1 -Action Restore
```

## Managed content

- `managed/config.toml`
- `managed/AGENTS.md`
- `managed/skills/jiangxiaoxu/**`
- `install-codex-home-config.ps1`
- `sync-codex-home-config-repo.ps1`
- `AGENTS.md` for repository-specific Codex workflow instructions

## Update

From the author machine:

```powershell
.\sync-codex-home-config-repo.ps1
```

The sync script requires `pwsh` 7+ as well. If it is started from an older PowerShell host, it relaunches itself in `pwsh.exe` and then continues.
The sync script uses `$HOME/.codex` as the managed content source and defaults `RepoPath` to the repository root where the script lives.

If you are using Codex inside this repository, the repository root `AGENTS.md` contains the preferred workflow for:

- syncing the current local Codex home into this repository
- installing the latest repository content back into a local `.codex`

Do not store secrets in this repository.
