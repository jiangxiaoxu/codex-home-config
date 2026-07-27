## 沟通

- 使用中文沟通; 技术术语, 代码标识符, 产品和框架名称保留英文.
- 编写或修改文档, 代码注释, commit message 等持久化文本时使用半角符号; 聊天正文不受此限.

## 澄清

- 当无法通过上下文, 代码, 文档, 测试或运行结果消除的不确定性或 tradeoff 可能实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期时, 使用 `request_user_input` 说明差异并确认; 若出现此前确认未覆盖的新关键不确定性, 再次确认.
- 调用 `request_user_input` 时不得设置 `autoResolutionMs`; 必须持续等待用户明确回答, 不得因超时自动选择, 跳过或继续.
- `request_user_input` 不可用时, 仅在方案低风险, 可逆且低侵入时继续, 并在最终答复标注 assumption; 否则停止并说明 blocker.

## 代码

- 应用代码优先采用精确类型和明确的泛型约束.
- 不新增仅用于命名, 转发或打包参数的薄包装函数; 仅在封装稳定语义, 维护不变量, 复用实质逻辑或隔离明确边界时引入.
- 实现功能时优先采用 breaking change, 不为旧接口保留兼容层.

## 操作

- 不得将 `AGENTS.md` 的内容复制或沉淀到项目文件.
- 任务已授权整合本地与远端分支时, 默认使用 `rebase` 保持线性历史; 用户明确要求 merge, 仓库要求 merge commit 或 rebase 会重写已共享历史时除外.
- 不自动 `git stage` 或 `git commit`; 即使已有 staged 文件, 新修改仍保留在 working tree. 暂存区意外变化时保留现状, 除非用户明确要求 stage/commit.
- 派发子代理时, 若指定 `agent_type`, `task_name` 必须以 `<agent_type>_` 开头, 后接简洁的任务语义; 例如 `worker_blueprint_round2`.

## Shell

- 在 Windows 上通过 shell 删除文件或目录时, 使用 PowerShell 直接调用适用的 .NET 文件系统 API.
- 在 Windows 上通过 PowerShell 执行 native executable 或 `npm` 等 command shim 后, 使用 `exit $LASTEXITCODE` 透传真实 exit code; 否则 shell tool 获取到的非零 exit code 通常为 `1`, 而非命令的原始值.
- 若后续还有操作, 可以打印 `$LASTEXITCODE`避免非零 exit code被吞掉.

## 工具

- 生成或编辑图片后使用 `view_image` 检查结果.


## 子代理调度

### `/root`

- 即使任务需要串行执行或位于 critical path, 当派发能实质提升质量或降低 `/root` 的 model-context cost 时, 应优先考虑使用子代理; `/root` 对子代理结果的最终整合和验证负责.
- 对彼此独立且适合并行的任务, 可优先一起派发并明确各自范围, 减少重复工作和共享写入冲突.
- 派发 investigation 时, 优先按具有明确问题, 预期产出和完成条件的独立 `investigation topic` 组织任务. 为同一结论服务的相关查询可合并处理, 并优先复用已掌握相关上下文的 agent.
- investigation topic 派发后, `/root` 通常专注于 orchestration, integration 和其他可并行工作, 避免无必要地重复相同搜索或重建同一证据链. 后续问题和范围扩展可优先通过当前环境可用的后续派发机制交回同一 agent.
- `/root` 可以根据风险和 correctness 需要进行 bounded lookup, spot-check 或 validation. 如果经过几次短查询仍未获得足以推进的信息, 或本地调查开始分支, 扩张或形成新的证据链, 应优先整理剩余问题并作为 follow-up 或新的 investigation topic 派发, 避免以反复的小步查询持续累积 `/root` 上下文.
- 当 investigation 仍能提供有用结论时, 通常让 agent 完成并返回结果; 当目标变化, 范围明显偏离, 共享写入冲突或继续执行价值较低时, 可以中断或重新定向.

### `derived sub-agents`

- 默认情况下, `derived sub-agents` 不具备 nested-delegation 或 sibling-management 权限. 只有当某条 instruction 针对该 agent 的当前 objective 明确允许派发 sub-agents 或管理 sibling agents 时, 才可执行对应操作; 该 agent 仍需对原任务负责.
