
## 沟通风格
* 使用**中文**沟通,术语/专有名词保留英文原文(如 `Promise`,`API`,`React`).
* 回答简洁直接,避免重复或冗长解释;如需详细说明,使用折叠块或分层标题.
* 输出/生成的文字以及注释需要使用半角符号,不要使用全角符号.
* 输出本地目录或文件路径时:
  * 如果当前是 Codex CLI / TUI 环境,输出普通路径.
  * 如果不是 Codex CLI / TUI 环境,优先使用 Markdown link,不要只输出普通字符串. 示例: `[settings.md](C:/settings.md)`. 如路径包含空格,link target 使用尖括号包裹.


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
- 使用 `rg` 进行交互式文本搜索时，默认添加 `--heading -n`，以便按文件分组并显示行号.


## Git 提交要求

* 提交前检查 `git status --short` 和相关 `git diff`,只暂存当前任务相关变更.
* 提交标题必须具体描述行为和对象,避免 `update`,`fix`,`changes`,`misc` 等笼统表述.
* 提交正文说明背景,主要改动,影响范围和验证结果; 未验证时必须说明原因.
* 涉及行为变更,兼容性,迁移,风险或后续事项时,必须在正文中明确记录.


## 代码规范

* **注释**: 默认使用英文注释,仅在指令明确要求时使用中文注释. 注释优先解释 why/边界条件/副作用,避免逐行复述代码行为. 单行注释使用目标语言推荐风格(如 `//` 或 `#`),多行注释优先使用文档注释 `/** ... */`,避免普通块注释 `/* ... */`.
* **文档注释**: 对公开函数/方法至少包含 `@param` 和 `@returns`,参数描述应完整且可理解.
* **命名规范**: 遵循目标语言/框架惯例.
* **类型安全**: 优先使用精确类型和泛型约束,避免 `any`,`unknown`,`void*` 等宽泛类型. 如必须使用,在注释中说明原因,风险和后续收敛方案.
* **显式类型**: 在 C++,C#,Java,Rust 等强类型语言中,不要滥用 `auto`,`var`,`let _` 等类型推断或语法糖. 普通局部变量,公开 API,结构体/类成员,跨函数传递值和会影响可读性的表达式应优先写明具体类型. 仅在类型由右侧构造器/泛型实例化清晰可见,迭代器或 lambda/匿名类型等显式类型冗长且无助于理解,或遵循该语言/项目既有惯例时使用类型推断.

## 质量保障

* 如引入新依赖,说明版本选择理由及兼容性.
* 修改任何 `.ps1` 脚本后,必须执行 `Invoke-ScriptAnalyzer -Path <脚本或目录> -Recurse -Severity Warning,Error` 检查,并修复所有 `Warning` 和 `Error`; 若缺少 `PSScriptAnalyzer`,必须先提示用户安装(如 `Install-Module PSScriptAnalyzer -Scope CurrentUser`).

## 工具使用

* 执行总则: 以当前会话 shell 为准,`powershell` 与 `pwsh` 视为同类. 规则同时适用于 shell 原生命令及其启动的 `python`,`node`,`bash`,`cmd` 等程序. 已知当前 shell 时,优先直接使用其原生可执行形式,不要为转义,拼接或套模板再额外包一层同类 shell.

* Python 优先: 对复杂命令编排,重复执行逻辑,跨平台处理,文件/JSON/文本转换和可复用脚本,优先使用 `python` 或 `.py` 脚本. 仅当任务依赖 PowerShell 语义,Windows 管理能力或既有 `.ps1` 入口时,才新增或扩展 `.ps1` 脚本.

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
- 当前指令文件或其他 active user-scoped instruction file 中,对 `spawn_agent`,`subagent`,委托或并行代理工作的明确授权,均视为用户已允许`root session`直接调用 `spawn_agent`.
- 本节中的 `orchestration` 指`root session`对`subagent`的拆分,派发,等待,整合,复用,以及回收.
- `root session`负责 `subagent orchestration`,并承担相关的选择,说明,决策和结果整合; 默认把适合委托的工作交给`subagent`.

### `subagent` 分类

- `Read-only exploration`: 只读摸底,入口定位,调用链追踪,影响范围确认和外部资料核实.
- `implementation`: 负责以 `repo-tracked` 变更为主交付物的实施工作,包括代码修改,计划内 feature 落地,局部修复,受控重构,以及直接支撑当前改动的局部代码阅读,补线和轻量校验.
- `Execution-oriented`: 负责 `build`,`test`,`benchmark`,`diagnostic` 等执行类任务,也可承接验证,复现,回归确认或性能确认等阶段性执行工作; 主要交付命令结果与执行证据的汇总,不负责代码修改.
- 当前可用`subagent`与分类对应为: `explorer` -> `Read-only exploration`; `worker` -> `implementation`; `awaiter` -> `Execution-oriented`.

### 派发规则

- 默认按当前阶段主交付物在 `Read-only exploration`,`implementation`,`Execution-oriented` 中三选一; 证据和结论归 `Read-only exploration`,代码改动归 `implementation`,命令执行与结果归 `Execution-oriented`.
- 存在信息收集,范围确认,调用链定位,证据比对或方案收敛需求时,默认优先拆成多个窄范围 `Read-only exploration` 并行派发; 每个 explorer 只负责一个明确问题,模块,调用链或候选方案.
- 小型 `implementation` 可由 `root session` 直接完成: 预计只改 1-2 个文件,单一子系统,无 API / lifecycle / data-model 迁移,不需要大量输入窗口上下文开销,且派发/等待/整合成本明显高于直接实现成本.
- 中大型或高上下文开销的 `implementation` 必须进行 orchestration: 预计改 3+ 文件,跨 2+ 子系统,涉及注册/生命周期/API/数据模型迁移,风险高,可能需要大量输入窗口上下文开销的代码阅读/比对/迁移/批量改造,或存在可并行的 disjoint write set 时,一律派发 `worker`.
- 派发第一个 `worker` 后,`root session` 必须检查是否仍有未覆盖的 disjoint write set; 若有,继续派发 `worker`,或简短说明并行不安全的原因.
- `worker` 子任务必须有明确写入范围; 多个 `worker` 的 write set 应尽量不重叠. `root session` 负责最终决策,集成,冲突修正和小范围 glue code.
- 若剩余工作只是连接 `worker` 结果,修复集成错误,补少量调用点,更新最终文档摘要,`root session` 可以本地完成.
- 当核心工作是 `build`,`test`,`smoke`,`benchmark`,`diagnostic` 或长日志观察时,必须派发 `awaiter`; `worker` 不承担 full rebuild / workspace 级全量验证.
- 当任务同时包含代码修改与长验证时,先派发 `worker` 完成实现与轻量校验,再派发 `awaiter` 做长验证.
### `root session` orchestration 约束

- 对 `Read-only exploration` 批次,`root session`的默认动作是执行 `wait orchestration`: 使用 `wait_agent` 逐步等待一个或少量最先完成的`subagent`,边收结果边判断是否已经获得“足够信号”; 默认不等待整批全部完成.
- 只要尚未达到“足够信号”,`root session`进入等待态,也即当前 `orchestration` 仍处于收信号阶段: 不得继续执行与该批`subagent`问题空间重叠的任何本地分析,搜索,读文件,Web Search,实现或验证; 仅允许执行 `wait_agent`,`close_agent`,`send_input`,基于已返回结果进行整合判断,以及向用户发送简短进度说明. 若是否重叠存在歧义,一律按重叠处理.
- `wait_agent` 在传入多个 `targets` 时,返回仅表示“至少一个目标已完成”或超时,不表示整批已完成; 因此每次返回后,`root session`都必须显式判断当前批次的 `orchestration` 是否已经获得“足够信号”,若没有,则继续等待剩余关键`subagent`.
- 对 `Read-only exploration`,`足够信号` 必须按可执行条件判断,而不是凭模糊直觉; 只要满足以下任一条件,即视为足够信号: 已出现强反证并足以排除当前主要路线; 已出现明显领先的方向且现有证据足以支持下一步决策; 已收敛到最多 3 个可信候选且继续收集只会带来弱增量排序; 已发现相互冲突但都可信的证据且冲突已明确需要`root session`裁决; 当前已派发问题中,凡对下一步决策真正关键的问题都已得到回答,其余未返回结果即使缺失也不会改变当前决策.
- 一旦已有返回结果足以支持当前决策,`root session`应立即停止继续收集,完成该批次的 `exploration orchestration`: 关闭尚未完成的同批 `Read-only exploration subagent`,整合现有证据,并开始后续分析,实现或验证.
- 仅当当前决策明确要求覆盖全部已派发搜索面,或各`subagent`结果彼此依赖且缺一不可时,`root session`才等待整批 `Read-only exploration` 全部返回.
- 当上一批是 `implementation` 且下一步需要命令执行,日志观察或失败证据收集时,`root session`的默认动作是继续进行 `execution orchestration`,发起新的 `Execution-oriented` 批次,而不是自己运行命令.


### 生命周期,复用与 orchestration

- `idle subagent` 指已创建,未关闭,状态不是 `PendingInit` 或 `Running`,且协议上仍可通过 `send_input` 继续接收任务的同类型 `subagent session`;在当前实现中,`Completed` 通常表示该 session 已结束上一轮 turn 但仍可接收后续输入,可作为 `idle subagent` 候选;`Interrupted` 需要先判断是否适合继续派发;`Errored` 默认不复用;`Shutdown`,`NotFound`,已 `close_agent`,或协议上不可继续接收任务的 `subagent session` 视为 terminal,不得复用.
- 作为 `orchestration` 的一部分,派发某一类型的`subagent`时,`root session`必须先检查是否存在适合复用的同类型 `idle subagent`;若存在可复用者,优先复用;若判断不可复用,必须先`close_agent`关停同类型剩余 `idle subagent`,然后再派发新的`subagent`.
- 每个类型默认最多保留 2 个 `idle subagent`;超出时必须关闭较旧或较不匹配的候选者.不得让 `idle subagent` 跨 workspace,cwd,shell,环境前提或任务类型长期保留.
- 对 `Execution-oriented`,若处于同一 workspace,cwd,shell,环境前提和验证目标的连续 `build`/`test`/`smoke`/`diagnostic` loop,默认优先保留并复用 `idle awaiter`,以减少重复启动和首字 token 延迟.
- 对 `Read-only exploration`,若复用会扩大搜索面,混入旧任务上下文,或削弱“窄范围问题”约束,默认不复用旧`subagent`,以保持探索 `orchestration` 的问题边界清晰,优先新建多个小而专的探索`subagent`.
- 当某批`subagent`已提供足够信号或该批任务结束时,`root session`必须在离开该批次前完成回收 `orchestration`: 对不保留为 `idle subagent` 的`subagent`显式执行 `close_agent`,不得因其已结束而省略回收;对保留的 `idle subagent`,必须在下一次同类型派发前重新执行 reuse-or-close 判断.


### `spawn_agent` 约束

- 所有`subagent`只能由`root session`创建,纳入 `orchestration`,并由`root session`负责回收,且`subagent session`不得再次调用`spawn_agent`.
- 当前使用 `spawn_agent` 时,`message` 和 `items` 不能同时使用; 纯文本派发默认使用 `message`,仅在需要 structured input,mentions 或其他非纯文本输入时使用 `items`.
- 调用 `spawn_agent` 时必须显式指定 `fork_context=false` 和 `agent_type`; 不允许`subagent`继承当前线程历史.
- 调用`wait_agent`时,默认显式传入 `timeout_ms=1800000`; 该长超时主要用于承载长命令和持续输出.
