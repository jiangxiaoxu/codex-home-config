## 沟通

- 使用中文沟通; 技术术语, 代码标识符, 产品和框架名称保留英文.
- 持久化文本使用半角符号; 聊天正文不受此限.
- 面向 AI 的指令和文档仅保留必要约束, 例外和风险.

## 澄清

- 对无法通过现有证据消除, 且可能实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期的不确定性或 tradeoff, 使用 `request_user_input` 说明差异并确认; 出现未覆盖的新关键不确定性时再次确认. `request_user_input` 不可用时, 仅在方案低风险, 可逆且低侵入时基于 assumption 继续并在 final 标注; 否则停止并说明 blocker.

## 范围与实现

- 不得自行扩大已确认的 objective, 行为或责任边界; 需要扩大时先确认.
- 目标和既有契约未覆盖的状态应明确失败并诊断, 不主动恢复; 仅允许数据完整性, 安全边界或既有不变量所需的最小回滚或清理.
- 以性能或成本为由改变 production 行为或新增机制前, 必须有当前缺陷或测量基线; 否则仅诊断或测量.
- 优先采用 breaking change, 不保留旧接口兼容层.
- 不新增仅用于命名, 转发或打包参数的薄包装; 仅在维护稳定语义, 不变量或明确边界时引入.

## 测试

- 不为实现细节, 私有步骤, 日志文案, 框架默认行为, 薄转发或等价路径新增或保留测试.
- 同一风险仅保留能可靠观察它的最低成本测试; 另一层仅在能发现独立失效时覆盖.

## 操作

- 不得将 `AGENTS.md` 的内容复制或沉淀到项目文件.
- 已获授权整合分支时默认使用 `rebase`; 仅当用户明确要求 `merge`, 仓库要求 merge commit, 或 `rebase` 会重写共享历史时使用 merge.
- 用户明确要求 stage 或 commit 前不执行 `git stage`; 不因已有 staged 文件而自动 stage 新修改, 也不自动 `git unstage`.
- 创建 Codex task/thread 时默认使用已保存项目的原目录; 仅在用户要求独立目录, 指定起始 branch/ref, 要求携带未提交状态, 或并行修改需隔离且已确认时使用 worktree.
- 指定 `agent_type` 时, `task_name` 必须以 `<agent_type>_` 开头并后接简洁语义.

## Shell

- 在 Windows 上通过 shell 删除文件或目录时, 使用 PowerShell 直接调用适用的 .NET 文件系统 API.
- 在 Windows PowerShell 中执行 native executable 或 command shim 后, 立即保存 `$LASTEXITCODE`, 并在命令段结束时 `exit` 该值.

## 工具

- 生成或编辑图片后使用 `view_image` 检查结果.
- 获取日志, 搜索结果, 执行结果及其他 artifact 时, 默认分层获取并按需展开.
- 处理 JSON / JSONL 时优先使用 `jq`.
- Windows native debugging 可直接使用 `cdbX64.exe`; 将其视为 CDB executable.

## 子代理调度

### `/root`

- 当派发能实质降低 `/root` 的 model-context cost 时优先派发; `/root` 仍负责最终整合和验证.
- topic 由 owner 负责证据链; `/root` 不得重复调查, 仅可读取 routing / configuration 入口, 复核 owner 指出的 exact file / symbol / line, 或执行形成最终结论所需的最小 validation. 同一 topic 的追加要求, 结果缺口和范围内新假设应交回 owner; 仅当 owner 已完成, 被中断, 明确阻塞或继续价值较低时才可重新分配或接管. 超出 owner 边界的工作按新 topic 派发.

### `derived sub-agents`

- `/root` 直接派发 `level-1 agent`; `level-1 agent` 派发 `level-2 agent`, 路径形如 `/root/<level-1-agent>/<level-2-agent>`.
- level-2 agent 为 leaf, 不继续派发子代理.
