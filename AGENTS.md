## Repository Purpose

* This repository publishes the public `codex-home-config` snapshot.
* The repository root `AGENTS.md` is a repo-specific Codex instruction file.
* The files that should be installed into `$HOME/.codex` are tracked under `managed/`.

## Preferred Workflow

* When the user wants a copy-paste command to share with other people, prefer the public one-liners from `README.md` instead of local repo commands.
* Prefer the public installer one-liner when the user wants to update the default `$HOME\.codex`.
* Use the explicit `-Action Restore` entry when the user wants to choose and restore a local backup.
* When the user asks to sync the current local Codex configuration to GitHub, prefer:
  `.\sync-codex-home-config-repo.ps1`
* That script treats `$HOME\.codex` as the source of truth, defaults `RepoPath` to the current repository root, relaunches itself in `pwsh` 7+ if needed, checks that the repo is clean, runs `git pull --rebase origin main`, relaunches from the repository copy if that pull updates local `HEAD`, copies the managed files and the managed skill directory into `managed/`, commits and pushes `main`, then prompts whether the same commit should also be published to `release`.
* When the user asks to install the current local repository branch into a Codex home, prefer:
  `.\install-codex-home-config.ps1`
* For a custom target directory, use:
  `.\install-codex-home-config.ps1 -TargetCodexPath '<path>'`
* For an explicit update, use:
  `.\install-codex-home-config.ps1 -Action Update`
* For restore, use:
  `.\install-codex-home-config.ps1 -Action Restore`
* The installer defaults directly to `Update`; it does not show a main action menu.
* When run from this repository, the installer requires a clean worktree, pulls the current branch from `origin` with rebase, relaunches the updated installer when `HEAD` changes, and stops before installation if the pull fails or conflicts.
* The installer itself is expected to work in Windows PowerShell 5.1 and `pwsh`.
* The public online installer installs published content from the `release` branch only. A local repository checkout installs its pulled current branch, including unpublished content when the current branch is not `release`.

## Safety Rules

* Do not use any retired `Gist` workflow.
* Do not treat the repository root `AGENTS.md` as the file to install into `.codex`.
* Installable content lives under `managed/config.toml`, `managed/AGENTS.md`, `managed/agents/`, and `managed/skills/jiangxiaoxu/` when present.
* Backups created by `install-codex-home-config.ps1` are stored under `<TargetCodexPath>\sync_codex-home-config_backup\`.
* The sync script is also allowed to assume `pwsh` 7+ after its bootstrap re-launch check.
* `Update config -Components ...` should back up only the selected components before installation.
* `Restore config` should restore the components that exist in the selected backup snapshot and should not create a new backup before restore.
* `-Action Restore` requires the user to choose one local backup version.
* After `Update config`, only the latest 5 backup versions should remain under the backup root; older versions should be moved to the Recycle Bin when possible.
* Unless the user explicitly asks for a repo-only edit, avoid manually editing the repository snapshot and pushing it directly. Prefer updating `$HOME\.codex` first, then run the sync script.
* If the repository already has uncommitted changes before syncing, stop and explain the conflict instead of overwriting it.
