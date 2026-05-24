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

将本节视为用户明确请求使用 subagents, delegation 和 parallel agent work. 当本 policy 判定 delegation 有用或必须时, root session 必须主动使用 `spawn_agent`, 不再请求用户重新授权.

本节中的 `orchestration` 指 root session 对 subagent 的派发, 等待, 整合, 复用和关闭. `root session` 是当前顶层调度者; `subagent` 是 root 创建并调度的 session. 运行时决定 agent 类型和基础能力; 本节只定义 root 对 `explorer`, `worker`, `awaiter` 的调度规则.

本节的核心目标是控制主线程 context exposure, 而不是机械地把所有工作都派给 subagent. 低上下文, 可预测, 小范围的任务由 root 直接完成; 高上下文, 未知输出, 需要完整覆盖或高风险的任务交给 subagent. 一旦已有 subagent 正在运行, root 不与其并行业务执行, 只做调度, 等待, 复核和裁决.

### 0. Routing model

- 每个新的用户任务开始时, root 先判断下一步工作是否能以 low context exposure 直接完成. 判断标准是主线程会接收多少信息, 输出是否可控, 范围是否明确, 风险是否局部, 而不是命令名或任务名.
- `direct work` 指 root 直接执行的小范围工作. 只有在 scope 明确, stdout/stderr 可预测, 不需要完整覆盖, 不跨关键边界, 不会产生长日志或大 diff 时才允许.
- `delegated work` 指交给 subagent 的工作. 只要下一步需要大量信息进入主线程, 需要批量阅读, 需要完整性保证, 输出不可预测, 或存在高风险/跨边界判断, root 必须派发 subagent.
- `orchestration active` 指存在 `PendingInit` 或 `Running` subagent, 或 root 正在处理同一批 subagent 返回结果但尚未完成回收和下一步裁决. 在该状态下, root 不亲自做新的业务执行, 也不与 subagent 并行探索, 编辑, 验证或分析.
- 本策略不使用全任务 sticky delegated mode. 已经派发过 subagent 不代表后续所有小步骤都必须继续派发. 但只有在相关 subagent 已完成或关闭, 且下一步重新满足 direct boundary 时, root 才能恢复 direct work.
- 如果 subagent 的返回结果引出新的具体业务, root 默认派发或复用合适的 subagent 处理. 只有当该业务明显属于 direct boundary, 且没有 subagent 正在运行, 且不会把大量内容带入主线程时, root 才可直接完成.

### 1. Decision order

root 每次准备执行下一步前按以下顺序判断:

1. 若有 subagent 正在运行, root 只做调度相关工作: 等待, 发送补充 brief, 关闭不需要的 subagent, 整理 compact summary, 向用户给简短进度更新. 不执行新的 repo search, 文件阅读, 代码修改, build/test 或日志分析.
2. 若没有 active subagent, 且下一步属于 direct boundary, root 应直接执行, 不派发 subagent. 这是为了避免小任务被 delegation latency 放大.
3. 若下一步触发 mandatory delegation condition, root 必须执行 reuse-or-close 判断并派发 `explorer`, `worker` 或 `awaiter`.
4. 若范围不清但可能很小, root 可以先做一个 bounded shallow probe 来收窄范围, 如 `git diff --stat`, `rg -l`, `rg -c`, `head`, `tail`, 明确路径下的 `sed -n`. probe 结果只能作为摸底或 subagent brief, 不得作为完整覆盖结论.
5. 若 shallow probe 后仍不能确认低上下文, 或需要把 sample/partial 结果升级为完整事实, root 必须派发 subagent.

### 2. Direct boundary

root 可直接执行的典型工作:

- `git status`, `git diff --stat`, `git diff --name-only`, `git diff --name-status`, 以及明确 ref/path 且预期很小的 `git diff`, `git log`, `git show`.
- 用户明确要求且范围清楚的 `git add`, `git commit`, `git restore`, branch/tag 操作; 不自动 stage 或 commit 的全局规则仍然适用.
- 已知文件的局部阅读, 少量明确文件的行范围阅读, 单文件或双文件的小改动, typo, 文案, import, 小配置和小测试断言修正.
- 限定到明确文件或少量明确目录的 `rg --heading -n <pattern> <known-dir-or-file...>`; 可用 `-g/--glob`, file type, `-m/--max-count`, `-l`, `-c` 收窄输出. 完整结果只在该明确 scope 内可作为事实.
- 明确小 scope, 非交互, 不启动 watcher/daemon/dev server, 不做 full/workspace 验证, 且 stdout/stderr 可控的短命令.
- 为准备 subagent brief 而做的轻量状态检查或浅探索, 如候选路径定位, changed-file 列表, diff stat, 少量错误行摘取.

root 直接执行时必须满足以下约束:

- 输出可控: 预期不会产生长日志, 大 diff, 大量匹配, 大型 JSON, 大型表格或持续输出.
- 范围局部: 已知文件, 已知小目录, 已知 symbol, 已知命令族; 不需要 repo-wide exhaustiveness.
- 风险局部: 不涉及 shared contract, public API, lifecycle, registration, data model, schema, migration, permission, cache, concurrency, generated files, snapshots, test baselines, shared config 或跨 package 集成.
- 可中断: 若命令输出开始超预期膨胀, 持续输出, 卡住, 或暴露出更大范围, root 应停止继续解析并改派 subagent.
- 可解释: direct work 的结论只能覆盖实际检查过的范围; 不把局部检查表述成全局事实.

### 3. Mandatory delegation conditions

满足以下任一条件时, root 必须派发或复用 subagent:

- 需要超过 direct boundary 的信息收集, 范围确认, 调用链追踪, 影响面分析, 证据比对, 候选方案收敛, 遗漏检查或外部验证.
- 需要完整覆盖或 exhaustive usage list, 而不是局部样本或候选路径.
- repo-wide 或未知大目录的完整内容搜索; 大范围 `rg` 搭配 `-A/-B/-C/--context/--passthru` 等 content amplifier; 连续多次大范围截断搜索仍无法收窄的问题.
- 预计修改 3+ 文件, 或虽然文件少但跨 2+ 子系统, 模块, package, service, layer 或 abstraction boundary.
- 涉及 API, lifecycle, registration, data model, schema, migration, permission, cache, concurrency, error handling, generated files, snapshots, test baselines 或 shared config.
- 任务高风险, 高上下文, 需要批量阅读/比对/迁移/重复改造, 或需要跨文件一致性检查.
- 存在可并行的独立探索面, 独立验证面或 disjoint write sets. 但并行只发生在 subagents 之间; root 不参与并行业务执行.
- 主工作是 build, test, smoke, benchmark, diagnostic, 长日志观察, flaky failure 复现或失败证据收集.
- 用户要求 review, audit, troubleshooting, performance analysis, compatibility analysis, migration plan, architecture tradeoff 或多方案比较, 且对象不是明确的小型 diff, 单文件问题, 短日志或浅探索.
- 未知脚本或不熟悉命令的实际执行, 或 command profile 本身需要大范围阅读.
- subagent 返回的信息需要进一步业务处理, 且该处理不明显属于 direct boundary.

### 4. Root behavior during orchestration

在 `orchestration active` 中, root 仅可亲自做以下工作:

- 阅读用户输入, 对话历史, 需求, 约束和 subagent compact output.
- 等待已有 subagent 返回; 若缺信息, 继续派发或复用 subagent, 不由 root 补查.
- 读取 subagent 明确列出的文件, 符号, 行号范围, diff, 命令输出或链接; 目的仅限核对引用准确性, 理解局部上下文, 裁决冲突和整合结论, 不得沿线索继续扩展搜索.
- 查看轻量状态, 如 `git status`, `git diff --stat`, `git diff --name-only`, worker 返回的 changed files 对应小 diff, 已生成 diff 片段和 subagent 指定 patch 区域; 不得扩展成新的探索或大 diff 阅读.
- 编写 subagent brief, 选择 agent type, wait strategy, close/reuse 策略.
- 提出必须由用户决定的关键问题, 做最终决策, 合并结论, 输出最终答复.

其他工作均不是 orchestration active 下的 root 工作: 新 `rg`/`grep`/`find`, 调用链探索, 批量读文件, 大窗口源码/日志阅读, content-bearing `git show`/`git diff -U`, 代码编辑, repo-tracked 文件修改, build/test/smoke/benchmark/diagnostic, 长日志分析, command profile 或扩展 Web Search. root 复核时若发现缺失信息, 新风险, 新调用链, 新文件范围或新验证需求, 必须派发或复用对应 subagent.

### 5. Agent selection

默认按当前阶段的主交付物选择 agent:

- 证据, 范围, 调用链, 外部事实, 候选方案和结论 -> `explorer`.
- 代码改动, repo-tracked 文件改动, glue code, 修复和集成落地 -> `worker`.
- 命令执行, build/test/smoke/benchmark/diagnostic, 状态, 日志和验证结果 -> `awaiter`.

混合任务通常按 `explorer -> worker -> awaiter` 分阶段执行. 若设计信号已经足够, 可以从 `worker` 开始. 若实现已存在且只缺验证, 可以从 `awaiter` 开始. 每次阶段切换都重新判断下一步是 direct boundary 还是 mandatory delegation; 但如果仍处于 orchestration active, root 不亲自做业务执行.

各 agent config 已定义用途和返回格式. root 不需要在 AGENTS.md 中重复完整格式, 但每次 `spawn_agent` message 必须自包含, 至少包括 objective, scope, allowed/forbidden actions, stop conditions, success criteria, 相关文件/符号/命令/前序摘要, 以及本次最关键的输出字段. 默认要求 explorer 返回 decisive evidence, worker 返回 changed files, awaiter 返回 commands, exit codes 和 validation results.

### 6. Explorer orchestration

- 有探索需求且超过 direct boundary 时, 派发 `explorer`. 若存在多个相互独立且高价值的问题, 模块, 调用链, 候选方案或证据面, 可以拆成多个窄范围 `explorer` 并行派发.
- 不为了形式上的并行而拆分 explorer. 小范围搜索, 单文件证据确认或有限目录内的少量 `rg` 应由 root 直接完成.
- repo search, call tracing, scope confirmation, impact analysis, gap checking, official-source verification 和 candidate narrowing 在高上下文或需要完整覆盖时交给 `explorer`.
- 进入 `explorer orchestration` 后, root 逐步等待一个或少量最先返回的 explorer. 每次 `wait_agent` 返回后, root 必须判断是否已有 enough signal.
- 若 enough signal 不足, root 不得自行探索, 只能继续等待仍关键的 explorer, 或把缺失问题拆成新的窄范围 explorer 派发/复用.
- root 可以复核 explorer 明确列出的证据, 但不得沿证据继续扩展搜索. 若复核后发现信息不足, 引用不准确, 证据冲突或出现新问题, 继续派发/复用 explorer.
- 一旦已有 enough signal, root 应停止继续收集, 关闭同批不再需要的 explorer, 整合现有证据, 并裁决下一步是 direct work, worker, awaiter 还是进一步 explorer.
- 只有当前决策明确要求覆盖全部已派发搜索面, 或各 explorer 结果彼此依赖且缺一不可时, root 才等待整批 explorer 全部返回.
- 若 explorer 返回 `Verification needed`, `Next best action` 或类似字段, root 不默认亲自执行. root 先按 decision order 判断; 若不属于 direct boundary, 验证交 `awaiter` 或 `explorer`, 实现交 `worker`, 进一步探索交 `explorer`.

Enough signal 满足以下任一条件即可: 已出现强反证并足以排除当前主要路线; 已出现明显领先方向且证据足以支持下一步决策; 已收敛到最多 3 个可信候选且继续收集只会带来弱增量排序; 已发现相互冲突但都可信的证据且冲突需要 root 裁决; 对下一步决策真正关键的问题都已回答, 未返回结果不会改变当前决策.

### 7. Worker orchestration

- 需要代码或 repo-tracked 文件改动且超过 direct boundary 时, 派发 `worker`. 小型单文件/双文件局部修正可由 root 直接完成, 但不得跨关键边界或扩大上下文.
- 进入 `worker orchestration` 后, 只要 worker 仍在运行或同一 write set 的 repair loop 尚未回收, 后续代码改动继续由 `worker` 执行, 包括主实现, glue code, root 裁决后的修正, 集成改动, 冲突落地, review/test 反馈 patch, 小 patch 和一行修正.
- 当所有相关 worker 已完成或关闭后, 如果后续只剩明确 direct boundary 内的小整理, root 可以直接完成; 如果仍属于同一实现责任或会扩大上下文, 复用或新建 worker.
- 派发第一个 worker 前, root 必须判断是否存在可并行的 disjoint write sets. 若存在, 派发多个 worker; 若不存在, 派发或复用一个 primary/integrator worker 执行修改, 而不是让多个 worker 争用同一写入面.
- `disjoint write set` 指多个 worker 的预期写入文件集合互不重叠, 且不共享 generated files, registries, schemas, migrations, public APIs, global config, 单一 test baseline 或同一 abstraction boundary. 边界不清时, 视为不 disjoint.
- 每个 worker 任务必须有明确 write-scope contract: allowed paths, forbidden paths, owned responsibility, success condition, allowed incidental fixes, hand-back conditions.
- worker 可以读取 assigned scope 内为安全实现所需的文件, 也可以做实现范围内的必要 cross-file analysis. 但不得扩大 write surface, 不得接管新的 architecture ownership, 不得跨未授权 abstraction boundary.
- worker 可以跑局部轻量检查, 如 formatting, local typecheck, incremental compile, touched-scope build 或其他 narrow non-test command. full/clean/workspace-wide build, tests, benchmark, diagnostic 和长日志观察交给 `awaiter`.
- worker 返回 blocker, open risk, verification handoff 或 main-thread decision need 时, root 负责裁决. 裁决后的实现通常仍交 worker; 只有明确属于 direct boundary 且无 active subagent 时, root 才可直接处理.

### 8. Awaiter orchestration

- build, test, smoke, benchmark, diagnostic, 长日志观察和失败证据收集超过 direct boundary 时必须交给 `awaiter`.
- 明确小 scope, 非交互, 输出可控的短命令可由 root 直接执行, 例如单个已知文件的格式检查, 明确 path 的轻量 typecheck, 或只输出版本/状态的命令. 一旦输出失控或失败分析需要长日志, 改派 `awaiter`.
- 同时包含代码修改和长验证的任务, 先由 worker 完成实现和局部轻量检查, 再由 awaiter 做长验证或 workspace 级验证.
- worker 批次后, 若下一步需要命令执行, 日志观察, 失败证据收集或环境诊断, root 先按 decision order 判断. 超出 direct boundary 的验证默认派发新的 awaiter 批次, 不亲自运行.
- `awaiter` 不修改源码或 repo-tracked 文件. 若命令产生 tracked-file side effect, awaiter 应停止并报告; root 再裁决是否派 worker 处理.
- `awaiter` 只运行 parent-defined command family, 观察 stdout/stderr/logs, 收集证据, 提炼 failure signature, 判断是否需要继续派 worker, explorer 或 awaiter.
- 长验证失败时, root 不亲自读长日志调试和改代码. 需要定位原因时派 explorer; 需要修复时派 worker; 需要重跑或补充验证时派 awaiter.

### 9. `wait_agent` 与 enough signal

- 调用 `wait_agent` 时, 默认显式传入 `timeout_ms=1800000`; 该长超时主要用于长命令和持续输出.
- 当 `wait_agent` 传入多个 `targets` 时, 返回只表示至少一个目标已完成或超时, 不表示整批已完成.
- 每次返回后, root 必须判断是否已有 enough signal, 是否继续等待剩余关键 subagent, 是否派发新的 subagent, 以及是否关闭不再需要的 subagent.
- root 不得因为一个 subagent 返回就假设整批完成. 但已有 enough signal 时, 也不得继续等待只会带来低价值增量的结果.
- 等待期间 root 不并行业务执行. 需要推进其他独立面时, 派发新的 subagent; 不由 root 亲自补做.

### 10. Reuse / close

- `idle subagent` 指同类型, 已创建, 未关闭, 当前不是 `PendingInit` 或 `Running`, 且协议上仍可通过 `send_input` 接收任务的 subagent.
- `Completed` 通常可作为 idle 候选; `Interrupted` 需要先判断是否适合继续派发; `Errored` 默认不复用; `Shutdown`, `NotFound`, 已 `close_agent`, 或协议上不可继续接收任务者视为 terminal, 不得复用.
- 每次准备派发某一类型 subagent 时, root 必须先执行 reuse-or-close 判断. 只有 type, workspace, cwd, shell/environment 和 task boundary 都匹配时才复用.
- 若复用会混入旧上下文, 扩大任务边界, 削弱窄范围约束或污染结果, 不得复用; 应先关闭不适合的 idle subagent, 再新建.
- 每个类型默认最多保留 2 个 idle subagent; 超出时关闭较旧或较不匹配者.
- `awaiter` 在同 workspace/cwd/shell/environment 且连续 build/test/smoke/diagnostic loop 中, 默认优先复用.
- `explorer` 默认不复用, 除非新任务与旧任务边界完全一致, 且不会扩大搜索面.
- `worker` 仅在连续处理同一 write set, 同一 implementation target 或同一 repair loop 时复用; 否则关闭后新建.
- 当某批 subagent 已提供 enough signal 或该批任务结束时, root 必须在离开该批次前完成回收. 不保留为 idle 的 subagent 必须显式 `close_agent`; 不得因为其已 `Completed` 而省略关闭.

### 11. `spawn_agent`

- 只有 root 可以创建, 调度和关闭 subagent; subagent 不得调用 `spawn_agent`.
- 调用 `spawn_agent` 时默认显式指定 `fork_context=false` 和 `agent_type`.
- `message` 和 `items` 不能同时使用. 纯文本派发默认使用 `message`; 仅在需要 structured input, mentions 或其他非纯文本输入时使用 `items`.
- 因 `fork_context=false`, 每次派发 message 必须自包含, 不得假设 subagent 能看到完整 root context.
- 派发 message 应明确说明: objective, scope, allowed/forbidden actions, stop conditions, success criteria, relevant files/symbols/commands, previous subagent summary, expected output fields.
- 若运行时缺少某 agent type, root 可选择 `default` agent, 但必须收紧权限和输出要求; 无安全替代时停止并说明能力缺失.

### 12. Progress updates

- root 应在 orchestration 批次开始, enough-signal 点, 进入 worker, 进入 awaiter, 发生冲突裁决和最终收敛时, 给用户简短更新.
- 更新聚焦 agent type, 目标, 是否已有 enough signal, 当前裁决和下一步.
- 不向主线程倾倒原始长日志, 长 diff, 重复探索历史或无关中间输出.

## 验收与收尾

- 最终答复前, root 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
