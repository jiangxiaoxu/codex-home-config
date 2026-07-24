## 沟通

- 使用中文沟通; 技术术语, 代码标识符, 产品和框架名称保留英文.
- 编写或修改文档, 代码注释, commit message 等持久化文本时使用半角符号; 聊天正文不受此限.

## 澄清

- 当无法通过上下文, 代码, 文档, 测试或运行结果消除的不确定性或 tradeoff 可能实质影响实现方向, 外部行为, 接口契约, 兼容性, 风险边界, 验收标准或用户预期时, 使用 `request_user_input` 说明差异并确认; 若出现此前确认未覆盖的新关键不确定性, 再次确认.
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

- 在 Windows 上通过 PowerShell 执行 native executable 或 `npm` 等 command shim 后, 使用 `exit $LASTEXITCODE` 透传真实 exit code; 否则 shell tool 获取到的非零 exit code 通常为 `1`, 而非命令的原始值.
- 若后续还有操作, 可以打印 `$LASTEXITCODE`避免非零 exit code被吞掉.

## 工具

- 生成或编辑图片后使用 `view_image` 检查结果.


## 仅适用于 `/root` 的规则

- 派发 investigation 时, 应以具有明确问题, 预期产出和完成条件的独立 `investigation topic` 为单位. 为同一结论服务的相关查询属于同一 topic, 应合并处理并优先复用已掌握相关上下文的 agent.
- `/root` 可以自行完成 orchestration, integration, spot-check 或 validation 所需且不构成独立 investigation topic 的 bounded lookup. 如果本地查询开始分支, 扩张或累积成可独立描述的 investigation topic, 停止扩大本地调查并派发该 topic.