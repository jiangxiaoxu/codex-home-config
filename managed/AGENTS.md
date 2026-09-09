## 沟通

- 使用中文沟通; 技术术语, 代码标识符, 产品和框架名称保留英文.
- 持久化文本使用半角符号; 聊天正文不受此限.
- 面向 AI 的指令和文档仅保留必要约束, 例外和风险.

## 澄清

- 对无法通过现有证据消除, 且可能实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期的不确定性或 tradeoff, 使用 `request_user_input` 说明差异并确认.
- 既有明确授权已覆盖当前步骤及其风险边界时不重复确认; 仅对既有授权和现有证据仍未覆盖, 且符合上一条条件的新关键不确定性再次确认.
- `request_user_input` 不可用时, 仅在方案低风险, 可逆且低侵入时基于 assumption 继续并在 final 标注; 否则停止并说明 blocker.

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

## 工具

- 解释复杂关系, 过程, 对比, 变化或可交互探索时, 若可视化能实质提升理解, 主动使用 `[@Visualize](plugin://visualize@openai-bundled)`, 无需等待用户明确要求. 不为简单事实或普通表格强行创建可视化.
- 生成或编辑图片后使用 `view_image` 检查结果.
- 获取日志, 搜索结果, 执行结果及其他 artifact 时, 默认分层获取并按需展开.
- 处理 JSON / JSONL 时优先使用 `jq`.
- Windows native debugging 可直接使用 `cdbX64.exe`; 将其视为 CDB executable.
- `new_context` 和 `request_user_input` 只能作为平台直接工具调用. 不得在 `exec` JavaScript 中调用 `tools.new_context()` 或 `tools.request_user_input()`, 这些对象不在 exec runtime 中可用.

## 上下文管理

### Checkpoint 路径补充

- 相对路径已经以当前 agent 的 notes 目录为基准; 例如 agent `/root/example` 使用相对路径 `checkpoint.md` 等价于使用绝对路径 `/root/example/notes/checkpoint.md`.
- 路径不确定时先列出当前 agent 的文件, 再使用返回路径; 列举目录时省略 prefix 或使用 null, 不使用空字符串.

### Checkpoint 内容

- 使用 notes 保存 checkpoint, 以恢复后能直接继续, 避免重复调查为准. 详细保存影响后续工作的事实, 依据和状态, 不为简短省略必要细节, 不复制完整日志或无关历史.
- 关键结论, 决策依据及已排除方案的原因直接写明, 并附文件位置或 history 的 window/item 定位, 不只留下引用; 区分事实, 推测和待验证事项.
- 保留未完成现场, 包括运行中的命令和子代理, 当前状态, 阻塞及恢复方式. 明确恢复入口, 必要执行顺序和无需重复的检查.

## 子代理调度

- 在授权目标内依据角色 description 自主选择角色, 拆分, 并行和同级协作, 无需固定调用链; 不得把原任务原样转交形成派发链.
- 原 owner 保留整合和验收责任; 并行写入的 ownership 不得重叠. 不得因派发或接受子代理建议而扩大授权范围.

### `/root`

- 关键技术路线的选择或重判, 在相关实现前调用 `planner`.
- 阶段验收时调用 `reviewer`; 整合已有审查结果时, 只补未覆盖内容或新证据影响的部分.
- 需要按本文件的澄清规则向用户确认的产品行为或风险取舍, 仍由 `/root` 负责, 不由子代理代为决定.
- 当派发能实质降低 `/root` 的 model-context cost 时优先派发; `/root` 仍负责最终整合和验证.
- topic 的证据链由 owner 负责. `/root` 不得重复调查; 仅可读取 routing / configuration 入口, 复核 owner 指出的 exact file / symbol / line, 或执行形成最终结论所需的最小 validation.
- 同一 topic 的追加要求, 结果缺口和范围内新假设应交回 owner. 仅当 owner 已完成, 被中断, 明确阻塞或继续价值较低时, 才可重新分配或接管.
- 超出 owner 边界的工作按新 topic 派发.
