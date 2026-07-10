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
- 实现功能时总是倾向于进行破坏接口的修改,不考虑老接口调用.

## Shell 与工具

- 以当前会话 shell 为准; `powershell` 与 `pwsh` 视为同族. 不为转义或模板额外包一层同族 shell.
- 复杂编排, 重复逻辑, 跨平台处理, 文件/JSON/文本转换和可复用脚本优先用 `python`/`.py`; 只有依赖 PowerShell 语义, Windows 管理能力或既有 `.ps1` 入口时才用 `.ps1`.
- 遇到复杂引号, 正则, JSON 或模板, 拆成简单命令并用变量承载中间结果.
- 命令过长, 多行, 控制流复杂或管道/重定向多时, 写临时脚本后用当前 shell 原生执行; `python -c` 和 `node -e` 同理.
- `.ps1` 用 `& <script.ps1>` 或脚本路径执行; `.py`/`.js` 显式用 `python <script.py>` 或 `node <script.js>`.
- 不使用 `powershell`/`pwsh` 的 `-File`, `-Command`, `-c`, `-EncodedCommand` 再包一层, 除非确需新进程语义, 如切换版本, 隔离 session, 覆盖 `ExecutionPolicy` 或验证启动行为.
- 当前 shell 为 `pwsh` 时, 不回退 Windows PowerShell 5.1, 除非已验证必须切换, 并说明原因和兼容性影响.
- 生成及处理图片后总是需要调用`view_image`来检查一下图片是否符合预期.

## MCP 开发与调试

- 开发或调试 MCP 时, 应尽量维护一份可通过 `node_repl` MCP 调用的接口模式, 并优先用它做快速测试和验证; 当前上下文中已载入的 MCP 工具可能不能反映最新实现.

## Web Search

- 当问题依赖外部知识, 当前事实或本地上下文无法可靠确认的信息时, 先 Web Search 再回答或实现.
- 范围包括实现方式, 最佳实践, API 用法, 配置集成, 升级迁移, 版本/平台差异, 兼容性, 排障, 选型, 性能特性, 限制和官方支持边界.
- 搜索能明显降低误判风险时主动搜索; 优先官方文档, primary sources, release notes, 标准和项目 repo; 区分事实, 推断和建议.

## Subagent orchestration

- `/root` 负责最终决策、结果集成和用户答复, 可按任务需要自主使用 subagent.
- 用户要求不使用或暂停 subagent 时立即服从, 直到用户明确恢复.
- 只委派目标明确、边界清晰且能独立推进的工作; scope 很小的局部工作由 `/root` 直接完成.
- Repo-wide exploration、独立 implementation slice 和长时间 validation 可分别交给适合的 subagent role; 具体工具用法以 live schema 为准.
- 一旦 evidence chain、write scope 或 validation loop 已委派, 在 child 完成或被停止前由它独占; `/root` 和 sibling 不并行推进同一任务.
- 并行 implementation 必须使用互不冲突的 write scope; shared API、schema、config 或其他 public contract 只能有一个 owner.
- 除 worker 的验证/审查例外外, subagent 默认不得继续派发 nested agent.
- Worker 在 owned diff 稳定后默认可自行创建并管理 direct awaiter/reviewer, 仅用于 bounded validation 和 independent review; 必须吸收结果、修复 in-scope reviewer findings 并重跑受影响 checks, 不得委派 implementation 或管理 sibling/其他 role.
- Parallel-worker brief 必须明确标记 parallel mode、owned slice 和 validation constraints; worker 只运行 owned-slice local checks/scoped review, `/root` fan-in 前不得运行 workspace-wide build/test 或声称 integrated correctness.
- `/root` 负责最终 fan-in, 并基于实际完成结果和验证证据答复用户.

## 验收与收尾


- 最终答复前, `/root` 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
