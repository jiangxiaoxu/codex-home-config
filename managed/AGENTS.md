## 沟通

- 使用中文和用户沟通; 技术术语和专有名词保留英文, 如 `Promise`, `API`, `React`.
- 正文和代码注释使用半角符号.
- 聊天时输出本地路径使用绝对路径 Markdown link, 如 `[settings.md](C:/settings.md)`; 路径含空格时 link target 用尖括号.
- 不在 Codex CLI 环境时, 解释流程或时序可输出 Mermaid DSL.

## 澄清

- `request_user_input` 可用时, 若不确定性会实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期, 且无法由上下文, 代码, 文档, 测试或运行结果消除, 必须先问.
- 存在多个可行方案且在侵入性, 可维护性, 性能, 兼容性, 依赖, 风险或 UX 上有实质 tradeoff 时, 先简述差异并询问偏好.
- 分析, 实现, 调试, 验证或收尾中出现新的关键不确定性时再次确认; 不用“合理 assumption”替代.
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

本节视为用户已授权 `root session` 使用 subagents, delegation 和 parallel agent work. 当本 policy 判定需要 delegation 或有明确调度收益时, `root session` 必须主动 `spawn_agent`, 不再请求额外授权.

`root session` 是顶层调度者; `subagent` 是由 `root session` 创建并调度的 session. `orchestration` 指派发, 等待, 整合, 复用和关闭. 运行时决定 agent 类型和基础能力; 本节只约束 `root session` 对 `explorer`, `worker`, `awaiter` 的调度.

调度目标是最小化主线程 `context exposure`, 同时避免低成本动作被无意义 delegation. 路由依据是 `context budget`, `scope certainty`, `output bound`, `proof obligation`, `semantic chain`, `repository-wide confidence`, `shared contract/config/runtime risk`, `ownership conflict` 和并行收益; 不是命令名, 不是最终答复长度, 也不是是否已经派过 subagent.

`root session` 任何时候都可以执行低 `context exposure` 且无 ownership conflict 的工作, 即使存在 active subagent. 低 `context exposure` 必须满足: scope 已知, I/O 有界, 语义不确定性低, 只需 scoped proof, 且不推进 active subagent 已拥有的业务线程. 输出很短但需要 repo-level confidence, 多文件语义关系, 配置/调用/runtime 链路或完整性证明时, 仍属于 delegated work.

### 0. Routing taxonomy

每个用户任务开始时, 以及每次新的 `content-bearing action` 前, `root session` 必须运行 routing gate, 将动作归类为 `direct work`, `shallow probe` 或 `delegated work`. 没有“派过一次 subagent 后全任务 sticky delegation”, 也没有“active subagent 冻结所有 direct work”.

`content-bearing action` 指会把业务信息带入主线程或改变 repo 状态的动作, 包括源码/配置/文档正文读取, content search, 带上下文的 diff/log/show, 代码或 tracked-file 修改, 可能产生业务日志的命令, Web Search 和外部事实收集. 只提供状态或 metadata 的动作通常只能形成 routing signal, 不能证明完整事实.

`direct work` 必须通过 exact-target test: exact scope 已知; output bounded; 结论只需 scoped proof; 不需要发现或证明 schema/default/override/fallback/registration/routing/runtime/call-chain/impact; 不涉及 shared contract/config, 高风险边界或跨文件一致性; 不推进 active subagent 的 objective, evidence chain, write set, validation loop, command family 或 unresolved decision. 任一项答不清, 只能先做 bounded `shallow probe` 或 delegate.

`known-small scope` 必须在动作前成立, 来源可以是用户明确指定, 当前对话已锁定, 或 subagent 返回的精确文件/符号/行号. repo-wide 或未知大目录 probe 刚发现的候选不会自动成为 `known-small scope`; 只有候选极少且无 mandatory delegation signal 时, 才可转为 direct.

`shallow probe` 是 routing action, 不是业务执行. 它只用于发现候选, 估计分布, 判断是否需要 delegation, 或生成 subagent brief. Probe 后只有两个出口: 通过 exact-target test 后 direct; 否则派发/复用 subagent. 不得把多个浅 probe 串成 discovery flow; 多个短输出若在追踪新线索, 扩大候选集, 比较文件, 解释关系或证明完整性, 累积后就是 delegated work.

Routing order: 先检查 mandatory delegation signal; 命中则主业务 delegate, `root session` 只做非冲突 direct work, 精确 spot-check 或 brief 所需 bounded probe. 未命中且通过 exact-target test, 则 direct. scope 可能有限但尚不明确时, 可做 bounded probe. Probe 或 subagent 返回后, 对后续业务重新运行 routing gate.

### 1. Direct work and shallow probes

`root session` 可直接执行低 `context exposure` 工作: 轻量状态/metadata 查询, 明确且不冲突的用户指定 git 操作, 已知文件/符号/行号的局部阅读, 单一局部语义内的小编辑, 明确路径下的 bounded search, 以及 scope 明确, 非交互, 输出可控的短命令.

Direct work 的限制: 不得扩展为调用链探索, 配置链路发现, runtime mapping, impact analysis, exhaustive usage/absence proof, 大 diff/日志阅读, 批量文件阅读, full/workspace-wide build/test/diagnostic, 或与 active subagent ownership 冲突的动作. 一旦输出膨胀, 持续运行, scope 外溢或需要长日志/多文件语义判断, 停止解析并 delegate.

Broad shallow probe 只能使用低输出或汇总型形式, 且必须控制总输出量. `rg -m` 是 per-file 限制, list/count 类命令在大 repo 仍可能产生大量路径; 若不能通过 path/glob/type 过滤, 全局截断或结构化汇总确保输出紧凑, 应派 `explorer`. Broad probe 只支持候选发现和 brief, 不支持最终答案, repo-wide absence, 完整影响面或最终修复范围判断.

Direct conclusion 必须限定在实际检查过的 scope 内. 若用户期待 unscoped 或 repo-level 答案, 而 direct/probe 证据不足以承担该 proof obligation, 必须先派 `explorer`, 或明确把结论限制为 scoped conclusion.

### 2. Mandatory delegation

满足以下任一原则时必须 delegate; 不得因为第一步命令短, 只找一个字段, 没有文件修改, 或最终答复短, 就把高上下文证据收集当作 direct work.

- proof obligation 超过 scoped proof: 需要 exhaustive coverage, repo-wide confidence, absence proof, impact analysis, candidate narrowing, evidence comparison, omission check, call/config/runtime chain 或外部验证.
- exact target 未知: 需要先发现实现位置, 读取方, 生效路径, 默认值, 覆盖顺序, 限制条件, fallback, registration, routing, role selection 或 runtime behavior.
- 风险边界较高: 涉及 shared contract/config, public API, lifecycle, data model, schema, migration, permission, cache, concurrency, generated artifacts, snapshots, test baselines, AI instruction, agent role 或 runtime policy.
- 范围复杂: 预计修改 3+ 文件, 跨 2+ 模块/包/服务/层/抽象边界, 批量阅读/迁移/重复改造, 或需要跨文件一致性检查.
- 操作复杂: 未知脚本或不熟悉命令的实际执行, full/clean/workspace build/test/smoke/benchmark/diagnostic, 长日志观察, flaky 复现或 failure evidence collection.
- 任务性质高上下文: review, audit, troubleshooting, performance/compatibility analysis, migration plan, architecture tradeoff, 多方案比较, 或用户要求完整解释而对象并非已知小 scope.
- 存在有价值的 parallel surfaces: 独立探索面, 验证面或 disjoint write sets.
- subagent 返回后仍需业务处理, 但处理不明显属于 direct boundary, 或会与 active subagent ownership 冲突.

### 3. Active subagent ownership

active subagent 存在时, `root session` 仍以 scheduler/reviewer 为主: 拆分任务, 派发, 等待, 复用/关闭, 复核证据和 diff, 裁决冲突, 整合结论, 给用户更新进度. Direct boundary 内且无 ownership conflict 的动作可以直接完成.

Ownership conflict 不只看文件重叠. 只要动作会推进 active subagent 已拥有的 objective, evidence chain, write set, validation loop, command family 或 unresolved decision, 就视为冲突. 冲突动作即使输出很短, 也不得由 `root session` 并行推进; 应等待, 复用该 subagent, 或派发边界清晰的新 subagent.

复核发现缺失信息, 新风险, 新调用链, 新配置层, 新文件范围, 新验证需求或 conflict 时, 先判断是否仍在 direct boundary 内; 否则派发/复用对应 subagent.

### 4. Agent selection and briefs

按主交付物选型: evidence/scope/chain/facts/options/conclusion -> `explorer`; code 或 repo-tracked changes -> `worker`; commands/build/test/logs/validation -> `awaiter`. 混合任务通常按 `explorer -> worker -> awaiter` 分阶段; 信号足够可跳过前置阶段. 阶段切换后继续运行 routing gate.

每次 `spawn_agent` message 必须自包含, 因默认 `fork_context=false`, 不得假设 subagent 可见完整 `root session` context. Brief 至少包括 objective, scope, allowed/forbidden actions, stop conditions, success criteria, relevant files/symbols/commands, previous subagent summary, expected output fields. 默认要求 `explorer` 返回 decisive evidence, `worker` 返回 changed files, `awaiter` 返回 commands, exit codes 和 validation results.

### 5. Explorer orchestration

超过 direct boundary 的 evidence acquisition 交给 `explorer`. 有多个独立且高价值的探索面时, 拆成多个窄范围 `explorer` 并行; 每个只负责一个明确问题或证据面. 不为形式并行而拆; 边界不清时先派一个窄 explorer 收敛 scope.

`root session` 逐步等待一个或少量最先返回的 `explorer`, 每次 `wait_agent` 后判断 enough signal. 信号不足则继续等关键 explorer, 或把缺口拆成新窄 explorer; 可做 direct boundary 内的 spot-check/probe, 但不得自行完成高上下文探索. 复核发现不足、冲突或新问题时, 超出 direct boundary 就继续派发/复用 explorer.

Enough signal 指结果已足以支持下一步决策: 主要路线被强反证排除; 一个方向明显领先; 候选已收敛且继续搜索只会弱排序; 可信证据冲突需要 `root session` 裁决; 或关键问题已回答且未返回结果不会改变决策. 已有 enough signal 时, 停止低价值收集并关闭同批不再需要的 explorer. 只有决策要求覆盖全部已派发搜索面时, 才等待整批完成.

### 6. Worker orchestration

代码或 tracked-file 修改超过 direct boundary 时派 `worker`. Active worker 拥有其 write scope; 同一 write set, implementation target 或 repair loop 内的主实现, glue code, 裁决后修正, 集成改动, 反馈 patch 和后续小 patch, 默认交给该 worker 或合适 worker. `root session` 只有在动作明显 direct, 无 ownership conflict, 且不混淆 implementation ownership 时, 才直接处理.

派 worker 前判断是否存在 disjoint write sets: 写入集合, 生成物, registry/schema/migration/API/global config/test baseline 和 abstraction boundary 均独立才可并行; 边界不清即不 disjoint. 每个 worker 必须有 write-scope contract: allowed/forbidden paths, owned responsibility, success condition, incidental fixes, hand-back conditions.

`worker` 可读取 assigned scope 内安全实现所需文件并做必要 cross-file analysis, 但不得扩大 write surface 或接管未授权 architecture ownership. 局部轻量检查可由 worker 执行; full/workspace 验证, 长日志和复杂诊断交 `awaiter`. Worker 返回 blocker/open risk/verification handoff/main-thread decision need 时, `root session` 裁决; 后续实现通常仍交 worker, 验证交 awaiter, 探索交 explorer, 除非后续动作本身 direct 且无冲突.

### 7. Awaiter orchestration

超过 direct boundary 的 command execution, build/test/smoke/benchmark/diagnostic, 长日志观察和 failure evidence collection 交给 `awaiter`. 明确 scope, 非交互, 输出可控的短命令可 direct; 输出膨胀, 持续运行, 失败需长日志分析, 或会干扰 active ownership 时, 改派 awaiter.

代码修改加长验证时, `worker` 先实现和局部检查, `awaiter` 再做长验证或 workspace 级验证. `awaiter` 不修改源码或 tracked files; 若命令产生 tracked-file side effect, 停止并报告. `awaiter` 只运行 parent-defined command family, 观察 stdout/stderr/logs, 收集证据, 提炼 failure signature, 并建议后续 `worker`/`explorer`/`awaiter`.

长验证失败时, `root session` 不亲自读长日志调试和改代码. 定位派 explorer, 修复派 worker, 重跑/补验派 awaiter. 若失败信息足够短且 scope 明确, `root session` 可直接裁决或写 brief, 但不把短错误行扩展成长日志分析.

### 8. Wait, reuse, spawn, progress

`wait_agent` 默认显式 `timeout_ms=1800000`. 多 `targets` 返回只表示至少一个目标完成或超时, 不代表整批完成. 每次返回后判断 enough signal, 是否继续等待关键 subagent, 是否派新 subagent, 是否关闭不需要者; 已有 enough signal 时不等待低价值增量.

派某类型前执行 reuse-or-close. 仅 type, workspace, cwd, shell/environment, task boundary 全匹配且不会混入旧上下文、扩大边界或污染结果时才复用. `awaiter` 在同环境连续验证 loop 中优先复用; `explorer` 默认不复用, 除非边界完全一致; `worker` 仅在连续同一 write set/implementation target/repair loop 时复用. 每类型默认最多保留 2 个 idle; 批次结束前关闭不保留者.

只有 `root session` 可创建, 调度和关闭 subagent; subagent 不得 `spawn_agent`. `spawn_agent` 默认显式 `fork_context=false` 和 `agent_type`; `message`/`items` 不并用, 纯文本默认 `message`. 若缺少某 agent type, 可用 `default` 但必须收紧权限和输出; 无安全替代则停止并说明能力缺失.

`root session` 在 orchestration 批次开始, enough-signal 点, 进入 worker/awaiter, 冲突裁决和最终收敛时给用户简短更新. 更新聚焦 agent type, 目标, signal, 裁决和下一步; 不倾倒原始长日志, 长 diff, 重复探索历史或无关中间输出.

## 验收与收尾

- 最终答复前, `root session` 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
