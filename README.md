# codex-home-config

Public Codex home configuration for `config.toml`, `AGENTS.md`, and custom skills under `skills/jiangxiaoxu`.

## Install

Run this in `pwsh`:

```powershell
Invoke-Expression (Invoke-RestMethod -Headers @{ 'User-Agent' = 'codex-home-config-installer' } -Uri 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/main/install-codex-home-config.ps1')
```

The installer writes into `$HOME/.codex`, backs up existing `config.toml` and `AGENTS.md`, and replaces `skills/jiangxiaoxu`.

## Managed content

- `config.toml`
- `AGENTS.md`
- `skills/jiangxiaoxu/**`
- `install-codex-home-config.ps1`

## Update

From the author machine:

```powershell
& "$HOME\.codex\sync-codex-home-config-repo.ps1"
```

Do not store secrets in this repository.
