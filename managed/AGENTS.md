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

- `/root` 指当前直接与用户交互并负责最终答复的主 agent; `/root` 是全局最终 owner, 负责面向用户的最终答复和全局收敛. 若当前 subagent 工具使用 thread id 而不是 canonical path, `/root` 仍作为本文档中的 ownership 名称使用.
- `subagent` 指 agent tree 中的协作 agent: an agent in a team of agents collaborating to complete a task. 它由 direct parent 通过当前可用的 `spawn_agent` 工具创建, 以 direct parent 提供的任务 brief 和授权边界为准; 在 `final` channel 或等价完成通知中返回的内容交付给 parent agent.
- 默认 subagent 不自行创建, 调度, 恢复, 中断, 关闭, 等待或重新分配任何 agent tree 任务; 当任务授权明确允许时, 才可在授权边界内派发并管理自己创建的 direct child agent. Nested delegation 不自动扩展到任意后代.
- `/root` 保留对所有 descendant agent 的 lifecycle 接管权; 接管后 `/root` 不得和原 owner 并行推进同一 evidence chain 或 validation loop. 具体使用 wait, interrupt, resume 或 close 工具时, 以当前工具列表和 tool schema 为准.
- 调用 `spawn_agent` 时默认选择不继承历史上下文的可用选项, 并显式选择合适的 `agent_type`. 若当前工具支持任务名或稳定标识, 提供稳定的 task label; 若工具返回 thread id, 后续 target 使用该返回值. 若缺少合适的 agent type, 可使用 `default`, 但必须用简短自然语言收紧范围, 权限和预期输出.
- 调用 `spawn_agent` 时, 任务正文和 brief 使用 `message` 参数传入, 不使用 `items` 参数; 其他必要参数仍以当前 tool schema 为准.
- `spawn_agent` brief 默认保持简洁: 用 1-2 句说明任务目标, 只写本次真正需要的范围/禁止事项, 明确要返回的证据或结果. 只有存在并行 ownership 风险, 高风险副作用, 长验证, 或容易越界的任务时, 才补充协作边界和停止条件. 复杂任务可以写更详细 brief, 但按风险增加细节, 不默认展开固定字段模板.

### Subagent progress messages

- 任何 agent 如果在授权边界内创建了 direct child agent, 它就是该 child agent 的 direct parent agent, 并负责该 child agent 的 ownership. 只有当前工具明确提供 parent-directed queue-only message/progress 输入时, child agent 才能在任务推进过程中向 direct parent agent 投递简短 progress message; 没有该能力时, 不要模拟中途投递, 只在 final response、completion/status payload 或 parent 的 wait/status 结果中交付信息.
- 若可发送 progress message, 默认只投递给 direct parent agent, 不跨级投递给 `/root`, 除非 brief 明确要求或 direct parent agent 就是 `/root`. Nested delegation 按 owner 链逐级汇报; child agent 吸收 descendant 进度后, 只在影响上层决策时向自己的 direct parent agent 汇总.
- child agent 应优先从当前工具返回的 agent 标识或自身路径推导 direct parent agent target. 若存在 canonical agent path, parent 是去掉最后一段后的路径, 例如 `/root/a/b` 的 parent agent 是 `/root/a`; 若只有 thread id, 使用 parent brief 或工具返回的 id. 必要时可用当前可用的 agent listing/status 工具验证该 parent agent 仍在 live agent tree 中.
- 若可发送 progress message, 内容必须简短且有界, 包含当前阶段、关键 signal、是否 blocked 和下一步; 每次只报告相对上一条 progress message 的新状态或增量; 不包含长日志、长 diff、完整证据列表或敏感原文. 不要机械心跳; 没有新信息时不发送; 发送 progress message 后继续执行原任务, 不因发送或收到 progress message 本身再次上报.
- Queue-only message 只作为提示或 progress message; 它可能唤醒正在等待的 parent, 但不等同于完成一次 follow-up turn, 也不保证立即处理. direct parent agent 接收到 progress message 或等价状态变化后, 根据任务状态从下列动作中按需选择: 继续等待, 使用当前可用的 follow-up/input 工具调整任务, 停止或关闭 child agent, 接手任务, 或向自己的 direct parent agent 汇总.

### 授权声明

默认授权 `/root` 在会话中根据任务需要自主决策调用 `spawn_agent`, 包括创建, 调度, 等待以及按当前工具语义停止或清理 subagent. `/root` 调用 `spawn_agent` 前无需再次向用户确认.
若用户在后续聊天中要求“不派发子代理”, “不要用 subagent”, “直接做”, “暂停派发”或“停止派发”, `/root` 必须在本轮及相关后续上下文中服从该限制, 直到用户明确恢复默认授权.

### Subagent lifecycle policy

以下 lifecycle, routing, reuse/stop 和 validation delegation 规则仅约束 `/root`; subagent 只执行 direct parent brief 和自身授权边界内的任务, 并在 final response 或等价完成通知中返回证据, 风险和建议.

- 默认新任务使用新的稳定 task label/brief, 并选择不继承历史上下文的可用选项; 只有明确需要继承上下文时才放宽. 不要传入当前 tool schema 未暴露的字段.
- 对已有 subagent, 只有需要它继续执行时才使用当前可用的 follow-up/input 工具; queue-only message 只在当前工具明确支持 parent-directed progress/提示时使用. 它可能唤醒正在等待的 receiver, 但不直接等同于完成结果, 不保证触发 idle receiver 新 turn, 也不保证同一 turn 立即处理.
- `wait_agent` 只作为等待通知/状态变化的同步点. 某些实现会直接返回完成内容, 某些实现只返回 mailbox/status signal; 最终结论必须基于实际收到的 subagent notification、final payload、status payload 或后续可核验输出.
- `wait_agent` 默认显式 `timeout_ms=1200000`
### 0. Routing gate

每个任务开始时, 以及每次准备执行新的 content-bearing action 前, `/root` 必须先判定当前动作属于 `direct work`, `shallow probe`, `explorer work` 还是 `awaiter work`.

`content-bearing action` 包括源码/配置/文档正文读取, content `rg`/`grep`, 大段 diff/log/show, 文件修改, 可能产生业务日志的命令, Web Search 或外部事实收集. `git status`, `git diff --stat/name-only`, list/count-only 搜索和小 metadata 查询通常只算 routing signal, 不能单独支撑完整事实.

`/root` 直接执行前必须同时满足四个条件: scope 已知且小; 输出短且可控; 结论只依赖该 scope; 不推进 active subagent 正在负责的 evidence chain、validation loop 或 unresolved decision. 任一条件不满足, 只能做一次有界 `shallow probe`, 或派发/复用 `explorer`/`awaiter`.

用户明确指定的单文件/单段配置/单个测试输出, 且输出短可控时, `/root` 可直接读取或分析; 若分析需要扩展到调用链, runtime mapping, repo-wide absence 或跨模块影响面, 再切换到 `explorer`.

`shallow probe` 只用于发现候选、估计分布、判断是否需要 delegation、编写 brief. Probe 后只有两个出口: 若已满足 direct 条件, 继续 direct; 否则 delegate. 不得把多个短 probe 串成事实上的主线程 discovery.

`known-small scope` 必须在 action 前已经成立, 来源可以是用户明确指定、当前对话已锁定, 或 `explorer` 返回的精确文件/符号/行号. repo-wide probe 刚找到的候选路径不会自动变成 known-small scope; 只有候选极少、语义局部、无 shared contract/config/runtime mapping 风险时才可继续 direct.

### 1. Phase model

任务按阶段切换, 阶段不是永久状态:

- **Exploration phase**: 目标、范围、调用链、配置链路或影响面尚未收敛. `/root` 只做 `shallow probe` 和低 context exposure 工作; 广域探索交给 `explorer`.
- **Construction phase**: 已有足够实现信号. `/root` 自己修改文件, 并为正确实现读取/搜索必要的 implementation-local 上下文; 不再被探索阶段的低曝光规则过度限制.
- **Validation phase**: 短且有界的局部检查可由 `/root` 运行; 长验证、workspace 级命令、日志观察和失败证据收集交给 `awaiter`.

任何阶段都可继续派发或复用 `explorer`. Construction phase 只放宽实现邻域内的取证, 不授权主线程亲自做 repo-wide discovery、完整影响面证明、长日志调试或 workspace 级验证.
当 `/root` 将实现任务交给 `worker` 时, brief 应说明期望验证范围, 并默认把该实现的实际验证责任交给 worker. `/root` 不应替 worker 执行 routine validation; 只有 worker 报告工具缺失、环境不可用、执行被禁止、授权边界不足或需要主线程决策时, 才接回验证问题.

### 2. Explorer routing

以下情况必须派发/复用 `explorer`: repo-wide search/absence、exhaustive usage list、未知大目录正文搜索、call tracing、impact analysis、config/schema/default/registration/routing/runtime mapping、shared config/contract/policy、跨 package 或跨子系统语义判断、迁移/兼容性/架构 tradeoff、外部官方资料核验, 主要依赖 MCP tools/resources 获取信息或证据, 以及任何主线程无法用少量有界上下文可靠判断的问题.

`explorer` brief 默认简短自包含: 写清调查问题, 已知候选范围或起点, 只读/禁止修改等必要边界, 以及需要返回的 decisive evidence、关键文件/符号/行号、候选 write set、未解决风险或建议下一步. 只有高风险或容易越界的探索才展开更多限制.

多个独立探索面可以并行拆给多个窄 `explorer`; 依赖关系不清时先派一个收敛范围. `/root` 逐步 `wait_agent`, 每次完成通知或状态变化后判断是否已有 enough signal: 已能排除主路线、锁定实现方向、收敛到少量可信候选, 或剩余结果不会改变当前决策. 有 enough signal 时停止不再需要的 explorer, 进入 Construction phase 或派更窄的 explorer.

`/root` 可 spot-check `explorer` 给出的精确证据, 但不得沿证据扩展成新的广域探索. 若结果冲突、证据不足、范围扩大或引出新链路, 继续派发/复用 `explorer`.

### 3. Construction routing

进入 Construction phase 前至少满足: 目标和成功标准清楚; write set 或候选范围可控; 关键语义缺口已关闭; 不需要先证明 repo-wide absence、完整调用链、配置继承、runtime routing 或影响面完整性; 验证边界大致明确.

施工中 `/root` 可以读取/搜索比探索阶段更多的局部上下文, 包括 touched files 的完整或大段内容、邻近类型/接口/测试/配置、同模块 caller/callee、短错误上下文、局部 `rg --heading -n`、局部 diff review 和短局部检查. 只要动作服务于已收敛 write set, 且结论不外推到 repo-level, 不应因输出不是极短而转交 subagent.

施工扩展必须保持 implementation-local. 若发现新模块、新 schema/default、generated file、snapshot/test baseline、public API、permission/cache/concurrency/migration、跨 package 边界、未知调用链、配置层级、runtime mapping 或 repo-wide 影响面, 先暂停实现并派 `explorer` 收敛; 返回后由 `/root` 继续施工.

小修正、review/test 反馈 patch、glue code 和集成落地默认由 `/root` 完成. 但长日志定位交 `explorer`, 长验证交 `awaiter`; 不因已经进入 Construction phase 而把所有后续工作都留在主线程.

### 4. Awaiter routing

短命令可由 `/root` 直接运行, 前提是 scope 明确、非交互、输出可控, 如版本查询、格式化单文件、局部 typecheck、明确路径的小测试. 若命令可能长时间运行、产生大量日志、启动 watcher/server、执行 full/clean/workspace-wide build/test/smoke/benchmark/diagnostic, 或失败后需要日志证据收集, 必须交给 `awaiter`.

`awaiter` brief 默认简短说明 command family、cwd/environment、成功/停止条件、side-effect policy 和需要返回的验证结论. `awaiter` 只运行命令、观察 stdout/stderr/logs、提炼 failure signature 和验证结论. 若命令产生未授权 tracked-file side effect, `awaiter` 停止并报告, 由 `/root` 裁决.

长验证失败时, `/root` 不亲自读长日志调试. 失败很短且定位明确时可直接修; 否则派 `explorer` 定位原因, `/root` 修复, 再用 `awaiter` 复验.

### 5. Active subagent and conflict rules

Active subagent 不会冻结主线程. `/root` 仍然可以做和它不冲突的事情, 例如给用户同步进度、整理后续 brief、做不读取正文内容的状态检查、处理已经收敛的局部实现, 或在 subagent 返回后复核它给出的精确证据.

判断是否冲突时, 看的是“这个问题现在由谁负责”, 而不只是看文件是否相同、命令是否只读、输出是否很短. 一旦 `/root` 把某条 evidence chain、validation loop 或 unresolved decision 交给 subagent, 这条链路就暂时由该 subagent 负责. 在它返回之前, 主线程不要继续用 repo-wide search、正文 `rg`/`grep`、源码/配置/文档读取、长 diff/log/show、Web Search 或其他命令去回答同一个问题, 也不要去验证或推翻它正在收集的证据.

如果主线程想重新接手这条链路, 先做一个明确动作: 等 subagent 返回, 或使用当前可用的 interrupt/close/stop 工具终止它负责的任务. Follow-up/input 工具只能安排 subagent 下一轮确认范围变化; 在收到后续 subagent notification 或可核验输出前, 不算 ownership 已转移. Follow-up/input 不一定停止当前 turn; 需要停止时使用当前可用的 interrupt/close/stop 工具. 单独 queue-only message 只算 progress hint, 不算 ownership 已转移. 在这之前, “只是看一下”“只读”“文件不同”“输出很短”都不算继续探索同一个问题的理由.

有 active subagent 时, `/root` 在执行 content-bearing action 前先快速判断: 这个动作会不会为 subagent 当前负责的问题提供证据? 会不会推进、验证或推翻它的未决结论? 最终答复会不会引用这个输出回答同一个 delegated question? 如果答案是 yes, 就先等待 subagent notification, 或使用当前可用的 interrupt/close/stop 工具结束目标 subagent 的任务, 不要并行抢跑.

Active `explorer` 未回答前, 不实现依赖该答案的改动. Active `awaiter` 运行期间, `/root` 和 direct owner 都不得修改它正在验证的对象, 也不得并行启动同一类验证命令.

### 6. Misclassification guards

判断 direct/delegated 看的是为了确信答案需要进入 `/root` 的上下文, 不是最终答复字数、第一步输出长度或是否修改文件.

“只找一个字段/开关/配置项”若涉及默认值、覆盖顺序、读取方、限制条件或 runtime mapping, 仍是 `explorer work`. “candidate 文件很少”若不能排除 shared contract/config/call chain 风险, 仍不能直接施工. “没有文件修改”的 answer-only 任务若依赖 repo-wide 置信度、多文件证据比对、配置链路或行为映射, 也需要 `explorer`.

### 7. Reuse, stop, and wait

派发前若当前工具提供 agent listing/status 能力, 先用它做 reuse-or-stop 判断. `explorer` 默认新建, 只有问题边界完全一致且不会污染结果时复用; `awaiter` 在同 workspace/cwd/shell/environment 的连续验证 loop 中优先复用. 不再需要的 subagent 使用当前可用的 interrupt/close/stop 工具处理; 若工具语义是永久关闭, 后续工作重新 `spawn_agent`; 若工具语义是中断但可继续, 只有需要保留上下文时才复用.

### Agent status 返回值解释

若当前工具提供 agent listing/status, 它返回当前会话 root thread tree 或可见 agent 集合中的 live agents。常见字段可能包含 agent name/path/id, `agent_status`, `last_task_message` 或 completed payload; `last_task_message` 只表示最近任务 brief / instruction, 不等同于 final result。

是否能基于结果等待, 关闭, 续派或接手某个 agent, 取决于当前 brief / policy 是否授予对应的 lifecycle ownership。未被授权时, 不得管理, 等待, 关闭或重新分配其他 agents。

`agent_status` 使用规则:

- `running`: 正在执行; 只有它仍 owns 当前 evidence chain / validation loop 时, 才可作为 `wait_agent` 的等待理由。
- `pending_init`: 初始化中; 只在刚创建 agent 时可短暂等待。
- `interrupted`: 已中断, 不会自己继续。若要继续, 先使用当前可用的 follow-up/input 工具发送明确续作任务, 再等待后续 update; 否则停止该 agent 或由当前 owner 接手。
- `{ "completed": string | null }`: 已完成; 吸收 completed payload 或对应 final result 后, 按当前工具语义清理或停止, 不要再等待 final 状态。
- `{ "errored": string }`: 已失败; 记录 failure signature 后, 按当前工具语义清理或停止, 不要再等待 final 状态。
- `shutdown`: 已关闭且不可再取回结果; 不要等待。若仍出现在 agent listing/status 中, 使用当前可用的清理工具处理。
- `not_found`: 不存在或不可见; final 状态, 不要 `wait_agent`。

只对仍可能产生完成通知或状态变化的非 final agent 使用 `wait_agent`; 不要等待 final 状态。

`wait_agent` timeout 根据等待对象和任务长度选择; 不要机械固定长 timeout. 短同步点用默认或短 timeout, 明确长任务才用较长 timeout. 多 subagent 同时存在时, 每次完成通知或状态变化后判断是否已有 enough signal: 已能排除主路线、锁定实现方向、收敛到少量可信候选, 或剩余结果不会改变当前决策. 有 enough signal 时停止不再需要的 subagent. 不把 `wait_agent` 的 tool output 当作完整结果; 最终结论必须基于实际收到的 subagent notification、final payload、status payload 或后续可核验输出.

### Progress updates

`/root` 在关键阶段切换和收敛点给用户短更新: 说明当前阶段、已获信号、裁决和下一步; 不倾倒长日志、长 diff 或重复探索历史.

## 验收与收尾


- 最终答复前, `/root` 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
