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

## Safety Rules

* Do not use any retired `Gist` workflow.
* Do not treat the repository root `AGENTS.md` as the file to install into `.codex`.
* Installable content lives under `managed/config.toml`, `managed/AGENTS.md`, and `managed/skills/`.
* Backups created by `install-codex-home-config.ps1` are stored under `<TargetCodexPath>\sync_codex-home-config_backup\`.
* Unless the user explicitly asks for a repo-only edit, avoid manually editing the repository snapshot and pushing it directly. Prefer updating `$HOME\.codex` first, then run the sync script.
* If the repository already has uncommitted changes before syncing, stop and explain the conflict instead of overwriting it.
