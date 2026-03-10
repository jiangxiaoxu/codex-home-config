# codex-home-config

Public Codex home configuration for the installable content under `managed/` and the repository workflow instructions in the root `AGENTS.md`.

## Install

Copy and run one of these in PowerShell.

Interactive install menu:

```powershell
iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/main/install-codex-home-config.ps1' | iex
```

Direct update to the default `$HOME/.codex`:

```powershell
&([scriptblock]::Create((iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/main/install-codex-home-config.ps1'))) -Action Update
```

Direct update for `config.toml` only:

```powershell
&([scriptblock]::Create((iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/main/install-codex-home-config.ps1'))) -Action Update -Components Config
```

The installer starts with an interactive menu:

- `1. Update config`
- `2. Restore config`
- `Q. Quit`

`Update config` writes into `$HOME/.codex`, installs `managed/config.toml`, installs `managed/AGENTS.md` as `.codex/AGENTS.md`, and replaces `managed/skills/jiangxiaoxu` into `.codex/skills/jiangxiaoxu`.
`Restore config` restores a full local backup snapshot of `config.toml`, `AGENTS.md`, and `skills/jiangxiaoxu`.
`-Components` accepts `Config`, `Agents`, and `Skill`. If omitted, `Update config` still updates all three components.
All backups created during one update run are grouped under `.codex/sync_codex-home-config_backup/<timestamp>/`.
Partial updates still create one full backup snapshot before installation, and `Restore config` still restores the full snapshot.
After a successful update, the installer keeps only the latest 5 backup versions and moves older ones to the Recycle Bin when possible.

`-Components` values:

- `Config` -> `config.toml`
- `Agents` -> `AGENTS.md`
- `Skill` -> `skills/jiangxiaoxu`

For non-interactive update, use:

```powershell
.\install-codex-home-config.ps1 -Action Update
```

Update `AGENTS.md` only:

```powershell
.\install-codex-home-config.ps1 -Action Update -Components Agents
```

Update `config.toml` and `skills/jiangxiaoxu` together:

```powershell
.\install-codex-home-config.ps1 -Action Update -Components Config,Skill
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

Sync `skills/jiangxiaoxu` only:

```powershell
.\sync-codex-home-config-repo.ps1 -Components Skill
```

Sync `config.toml` and `AGENTS.md` only:

```powershell
.\sync-codex-home-config-repo.ps1 -Components Config,Agents
```

The sync script requires `pwsh` 7+ as well. If it is started from an older PowerShell host, it relaunches itself in `pwsh.exe` and then continues.
The sync script uses `$HOME/.codex` as the managed content source and defaults `RepoPath` to the repository root where the script lives.
`-Components` accepts `Config`, `Agents`, and `Skill`. If omitted, the sync script still publishes all three managed components.
The same `-Components` values apply here: `Config` -> `config.toml`, `Agents` -> `AGENTS.md`, `Skill` -> `skills/jiangxiaoxu`.

If you are using Codex inside this repository, the repository root `AGENTS.md` contains the preferred workflow for:

- syncing the current local Codex home into this repository
- installing the latest repository content back into a local `.codex`

Do not store secrets in this repository.
