## 沟通

- 使用中文沟通; 技术术语, 代码标识符, 产品和框架名称保留英文.
- 编写或修改文档, 代码注释, commit message 等持久化文本时使用半角符号; 聊天正文不受此限.
- 编写面向 AI 的指令和文档时, 以 GPT-5.6-sol 的理解能力为基准保持简洁; 省略常识, 重复解释和可从上下文推导的内容, 仅保留必要约束, 例外和风险.

## 澄清

- 当无法通过上下文, 代码, 文档, 测试或运行结果消除的不确定性或 tradeoff 可能实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期时, 使用 `request_user_input` 说明差异并确认; 若出现此前确认未覆盖的新关键不确定性, 再次确认.
- 调用 `request_user_input` 时,使用阻塞等待的参数.
- `request_user_input` 不可用时, 仅在方案低风险, 可逆且低侵入时继续, 并在最终答复标注 assumption; 否则停止并说明 blocker.

## Steer 输入

- 执行过程中收到的追加用户消息视为 steer, 可用于询问, 引导或调整执行; 工具等待被其中断仅表示消息到达. 处理 steer 后继续执行经该 steer 更新后的工作; 不得仅因收到或回应 steer 而停止或发送 final, 除非 steer 明确要求停止当前执行.

## 代码

- 应用代码优先采用精确类型和明确的泛型约束.
- 不新增仅用于命名, 转发或打包参数的薄包装函数; 仅在封装稳定语义, 维护不变量, 复用实质逻辑或隔离明确边界时引入.
- 实现功能时优先采用 breaking change, 不为旧接口保留兼容层.

## 测试

- 不为实现细节, 私有步骤, 日志文案, 框架默认行为, 薄转发或等价路径新增或保留测试.
- 不为同一风险在多层重复覆盖, 除非该层能发现其他层无法可靠观察的独立失效.
- 不在昂贵环境重复验证可由低成本层确定的行为, 不为没有独立风险的新场景增加测试.

## 操作

- 不得将 `AGENTS.md` 的内容复制或沉淀到项目文件.
- 已获授权整合本地与远端分支时, 默认使用 `rebase` 保持线性历史. 用户所说的"合并"默认表示分支整合, 仍使用 `rebase`. 仅当用户明确要求使用 `merge`, 仓库规范要求 merge commit, 或 `rebase` 会重写已共享历史时, 才使用 `merge`.
- 用户明确要求 stage/commit 之前,不自动 `git stage`, 即使已有 staged 文件, 新修改仍保留在 working tree. 不自动进行 `git unstage`.
- 派发子代理时, 若指定 `agent_type`, `task_name` 必须以 `<agent_type>_` 开头, 后接简洁的任务语义; 例如 `worker_blueprint_round2`.

## Shell

- 在 Windows 上通过 shell 删除文件或目录时, 使用 PowerShell 直接调用适用的 .NET 文件系统 API.
- 在 Windows 上通过 PowerShell 执行 native executable 或 `npm` 等 command shim 后, 使用 `exit $LASTEXITCODE` 透传真实 exit code; 否则 shell tool 获取到的非零 exit code 通常为 `1`, 而非命令的原始值.
- 若后续还有操作, 可以打印 `$LASTEXITCODE`避免非零 exit code被吞掉.

## 工具

- 生成或编辑图片后使用 `view_image` 检查结果.
- 获取日志, 搜索结果, 执行结果及其他 artifact 时, 为降低 model-context cost, 默认分层获取并按需展开.
- 处理 JSON / JSONL 时优先使用 `jq`命令.


## 子代理调度

### `/root`

- 即使任务需要串行执行或位于 critical path, 当派发能实质提升质量或降低 `/root` 的 model-context cost 时, 应优先考虑使用子代理; `/root` 对子代理结果的最终整合和验证负责.
- 对彼此独立且适合并行的任务, 可优先一起派发并明确各自范围, 减少重复工作和共享写入冲突.
- 派发 investigation 时, 优先按具有明确问题, 预期产出和完成条件的独立 `investigation topic` 组织任务. 为同一结论服务的相关查询可合并处理, 并优先复用已掌握相关上下文的 agent.
- 派发 `investigation topic` 后, 该 topic 的证据搜索和结论构建由被派发 agent 负责, 直到其完成, 被中断或被明确重新定向. `/root` 不得并行重复该 topic 的搜索, 不得自行重建相同证据链; 应专注于 orchestration, integration 和不重叠的工作.
- `/root` 在已派发 topic 内只可进行 bounded spot-check: 读取 routing / configuration 入口, 检查 agent 已指出的 exact file / symbol / line, 或执行最终结论所需的最小 validation. 默认不超过一次批量查询; 不得由 spot-check 发起 repo-wide / Engine-wide 搜索, 新假设分支, 多跳引用追踪或连续依赖查询.
- 出现以下任一情况时, 本地查询不再属于 bounded spot-check, `/root` 必须停止并将剩余问题 follow-up 给当前 topic owner: 尚不知道 exact file / symbol; 需要扩大目录或语言范围; 一次查询结果决定下一次搜索方向; 出现新的机制, 例外或证据分支; 需要两轮以上依赖查询才能形成结论.
- 用户在 investigation 进行期间补充证据来源, 验收标准或范围约束时, 若仍属于原 topic, `/root` 应将补充要求发送给当前 owner, 不得以用户追问为由接管并重复调查. 只有原 agent 已完成, 被中断, 明确阻塞或继续执行价值较低时, `/root` 才可重新分配或显式接管该 topic.
- agent 结果不完整时, `/root` 应先列出缺失问题并 follow-up 给同一 agent. 最终 validation 用于验证 agent 结论, 不用于重新进行完整 investigation.
- 等待 investigation 返回期间, `/root` 可以推进不重叠的工作或等待; 不得仅因为处于等待状态而搜索该 agent 正在调查的范围.

### `derived sub-agents`

- 默认情况下, `derived sub-agents` 不具备 nested-delegation 或 sibling-management 权限. 只有当某条 instruction 针对该 agent 的当前 objective 明确允许派发 sub-agents 或管理 sibling agents 时, 才可执行对应操作; 该 agent 仍需对原任务负责.
