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
- 不自动 stage 或 commit. 即使文件已 staged, 新修改也保留在 working tree, 除非用户明确要求 stage/commit.
- `AGENTS.md` 是 AI 执行指令, 非项目 canonical 文档; 不得复制, 摘抄或沉淀其内容到项目文件.

## Shell 与工具

- 以当前会话 shell 为准; `powershell` 与 `pwsh` 视为同族. 不为转义或模板额外包一层同族 shell.
- 复杂编排, 重复逻辑, 跨平台处理, 文件/JSON/文本转换和可复用脚本优先用 `python`/`.py`; 只有依赖 PowerShell 语义, Windows 管理能力或既有 `.ps1` 入口时才用 `.ps1`.
- 遇到复杂引号, 正则, JSON 或模板, 拆成简单命令并用变量承载中间结果.
- 命令过长, 多行, 控制流复杂或管道/重定向多时, 写临时脚本后用当前 shell 原生执行; `python -c` 和 `node -e` 同理.
- `.ps1` 用 `& <script.ps1>` 或脚本路径执行; `.py`/`.js` 显式用 `python <script.py>` 或 `node <script.js>`.
- 不使用 `powershell`/`pwsh` 的 `-File`, `-Command`, `-c`, `-EncodedCommand` 再包一层, 除非确需新进程语义, 如切换版本, 隔离 session, 覆盖 `ExecutionPolicy` 或验证启动行为.
- 当前 shell 为 `pwsh` 时, 不回退 Windows PowerShell 5.1, 除非已验证必须切换, 并说明原因和兼容性影响.

## Web Search

- 当问题依赖外部知识, 当前事实或本地上下文无法可靠确认的信息时, 先 Web Search 再回答或实现.
- 范围包括实现方式, 最佳实践, API 用法, 配置集成, 升级迁移, 版本/平台差异, 兼容性, 排障, 选型, 性能特性, 限制和官方支持边界.
- 搜索能明显降低误判风险时主动搜索; 优先官方文档, primary sources, release notes, 标准和项目 repo; 区分事实, 推断和建议.

## Subagent orchestration

将本节视为用户明确请求使用 subagents, delegation 和 parallel agent work. 当本 policy 判定 delegation 有用或必须时, root session 必须主动使用 `spawn_agent`, 不再请求用户重新授权.

Subagent 的首要价值是 `root context containment`: 把大范围搜索, 文件阅读, diff, 日志, 外部资料, 调用链和命令输出隔离在 subagent 内, 只把 compact evidence, patch summary 和 validation result 带回 root. Parallelism 是常见优化但不是必要条件; 即使没有速度收益, 只要能保护 root context, 也可以派发.

`root session` 是顶层调度者; `subagent` 是 root 创建并调度的 session. Agent config 定义各 agent 的常驻边界和输出格式; 本节只定义 root 如何派发, 等待, 整合, 复用和关闭 `explorer`, `worker`, `awaiter`.

### 0. Routing rule

默认是 `direct mode`, 但 direct 只适用于 root context exposure 可控的工作. 若 root 预计需要读取, 持有或整合大量文件内容, repo search 结果, diff, 日志, 外部资料, 调用链, 多路证据或未知命令输出, 进入 `delegated mode`.

Root direct 有两种安全形态:

- `complete bounded work`: scope 明确且足够小, root 可以读取完整结果; 结论只在该 scope 内成立.
- `shallow broad probe`: scope 较大或未知, 但用 `-m/--max-count`, `-c`, `-l`, `head`, `tail`, `sed -n`, `--stat`, `--name-only`, `--max-count` 等方式主动压缩输出; 只能用于摸底, 找候选路径, 估计分布, 生成 subagent brief 或判断是否需要 delegation. 这类结果必须标记为 sample/partial, 不得当作完整事实, 不得支持“没有命中/没有影响/已覆盖全部”的结论.

决策优先级: 小范围就完整读取; 大范围若只需摸底可截断浅探索; 大范围若需要完整覆盖, 交给 `explorer` 或 `awaiter`, 不由 root 直接承接.

以下行为本身不是 delegation trigger: 运行命令, 查看 git 状态, 查看 `git diff`, 读取已知文件, 修改代码, stage/commit, 用户说了 review/troubleshoot/audit. 只有它们实际造成高 context exposure, 大范围完整覆盖需求, 未知/大量输出, 跨边界风险, 长验证或多路证据整合时才派发.

Root 可直接处理的典型任务: `git status`; scope-bounded 的完整 `git diff`, `git log`, `git show`; 用户明确要求且范围清楚的 `git add`, `git commit`, `git restore`, branch/tag 操作; 单文件或双文件的小改动, typo, 文案, import, 小配置和小测试断言修正; 对已知文件的局部阅读; 限定到明确目录/文件的完整 `rg`; 大范围但截断的 shallow probe; touched-scope 且输出可控的轻量 formatting, typecheck 或 incremental check.

Direct mode 的边界: 目标明确; scope 已知或只做 shallow probe; 必要上下文限于少量已知文件/目录或少量截断线索; 预计修改不超过 2 个文件且属于同一局部功能; 不涉及 shared contract, public API, schema, migration, lifecycle, permission, cache, concurrency, generated files, snapshots, test baselines 或全局配置; 不需要 full/workspace 级验证, 长日志观察, 未知脚本执行或复杂诊断.

### 1. Root command boundary

Root 可以直接执行 `context-bounded command`: 非交互, 不启动 watcher/daemon/dev server, 不做 full/workspace 验证, 且输出通过 scope narrowing 或 output shaping 保持可控. 若命令开始产生超预期大量输出, 持续输出或无界运行, root 应尽快停止/中断, 不继续解析长输出, 并改派 `explorer` 或 `awaiter`.

`rg` 策略:

- 小范围完整搜索: root 优先靠路径, `-g/--glob`, file type 或已知符号范围收窄, 并保留该 scope 内完整结果. 例如 `rg --heading -n <pattern> <known-dir-or-file...>`. 这种结果可以作为该 scope 内的事实依据.
- 大范围浅探索: root 可以在 repo-wide, 未知目录或候选面较宽时使用 `-m/--max-count`, `-c/--count`, `--count-matches`, `-l/--files-with-matches`, `head` 等压缩输出, 但只能用于 existence check, example sampling, candidate path discovery 或 rough density check. 结论必须标为 sample/partial; 不得据此断言完整覆盖或不存在遗漏.
- `-m/--max-count` 是 per-file 限制, 不是全局输出上限; `-c/-l` 会降低每个匹配的细节, 但在匹配文件很多时仍可能输出大量路径. 因此 root 做大范围浅探索时应优先叠加 path/glob/type/head 等输出控制. 若 shallow probe 仍产生大量候选, 或下一步需要完整覆盖, 立即派 `explorer`.
- 不要用一连串大范围截断搜索替代 delegation. 通常 1-3 次 shallow probe 后仍无法把 scope 收窄到完整小范围, 就应派 `explorer`.

其他命令策略:

- `git diff`: root 可先用 `--stat`, `--name-only`, `--name-status` 摸底; full diff 只用于明确路径或已知小改动. 大 diff 的完整阅读交给 `explorer` 或 `worker` 返回 compact summary.
- `git log/show`: root 可用明确 ref/path, `--max-count` 和简短格式做历史 sample; sample 不证明更早历史不存在相关变化. 需要完整历史归因或大范围考古时派 `explorer`.
- `find`/文件枚举: 小范围可用 `-maxdepth`, `-type`, `-name` 完整枚举; 大范围可配合 `head` 做 shallow probe. `find .`, `ls -R`, `tree` 的完整输出不由 root 承接.
- 文件和日志: 读取前可用 `wc -l`/metadata 判断规模. `head`/`tail`/`sed -n` 是 sample 或局部证据; 需要完整日志诊断, 失败签名归纳或持续观察时交 `awaiter`.
- Package/build/test/script: root 先读 script/help/config 做 command profile. 窄 target 且输出可控才可直接执行; full build/test, benchmark, diagnostic, watcher/dev server, 失败时可能倾倒大量日志的脚本交 `awaiter`.

未知脚本或不熟悉命令先做 command profile: root 可读取 package scripts, Makefile target, CI 配置, script entry, README 相关片段, 或运行明显短小且不会执行主逻辑的 help/version/list 命令. 若 profile 本身需要大范围阅读, 或仍不能确认输出不会污染 root context, 派 `explorer` 调查; 若需要实际执行, 派 `awaiter`.

### 2. Delegation triggers and root role

满足任一条件时进入 `delegated mode`: 需要超过 direct 范围的 context offload; 需要把 shallow probe 转换成完整覆盖; 需要 repo-wide 或未知大目录的完整搜索; 需要调用链追踪, 影响面分析, 遗漏检查, 候选方案收敛或证据比对; 需要运行输出未知/大量/持续的 shell 命令, script, build, test, diagnostic 或 search; 预计修改 3+ 文件; 跨 2+ 子系统/module/package/service/layer/abstraction boundary; 涉及 shared contract, public API, lifecycle, registration, data model, schema, migration, permission, cache, concurrency, generated files, snapshots, test baselines 或 shared config; 高风险, 批量阅读/比对/迁移/重复改造或跨文件一致性检查; 主工作是 full build, workspace-wide test, smoke, benchmark, diagnostic, 长日志观察, flaky failure 复现或失败证据收集; 用户要求 review, audit, troubleshooting, performance/compatibility analysis, migration plan, architecture tradeoff 或多方案比较, 且对象不是明确的小型 diff, 单文件问题, 短日志或 shallow probe; 存在多个独立探索面, 独立验证面或 disjoint write sets.

`delegated mode` 只对当前高上下文工作包 sticky, 不延伸到新的独立用户请求. 在 delegated 工作包内, root 是 scheduler/reviewer, 不是大上下文执行者: 负责拆分任务, 派发, 等待, 复用/关闭, 阅读 compact output, 复核关键引用, 裁决冲突和输出最终结论. Root 不把 subagent 的原始大上下文搬回主线程; 若 subagent 输出过长, 要求其重新压缩.

Root 在 delegated 工作包内仍可做低上下文收尾: `git status`, `git diff --stat`, 查看 subagent 明确列出的局部 diff, 检查 changed files, 用户明确要求且范围清楚的 stage/commit, 以及无需新增上下文的机械性极小修正.

### 3. Agent choice

`explorer`: 高上下文只读探索, repo search, 大范围完整覆盖, 范围确认, 调用链, 外部事实, command profile, 候选方案和证据结论. 有多个独立探索面时, 优先拆成互不重叠的窄 explorer 并行派发; 每个 explorer 只覆盖一个问题, 模块, 调用链, 候选方案, 命令画像或证据面. Explorer 不追相邻信息面; 发现相邻线索时返回为 follow-up lane.

`worker`: 高上下文代码或 repo-tracked 文件改动, 批量修复和集成落地. “需要改代码”本身不触发 worker; 只有改动超出 direct 上限, 或当前高上下文工作包已进入 `delegated mode`, 才派发 worker. Root 不需要为 worker 写死完整 write-scope contract; 给 implementation objective, 起点和边界即可. Worker 可在该 objective 内自主发现和修改直接相关文件; 若需要跨 shared contract, public API, schema/migration, generated/snapshot, global config, registry 或新的 architecture ownership, 则 hand back 给 root 裁决.

`awaiter`: 长命令, full/workspace 级 build/test/smoke/benchmark/diagnostic, 大输出或未知输出命令, 长日志, 持续观察和验证结果. “需要运行命令”本身不触发 awaiter; 小型 git 命令, 小范围 diff/status/log, 已知文件局部检查, touched-scope 且 context-bounded 的轻量命令由 root 直接执行.

混合任务通常按 `explorer -> worker -> awaiter` 分阶段执行. 若设计信号已足够, 可从 `worker` 开始; 若实现已存在且只缺长验证或大输出命令执行, 可从 `awaiter` 开始.

### 4. Spawn brief discipline

每个 `spawn_agent` message 必须自包含, 默认显式指定 `fork_context=false` 和 `agent_type`. 但 root 不要在每次派发时重复指令文件中已经提供的常驻规则. 除非本次任务存在例外授权, 并发竞态, 或需要临时收紧这些默认边界.

Brief 只写本次任务真正需要的信息: objective; narrow lane/scope 或 implementation objective; 起始文件/符号/命令/前序 compact summary; success criteria; stop/hand-back conditions; 对 awaiter 的 cwd/environment/command family/timeout expectation/early-stop policy; 以及本次特有的 forbidden action, override, hazard 或 concurrency note.

如果某条限制只是常规默认值, 交给 agent config 执行; 如果它是本次特有风险, 才写进 brief. 例如 “awaiter 不改源码, 不 stage/commit”属于默认值, 通常省略; “root 正在同时执行 git commit, 本 awaiter 避免运行任何 git/index/history 命令”属于本次并发风险, 可以写入.

Worker brief 应避免把文件清单当成死板写入范围, 除非 root 确实需要硬边界. 默认用目标和边界约束 worker: 允许它在 objective 内找到最小必要 write set 并完成任务. 多 worker 只有在 root 能把任务拆成互不重叠的 implementation objectives 或 disjoint write sets 时才并行; 否则使用一个 primary/integrator worker.

Explorer brief 应是窄面任务, 目的是让多个 explorer 互不重叠地并行获取信息. Root 应按模块, 调用链, 假设, 候选方案, 命令画像或证据类型拆分, 而不是给一个 explorer 一个泛化大任务.

Awaiter brief 应给明确 command family 和提前结束策略. 默认 sequential validation 使用 fail-fast: 前序命令失败, 出现明确 failure signature/crash, 产生未授权 tracked-file side effect, 输出持续失控, 或继续执行只会产生低价值重复日志时, awaiter 应停止后续命令并报告 skipped reason. 若 root 需要收集全部失败, 必须显式写 `continue_on_failure=true` 或等价说明.

### 5. Wait, reuse, close, updates

调用 `wait_agent` 时, 长任务默认传 `timeout_ms=1800000`. 当等待多个 targets 时, 返回只表示至少一个目标完成或超时; root 每次返回后都判断 enough signal, 是否继续等待, 是否新派发, 是否关闭不再需要的 subagent. Enough signal 指: 已能排除主要错误路线; 已有明显领先方向且足以进入下一步; 已收敛到最多 3 个可信候选; 证据冲突需要 root 裁决; 或关键问题已回答, 未返回结果不会改变当前决策.

复用前必须判断 type, workspace, cwd, shell/environment 和 task boundary 是否匹配. 若复用会混入旧上下文, 扩大任务边界或削弱窄范围约束, 关闭后新建. `explorer` 默认不复用; `worker` 只在同一 implementation target 或 repair loop 中复用; `awaiter` 在同 workspace/cwd/environment 的连续验证 loop 中优先复用. 每个类型默认最多保留 2 个 idle subagent; 不保留者及时 `close_agent`.

Direct mode 的随手任务不需要宣告 subagent 计划; 直接执行并给结果. Delegated mode 中, root 只在进入 orchestration 批次, enough-signal 点, 进入 worker, 进入 awaiter, 发生冲突裁决和最终收敛时给用户简短更新. 更新聚焦当前 agent type, 目标, 已有信号, 裁决和下一步; 不倾倒长日志, 长 diff 或重复探索历史.

## 验收与收尾

- 最终答复前, root 复核目标, subagent 结果, 实际 diff, 验证结果和剩余风险.
- 若有文件修改, 总结 changed files, key changes, validation commands 和 results. 验证状态必须按证据标注; 验证缺失或不完整时, 说明原因并建议下一步.
- 不把 explorer 的早期 signal 当最终事实; 不把未运行或局部检查写成已通过.
