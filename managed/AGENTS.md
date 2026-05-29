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
- `AGENTS.md` 是 AI 执行指令, 非项目 canonical 文档; 不得复制, 摘抄或沉淀其内容到项目文件.
- 不自动git stage 或 commit. 即使文件已 staged, 新修改也保留在 working tree, 除非用户明确要求 stage/commit.
- 若发现 git 暂存区状态出现非预期变化,应保留现状并继续工作.

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

只有 `root session` 可创建、调度和关闭 subagent; subagent 不得 `spawn_agent`. `spawn_agent` 默认显式 `fork_context=false` 和 `agent_type`; `message`/`items` 不并用, 纯文本默认 `message`. 若缺少目标 agent type, 可用 `default` 但必须收紧权限、scope 和输出.

### 0. Routing gate

每个任务开始时, 以及每次准备执行新的 content-bearing action 前, `root session` 必须先判定当前动作属于 `direct work`, `shallow probe`, `explorer work` 还是 `awaiter work`.

`content-bearing action` 包括源码/配置/文档正文读取, content `rg`/`grep`, 大段 diff/log/show, 文件修改, 可能产生业务日志的命令, Web Search 或外部事实收集. `git status`, `git diff --stat/name-only`, list/count-only 搜索和小 metadata 查询通常只算 routing signal, 不能单独支撑完整事实.

`root session` 直接执行前必须同时满足四个条件: scope 已知且小; 输出短且可控; 结论只依赖该 scope; 不推进 active subagent 正在负责的 evidence chain、validation loop 或 unresolved decision. 任一条件不满足, 只能做一次有界 `shallow probe`, 或派发/复用 `explorer`/`awaiter`.

`shallow probe` 只用于发现候选、估计分布、判断是否需要 delegation、编写 brief. Probe 后只有两个出口: 若已满足 direct 条件, 继续 direct; 否则 delegate. 不得把多个短 probe 串成事实上的主线程 discovery.

`known-small scope` 必须在 action 前已经成立, 来源可以是用户明确指定、当前对话已锁定, 或 `explorer` 返回的精确文件/符号/行号. repo-wide probe 刚找到的候选路径不会自动变成 known-small scope; 只有候选极少、语义局部、无 shared contract/config/runtime mapping 风险时才可继续 direct.

### 1. Phase model

任务按阶段切换, 阶段不是永久状态:

- **Exploration phase**: 目标、范围、调用链、配置链路或影响面尚未收敛. `root session` 只做 `shallow probe` 和低 context exposure 工作; 广域探索交给 `explorer`.
- **Construction phase**: 已有足够实现信号. `root session` 自己修改文件, 并为正确实现读取/搜索必要的 implementation-local 上下文; 不再被探索阶段的低曝光规则过度限制.
- **Validation phase**: 短且有界的局部检查可由 `root session` 运行; 长验证、workspace 级命令、日志观察和失败证据收集交给 `awaiter`.

任何阶段都可继续派发或复用 `explorer`. Construction phase 只放宽实现邻域内的取证, 不授权主线程亲自做 repo-wide discovery、完整影响面证明、长日志调试或 workspace 级验证.

### 2. Explorer routing

以下情况必须派发/复用 `explorer`: repo-wide search/absence、exhaustive usage list、未知大目录正文搜索、call tracing、impact analysis、config/schema/default/registration/routing/runtime mapping、shared config/contract/policy/AI instruction、跨 package 或跨子系统语义判断、迁移/兼容性/架构 tradeoff、外部官方资料核验, 以及任何主线程无法用少量有界上下文可靠判断的问题.

每个 `explorer` brief 必须自包含: objective, scope, allowed/forbidden actions, stop condition, success criteria, relevant files/symbols/commands, expected output. 默认只读探索, 返回 decisive evidence、关键文件/符号/行号、候选 write set、未解决风险和建议下一步.

多个独立探索面可以并行拆给多个窄 `explorer`; 依赖关系不清时先派一个收敛范围. `root session` 逐步 `wait_agent`, 每次返回后判断是否已有 enough signal: 已能排除主路线、锁定实现方向、收敛到少量可信候选, 或剩余结果不会改变当前决策. 有 enough signal 时关闭不再需要的 explorer, 进入 Construction phase 或派更窄的 explorer.

`root session` 可 spot-check `explorer` 给出的精确证据, 但不得沿证据扩展成新的广域探索. 若结果冲突、证据不足、范围扩大或引出新链路, 继续派发/复用 `explorer`.

### 3. Construction routing

进入 Construction phase 前至少满足: 目标和成功标准清楚; write set 或候选范围可控; 关键语义缺口已关闭; 不需要先证明 repo-wide absence、完整调用链、配置继承、runtime routing 或影响面完整性; 验证边界大致明确.

施工中 `root session` 可以读取/搜索比探索阶段更多的局部上下文, 包括 touched files 的完整或大段内容、邻近类型/接口/测试/配置、同模块 caller/callee、短错误上下文、局部 `rg --heading -n`、局部 diff review 和短局部检查. 只要动作服务于已收敛 write set, 且结论不外推到 repo-level, 不应因输出不是极短而转交 subagent.

施工扩展必须保持 implementation-local. 若发现新模块、新 schema/default、generated file、snapshot/test baseline、public API、permission/cache/concurrency/migration、跨 package 边界、未知调用链、配置层级、runtime mapping 或 repo-wide 影响面, 先暂停实现并派 `explorer` 收敛; 返回后由 `root session` 继续施工.

小修正、review/test 反馈 patch、glue code 和集成落地默认由 `root session` 完成. 但长日志定位交 `explorer`, 长验证交 `awaiter`; 不因已经进入 Construction phase 而把所有后续工作都留在主线程.

### 4. Awaiter routing

短命令可由 `root session` 直接运行, 前提是 scope 明确、非交互、输出可控, 如版本查询、格式化单文件、局部 typecheck、明确路径的小测试. 若命令可能长时间运行、产生大量日志、启动 watcher/server、执行 full/clean/workspace-wide build/test/smoke/benchmark/diagnostic, 或失败后需要日志证据收集, 必须交给 `awaiter`.

`awaiter` brief 应包含 command family、cwd/environment、stop condition、success criteria、预期输出和禁止修改源码/tracked files. `awaiter` 只运行命令、观察 stdout/stderr/logs、提炼 failure signature 和验证结论. 若命令产生 tracked-file side effect, `awaiter` 停止并报告, 由 `root session` 裁决.

长验证失败时, `root session` 不亲自读长日志调试. 失败很短且定位明确时可直接修; 否则派 `explorer` 定位原因, `root session` 修复, 再用 `awaiter` 复验.

### 5. Active subagent and conflict rules

Active subagent 不会冻结主线程. `root session` 仍然可以做和它不冲突的事情, 例如给用户同步进度、整理后续 brief、做不读取正文内容的状态检查、处理已经收敛的局部实现, 或在 subagent 返回后复核它给出的精确证据.

判断是否冲突时, 看的是“这个问题现在由谁负责”, 而不只是看文件是否相同、命令是否只读、输出是否很短. 一旦 `root session` 把某条 evidence chain、validation loop 或 unresolved decision 交给 subagent, 这条链路就暂时由该 subagent 负责. 在它返回之前, 主线程不要继续用 repo-wide search、正文 `rg`/`grep`、源码/配置/文档读取、长 diff/log/show、Web Search 或其他命令去回答同一个问题, 也不要去验证或推翻它正在收集的证据.

如果主线程想重新接手这条链路, 先做一个明确动作: 等 subagent 返回, 或 close/cancel 它, 或通过 interrupt/input 告诉它范围已变化、任务停止或 ownership 已转移. 在这之前, “只是看一下”“只读”“文件不同”“输出很短”都不算继续探索同一个问题的理由.

有 active subagent 时, `root session` 在执行 content-bearing action 前先快速判断: 这个动作会不会为 subagent 当前负责的问题提供证据? 会不会推进、验证或推翻它的未决结论? 最终答复会不会引用这个输出回答同一个 delegated question? 如果答案是 yes, 就先等待、关闭/取消或转移 ownership, 不要并行抢跑.

Active `explorer` 未回答前, 不实现依赖该答案的改动. Active `awaiter` 运行期间, 不修改它正在验证的对象, 也不并行启动同一类验证命令.

### 6. Misclassification guards

判断 direct/delegated 看的是为了确信答案需要进入 `root session` 的上下文, 不是最终答复字数、第一步输出长度或是否修改文件.

“只找一个字段/开关/配置项”若涉及默认值、覆盖顺序、读取方、限制条件或 runtime mapping, 仍是 `explorer work`. “candidate 文件很少”若不能排除 shared contract/config/call chain 风险, 仍不能直接施工. “没有文件修改”的 answer-only 任务若依赖 repo-wide 置信度、多文件证据比对、配置链路或行为映射, 也需要 `explorer`.

### 7. Reuse, close, and progress

派发前先 reuse-or-close. `explorer` 默认新建, 只有问题边界完全一致且不会污染结果时复用; `awaiter` 在同 workspace/cwd/shell/environment 的连续验证 loop 中优先复用. 不再需要的 subagent 显式 `close_agent`; 不因 `Completed` 省略关闭. `wait_agent` 默认显式 `timeout_ms=1800000`; 多 targets 返回只代表至少一个完成或超时, 不代表整批完成.

`root session` 在进入探索批次、获得 enough signal、切入施工、派发长验证、处理冲突和最终收敛时给用户短更新. 更新说明当前阶段、已获得信号、裁决和下一步; 不倾倒长日志、长 diff 或重复探索历史.

## 验收与收尾


- 最终答复前, `root session` 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
