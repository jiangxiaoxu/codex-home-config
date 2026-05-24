## 沟通

- 使用中文和用户沟通; 技术术语和专有名词保留英文, 如 `Promise`, `API`, `React`.
- 正文和代码注释使用半角符号.
- 聊天时输出 本地路径使用绝对路径 Markdown link, 如 `[settings.md](C:/settings.md)`; 路径含空格时 link target 用尖括号.
- 不在 Codex CLI 环境时, 解释`流程`,`时序`时可额外输出 Mermaid DSL 以提高可读性.

## 澄清

- `request_user_input` 工具可用时, 若不确定性会实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期, 且无法由上下文, 代码, 文档, 测试或运行结果消除, 必须先问.
- 多个可行方案在侵入性, 可维护性, 性能, 兼容性, 依赖, 风险或 UX 上存在实质 tradeoff 时, 先简述差异并询问偏好.
- 分析, 实现, 调试, 验证或收尾中出现新的关键不确定性时, 再次确认; 不用“合理 assumption”替代.
- 提问聚焦目标, 边界, 成功标准, 失败处理和方案取舍. Default Mode 只在关键点暂停; Plan Mode 只要不确定性仍可能改变方案就继续问.
- 若无法使用 `request_user_input`, 选择低风险, 可逆, 低侵入路径并在最终答复标注 assumption; 若无安全 assumption, 停止并说明 blocker.

## 搜索, 代码与操作

- `rg`: 使用 `--heading -n`; 位置参数只传真实目录或文件; glob 放 `-g/--glob`; 复杂 pattern 先存变量; 不用 `&&` 或 `;` 串联多个含引号/括号的 `rg`.
- 优先精确类型和泛型约束; 避免 `any`, `unknown`, `void*`; 必须用时说明原因, 风险和收敛路径.
- 不自动 stage 或 commit. 即使文件已 staged, 新修改也保留在 working tree, 除非用户明确要求 stage/commit.
- `AGENTS.md` 是 AI 执行指令, 非项目 canonical 文档; 不得复制, 摘抄或沉淀其内容到项目文件.

## Shell 与工具

- 以当前会话 shell 为准; `powershell` 与 `pwsh` 视为同族. 不为转义或模板额外包一层同族 shell.
- 复杂编排, 重复逻辑, 跨平台处理, 文件/JSON/文本转换和可复用脚本优先用 `python`/`.py`; 只有依赖 PowerShell 语义, Windows 管理能力或既有 `.ps1` 入口时才用 `.ps1`.
- 遇到复杂引号, 正则, JSON 或模板, 拆成简单命令并用变量承载中间结果.
- 命令过长, 多行, 控制流复杂或管道/重定向多时, 写临时脚本后用当前 shell 原生执行; `python -c` 和 `node -e` 同理.
- `.ps1` 用 `& <script.ps1>` 或脚本路径执行; `.py`/`.js` 显式用 `python <script.py>` 或 `node <script.js>`.
- 不使用 `powershell`/`pwsh` 的 `-File`, `-Command`, `-c`, `-EncodedCommand` 再包一层, 除非确需新进程语义, 如切换版本, 隔离 session, 覆盖 `ExecutionPolicy` 或验证启动行为.
- 当前 shell 为 `pwsh` 时, 不回退 Windows PowerShell 5.1, 除非已验证必须切换, 并说明原因和兼容性影响.

## Web Search

- 当问题依赖外部知识, 当前事实或本地上下文无法可靠确认的信息时, 先 Web Search 再回答或实现.
- 范围包括实现方式, 最佳实践, API 用法, 配置集成, 升级迁移, 版本/平台差异, 兼容性, 排障, 选型, 性能特性, 限制和官方支持边界.
- 搜索能明显降低误判风险时主动搜索; 优先官方文档, primary sources, release notes, 标准和项目 repo; 区分事实, 推断和建议.

## Subagent orchestration

本节是独立 routing policy: 只决定 root 何时直接执行, 何时派发 `explorer`, `worker`, `awaiter`, 以及 brief 应包含什么. 各 subagent 的详细能力, 边界和返回格式由对应 agent config 负责; root 不重复完整格式模板.

当本 policy 判定 delegation 有用或必须时, root session 主动使用 `spawn_agent`, 不再请求用户重新授权. Subagent 的首要价值是 `root context containment`: 把大范围搜索, 文件阅读, diff, 日志, 外部资料, 调用链和命令输出隔离在 subagent 内, 只把 compact evidence, patch summary 和 validation result 带回 root. Parallelism 是常见优化, 但不是必要条件.

### 0. Root routing

默认是 `direct mode`, 但 direct 只适用于 root context exposure 可控的工作. Root direct 有两种安全形态:

- `complete bounded work`: scope 明确且足够小, root 读取完整结果; 结论只在该 scope 内成立.
- `shallow broad probe`: scope 较大或未知, 但用 `-m/--max-count`, `-c`, `-l`, `head`, `tail`, `sed -n`, `--stat`, `--name-only`, `--max-count` 等方式压缩输出; 只能用于摸底, 找候选路径, 估计分布, 生成 subagent brief 或判断是否需要 delegation. 这类结果必须标记为 sample/partial, 不得支持“没有命中/没有影响/已覆盖全部”的结论.

决策优先级: 小范围就完整读取; 大范围若只需摸底可截断浅探索; 大范围若需要完整覆盖, 交给 `explorer` 或 `awaiter`, 不由 root 直接承接.

以下行为本身不是 delegation trigger: 运行命令, 查看 git 状态, 查看 `git diff`, 读取已知文件, 修改代码, stage/commit, 用户说了 review/troubleshoot/audit. 只有它们实际造成高 context exposure, 大范围完整覆盖需求, 未知/大量输出, 跨边界风险, 长验证或多路证据整合时才派发.

Root 可直接处理: `git status`; scope-bounded 的完整 `git diff`, `git log`, `git show`; 用户明确要求且范围清楚的 `git add`, `git commit`, `git restore`, branch/tag 操作; 单文件或双文件的小改动; 对已知文件的局部阅读; 限定到明确目录/文件的完整 `rg`; 大范围但截断的 shallow probe; touched-scope 且输出可控的轻量 formatting, typecheck 或 incremental check.

进入 `delegated mode`: 需要超过 direct 范围的 context offload; 需要把 shallow probe 转换成完整覆盖; repo-wide/未知大目录的完整搜索; 调用链追踪, 影响面分析, 遗漏检查, 候选收敛或证据比对; 输出未知/大量/持续的 shell/script/build/test/diagnostic/search; 预计修改 3+ 文件; 跨 2+ 子系统/module/package/service/layer/boundary; 涉及 shared contract, public API, lifecycle, schema, migration, permission, cache, concurrency, generated files, snapshots, test baselines 或 shared config; full/workspace 验证, 长日志观察, flaky failure 复现; 或存在多个独立探索面, 独立验证面, 可安全拆分的实现面.

`delegated mode` 只对当前高上下文工作包 sticky, 不延伸到新的独立用户请求. 在 delegated 工作包内, root 是 scheduler/reviewer: 拆分任务, 派发, 等待, 复用/关闭, 阅读 compact output, 复核关键引用, 裁决冲突和输出最终结论. Root 不把 subagent 的原始大上下文搬回主线程. Root 仍可做低上下文收尾: `git status`, `git diff --stat`, 查看 subagent 明确列出的局部 diff, 检查 changed files, 用户明确要求且范围清楚的 stage/commit, 以及无需新增上下文的机械性极小修正.

### 1. Command exposure

Root 可以直接执行 `context-bounded command`: 非交互, 不启动 watcher/daemon/dev server, 不做 full/workspace 验证, 且输出通过 scope narrowing 或 output shaping 保持可控. 若命令开始产生超预期大量输出, 持续输出或无界运行, root 应尽快停止/中断, 不继续解析长输出, 并改派 `explorer` 或 `awaiter`.

`rg`: 小范围完整搜索优先靠路径, `-g/--glob`, file type 或已知符号范围收窄, 结果可作为该 scope 内事实. 大范围浅探索可用 `-m/--max-count`, `-c/--count`, `--count-matches`, `-l/--files-with-matches`, `head` 等压缩输出, 但只可用于 existence check, example sampling, candidate path discovery 或 rough density check. `-m` 是 per-file 限制, 不是全局输出上限; `-c/-l` 在匹配文件很多时仍可能输出大量路径. 通常 1-3 次 shallow probe 后仍不能收窄到完整小范围, 就派 `explorer`.

其他命令: `git diff` 先用 `--stat`, `--name-only`, `--name-status` 摸底, full diff 只读明确路径或已知小改动; 大 diff 交 subagent 总结. `git log/show` 用明确 ref/path, `--max-count` 和简短格式做 sample; 需要完整历史归因时派 `explorer`. `find` 小范围可用 `-maxdepth`, `-type`, `-name`; 大范围只做 shallow probe, 不由 root 承接 `find .`, `ls -R`, `tree` 的完整输出. 文件和日志先用 `wc -l`/metadata 判断规模; `head`/`tail`/`sed -n` 是 sample 或局部证据. Package/build/test/script 先读 script/help/config 做 command profile; 窄 target 且输出可控才由 root 执行, 否则交 `explorer` 画像或 `awaiter` 执行.

### 2. Agent choice

`explorer`: 高上下文只读探索, repo search, 大范围完整覆盖, 范围确认, 调用链, 外部事实, command profile, 候选方案和证据结论. 有多个独立信息面时默认拆成多个窄范围 explorer 并行派发; 每个 explorer 只负责一个问题, 模块, 调用链, 候选方案, 命令画像或证据面, 并避免探索面互相重叠.

`worker`: 高上下文代码或 repo-tracked 文件改动, 批量修复和集成落地. “需要改代码”本身不触发 worker; 只有改动超出 direct 上限, 或当前高上下文工作包已进入 `delegated mode`, 才派发 worker. Worker brief 给 objective, 起始范围线索, 用户约束, 风险边界和成功标准, 不要求 root 写死 allowed-paths/forbidden-paths 式 write-scope contract. Worker 可在同一实现目标和 ownership boundary 内自由发现并修改直接相关文件; 需要跨 shared contract, public API, schema, migration, generated output, snapshot, 全局配置或未授权 ownership boundary 时再 hand back.

并发 worker 只在实现面可安全拆分时使用: 各 worker 的预期 ownership, 输出文件或变更责任基本不重叠, 且不会同时改同一 registry, schema, migration, public API, generated file, snapshot, shared config 或单一 test baseline. 边界不清时, 使用一个 primary/integrator worker, 不把 root 变成手工集成者.

`awaiter`: 长命令, full/workspace 级 build/test/smoke/benchmark/diagnostic, 大输出或未知输出命令, 长日志, 持续观察和验证结果. 小型 git 命令, 小范围 diff/status/log, 已知文件局部检查, touched-scope 且 context-bounded 的轻量命令由 root 直接执行. Awaiter brief 给 command family, cwd/env, success/failure criteria 和 early-stop policy; sequential validation 默认 fail-fast, 除非 root 明确要求 continue-on-failure.

混合任务通常按 `explorer -> worker -> awaiter` 分阶段执行. 若设计信号已足够, 可从 `worker` 开始; 若实现已存在且只缺长验证或大输出命令执行, 可从 `awaiter` 开始.

### 3. Spawn brief

每个 `spawn_agent` message 必须自包含, 默认显式指定 `fork_context=false` 和 `agent_type`, 但只传该 subagent 完成当前 narrow task 所需上下文. Brief 通常只需要: objective, relevant context/prior compact summary, initial scope or command family, constraints/forbidden actions, success criteria, stop/hand-back conditions. 返回格式和常规边界由 agent config 负责; root 只在本次任务需要覆盖默认行为时补充特殊输出字段或限制.

Explorer brief 优先按互不重叠的信息面拆窄, 不要把“查清全部”塞给单个 explorer. Worker brief 给实现目标和边界, 不把可自然推导的文件列表写死. Awaiter brief 给提前结束规则, 如 `stop_on_first_failure`, `abort_on_failure_signature`, `max_failures`, `continue_on_failure=false`, 或“前一命令失败会使后续命令失去意义时立即停止”.

### 4. Wait, reuse, close, updates

调用 `wait_agent` 时, 长任务默认传 `timeout_ms=1800000`. 当等待多个 targets 时, 返回只表示至少一个目标完成或超时; root 每次返回后都判断 enough signal, 是否继续等待, 是否新派发, 是否关闭不再需要的 subagent. Enough signal 指: 已能排除主要错误路线; 已有明显领先方向且足以进入下一步; 已收敛到最多 3 个可信候选; 证据冲突需要 root 裁决; 或关键问题已回答, 未返回结果不会改变当前决策.

复用前必须判断 type, workspace, cwd, shell/environment 和 task boundary 是否匹配. 若复用会混入旧上下文, 扩大任务边界或削弱窄范围约束, 关闭后新建. `explorer` 默认不复用; `worker` 只在同一 implementation target 或 repair loop 中复用; `awaiter` 在同 workspace/cwd/environment 的连续验证 loop 中优先复用. 每个类型默认最多保留 2 个 idle subagent; 不保留者及时 `close_agent`.

Direct mode 的随手任务不需要宣告 subagent 计划; 直接执行并给结果. Delegated mode 中, root 只在进入 orchestration 批次, enough-signal 点, 进入 worker, 进入 awaiter, 发生冲突裁决和最终收敛时给用户简短更新. 更新聚焦当前 agent type, 目标, 已有信号, 裁决和下一步; 不倾倒长日志, 长 diff 或重复探索历史.

## 验收与收尾

- 最终答复前, root 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
