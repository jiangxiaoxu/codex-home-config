## Repository Purpose

* This repository publishes the public `codex-home-config` snapshot.
* The repository root `AGENTS.md` is a repo-specific Codex instruction file.
* The files that should be installed into `$HOME/.codex` are tracked under `managed/`.

## Preferred Workflow

* When the user wants a copy-paste command to share with other people, prefer the public one-liners from `README.md` instead of local repo commands.
* Prefer the public installer one-liner when the user wants to update the default `$HOME\.codex`.
* When the user asks to sync the current local Codex configuration to GitHub, prefer:
  `.\sync-codex-home-config-repo.ps1`
* That script treats `$HOME\.codex` as the source of truth, defaults `RepoPath` to the current repository root, relaunches itself in `pwsh` 7+ if needed, checks that the repo is clean, runs `git pull --rebase origin main`, relaunches from the repository copy if that pull updates local `HEAD`, copies the selected managed components, including `models.local.json` as the optional `ModelsLocalFile` snapshot, into `managed/`, commits and pushes `main`, then prompts whether the same commit should also be published to `release`.
* When the user asks to install the current local repository branch into a Codex home, prefer:
  `.\install-codex-home-config.ps1`
* For a custom target directory, use:
  `.\install-codex-home-config.ps1 -TargetCodexPath '<path>'`
* For a local repository dry run, use:
  `.\install-codex-home-config.ps1 -DryRun`
* The installer always performs the default `Update`; it does not accept `-Action`, `-Components`, or any Restore selection and does not show a menu.
* `-DryRun` only reads the managed snapshot and target configuration, skips the local repository `git pull`, creates no backup, makes no target changes, and outputs the actual installation-result diff.
* When performing an installation from this repository, the installer requires a clean worktree, pulls the current branch from `origin` with rebase, relaunches the updated installer when `HEAD` changes, and stops before installation if the pull fails or conflicts.
* The installer itself is expected to work in Windows PowerShell 5.1 and `pwsh`.
* The public online installer installs published content from the `release` branch only. A local repository checkout installs its pulled current branch, including unpublished content when the current branch is not `release`.

## Safety Rules

* Do not use any retired `Gist` workflow.
* Do not treat the repository root `AGENTS.md` as the file to install into `.codex`.
* Installable content lives under `managed/config.toml`, `managed/models.local.json`, `managed/AGENTS.md`, `managed/agents/`, and `managed/skills/jiangxiaoxu/` when present.
* Backups created by `install-codex-home-config.ps1` are stored under `<TargetCodexPath>\sync_codex-home-config_backup\`.
* The sync script is also allowed to assume `pwsh` 7+ after its bootstrap re-launch check.
* `models.local.json` is an optional snapshot file and is independent of `config.toml`; sync and installation copy it unchanged without CRLF processing.
* A missing source `models.local.json` skips sync and preserves the managed snapshot; a missing managed snapshot skips installation and preserves the target file.
* Each installer update backs up existing installable content before overwriting it; `models.local.json` is included only when both the managed snapshot and target file exist.
* After an installer update, only the latest 5 backup versions should remain under the backup root; older versions should be moved to the Recycle Bin when possible.
* Unless the user explicitly asks for a repo-only edit, avoid manually editing the repository snapshot and pushing it directly. Prefer updating `$HOME\.codex` first, then run the sync script.
* If the repository already has uncommitted changes before syncing, stop and explain the conflict instead of overwriting it.
