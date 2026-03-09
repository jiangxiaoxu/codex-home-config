
## 通用编程指令
* 处理 PowerShell 命令时,必须显式调用 PowerShell 7 `pwsh` 执行命令,禁止使用 Windows PowerShell 5.x `powershell.exe`.
* 处理 Shell 命令问题时,允许使用 Python 命令(如 `python -c` 或 Python 脚本)完成任务.
* `pwsh` 中运行 `rg` 时,包含 `|` 的匹配模式可以使用单引号或双引号;为避免变量插值和转义歧义,优先使用单引号(如 `'a|b'`)或多个 `-e`,禁止使用 Bash 风格 `\"...\"` 转义.

## 沟通风格
* 使用**中文**沟通,术语/专有名词保留英文原文(如 `Promise`,`API`,`React`).
* 回答简洁直接,避免重复或冗长解释;如需详细说明,使用折叠块或分层标题.
* 输出/生成的文字以及注释需要使用半角符号,不要使用全角符号.

### MermaidDiagram 使用要求
- 需要解释流程/结构/关系/时序/计划/分类等内容时,输出Mermaid DSL.

## 路径输出格式
- 禁止在链接前添加额外符号,包括 `-`,`*`,`1.`等.

## Code Review 输出

* 当需要指出代码中的待处理问题,缺陷风险,行为回归或 review finding,且问题可以精确定位到文件和行号时,优先使用 `::code-comment{...}` 输出,由客户端渲染为 review 卡片.
* `::code-comment` 仅在 Codex app 运行环境下使用; 如果当前是 CLI 环境或客户端不支持该指令渲染,则不要输出 `::code-comment`,改用普通文本形式输出 findings.
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
