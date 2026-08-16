## 沟通

- 使用中文沟通; 技术术语, 代码标识符, 产品和框架名称保留英文.
- 编写或修改文档, 代码注释, commit message 等持久化文本时使用半角符号; 聊天正文不受此限.
- 编写面向 AI 的指令和文档时, 以 GPT-5.6-sol 的理解能力为基准保持简洁; 省略常识, 重复解释和可从上下文推导的内容, 仅保留必要约束, 例外和风险.

## 澄清

- 当无法通过上下文, 代码, 文档, 测试或运行结果消除的不确定性或 tradeoff 可能实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期时, 使用 `request_user_input` 说明差异并确认; 若出现此前确认未覆盖的新关键不确定性, 再次确认.
- `request_user_input` 不可用时, 仅在方案低风险, 可逆且低侵入时继续, 并在最终答复标注 assumption; 否则停止并说明 blocker.

## Steer 输入

- 执行过程中收到的追加用户消息视为 steer, 可用于询问, 引导或调整执行; 工具等待被其中断仅表示消息到达. 处理 steer 后继续执行经该 steer 更新后的工作; 不得仅因收到或回应 steer 而停止或发送 final, 除非 steer 明确要求停止当前执行.

## 代码

- 不新增仅用于命名, 转发或打包参数的薄包装函数; 仅在封装稳定语义, 维护不变量, 复用实质逻辑或隔离明确边界时引入.
- 实现功能时优先采用 breaking change, 不为旧接口保留兼容层.

## 测试

- 不为实现细节, 私有步骤, 日志文案, 框架默认行为, 薄转发或等价路径新增或保留测试.
- 对同一风险, 选择能可靠观察它的最低成本层; 仅当另一层能发现独立失效时重复覆盖. 不在昂贵环境重复验证低成本层已确定的行为, 不为没有独立风险的新场景增加测试.

## 操作

- 不得将 `AGENTS.md` 的内容复制或沉淀到项目文件.
- 已获授权整合分支时默认使用 `rebase`; 用户所说的"合并"默认表示分支整合, 仍使用 `rebase`. 用户明确要求 `merge`, 仓库要求 merge commit, 或 `rebase` 会重写已共享历史时除外.
- 用户明确要求 stage 或 commit 前不执行 `git stage`; 不因已有 staged 文件改变新增修改的 working-tree 状态, 也不自动 `git unstage`.
- 派发子代理时, 若指定 `agent_type`, `task_name` 必须以 `<agent_type>_` 开头, 后接简洁的任务语义; 例如 `worker_blueprint_round2`.

## Shell

- 在 Windows 上通过 shell 删除文件或目录时, 使用 PowerShell 直接调用适用的 .NET 文件系统 API.
- 在 Windows PowerShell 中执行 native executable 或 command shim 后, 立即保存 `$LASTEXITCODE`, 并在命令段结束时 `exit` 该值.

## 工具

- 生成或编辑图片后使用 `view_image` 检查结果.
- 获取日志, 搜索结果, 执行结果及其他 artifact 时, 为降低 model-context cost, 默认分层获取并按需展开.
- 处理 JSON / JSONL 时优先使用 `jq`命令.

## 子代理调度

### `/root`

- 角色路由:
  - `explorer_bound` 仅用于范围预先限定的只读事实调查, 例如已知目录或 symbol 的调用点, 配置, 测试定位. 如果需要扩大范围, 引入新假设或进行多跳归因, 使用 `explorer`.
  - `worker_simple` 仅用于 ownership, 变更规则, 预期结果和验证方式均已明确的机械性实现. 不得自行设计或扩大范围, 也不得触及 API, 协议, 配置格式, 并发, 安全或跨平台语义. 发现任一条件不满足时, 停止并改派 `worker`.
- 当派发能实质提升质量或降低 `/root` 的 model-context cost 时, 即使任务串行或位于 critical path 也应优先考虑派发. 对独立任务可优先并行派发并明确范围; `/root` 负责最终整合和验证.
- 派发 investigation 时, 按具有明确问题, 预期产出和完成条件的独立 topic 组织; 为同一结论服务的查询可合并, 并优先复用已有相关上下文的 agent.
- topic 派发后由 owner 负责证据链; `/root` 不得重复调查, 仅可读取 routing / configuration 入口, 复核 agent 指出的 exact file / symbol / line, 或执行形成最终结论所需的最小 validation. 若需扩大范围, 形成新假设或连续追踪依赖, 应停止并 follow-up owner.
- 同一 topic 的追加要求和结果缺口应交回 owner; 仅当其已完成, 被中断, 明确阻塞或继续价值较低时才可重新分配或接管. `explorer_bound` 因边界不足停止时直接改派 `explorer`.

### `derived sub-agents`

- 本节仅定义默认调度规则, 可被适用的运行时指令明确覆盖.
- `/root` 直接派发 `level-1 agent`; `level-1 agent` 派发 `level-2 agent`, 路径形如 `/root/<level-1-agent>/<level-2-agent>`.
- 默认只有 agent type 为 `explorer` 或 `worker` 的 `level-1 agent` 可以派发 `level-2 agent`; `level-2 agent` 默认视为 leaf agent, 不继续派发子代理.
- `level-1 agent` 仅在 `level-2 agent` 的 objective 能由单个 leaf agent 独立完成, 且可与自身正在进行的有用本地工作并行时派发.
- agent type 为 `explorer` 的 `level-1 agent` 只能为获取信息派发 `explorer`, `explorer_bound`, 或执行不修改 source-of-truth 的诊断, 构建或测试的 `awaiter`; agent type 为 `worker` 的 `level-1 agent` 可派发任意 agent type.
- `level-1 agent` 仍对原 objective 和最终汇总结果负责.
