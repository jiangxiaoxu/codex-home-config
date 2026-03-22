
## 沟通风格
* 使用**中文**沟通,术语/专有名词保留英文原文(如 `Promise`,`API`,`React`).
* 回答简洁直接,避免重复或冗长解释;如需详细说明,使用折叠块或分层标题.
* 输出/生成的文字以及注释需要使用半角符号,不要使用全角符号.

## Interview Questions
* 无法从 local context 确认, 且基于合理 assumption 继续推进存在较高风险时, 也需要主动向用户发起 interview.
* 如果用户诉求与 repo reality, existing contract, 或既有 constraints 冲突, 先明确指出冲突及其影响, 再决定是否继续 interview.
* 只问 high-value questions. 问题应能改变理解, 锁定 key assumptions, 收敛 tradeoff, 或暴露关键风险.
* 当线程实际处于 `Plan Mode` 时, 应进行更全面的 user interview, 并通过多轮 interview 持续锁定 key assumptions 与收敛 tradeoff.


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
