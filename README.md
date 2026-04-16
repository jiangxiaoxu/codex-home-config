# codex-home-config

Public Codex home configuration for the installable content under `managed/` and the repository workflow instructions in the root `AGENTS.md`.

## Install

Copy and run one of these in PowerShell. `Node.js 18+` is required for both install and restore because `config.toml` is merged through the repository Node helper. Online install uses the published `release` branch only. Local install from a repository checkout uses the current local branch snapshot.
Before `Update config`, the installer prints the install source commit metadata, including the branch name when available, commit SHA, subject, description, commit time, and commit URL.

Interactive install menu:

```powershell
iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/release/install-codex-home-config.ps1' | iex
```

Direct update to the default `$HOME/.codex`:

```powershell
&([scriptblock]::Create((iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/release/install-codex-home-config.ps1'))) -Action Update
```

Direct update for `config.toml` only:

```powershell
&([scriptblock]::Create((iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/release/install-codex-home-config.ps1'))) -Action Update -Components Config
```

The installer starts with an interactive menu:

- `1. Update config`
- `2. Restore config`
- `Q. Quit`

`Update config` writes into `$HOME/.codex`, installs `managed/config.toml`, installs `managed/AGENTS.md` as `.codex/AGENTS.md`, replaces `managed/agents` into `.codex/agents`, and syncs `managed/skills/jiangxiaoxu` to `.codex/skills/jiangxiaoxu` when it exists.
During `Update config`, the installer performs a structured TOML merge. Repository-managed top-level scalars and top-level tables replace the local values, unmanaged local paths are preserved, the local `projects` table is always kept as-is, and `[notice.model_migrations]` is always removed. The managed `[agents]` table is installed from the snapshot like any other managed top-level table. The top-level keys `service_tier` and `plan_mode_reasoning_effort` always keep the local value even when the managed snapshot defines them. The `mcp_servers` table is merged by server name: each managed `[mcp_servers.<name>]` block fully replaces the matching local block, while local server blocks that are not present in the managed snapshot are preserved.
When `-Components` is omitted, `Update config` processes `Skill` as part of the full update. If `managed/skills/jiangxiaoxu` exists, it is installed to `.codex/skills/jiangxiaoxu`; otherwise the local `.codex/skills/jiangxiaoxu` directory is removed. Explicit partial updates leave `Skill` untouched unless it is selected.
`Restore config` restores the components contained in the selected local backup snapshot.
During `Restore config`, `config.toml` uses the same structured TOML merge. Backup-managed top-level scalars and top-level tables replace the current local values, unmanaged local paths are preserved, the current local `projects` table is still kept as-is, and `[notice.model_migrations]` is always removed. The backup `[agents]` table is restored from the selected snapshot like any other managed top-level table. The top-level keys `service_tier` and `plan_mode_reasoning_effort` still keep the current local value. The `mcp_servers` table follows the same per-server merge behavior as `Update config`.
`-Components` accepts `Config`, `AgentFile`, `AgentFolder`, and `Skill`. If omitted, `Update config` still updates all four components.
`-Components` applies to `Update config` only. `Restore config` restores the components that exist in the selected backup version, including `Skill` when the backup contains `skills/jiangxiaoxu`.
All backups created during one update run are grouped under `.codex/sync_codex-home-config_backup/<timestamp>/`.
Local backups still keep the full `config.toml`, including any `projects` entries.
Partial updates back up only the selected components before installation, and `Restore config` restores whatever components exist in the selected backup version.
After a successful update, the installer keeps only the latest 5 backup versions and moves older ones to the Recycle Bin when possible.

`-Components` values:

- `Config` -> `config.toml`
- `AgentFile` -> `AGENTS.md`
- `AgentFolder` -> `agents`
- `Skill` -> `skills/jiangxiaoxu`

For non-interactive update, use:

```powershell
.\install-codex-home-config.ps1 -Action Update
```

Update `AGENTS.md` only:

```powershell
.\install-codex-home-config.ps1 -Action Update -Components AgentFile
```

Update `agents` only:

```powershell
.\install-codex-home-config.ps1 -Action Update -Components AgentFolder
```

Update `skills/jiangxiaoxu` only:

```powershell
.\install-codex-home-config.ps1 -Action Update -Components Skill
```

Update `config.toml` and `agents` together:

```powershell
.\install-codex-home-config.ps1 -Action Update -Components Config,AgentFolder
```

For non-interactive restore entry, use:

```powershell
.\install-codex-home-config.ps1 -Action Restore
```

## Managed content

- `managed/config.toml`
- `managed/AGENTS.md`
- `managed/agents/**`
- `managed/skills/jiangxiaoxu/**`
- `install-codex-home-config.ps1`
- `sync-codex-home-config-repo.ps1`
- `AGENTS.md` for repository-specific Codex workflow instructions

## Update

From the author machine:

```powershell
.\sync-codex-home-config-repo.ps1
```

Sync `agents` only:

```powershell
.\sync-codex-home-config-repo.ps1 -Components AgentFolder
```

Sync `skills/jiangxiaoxu` only:

```powershell
.\sync-codex-home-config-repo.ps1 -Components Skill
```

Sync `config.toml` and `AGENTS.md` only:

```powershell
.\sync-codex-home-config-repo.ps1 -Components Config,AgentFile
```

The sync script requires `pwsh` 7+ and `Node.js 18+`. If it is started from an older PowerShell host, it relaunches itself in `pwsh.exe` and then continues.
The sync script uses `$HOME/.codex` as the managed content source and defaults `RepoPath` to the repository root where the script lives.
Before it publishes managed content, the sync script verifies that the repository is clean, pulls `origin/main`, and relaunches itself from the repository copy when that pull updates the local `HEAD`.
After it pushes `origin/main`, the sync script prompts whether the same commit should also be published to `origin/release`. If you answer `No`, only `main` is updated. If `origin/release` does not exist yet and you answer `Yes`, the push creates it automatically.
When publishing `config.toml`, the sync script uses the current `managed/config.toml` top-level keys as the allowlist for managed paths, except that `[agents]` is always copied directly from the local Codex home when it exists. The local `projects` table is never committed, the top-level keys `model`, `model_reasoning_effort`, `service_tier`, and `plan_mode_reasoning_effort` are always excluded from sync, and `[notice.model_migrations]` is also always excluded from sync. For `mcp_servers`, the existing managed server names are the allowlist, so only those `[mcp_servers.<name>]` blocks are copied from the local Codex home.
When `-Components` is omitted, the sync script processes `Skill` as part of the full publish. If `.codex/skills/jiangxiaoxu` exists, it is copied into `managed/skills/jiangxiaoxu`; otherwise the managed skill directory is removed. Explicit partial sync runs leave `Skill` untouched unless it is selected.
`-Components` accepts `Config`, `AgentFile`, `AgentFolder`, and `Skill`. If omitted, the sync script still publishes all four managed components.
The same `-Components` values apply here: `Config` -> `config.toml`, `AgentFile` -> `AGENTS.md`, `AgentFolder` -> `agents`, `Skill` -> `skills/jiangxiaoxu`.

## Development

Install dependencies and run the TOML helper tests:

```powershell
npm install
npm test
```

The Node helper provides these explicit interfaces:

```powershell
node .\tools\config-toml-ops.cjs merge-install --source <path> --target <path> --output <path>
node .\tools\config-toml-ops.cjs publish-sync --local <path> --managed <path> --output <path>
```

If you are using Codex inside this repository, the repository root `AGENTS.md` contains the preferred workflow for:

- syncing the current local Codex home into this repository
- installing the latest repository content back into a local `.codex`

Do not store secrets in this repository.
