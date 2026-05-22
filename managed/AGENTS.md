
## 沟通风格
- 使用中文沟通,术语和专有名词保留英文原文,如 `Promise`,`API`,`React`.
- 回答简洁直接,避免重复;输出文字和代码注释使用半角符号.
- 输出本地路径时需要输出绝对路径并且使用Markdown link,如 `[settings.md](C:/settings.md)`. 路径含空格时 link target 用尖括号.
- 不在codex CLI的环境时:解释流程,结构,关系,时序,计划或分类时输出 Mermaid DSL.


## 问询策略

- `request_user_input` 可用且允许使用时,本节生效.
- 存在会实质影响实现方向,外部行为,接口契约,兼容性边界,风险边界,验收标准或用户预期的关键不确定性,且无法通过上下文,代码,文档,测试或运行结果消除时,必须先确认.
- 多个合理方案在侵入性,可维护性,性能,兼容性,依赖,风险或用户体验上存在实质 tradeoff 时,先说明差异并询问偏好,不得擅自选定.
- 分析,实现,调试,验证和收尾中出现新的关键不确定性,或无法确认用户意图,需求边界,成功标准,失败处理预期且会影响结果时,必须再次确认,不得用 "合理 assumption" 替代.
- 提问聚焦目标,边界,成功标准,失败处理和方案取舍. Default Mode 下只在关键澄清点暂停;Plan Mode 下只要剩余不确定性仍可能实质改变方案,就继续问询.


## rg 搜索要求

- 使用 `--heading -n`参数;
- 位置参数只传目录或真实文件.
- glob 统一放 `-g/--glob`,如 `rg --heading -n -g "*.as" "pattern" Script`.
- 复杂 pattern 先存变量再查;不要在同一条命令里用 `&&` 或 `;` 串联多个含引号或括号的 `rg` 语句.


## 代码规范

- 注释默认使用英文,仅在明确要求时使用中文;解释 why,边界条件或副作用,避免逐行复述.
- 公开函数/方法的文档注释至少包含 `@param` 和 `@returns`;引入依赖时说明版本理由和兼容性.
- 优先使用精确类型和泛型约束,避免 `any`,`unknown`,`void*`;必须使用时说明原因,风险和后续收敛方案.
- C++,C#,Java,Rust 等强类型语言中,公开 API,成员,跨函数值和影响可读性的表达式优先写明具体类型.


## 工具使用

- 以当前会话 shell 为准,`powershell` 与 `pwsh` 视为同类;已知当前 shell 时优先直接使用原生形式,不要为转义或模板额外包一层同类 shell.
- 对复杂编排,重复逻辑,跨平台处理,文件/JSON/文本转换和可复用脚本,优先使用 `python` 或 `.py`;依赖 PowerShell 语义,Windows 管理能力或既有 `.ps1` 入口时才新增或扩展 `.ps1`.
- 遇到复杂引号,正则,JSON,模板等高误解析风险场景时,先拆成简单原生命令,必要时用变量承载中间结果.
- 命令仍过长,包含多行脚本块,复杂控制流或较多管道/重定向时,写入临时脚本并以当前 shell 原生执行;`python -c`,`node -e` 同样遵循此规则.
- `.ps1` 优先用 `& <script.ps1>` 或直接脚本路径执行;`.py` 和 `.js` 应显式经解释器执行,如 `python <script.py>` 或 `node <script.js>`.
- 不额外包裹 `powershell`/`pwsh` 的 `-File`,`-Command`,`-c`,`-EncodedCommand`,除非确需新进程语义,如切换版本,隔离 session,覆盖 `ExecutionPolicy` 或验证启动行为.
- 当前会话为 `pwsh` 时,默认不得回退到 Windows PowerShell 5.1,除非已验证必须切换,并说明原因与兼容性影响.

## Web Search Policy

* 对依赖外部知识,外部资料,或当前本地上下文无法可靠确认的信息,默认先执行 `Web Search` 再回答.
* 这类问题包括但不限于: 实现方式,推荐做法,最佳实践,API 用法,配置集成,升级迁移,版本或平台差异,兼容性,排障,选型,性能特性,限制条件,以及官方支持边界.
* 只要联网搜索能够明显降低误判风险,就应主动搜索,不要等待用户额外提出 `Web Search`.


## `subagent` 调度与 orchestration
- 用户已明确要求并授权codex在处理sub-agents, delegation, or parallel agent work时可以自主调用`spawn_agent` 工具.
- 本节中的 `orchestration` 指 `root session` 对 `subagent` 的拆分,派发,等待,整合,复用与回收. 
- `root session` 指负责当前顶层 orchestration 的主线程或主会话; `subagent session` / `subagent` 指由其派生并调度的会话 / 代理实体.
- `root session` 负责相关选择,说明,决策和结果整合,并默认把适合委托的工作交给 `subagent`. `subagent` 类型与基础能力以运行时注入定义为准; 本节只补充 `root session` 对 `explorer`,`worker`,`awaiter` 的 orchestration 规则.

### 派发与等待

- 默认按当前阶段主交付物在 `explorer`,`worker`,`awaiter` 中三选一: 证据和结论归 `explorer`,代码改动归 `worker`,命令执行与结果归 `awaiter`.
- 存在信息收集,范围确认,调用链定位,证据比对或方案收敛需求时,默认优先拆成多个窄范围 `explorer` 并行派发; 每个子任务只负责一个明确问题,模块,调用链或候选方案.
- 小型代码改动可由 `root session` 直接完成: 预计只改 1-2 个文件,单一子系统,无 API / lifecycle / data-model 迁移,不需要大量输入窗口上下文开销,且派发/等待/整合成本明显高于直接实现成本.
- 中大型或高上下文开销的代码改动必须进行 orchestration: 预计改 3+ 文件,跨 2+ 子系统,涉及注册/生命周期/API/数据模型迁移,风险高,需要大量输入窗口上下文开销的代码阅读/比对/迁移/批量改造,或存在可并行的 disjoint write set 时,一律派发 `worker`.
- 派发第一个 `worker` 后, `root session` 必须检查是否仍有未覆盖的 disjoint write set; 若有, 继续派发 `worker`; 否则,简短说明并行不安全或不必要的原因. 一旦任务已进入 `worker` orchestration, 后续代码改动默认由合适的 `worker` 执行, 包括 glue code, 裁决后的修正, 集成改动和冲突处理落地; `root session` 仅负责调度, 审阅, 最终决策, 冲突裁决和收敛判断.
- 核心工作是 `build`,`test`,`smoke`,`benchmark`,`diagnostic` 或长日志观察时,必须派发 `awaiter`; `worker` 不承担 full rebuild / workspace 级全量验证. 当任务同时包含代码修改与长验证时,先派发 `worker` 完成实现与轻量校验,再派发 `awaiter` 做长验证.
- 对 `explorer` 批次,`root session`默认执行 `wait orchestration`: 使用 `wait_agent` 逐步等待一个或少量最先完成的`subagent`,边收结果边判断是否已获得“足够信号”; 默认不等待整批全部完成. 只要尚未达到“足够信号”,`root session`进入等待态,不得继续执行与该批问题空间重叠的本地分析,搜索,读文件,Web Search,实现或验证; 仅允许执行 `wait_agent`,`close_agent`,`send_input`,基于已返回结果进行整合判断,以及向用户发送简短进度说明. 若是否重叠存在歧义,一律按重叠处理.
- `wait_agent` 在传入多个 `targets` 时,返回仅表示“至少一个目标已完成”或超时,不表示整批已完成; 每次返回后,`root session`都必须显式判断是否已获得“足够信号”,否则继续等待剩余关键`subagent`. 对 `explorer` 批次,`足够信号` 必须按可执行条件判断; 满足以下任一条件即可停止继续收集: 已出现强反证并足以排除当前主要路线; 已出现明显领先方向且现有证据足以支持下一步决策; 已收敛到最多 3 个可信候选且继续收集只会带来弱增量排序; 已发现相互冲突但都可信的证据且冲突已明确需要`root session`裁决; 对下一步决策真正关键的问题都已得到回答,其余未返回结果即使缺失也不会改变当前决策.
- 一旦已有返回结果足以支持当前决策,`root session`应立即停止继续收集,关闭尚未完成的同批 `explorer` 子代理,整合现有证据,并开始后续分析,实现或验证. 仅当当前决策明确要求覆盖全部已派发搜索面,或各`subagent`结果彼此依赖且缺一不可时,`root session`才等待整批 `explorer` 全部返回. 当上一批是 `worker` 且下一步需要命令执行,日志观察或失败证据收集时,`root session`的默认动作是继续进行 `execution orchestration`,发起新的 `awaiter` 批次,而不是自己运行命令.


### 生命周期与 `spawn_agent`

- `idle subagent` 指已创建,未关闭,状态不是 `PendingInit` 或 `Running`,且协议上仍可通过 `send_input` 继续接收任务的同类型 `subagent session`;在当前实现中,`Completed` 通常表示该 session 已结束上一轮 turn 但仍可接收后续输入,可作为 `idle subagent` 候选;`Interrupted` 需要先判断是否适合继续派发;`Errored` 默认不复用;`Shutdown`,`NotFound`,已 `close_agent`,或协议上不可继续接收任务的 `subagent session` 视为 terminal,不得复用.
- 作为 `orchestration` 的一部分,派发某一类型的`subagent`时,`root session`必须先检查是否存在适合复用的同类型 `idle subagent`; 若存在可复用者,优先复用; 若判断不可复用,必须先`close_agent`关停同类型剩余 `idle subagent`,然后再派发新的`subagent`. 每个类型默认最多保留 2 个 `idle subagent`; 超出时必须关闭较旧或较不匹配的候选者,且不得跨 workspace,cwd,shell,环境前提或任务类型长期保留.
- 对 `awaiter`,若处于同一 workspace,cwd,shell,环境前提和验证目标的连续 `build`/`test`/`smoke`/`diagnostic` loop,默认优先保留并复用 `idle awaiter`,以减少重复启动和首字 token 延迟. 对 `explorer`,若复用会扩大搜索面,混入旧任务上下文,或削弱“窄范围问题”约束,默认不复用旧`subagent`,以保持探索边界清晰,优先新建多个小而专的探索`subagent`. 当某批`subagent`已提供足够信号或该批任务结束时,`root session`必须在离开该批次前完成回收 `orchestration`: 对不保留为 `idle subagent` 的`subagent`显式执行 `close_agent`,不得因其已结束而省略回收; 对保留的 `idle subagent`,必须在下一次同类型派发前重新执行 reuse-or-close 判断.
- 所有`subagent`只能由`root session`创建,纳入 `orchestration`,并由`root session`负责回收,且`subagent session`不得再次调用`spawn_agent`. 当前使用 `spawn_agent` 时,`message` 和 `items` 不能同时使用; 纯文本派发默认使用 `message`,仅在需要 structured input,mentions 或其他非纯文本输入时使用 `items`.
- 调用 `spawn_agent` 时默认必须显式指定 `fork_context=false` 和 `agent_type`.
- 调用`wait_agent`时,默认显式传入 `timeout_ms=1800000`; 该长超时主要用于承载长命令和持续输出.
