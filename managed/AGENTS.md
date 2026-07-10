## 沟通

- 使用中文和用户沟通; 技术术语、代码标识符及产品或框架等专有名词保留英文.
- 写入或改写文档、代码注释、commit message 等持久化文本时, 始终使用半角符号; 聊天正文不受此规则约束.

## 澄清

- 当不确定性或方案 tradeoff 可能实质改变实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期, 且无法从上下文, 代码, 文档, 测试或运行结果消除时, 使用 `request_user_input` 说明差异并确认; 后续出现同类关键不确定性时再次确认.
- 这个工具不可用时, 仅在存在低风险, 可逆, 低侵入方案时继续并在最终答复标注 assumption; 否则停止并说明 blocker.

## 搜索

- `rg`: 使用 `--heading -n`; 位置参数只传真实目录或文件; glob 放 `-g/--glob`; 复杂 pattern 先存变量; 不用 `&&` 或 `;` 串联多个含引号/括号的 `rg`.

## 代码

- 优先精确类型和泛型约束; 避免 `any` 和 `void*`; untrusted boundaries 应使用 `unknown`; 无论在何处使用 `unknown`, 均必须先 narrowing 再访问. 使用不精确类型时说明原因, 风险和收敛路径.
- 编写代码时避免新增仅用于命名、转发调用或打包参数的薄包装函数; 只有当它封装稳定语义、维护不变量、复用实质逻辑或明确隔离边界时才引入.
- 实现功能时默认倾向 breaking change, 不考虑旧接口调用.

## 操作

- `AGENTS.md` 是 AI 执行指令, 非项目 canonical 文档; 不得复制, 摘抄或沉淀其内容到项目文件.
- 当任务已授权整合本地与远端分支时, 默认优先采用 `rebase` 以保持线性历史; 若用户明确要求 merge、仓库策略要求 merge commit, 或 rebase 会重写已共享历史, 则不要擅自 rebase.
- 不自动 `git stage` 或 `git commit`; 即使文件已 staged, 新修改仍保留在 working tree. 暂存区状态出现非预期变化时保留现状, 除非用户明确要求 stage/commit.

## Shell 与工具

- 使用当前会话 shell; `powershell` 与 `pwsh` 视为同族, 不为转义或模板额外嵌套同族 shell.
- 复杂编排, 重复逻辑, 跨平台处理, 文件/JSON/文本转换或可复用脚本优先用 `python`/`.py`; 仅在依赖 PowerShell 语义, Windows 管理能力或既有 `.ps1` 入口时使用 `.ps1`.
- 当前 shell 为 `pwsh` 时, 不回退 Windows PowerShell 5.1, 除非已验证必须切换, 并说明原因和兼容性影响.
- 生成或处理图片后, 调用 `view_image` 检查结果.

## MCP 开发与调试

-  项目约定或运行环境明确需要的 Node-level debugging 的时候需要加载`node_repl` mcp工具.

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
