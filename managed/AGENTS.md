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

本节视为用户已允许 `root session` 使用 subagents, delegation 和 parallel agent work. 当本 policy 判定 delegation 有用或必须时, `root session` 必须主动 `spawn_agent`, 不再请求授权.

`orchestration` 指 `root session` 对 subagent 的派发, 等待, 整合, 复用和关闭. `root session` 是当前顶层调度者; `subagent` 是由 `root session` 创建并调度的 session. 运行时决定 agent 类型和基础能力; 本节只约束 `root session` 对 `explorer`, `worker`, `awaiter` 的调度规则.

核心目标是控制主线程 context exposure, 同时避免小事被无意义地转交 subagent. 判断标准是当前动作会让多少信息进入 `root session`, scope 是否已知且小, 输出是否可控, 结论是否只依赖已检查范围, 是否需要完整覆盖或 repo-wide confidence, 是否涉及 shared contract / shared config / runtime behavior, 以及是否会和 active subagent 的责任冲突. 判断标准不是命令名, 不是是否已经派过 subagent, 也不是最终答复是否很短.

`root session` 任何时候都可以直接做低 context exposure 工作, 即使当前存在 active subagent. 但低 context exposure 同时要求信息量低, 语义不确定性低, scope 已知, 输出有界, 且不推进 active subagent 已拥有的业务线程. 输出很短但需要 repo-wide 置信度, 多文件关系判断, 配置链路发现, runtime 映射解释或完整性证明的工作, 仍然是 delegated work.

### 0. Routing gate

每个用户任务开始时, 以及每次准备执行新的 content-bearing action 前, `root session` 必须先做 routing gate. 这个 gate 判断当前动作应归为 `direct work`, `shallow probe` 还是 `delegated work`; 不存在“派过一次 subagent 后全任务 sticky delegation”的规则, 也不存在“active subagent 会冻结所有 direct work”的规则.

`content-bearing action` 包括读取源码/配置/文档正文, content `rg`/`grep`, 带上下文的 diff/log/show, 代码编辑, repo-tracked 文件修改, 运行可能产生业务日志的命令, Web Search 或外部事实收集. `git status`, `git diff --stat/name-only`, count/list-only 搜索, 小范围 metadata 查询通常不是 content-bearing, 但它们只能提供 routing signal, 不能支撑完整事实.

`root session` 执行 direct shell/search/read/edit/run 前, 必须能回答 direct exact-target test:

- exact scope 是什么: 明确文件, 行号, symbol, 小目录或已知 write set.
- 输出为什么短且有界: 命令可预测, 可中断, 不会产生长日志, 大 diff 或无界内容.
- 结论是否只依赖该 scope: 不需要 repo-wide absence, exhaustive usage list, 覆盖完整性或影响面证明.
- 是否不需要链路解释: 不需要 schema/default/继承/覆盖/fallback/registration/routing/runtime mapping/call chain/impact analysis.
- 是否不与 active subagent 冲突: 不推进同一 objective, evidence chain, write set, validation loop 或 unresolved decision.

任一项答不清, 不得把动作当成 direct work; 只能做 bounded `shallow probe` 或派发/复用 subagent.

`known-small scope` 必须在 action 前已经成立, 来源可以是用户明确给出的文件/目录/行号, 当前对话已锁定的局部文件, 或 subagent 返回的精确文件/符号/行号. 通过 repo-wide/未知大目录 `shallow probe` 刚发现的候选路径, 不会自动变成 known-small scope; 只有同时满足候选极少, 文件很小, 不涉及 shared contract, 不需要调用链/覆盖/映射/继承/默认值判断, 且没有其他 mandatory delegation signal 时, 才可继续 direct.

`shallow probe` 是 routing action, 不是业务执行. 它只能用于找候选路径, 估计分布, 判断是否需要 delegation, 或写 subagent brief. Probe 后只有两个合法出口: 若已通过 direct exact-target test, 进入 `direct work`; 否则派发/复用 `explorer`, `worker` 或 `awaiter`. `root session` 不得把多个浅 probe 串成 discovery 流程; context exposure 是累积的, 多个短输出若在追踪新线索, 扩大候选集, 比较文件, 解释关系或证明完整性, 整体就是 delegated work.

决策顺序:

1. 先检查 mandatory delegation signal. 若命中, 主业务必须 delegate; `root session` 只可做非冲突 direct work, 精确证据 spot-check, 或 brief 所需的 bounded `shallow probe`.
2. 当前动作通过 direct exact-target test, 属于 direct boundary, 且不与 active subagent 冲突 -> `root session` 直接做.
3. scope 可能很小但尚不清楚 -> `root session` 可做 bounded `shallow probe`, 如 `git status`, `git diff --stat/name-only`, `rg -l/-c/-m`, `head`, `tail`, `sed -n`, 明确路径下的小范围读取.
4. Probe 后仍不能证明 low context exposure, 或需要完整覆盖, 配置链路, 调用链, 影响面, runtime 行为, 多文件语义关系或 repo-wide confidence -> 派发/复用 subagent.
5. Subagent 返回后引出后续业务 -> 重新过 routing gate. 低上下文且不冲突的动作可由 `root session` 处理; 否则派发/复用合适 subagent.

### 1. Direct boundary

`root session` 可随时直接执行以下低 context exposure 工作, 包括 active subagent 存在时:

- 轻量状态和小 git 查询: `git status`, `git diff --stat`, `git diff --name-only/status`, 明确 ref/path 且预期很小的 `git diff/log/show`.
- 明确且不冲突的 git 操作: 用户要求的 `git add`, `git commit`, `git restore`, branch/tag 操作. 若 active worker 可能继续改 tracked files, 或 active awaiter 正在验证当前工作树, 先等待或协调.
- 小范围阅读: 已知文件的局部阅读, subagent 明确列出的文件/符号/行号范围, 少量配置或错误行上下文. 不得沿线索扩展成新调用链探索, 配置链路发现, 行为映射确认或批量阅读.
- 小范围编辑: 单文件或双文件的 typo, 文案, import, 小配置, 小测试断言, 明确局部 glue code. 必须属于同一局部功能, 且不涉及 shared contract, public API, lifecycle, data model, schema, migration, permission, cache, concurrency, generated files, snapshots, test baselines, shared config 或跨 package 集成. active worker 存在时, 不得重叠其 owned paths 和语义责任.
- 小范围搜索: 限定到明确文件或少量明确目录的 `rg --heading -n <pattern> <known-path...>`, 可用 `-g/--glob`, file type, `-m`, `-l`, `-c` 收窄. 结论只在该明确 scope 内成立.
- 大范围浅探索: 只允许使用 `rg -l`, `rg -c`, `rg --count-matches`, `rg -m`, `git diff --stat/name-only`, `head`, `tail`, `sed -n` 等低输出形式. repo-wide probe 只能用于发现候选文件或写 subagent brief, 不得用完整 content search 替代 `explorer`, 不得直接支撑最终答案.
- 短命令: scope 明确, 非交互, 不启动 watcher/daemon/dev server, 不做 full/clean/workspace-wide 验证, stdout/stderr 可控. 若输出膨胀, 持续运行, 卡住或需要长日志分析, 停止/中断并改派 `awaiter` 或 `explorer`.

Direct work 只能支撑实际检查范围内的 scoped conclusion. 若用户期待 unscoped 或 repo-level 答案, 但 `root session` 只做了 direct work 或 `shallow probe`, 必须明确限制结论范围; 若该限制不能满足用户请求, 必须先派 `explorer`.

### 2. Mandatory delegation

满足以下任一条件时, `root session` 必须派发/复用 subagent. 不得因为第一步命令很短, 只是在找一个字段, 没有文件修改, 或最终答复可能很短, 就把高上下文证据收集当成 direct work.

- 超过 direct boundary 的信息收集, scope confirmation, call tracing, impact analysis, 证据比对, candidate narrowing, gap checking, 遗漏检查或外部验证.
- 需要完整覆盖, exhaustive usage list, repo-wide search, repo-wide absence, 或把局部样本升级为完整事实.
- repo-wide/未知大目录完整内容搜索; 大范围 `rg` 搭配 `--heading -n`, `-A/-B/-C/--context/--passthru`; 连续 `shallow probe` 仍无法收窄.
- 用户问如何修改配置, 策略, 行为, 集成方式, 启用方式, 路由方式, 兼容性或排障, 但 exact file + exact key/path + exact semantics 尚未已知.
- 需要确认配置 schema, 默认值, 继承, 覆盖, fallback, registration, capability routing, tool/model/runtime routing, role selection, policy scope 或多层配置生效路径.
- 涉及 shared config / shared contract / AI instruction / agent role / runtime policy, 且用户不是只要求对已知文件/已知行做字面改写.
- 预计修改 3+ 文件; 或跨 2+ 子系统, 模块, package, service, layer, abstraction boundary.
- 涉及 API, lifecycle, registration, data model, schema, migration, permission, cache, concurrency, error handling, generated files, snapshots, test baselines, shared config.
- 高风险, 高上下文, 批量阅读/比对/迁移/重复改造, 或跨文件一致性检查.
- 存在可并行的独立探索面, 验证面或 disjoint write sets.
- 主工作是 build, test, smoke, benchmark, diagnostic, 长日志观察, flaky failure 复现或失败证据收集.
- 用户要求 review, audit, troubleshooting, performance/compatibility analysis, migration plan, architecture tradeoff 或多方案比较, 且对象不是明确小型 diff, 单文件问题, 短日志或浅探索.
- 未知脚本/不熟悉命令的实际执行, 或 command profile 需要大范围阅读.
- subagent 返回的信息需要进一步业务处理, 但该处理不明显属于 direct boundary, 或会与 active subagent 冲突.

Parallel work 主要发生在 subagents 之间. `root session` 可以并行做低 context exposure 工作, 但不能用该例外规避本应 delegation 的高上下文业务.

### 3. Misclassification guards

这些规则用于避免把 high-context work 误判成小任务:

- 判断 direct/delegated 看的是为了确信答案需要进入 `root session` 的上下文, 不是最终答复字数, 命令数量, 文件名数量或第一步输出长度.
- “只找一个字段/开关/配置项”仍可能需要 `explorer`, 因为字段含义, 读取方, 默认值, 覆盖顺序, 限制条件和 runtime mapping 可能分散在多个文件或层级.
- “先搜一下就知道”只允许作为 `shallow probe`. 如果搜索范围是 repo root 或未知大目录, `root session` 最多获得候选和 brief 输入, 不得直接完成语义判断.
- “candidate 文件很少”不等于 known-small scope. 只有候选本身足以排除配置链路, 调用链, 覆盖关系, shared contract 和 runtime mapping 问题时, 才能继续 direct.
- “没有文件修改”不等于 direct. Answer-only 任务只要依赖 repo-wide 置信度, 多文件证据比对, 配置链路或行为映射, 也需要 `explorer`.
- “root session 可以在 active subagent 期间做低 context exposure 工作”不是并行业务执行许可; 它只允许非冲突小动作, 不允许抢占 high-context exploration, implementation 或 validation.
- `root session` 若发现自己需要解释为什么没有派 subagent, 且实际已经做过 repo-wide search, 多文件语义确认, 配置/角色/策略链路判断或长日志分析, 应立即停止并改派 subagent, 不要继续自行补救.

### 4. Active subagent ownership

active subagent 存在时, `root session` 仍以 scheduler/reviewer 为主: 拆分任务, 派发, 等待, 复用/关闭, 复核证据和 diff, 裁决冲突, 整合结论, 给用户更新进度. 同时, direct boundary 内且不冲突的低 context exposure 工作可以直接完成.

冲突不只看文件是否重叠. 只要某个动作会推进 active subagent 已拥有的 objective, evidence chain, write set, validation loop, command family 或 unresolved decision, 就视为冲突. 冲突动作即使本身很小, 也不得由 `root session` 并行推进; 应等待, 复用该 subagent, 或派发边界清晰的新 subagent.

active 期间允许 `root session` 做: 等待 subagent; 阅读用户输入/历史/需求/约束/subagent compact output; 读取 subagent 明确列出的文件, 符号, 行号范围, diff, 命令输出或链接用于核对和裁决; 查看 `git status`, `git diff --stat/name-only`, worker changed files 的小 diff; 编写 brief, 选择 agent type, wait strategy, close/reuse 策略; 做非冲突的小范围阅读, 小搜索, 小修正和短命令.

active 期间禁止 `root session` 做: 新的大范围 `rg`/`grep`/`find`, 调用链探索, 配置链路发现, impact analysis, exhaustive usage list, candidate narrowing, 批量读文件, 大窗口源码/日志阅读, 大 `git show`/`git diff -U`, 完整历史考古, 与 active worker 重叠的编辑, generated files/snapshots/test baselines/shared config 改动, full/workspace-wide build/test/smoke/benchmark/diagnostic, 长日志观察和失败证据收集.

复核发现缺失信息, 新风险, 新调用链, 新配置层, 新文件范围, 新验证需求或 conflict 时, 先判断是否仍在 direct boundary 内; 否则派发/复用对应 subagent.

### 5. Agent selection and brief

按主交付物选择 agent: 证据/范围/调用链/配置链路/外部事实/候选方案/结论 -> `explorer`; 代码或 repo-tracked 改动/glue code/修复/集成落地 -> `worker`; 命令执行/build/test/smoke/benchmark/diagnostic/状态/日志/验证结果 -> `awaiter`.

混合任务通常按 `explorer -> worker -> awaiter` 分阶段执行. 信号足够可从 `worker` 开始; 只缺验证可从 `awaiter` 开始. 阶段切换后继续按 routing gate 判断; direct boundary 内的小步骤可由 `root session` 直接做, 超出边界的探索/实现/验证继续派 subagent.

每次 `spawn_agent` message 必须自包含, 至少包括 objective, scope, allowed/forbidden actions, stop conditions, success criteria, relevant files/symbols/commands, previous subagent summary, expected output fields. 默认要求 `explorer` 返回 decisive evidence, `worker` 返回 changed files, `awaiter` 返回 commands, exit codes 和 validation results. 因默认 `fork_context=false`, 不得假设 subagent 能看到完整 `root session` context.

### 6. Explorer orchestration

超过 direct boundary 的 repo search, call tracing, scope confirmation, impact analysis, config-chain discovery, schema/role/policy mapping, gap checking, official-source verification, candidate narrowing 交给 `explorer`. 小范围搜索, 单文件证据确认, 明确少量目录内的 bounded `rg` 可由 `root session` 直接做, 但只支持小 scope 结论.

有多个独立且高价值的探索面时, 拆成多个窄范围 `explorer` 并行派发. 每个 `explorer` 只负责一个明确问题, 模块, 调用链, 配置层, 候选方案或证据面; 不为形式并行而拆. 探索面相互依赖或边界不清时, 先派一个更窄的 `explorer` 收敛 scope.

`root session` 逐步等待一个或少量最先返回的 `explorer`, 每次 `wait_agent` 后判断 enough signal. 不足则继续等待关键 `explorer`, 或把缺失问题拆成新的窄范围 `explorer` 派发/复用; 也可以做 direct boundary 内的小证据复核或 `shallow probe`, 但不得自行完成高上下文探索.

`root session` 可复核 `explorer` 明确证据, 不沿证据扩展成新大范围搜索或配置链路发现. 信息不足, 引用不准, 证据冲突或出现新问题时, 按 direct boundary 判断; 超出边界则继续派发/复用 `explorer`.

已有 enough signal 时, 停止低价值收集, 关闭同批不再需要的 `explorer`, 整合证据, 决定下一步是 direct work, further explorer, worker 还是 awaiter. 只有当前决策需要覆盖全部已派发搜索面, 或各结果彼此依赖且缺一不可时, 才等待整批完成.

Enough signal: 强反证足以排除主路线; 明显领先方向足以支持下一步; 收敛到最多 3 个可信候选且继续收集只会弱排序; 可信证据冲突需要 `root session` 裁决; 下一步关键问题已回答, 未返回结果不会改变当前决策.

### 7. Worker orchestration

代码或 repo-tracked 文件改动超过 direct boundary 时派 `worker`. 单/双文件局部小修正可由 `root session` 直接做, 包括 active subagent 存在时的非冲突小修正; 但不得跨关键边界, 不得修改 active worker owned paths, 不得影响 active awaiter 正在验证的工作树语义, 不得扩大 write surface.

进入 worker orchestration 后, active worker 的 write scope 由该 `worker` 拥有. 同一 write set, implementation target 或 repair loop 内的主实现, glue code, 裁决后修正, 集成改动, 冲突落地, review/test 反馈 patch, 小 patch 和一行修正, 默认继续交给该 `worker` 或复用合适 `worker`. `root session` 只有在动作明显属于 direct boundary, 不与 active worker 冲突, 且不会让实现责任混乱时, 才直接处理.

派第一个 `worker` 前, `root session` 必须判断是否存在 disjoint write sets. 有则可并行多个 `worker`; 没有则派/复用一个 primary/integrator `worker`. `disjoint write set` 指预期写入文件互不重叠, 且不共享 generated files, registries, schemas, migrations, public APIs, global config, 单一 test baseline 或同一 abstraction boundary; 边界不清即不 disjoint.

每个 `worker` brief 必须有 write-scope contract: allowed paths, forbidden paths, owned responsibility, success condition, allowed incidental fixes, hand-back conditions. `worker` 可读取 assigned scope 内安全实现所需文件并做必要 cross-file analysis, 但不得扩大 write surface, 接管新 architecture ownership, 或跨未授权 abstraction boundary.

`worker` 可跑局部轻量检查, 如 formatting, local typecheck, incremental compile, touched-scope build 或 narrow non-test command. full/clean/workspace-wide build, tests, benchmark, diagnostic 和长日志观察交给 `awaiter`, 除非命令明确属于 direct boundary 且输出可控.

`worker` 返回 blocker, open risk, verification handoff 或 main-thread decision need 时, `root session` 负责裁决. 裁决后的实现通常仍交 `worker`; 若只剩非冲突 direct boundary 小动作, `root session` 可直接完成. 验证交 `awaiter`, 探索交 `explorer`, 除非对应动作本身低 context exposure.

### 8. Awaiter orchestration

超过 direct boundary 的 build, test, smoke, benchmark, diagnostic, 长日志观察和失败证据收集交给 `awaiter`. 明确小 scope, 非交互, 输出可控的短命令可由 `root session` 直接执行, 如版本/状态查询, 单文件格式检查, 明确 path 的轻量 typecheck 或局部非测试命令. 输出膨胀, 持续运行, 失败需长日志分析, 或会干扰 active awaiter/worker 判断时, 改派 `awaiter`.

代码修改+长验证: `worker` 先实现和局部轻量检查, `awaiter` 再做长验证或 workspace 级验证. worker 批次后若需命令执行, 日志观察, 失败证据收集或环境诊断, 先按 routing gate 判断; 超出 direct boundary 的验证派 `awaiter`.

`awaiter` 不修改源码或 repo-tracked 文件. 若命令产生 tracked-file side effect, `awaiter` 停止并报告; `root session` 再裁决是否派 `worker`. `awaiter` 只运行 parent-defined command family, 观察 stdout/stderr/logs, 收集证据, 提炼 failure signature, 判断后续需 `worker`, `explorer` 还是 `awaiter`.

长验证失败时, `root session` 不亲自读长日志调试和改代码. 定位派 `explorer`, 修复派 `worker`, 重跑/补验派 `awaiter`. 若失败信息足够短且 scope 明确, `root session` 可直接做小范围裁决或 brief, 但不把短错误行扩展成长日志分析.

### 9. Wait, reuse, spawn, progress

`wait_agent` 默认显式 `timeout_ms=1800000`. 多 `targets` 返回只表示至少一个目标完成或超时, 不代表整批完成. 每次返回后, `root session` 判断是否已有 enough signal, 是否继续等关键 subagent, 是否派新 subagent, 是否关闭不需要者. 已有 enough signal 时, 不继续等待低价值增量.

`idle subagent`: 同类型, 已创建未关闭, 非 `PendingInit`/`Running`, 且协议上可 `send_input`. `Completed` 通常可复用; `Interrupted` 需判断; `Errored` 默认不复用; `Shutdown`/`NotFound`/已 `close_agent`/不可接收任务者为 terminal. 派某类型前必须 reuse-or-close. 仅 type, workspace, cwd, shell/environment, task boundary 全匹配才复用. 会混入旧上下文, 扩大边界, 削弱窄范围约束或污染结果时, 关闭后新建. 每类型默认最多保留 2 个 idle, 超出关旧的/不匹配的.

复用偏好: `awaiter` 在同 workspace/cwd/shell/environment 且连续 build/test/smoke/diagnostic loop 中优先复用; `explorer` 默认不复用, 除非边界完全一致且不扩大搜索面; `worker` 仅在连续同一 write set, implementation target 或 repair loop 时复用. 批次已有 enough signal 或任务结束时, `root session` 离开批次前完成回收. 不保留为 idle 的必须显式 `close_agent`; 不因 `Completed` 省略关闭.

只有 `root session` 可创建, 调度和关闭 subagent; subagent 不得 `spawn_agent`. `spawn_agent` 默认显式 `fork_context=false` 和 `agent_type`; `message`/`items` 不并用, 纯文本默认 `message`. 若缺少某 agent type, 可用 `default` 但必须收紧权限和输出; 无安全替代则停止并说明能力缺失.

`root session` 在 orchestration 批次开始, enough-signal 点, 进入 worker/awaiter, 冲突裁决和最终收敛时给用户简短更新. 更新聚焦 agent type, 目标, signal, 裁决和下一步; 不倾倒原始长日志, 长 diff, 重复探索历史或无关中间输出.

## 验收与收尾

- 最终答复前, `root session` 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
