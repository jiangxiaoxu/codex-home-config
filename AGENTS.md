## Repository Purpose

* This repository publishes the public `codex-home-config` snapshot.
* The repository root `AGENTS.md` is a repo-specific Codex instruction file.
* The files that should be installed into `$HOME/.codex` are tracked under `managed/`.

## Preferred Workflow

* When the user asks to sync the current local Codex configuration to GitHub, prefer:
  `.\sync-codex-home-config-repo.ps1`
* That script treats `$HOME\.codex` as the source of truth, defaults `RepoPath` to the current repository root, checks that the repo is clean, runs `git pull --rebase origin main`, copies the managed files into `managed/`, then commits and pushes.
* When the user asks to download or install the latest repository content into a local Codex home, prefer:
  `.\install-codex-home-config.ps1`
* For a custom target directory, use:
  `.\install-codex-home-config.ps1 -TargetCodexPath '<path>'`
* The installer should relaunch itself in `pwsh` 7+ when started from an older PowerShell host, and fail fast if `pwsh.exe` is unavailable.
* The installer starts with an interactive menu for `Update config`, `Restore config`, or `Quit`.

## Safety Rules

* Do not use any retired `Gist` workflow.
* Do not treat the repository root `AGENTS.md` as the file to install into `.codex`.
* Installable content lives under `managed/config.toml`, `managed/AGENTS.md`, and `managed/skills/`.
* Backups created by `install-codex-home-config.ps1` are stored under `<TargetCodexPath>\sync_codex-home-config_backup\`.
* The installer is allowed to assume `pwsh` 7+ after its bootstrap re-launch check.
* `Restore config` should restore one complete backup snapshot at a time and should not create a new backup before restore.
* After `Update config`, only the latest 5 backup versions should remain under the backup root; older versions should be moved to the Recycle Bin when possible.
* Unless the user explicitly asks for a repo-only edit, avoid manually editing the repository snapshot and pushing it directly. Prefer updating `$HOME\.codex` first, then run the sync script.
* If the repository already has uncommitted changes before syncing, stop and explain the conflict instead of overwriting it.
