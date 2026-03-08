# codex-home-config

Public Codex home configuration for the installable content under `managed/` and the repository workflow instructions in the root `AGENTS.md`.

## Install

Run this in `pwsh`:

```powershell
Invoke-Expression (Invoke-RestMethod -Headers @{ 'User-Agent' = 'codex-home-config-installer' } -Uri 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/main/install-codex-home-config.ps1')
```

The installer writes into `$HOME/.codex`, backs up existing `config.toml` and `AGENTS.md`, installs `managed/AGENTS.md` as `.codex/AGENTS.md`, and replaces `managed/skills/jiangxiaoxu` into `.codex/skills/jiangxiaoxu`.

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
& "$HOME\.codex\sync-codex-home-config-repo.ps1"
```

The sync script is also versioned in this repository root for backup and reuse. It is a maintainer script and is not used by the public installer.

If you are using Codex inside this repository, the repository root `AGENTS.md` contains the preferred workflow for:

- syncing the current local Codex home into this repository
- installing the latest repository content back into a local `.codex`

Do not store secrets in this repository.
