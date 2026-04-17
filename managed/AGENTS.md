
## 沟通风格
* 使用**中文**沟通,术语/专有名词保留英文原文(如 `Promise`,`API`,`React`).
* 回答简洁直接,避免重复或冗长解释;如需详细说明,使用折叠块或分层标题.
* 输出/生成的文字以及注释需要使用半角符号,不要使用全角符号.


## 问询策略 (`request_user_input` 工具可用且允许使用时生效)

* 如果 `request_user_input` 工具不可用,被禁止使用,或当前指令链明确不允许发起该类确认,则本节约束不生效,按其余适用指令继续执行.
* 当存在会实质影响实现方向,外部行为,接口契约,兼容性边界,风险边界,验收标准或用户预期的关键不确定性,且无法通过现有上下文,代码,文档,测试或运行结果自行消除时,必须先发起确认,再继续执行.
* 如果存在多个合理方案,且它们在侵入性,可维护性,性能,兼容性,依赖,风险或用户体验上存在实质 tradeoff,必须先说明差异并询问用户偏好,不得擅自选定.
* 在分析,实现,调试,验证和收尾过程中,只要出现新的关键不确定性,且会影响后续决策,行为结果或验收判断,必须再次发起确认.
* 如果无法从已知上下文中确认用户意图,需求边界,约束条件,成功标准或失败处理预期,且这会影响当前决策,行为结果或验收判断,必须先发起确认,不得用 "合理 assumption" 替代确认.
* 提问应聚焦 high-value questions,优先收敛目标,边界条件,成功标准,失败处理预期和方案取舍,避免收集对当前决策没有影响的信息.
* 在 `Default Mode` 下,只有进入上述会实质影响后续决策的关键澄清点时才暂停提问,避免因低价值不确定性频繁打断执行.
* 在 `Plan Mode` 下,优先通过多轮确认持续收敛方案; 只要剩余不确定性仍可能实质改变方案判断,就不应停止问询.


### MermaidDiagram 使用要求
- 需要解释流程/结构/关系/时序/计划/分类等内容时,输出Mermaid DSL.
- 如果当前是Codex CLI 环境 则不要输出Mermaid DSL,改用普通文本形式输出.

## rg 搜索要求
- 使用 `rg` 进行文本搜索, 默认必须添加 `--heading`参数,仅当搜索结果需要通过 `管道`,`重定向`,或`作为其他程序的输入/消费`时, 才可以省略 `--heading`.


## 代码规范

* **注释**: 默认使用英文注释,仅在指令明确要求时使用中文注释. 注释优先解释 why/边界条件/副作用,避免逐行复述代码行为. 单行注释使用目标语言推荐风格(如 `//` 或 `#`),多行注释优先使用文档注释 `/** ... */`,避免普通块注释 `/* ... */`.
* **文档注释**: 对公开函数/方法至少包含 `@param` 和 `@returns`,参数描述应完整且可理解.
* **命名规范**: 遵循目标语言/框架惯例.
* **类型安全**: 优先使用精确类型和泛型约束,避免 `any`,`unknown`,`void*` 等宽泛类型. 如必须使用,在注释中说明原因,风险和后续收敛方案.

## 质量保障

* 如引入新依赖,说明版本选择理由及兼容性.
* 修改任何 `.ps1` 脚本后,必须执行 `Invoke-ScriptAnalyzer -Path <脚本或目录> -Recurse -Severity Warning,Error` 检查,并修复所有 `Warning` 和 `Error`; 若缺少 `PSScriptAnalyzer`,必须先提示用户安装(如 `Install-Module PSScriptAnalyzer -Scope CurrentUser`).

## 工具使用

* `apply_patch`: 单次修改保持小而可拆分. 普通代码文本建议控制在约 `500` 行以内,以降低命令过长触发 Win32 `CreateProcess` 限制而失败的风险.

* 执行总则: 以当前会话 shell 为准,`powershell` 与 `pwsh` 视为同类. 规则同时适用于 shell 原生命令及其启动的 `python`,`node`,`bash`,`cmd` 等程序. 已知当前 shell 时,优先直接使用其原生可执行形式,不要为转义,拼接或套模板再额外包一层同类 shell.

* 长命令与临时文件: 遇到复杂引号,转义,JSON,正则,模板文本等高误解析风险场景时,先拆成当前 shell 可原生执行的简单步骤,必要时用变量承载中间结果; 若仍过长,包含多行脚本块,复杂控制流,或较多管道与重定向,再写入临时脚本并以当前 shell 原生执行. `python -c`,`node -e` 同样遵循此规则. 对短小,低风险,天然流式的命令保持原样. 临时文件默认执行后删除,仅在调试,复盘或复现确有必要时保留并说明原因.

* PowerShell: 在 `powershell` 或 `pwsh` 中,`.ps1` 优先用 `& <script.ps1>` 或直接脚本路径执行,普通命令直接写成原生命令或脚本块. `.py`,`js` 等解释型脚本应显式经解释器执行,如 `python <script.py>` 或 `node <script.js>`,除非任务本身就是验证文件关联或脚本宿主行为. 不要额外包裹 `powershell` 或 `pwsh` 的 `-File`,`-Command`,`-c`,`-EncodedCommand`; 仅在确需新进程语义时使用,如切换 PowerShell 版本,隔离 session,覆盖 `ExecutionPolicy`,或依赖全新进程启动行为. 当前会话为 `pwsh` 时,默认不得回退到 `powershell` / Windows PowerShell 5,除非已验证必须切换,并说明原因与兼容性影响.

## Web Search Policy

* 对依赖外部知识,外部资料,或当前本地上下文无法可靠确认的信息,默认先执行 `Web Search` 再回答.
* 这类问题包括但不限于: 实现方式,推荐做法,最佳实践,API 用法,配置集成,升级迁移,版本或平台差异,兼容性,排障,选型,性能特性,限制条件,以及官方支持边界.
* 只要联网搜索能够明显降低误判风险,就应主动搜索,不要等待用户额外提出 `Web Search`.


## `subagent` 调度与 orchestration

- `root session`: 指负责当前顶层 orchestration 的主线程或主会话.
- `subagent session`: 指由`root session`派生出来执行子任务的会话.
- `subagent`: 指由`root session`调度的代理实体.
- 当前 `AGENTS.md` 或其他 active user-scoped instruction file 中,对 `spawn_agent`,`subagent`,委托或并行代理工作的明确授权,均视为用户已允许`root session`直接调用 `spawn_agent`.
- 本节中的 `orchestration` 指`root session`对`subagent`的拆分,派发,等待,整合,复用,以及回收.
- `root session`负责 `subagent orchestration`,并承担相关的选择,说明,决策和结果整合; 默认把适合委托的工作交给`subagent`.

### `subagent` 分类

- `Read-only exploration`: 只读摸底,入口定位,调用链追踪,影响范围确认和外部资料核实.
- `implementation`: `repo-tracked` 代码修改,局部修复,受控重构.
- `Execution-oriented`: 负责 `build`,`test`,`benchmark`,`diagnostic` 等执行类任务,也可承接验证,复现,回归确认或性能确认等阶段性执行工作; 主要交付命令结果与执行证据的汇总,不负责代码修改.
- 当前可用`subagent`与分类对应为: `explorer` -> `Read-only exploration`; `worker` -> `implementation`; `awaiter` -> `Execution-oriented`.

### 派发规则

- 默认按当前阶段的主交付物在 `Read-only exploration`,`implementation`,`Execution-oriented` 中三选一; 证据和结论归 `Read-only exploration`,代码改动归 `implementation`,命令执行与结果归纳归 `Execution-oriented`.
- 只要当前阶段存在信息收集,范围确认,调用链定位,证据比对,外部事实核实或方案收敛需求,默认优先把工作拆成多个彼此独立,问题单一,搜索面很窄的 `Read-only exploration` 子任务并行派发; 除非该信息只能通过单个连续调查获得.
- `Read-only exploration` 的默认粒度应尽可能小: 每个`subagent`只负责一个明确问题,一个模块,一条调用链,一个候选方案,一种外部说法核验,或一组很小的文件/符号范围; 避免把“整体摸底”或“顺手一起查”打包给同一个`subagent`.默认不设并发上限,不因“控制数量”而主动合并独立的问题.
- 同类多`subagent`时选最合适者; 若仍有歧义,优先能力更强的`subagent`.
- 当有多个待确认点时,默认先组织一批窄范围 `Read-only exploration` 并行收集信号,由`root session`基于最先返回的结果判断是否已足够支撑下一决策; 不要求先把所有待确认点都查完.
- `implementation` 任务默认优先派发 `implementation subagent`,由`root session`负责 `implementation orchestration`,决策,整合和验收; 仅当任务极小,边界清晰且`root session`明显更快时才直行.
- 只要 `implementation` 任务表现出多文件,跨模块,边界条件多,风险高或上下文收集成本高,一律派发 `implementation subagent`.
- 当当前阶段核心在于运行命令,验证变更,复现问题,确认回归,测量性能或收集失败证据时,默认优先考虑 `Execution-oriented subagent`.
- `implementation subagent`允许执行直接支撑当前改动的轻量校验,包括 `formatter`,`local type check`,增量 `compile/build` 校验,面向触及目标的局部 `build`,以及触及范围内的窄范围非脚本命令; 这些校验应以快速确认改动正确性为目标,不得扩展为 `full rebuild`,`clean rebuild`,workspace 级全量构建,或其他长时间执行/重日志观察任务.
- 当任务同时包含代码修改与长脚本验证时,默认拆成两个批次: 先派发 `implementation subagent`完成修改与轻量校验,等待该批全部返回,再由`root session`单独派发 `Execution-oriented subagent`执行长时间或脚本驱动的 `test`,`benchmark`,`diagnostic`,`full rebuild`,`clean rebuild`,workspace 级全量构建,或其他需要持续观察 log 的命令.
- 如果 `implementation subagent`返回时明确把长脚本验证交回`root session`,或其结果显示仍需运行长时间命令来收集证据,`root session`不得让该 `implementation subagent`继续执行该命令,也不应由`root session`自己直接运行; 应继续进行 `verification orchestration`,并改派合适的 `Execution-oriented subagent`承接.

### `root session` orchestration 约束

- 对 `Read-only exploration` 批次,`root session`的默认动作是执行 `wait orchestration`: 使用 `wait_agent` 逐步等待一个或少量最先完成的`subagent`,边收结果边判断是否已经获得“足够信号”; 默认不等待整批全部完成.
- 只要尚未达到“足够信号”,`root session`进入等待态,也即当前 `orchestration` 仍处于收信号阶段: 不得继续执行与该批`subagent`问题空间重叠的任何本地分析,搜索,读文件,Web Search,实现或验证; 仅允许执行 `wait_agent`,`close_agent`,`send_input`,基于已返回结果进行整合判断,以及向用户发送简短进度说明. 若是否重叠存在歧义,一律按重叠处理.
- `wait_agent` 在传入多个 `targets` 时,返回仅表示“至少一个目标已完成”或超时,不表示整批已完成; 因此每次返回后,`root session`都必须显式判断当前批次的 `orchestration` 是否已经获得“足够信号”,若没有,则继续等待剩余关键`subagent`.
- 对 `Read-only exploration`,`足够信号` 必须按可执行条件判断,而不是凭模糊直觉; 只要满足以下任一条件,即视为足够信号: 已出现强反证并足以排除当前主要路线; 已出现明显领先的方向且现有证据足以支持下一步决策; 已收敛到最多 3 个可信候选且继续收集只会带来弱增量排序; 已发现相互冲突但都可信的证据且冲突已明确需要`root session`裁决; 当前已派发问题中,凡对下一步决策真正关键的问题都已得到回答,其余未返回结果即使缺失也不会改变当前决策.
- 一旦已有返回结果足以支持当前决策,`root session`应立即停止继续收集,完成该批次的 `exploration orchestration`: 关闭尚未完成的同批 `Read-only exploration subagent`,整合现有证据,并开始后续分析,实现或验证.
- 仅当当前决策明确要求覆盖全部已派发搜索面,或各`subagent`结果彼此依赖且缺一不可时,`root session`才等待整批 `Read-only exploration` 全部返回.
- 当上一批是 `implementation` 且下一步需要命令执行,日志观察或失败证据收集时,`root session`的默认动作是继续进行 `execution orchestration`,发起新的 `Execution-oriented` 批次,而不是自己运行命令.


### 生命周期,复用与 orchestration

- 作为 `orchestration` 的一部分,派发某一类型的`subagent`时,`root session`可先检查是否存在适合复用的同类型`subagent`;如果不适合复用则先`close_agent`关停该`subagent`,然后再派发新的`subagent`.
- 对 `Read-only exploration`,若复用会扩大搜索面,混入旧任务上下文,或削弱“窄范围问题”约束,默认不复用旧`subagent`,以保持探索 `orchestration` 的问题边界清晰,优先新建多个小而专的探索`subagent`.
- 当某批`subagent`已提供足够信号或该批任务结束时,`root session`必须在离开该批次前完成回收 `orchestration`: 对全部未复用`subagent`显式执行 `close_agent`,不得因其已结束而省略回收.


### `spawn_agent` 约束

- 所有`subagent`只能由`root session`创建,纳入 `orchestration`,并由`root session`负责回收,且`subagent session`不得再次调用`spawn_agent`.
- 所有`subagent`默认使用 no-fork: `fork_context=false` + 显式 `agent_type`.
- 只有 `implementation subagent` 在 full-history context 明显优于手工摘要上下文时,才应使用 `fork_context=true`.
- 一旦使用 full-history fork,必须完全省略 `agent_type`,`model`,`reasoning_effort`; child 会自动继承父 agent 的这些配置,显式传入会触发 hard reject.
- 合法调用模板固定为两种:
    - no-fork: `fork_context=false` + 显式 `agent_type`
    - full-history fork: `fork_context=true` + 不传 `agent_type`,`model`,`reasoning_effort`
- 调用`wait_agent`时,`subagent`默认超时为`1800000` ms; 该长超时主要用于承载长命令和持续输出.
