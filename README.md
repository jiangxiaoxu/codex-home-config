# codex-home-config

用于发布和安装 Codex home 配置. 可安装内容位于 `managed/`, 包括 `config.toml`, `models.local.json`, `AGENTS.md`, `agents/` 和 `skills/jiangxiaoxu/`.

## 使用前提

- 安装要求 `Node.js 18+`.
- 公开在线安装只使用已发布的 `release` 分支, 不会安装 `main` 上尚未发布的内容, 且不要求 Git.

## 安装和更新

直接更新默认的 `$HOME/.codex`:

```powershell
iwr -useb 'https://raw.githubusercontent.com/jiangxiaoxu/codex-home-config/release/install-codex-home-config.ps1' | iex
```

安装器始终执行默认 `Update`, 不提供 `-Action`, `-Components` 或 Restore 选择.

## 本地仓库 DryRun

在本地仓库中, 可先预览实际安装结果:

```powershell
.\install-codex-home-config.ps1 -DryRun
```

指定目标路径时:

```powershell
.\install-codex-home-config.ps1 -TargetCodexPath '<path>' -DryRun
```

`-DryRun` 只读取 managed snapshot 和目标配置, 跳过本地仓库 `git pull`, 不创建备份且不修改目标. 它会输出按实际安装规则计算的目标文件 diff, 包括 `config.toml` 合并后的结果和将原样复制的 `models.local.json`.

## 备份

备份保存在 `<TargetCodexPath>/sync_codex-home-config_backup/<timestamp>/`. 每次更新会在覆盖前备份目标路径中已有的可安装内容. `models.local.json` 是独立的可选 snapshot 文件: 仅在 managed snapshot 和目标文件都存在时备份. 文件会完整复制, 不应用下面的同步排除规则. `models.local.json` 会原样复制, 不处理 CRLF. 更新成功后仅保留最新 5 个备份版本, 更早的版本会尽可能移入 Recycle Bin.

## models.local.json 同步策略

`models.local.json` 是独立的可选 snapshot 文件. 同步时, 本地 `.codex/models.local.json` 存在才会原样复制到 `managed/models.local.json`, 不处理 CRLF, 也不受 `config.toml` 同步排除规则影响; 源文件缺失时会跳过并保留 managed 现状. 安装更新时, managed snapshot 存在才会原样复制并覆盖目标文件; snapshot 缺失时会跳过并保留目标现状.

## config.toml 同步策略

同步脚本不会上传完整的 `config.toml`. 默认只同步 `managed/config.toml` 中已经管理的顶层配置, 并排除下方列出的配置. `apps` 整张 table 都不会上传. `mcp_servers` 按仓库中已经管理的名称过滤, 本地新增的 MCP server 不会自动进入仓库.

例如, 本机包含 `apps.github`, `apps.local_app`, `mcp_servers.docs` 和 `mcp_servers.local_mcp`, 仓库已管理 `mcp_servers.docs`:

| 操作 | `apps` | `mcp_servers` |
| --- | --- | --- |
| 同步 | `apps` 整张 table 不会上传, 包括 `github`, `local_app` 和 `_default`. | 只采集 `docs`; `local_mcp` 不会上传. |
| 安装更新 | 正常发布的 snapshot 不包含 `apps`, 因此本机 `apps` 会完整保留. | 按名称合并; `docs` 更新同名配置, 本机独有的 `local_mcp` 保留. |

以下配置不会同步到 GitHub:

| 类型 | 配置 |
| --- | --- |
| 顶层配置 | `projects`, `model`, `model_context_window`, `model_reasoning_effort`, `model_catalog_json`, `service_tier`, `plan_mode_reasoning_effort`, `apps` |
| 嵌套配置 | `notice.model_migrations`, `sandbox_workspace_write.writable_roots`, `tui.model_availability_nux` |
| 本地专属配置 | `features.workspace_dependencies`, `features.apps` |

例如, 以下配置均不会同步:

```toml
model = "local-model"
model_context_window = 200000
model_reasoning_effort = "high"
model_catalog_json = "C:\\path\\to\\models.json"
service_tier = "default"
plan_mode_reasoning_effort = "high"

[projects."C:\\path\\to\\project"]
trust_level = "trusted"

[notice.model_migrations]
"old-model" = "new-model"

[sandbox_workspace_write]
writable_roots = ["C:\\local-workspace"]

[tui.model_availability_nux]
"model-name" = 1

[apps._default]
enabled = false

[features]
workspace_dependencies = false
apps = false
```

备份会原样保留上述配置. 安装更新时, `features.workspace_dependencies` 和 `features.apps` 不会覆盖当前机器上的值. `projects`, `service_tier`, `plan_mode_reasoning_effort` 和 `sandbox_workspace_write.writable_roots` 同样保留本机值; `model_context_window` 和 `notice.model_migrations` 会被移除; 其余配置按普通安装规则处理.

请勿在此仓库中存储 secret.
