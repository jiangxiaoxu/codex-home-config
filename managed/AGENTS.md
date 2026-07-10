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

- `/root` 负责最终决策、结果集成和用户答复. 仅当任务边界清晰、能独立推进、预计净 context 收益高于协调开销, 且会显著占用 `/root` context 或需要隔离大量过程与输出时, 才自主并行派发; 否则由 `/root` 完成.
- 用户直接指令可扩展、收窄或替换这些规则, 其中停用 subagent 始终优先. 用户点名或自动匹配的 skill 仅在其 instructions 明确要求 delegation、role routing 或 nested delegation 时, 才能在该 skill 范围内覆盖对应规则.
- 依据 `spawn_agent` live schema 的 role description 选择最匹配的可用类型, 不假设或编造 role. 可用时优先用 `explorer` 做大范围或跨模块探索、`scout` 做小范围多步查找、`worker` 做 ownership 清晰的中大型实现或修复、`awaiter` 跑长时间或高日志量且有明确终止状态的命令、`reviewer` 做 independent review; 首选不可用时选最接近的可用 role, 无合适 role 则由 `/root` 完成. Trivial lookup、小型局部修改和无专用 skill 的持续外部监控不派发.
- 中大型、跨文件、高风险或用户要求 review 的改动先通过相关 build/test checks, 再由 `/root` 自动派发 `reviewer`; 可归因于本次改动的失败在授权范围内修复并重跑, 既有或环境性失败记录原因后进入 review. Review 不受 context benefit 门槛限制; 无适用或无法执行 checks 时, 记录原因后直接进入 review.
- Reviewer 报告 P0/P1 或明确的 correctness、security、regression、contract blocker 时, `/root` 仅在已有授权且不存在需要新增 authority 或外部状态变化的 execution blocker 时组织修复、重跑受影响 checks 并再次 review; 否则立即请求用户决策. 同一严重 finding 连续三轮未解决、结论反复或无实质进展时停止自动循环并请求用户决策.
- 编写 message 时综合判断是否使用 `fork_turns="1"` 至 `"3"` 补充近期 context; 不需要时使用 `"none"`, 禁止使用 `"all"`. Message 必须足够详细并自包含目标、边界、必要输入、验证责任及有界输出要求, 但不重复 forked turns 已提供的补充细节. 完整证据只引用位置, 不回传大段日志或原文.
- 任何 scope 一经委派, 在 child 完成或被停止前由其独占; `/root` 和 sibling 只推进不重叠工作. Child 返回后, `/root` 只核验证据、集成结果并作出决策; 仅在交付无效或不完整时明确收回 scope 后补充或重新委派, 不无条件重做.
- 并行 implementation 必须使用互不冲突的 write scope; shared API、schema、config 等 public contract 只能有一个 owner. Subagent 默认不得继续派发; 仅在用户指令或适用 skill instructions 明确授权时允许 nested delegation.
- Parallel worker 只运行 owned-slice checks; `/root` 负责最终 fan-in、integrated validation 和结果答复.

## 验收与收尾


- 最终答复前, `/root` 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
