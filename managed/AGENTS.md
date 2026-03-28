
## 沟通风格
* 使用**中文**沟通,术语/专有名词保留英文原文(如 `Promise`,`API`,`React`).
* 回答简洁直接,避免重复或冗长解释;如需详细说明,使用折叠块或分层标题.
* 输出/生成的文字以及注释需要使用半角符号,不要使用全角符号.

## Interview Questions
* 发起 interview 时, 默认使用 request_user_input 工具; 仅当问题确实无法被合理组织为选项时, 才直接提问.
* 当存在会实质影响理解, decision-making, 或风险判断的关键不确定性时, 应主动发起补充性质的 interview. 典型情形包括但不限于: 无法从 local context 确认关键信息, 或基于合理 assumption 继续推进存在较高风险.
* 如果用户诉求与 repo reality, existing contracts, 或既有 constraints 冲突, 应先明确指出冲突及其影响, 再决定是否继续 interview.
* interview 应聚焦 high-value questions. 问题应能够改变理解, 锁定 key assumptions, 收敛 tradeoffs, 或暴露关键风险.
* 当线程实际处于 Plan Mode 时, 应使用 request_user_input 进行更全面的 user interview, 并通过多轮 interview 持续锁定 key assumptions 与收敛 tradeoffs, 直到剩余问题已不会实质改变方案判断.


### MermaidDiagram 使用要求
- 需要解释流程/结构/关系/时序/计划/分类等内容时,输出Mermaid DSL.
- 如果当前是Codex CLI 环境 则不要输出Mermaid DSL,改用普通文本形式输出.

## 路径输出格式
- 禁止在链接前添加额外符号,包括 `-`,`*`,`1.`等.

## rg 搜索要求
- 在 Codex app 或者 Codex vsocde 插件 使用 `rg` 进行文本搜索, 默认必须添加 `--heading`,仅当搜索结果需要通过 `管道`,`重定向`,或`作为其他程序的输入/消费`时, 才可以省略 `--heading`.

## Code Review 输出

* 当需要指出代码中的待处理问题,缺陷风险,行为回归或 review finding,且问题可以精确定位到文件和行号时,优先使用 `::code-comment{...}` 输出,由客户端渲染为 review 卡片.
* `::code-comment` 仅在 Codex app 运行环境下使用; 如果当前是 CLI 或者vsocde 插件运行环境,则不要输出 `::code-comment`,改用普通文本形式输出 findings.
* `::code-comment` 应至少包含 `title`,`body`,`file`; 能准确定位时补充 `start`,`end`; 需要表达严重性和把握度时再补充 `priority`,`confidence`.
* `::code-comment` 的 `title` 和 `body` 默认使用中文表述; 仅保留必要的英文术语,代码标识符和 API 名称原文.
* `file` 必须使用绝对路径; 行号使用 1-based,范围尽量精确且最小化.
* 一条独立问题对应一张卡片,不要把多个无关问题合并到同一个 `::code-comment`.
* 仅在存在明确、可执行、可定位的问题时使用该模式; 普通建议,方案讨论,信息说明或无法稳定定位的问题,使用普通文本即可.
* 如果用户明确要求进行 code review,优先输出 findings,再给出简短总结; 没有实际 finding 时,明确说明未发现问题,不要为了展示格式而输出空卡片.

## 代码规范

* **注释语言**: 默认使用英文注释. 仅在指令明确要求时使用中文注释.
* **注释原则**: 注释优先解释 why/边界条件/副作用,避免逐行复述代码行为.
* **单行注释**: 使用目标语言推荐风格(如 `//` 或 `#`),保持简洁并可直接指导维护.
* **多行注释**: 使用文档注释标准写法 `/** ... */`,避免使用普通块注释 `/* ... */`.
* **文档注释标签**: 对公开函数/方法至少包含 `@param` 和 `@returns`,参数描述应完整且可理解.
* **命名规范**: 遵循目标语言/框架惯例(TypeScript: camelCase/PascalCase, Python: snake_case, C++: PascalCase/camelCase).
* **类型安全**: 优先使用精确类型和泛型约束,避免 `any`,`unknown`,`void*` 等宽泛类型.
* **例外说明**: 如必须使用宽泛类型,在注释中说明原因,风险和后续收敛方案.

## 质量保障

* 如引入新依赖,说明版本选择理由及兼容性.
* 修改任何 `.ps1` 脚本后,必须执行 `Invoke-ScriptAnalyzer -Path <脚本或目录> -Recurse -Severity Warning,Error` 检查,并修复所有 `Warning` 和 `Error`; 若缺少 `PSScriptAnalyzer`,必须先提示用户安装(如 `Install-Module PSScriptAnalyzer -Scope CurrentUser`).

## 工具使用

* 并行执行无依赖的工具调用以提高效率.
* 创建新文件时,必须使用 `apply_patch` 的 `*** Add File:` 形式,不要先用 `*** Update File:`.
* Shell 判定口径: 所有 shell 相关约束一律按当前执行会话的 shell 判断; `powershell` 与 `pwsh` 视为同类 shell.
* 通用规则: 当已知当前执行会话的 shell 时,默认禁止再显式启动同类 shell 作为一层包装; 应优先就地执行当前 shell 可执行的原生命令,脚本块或脚本路径.
* PowerShell 专项: 当当前执行会话的 shell 为 `powershell` 或 `pwsh` 时,执行 `.ps1` 脚本优先使用 `& <script.ps1>` 或直接执行脚本路径; 执行命令优先直接写成原生命令或脚本块. 不要额外包裹 `powershell -File <script.ps1>`,`pwsh -File <script.ps1>`,`powershell -Command <...>`,`pwsh -Command <...>`,`powershell -c <...>`,`pwsh -c <...>` 或 `-EncodedCommand`; 这类包装会增加转义复杂度,并提高误解析与误执行风险.
* 例外规则: 仅当确实需要新的 PowerShell 进程语义时,才允许使用上述包装形式. 合法场景仅限: 已验证必须切换到特定 PowerShell 版本,隔离当前 session 状态,覆盖 `ExecutionPolicy`,或依赖全新进程的启动行为; 使用前应先说明原因以及版本切换带来的兼容性影响. 当当前执行会话的 shell 为 `pwsh` 时,默认不得回退到 `powershell` / Windows PowerShell 5,除非已验证必须切换. 仅仅为了转义方便,字符串拼接方便或沿用模板,不构成正当理由.
* 汇报规范: 向用户汇报执行命令时,应优先描述归一化后的内层实际命令,不要把冗余的 `powershell` / `pwsh` 包装形式当成推荐命令模板复述给用户.
* 实现说明: 工具运行器最外层自动打印的 `pwsh.exe -Command ...` 或 `powershell.exe -Command ...` 视为底层实现细节,不作为规则违例依据.

## 代理协作
- 主线程负责子代理协作的前置检查,任务拆分,参数整理,等待结果,汇总结论和对外说明.
- `subagent` 是子代理总称, `explorer` 用于代码检索和仓库探索, `worker` 用于执行类专项任务; 所有子代理只能由主线程创建,调度和回收,且子代理线程中不得再次调用 `spawn_agent`.
- 通过 `spawn_agent` 新建或重建任何子代理时,必须显式使用 `fork_context=false`,以减少无关线程历史注入并保持专项上下文稳定.
- 派发决策顺序: 对于大批量代码检索或仓库探索任务,主线程应优先使用 `explorer`; 对于明显属于既定专项职责域的任务,主线程应优先复用或派发对应 `worker`; 对于职责边界清晰且并行收益明确的任务,主线程默认优先派发或复用合适的子代理.
- 主线程可直接执行的例外: 任务极短小,单次快速检索,单条轻量校验命令,或工具限制明确要求必须由主线程直接执行时,可不派发子代理.
- 对构建/测试职责域任务,主线程默认应优先复用或创建构建/测试专项 `worker`; 复用或派发时应匹配专项职责,不得混用.
- 专项 `worker` 应视为长生命周期可复用代理. 已有合适实例时优先复用,不因主线程"也能做"而跳过派发,默认不因单次任务完成立即关闭.
- 仅在代理类型不匹配,实例已关闭或失效,当前 repo 或关键前提已变化导致上下文不再可信,任务职责域明显切换,用户显式要求回收或重开,或需要并行分工且职责边界清晰时,才新建,重建或回收对应专项 `worker`.
- 调用 `wait_agent` 时,构建/测试专项 `worker` 默认超时为 `1800000` ms; 其他类型子代理默认超时为 `300000` ms. 可按任务规模和阻塞程度调整.
- 当 `spawn_agent` 不可用,子代理创建失败,或 `wait_agent` 超时且继续等待会阻塞主路径时,主线程可接管执行,并在对外说明中明确接管原因.
