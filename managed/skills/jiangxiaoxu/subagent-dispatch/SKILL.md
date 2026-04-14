---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use when subagents are available and the user explicitly enables `$subagent-dispatch`, asks to `派发子代理` or `使用子代理` for a task, or uses an execute-plan phrase such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行` to execute an already-generated concrete plan.
---

# Subagent Dispatch

## Activation

Use this skill only when subagents are available and the conversation is about subagent dispatch or the current task is delegated.

Activate this skill when one of these is true:

- explicit enablement of `$subagent-dispatch`
- the user asks to `派发子代理` or `使用子代理` for a task
- the user uses a short execute-plan utterance that clearly targets a visible prior plan, such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`
- the conversation is specifically about subagent routing or workflow design

Bare mentions of `子代理` do not count as delegation intent.

Discussion about routing, workflow design, or subagent policy loads this skill for analysis only. It does not by itself authorize spawning subagents for the current task.

Current-task delegation requires one of these:

- explicit enablement of `$subagent-dispatch`
- the user explicitly asks to `派发子代理` or `使用子代理` for the current task
- explicit authorization in an active user-scoped instruction file
- a short execute-plan utterance that clearly targets a visible prior plan, such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`

Default posture:

- ordinary chat, direct Q&A, and trivial edits stay on the main thread
- the main thread must do one local triage pass before dispatch
- stay local when local work is faster and cheaper than delegation

If the current task is delegated, announce activation and the planned delegation split before spawning subagents.

## Ownership

Only the main thread may create, steer, interrupt, wait on, close, and integrate subagents.

Only the main thread may decide:

- whether delegation is worth it
- whether a partial result is already enough
- whether route upgrades or direction changes are required
- whether implementation results are ready to integrate
- what final judgment to present

## Main-Thread Modes

- `Chat`: default mode; do not dispatch
- `Exploration-enhanced`: use only when bounded unknowns can change the next decision and local exploration would noticeably bloat main-thread context; fan out as many independent narrow fast exploration tasks as useful within the current thread budget and keep at most `2` normal exploration agents active only when they own disjoint broader search surfaces
- `Slow-execution`: use when the next critical-path step is long mechanical execution such as build, test, script, benchmark, or diagnostics; keep at most one execution agent active
- `Long-implementation`: use when the task is clearly implementation-heavy and the main thread needs to preserve decision and integration context
- `Parallel-implementation`: use only after both path ownership and abstraction ownership are explicitly split

Allow `Long-implementation` or `Parallel-implementation` auto-escalation only after the main thread has done one local triage pass and confirmed all of these:

- the user asked to implement, fix, refactor, or deliver work instead of only discussing it
- the task is multi-file, multi-step, validation-heavy, has an independent sidecar, or is already swelling main-thread context

## Dispatch

Dispatch by return semantics:

- `exploration`: use only for bounded unknowns whose early signal can change the next step; split independent narrow probes across fast routes when useful, try to run fast and normal exploration together when broader retained context may still matter, keep at most `2` normal exploration routes active only when they cover disjoint broader search surfaces, and do not hand off broad open-ended research
- `execution`: use for mechanical runs; the main thread owns policy changes and decision forks
- `implementation`: use only with an explicit write-scope contract and owned abstraction boundary

`execution` and `implementation` are mutually exclusive lanes. Do not keep both active at the same time.

If a task mixes code changes and heavy validation, dispatch `implementation` first and `execution` second.

Prefer fresh or isolated context for `exploration` and `execution`. Prefer inherited context for `implementation` only when the current main-thread history is actually needed.

## Wait And Reuse

After dispatch, keep advancing non-overlapping work on the main thread when possible.

Wait only when the next critical-path step depends on that result:

- `exploration`: wait only when its signal is needed for the next decision; if one or more exploration results already provide enough signal, do not wait for the remaining exploration routes to finish
- `execution`: wait before using its evidence for validation claims
- `implementation`: wait before integration, overlapping edits, result-dependent validation, or the final answer

Review active same-class subagents before creating a new one.

Treat each active subagent as one of these reuse states:

- `warm-reusable`
- `summarize-first`
- `terminal`

Direct reuse is allowed only when class, goal, and success condition still fit and old context is unlikely to bias the next step incorrectly.

Use `summarize-first` when reuse would save time but context pollution is rising: request a short state capsule, then continue from that capsule instead of the full old history.

Treat interrupted `implementation` agents as `terminal` for repo-tracked write work.

Treat completed fast-lane agents as single-use. Once their result is consumed or their decision window closes, close them instead of keeping them warm for reuse.

If ambiguity, retained-context needs, or write responsibility grows, upgrade the route instead of stretching a fast or narrow lane too far.

## Interrupt And Close

Prefer wrap-up steering over interrupt when there is no urgent scope conflict.

Interrupt only for a clear reason:

- wrong scope, wrong target, or new overlap
- the subagent is stuck and the main thread has a better immediate path
- validation disproves the current direction
- the user explicitly requests a stop or redirect
- enough exploration signal already closed the decision window

If a subagent times out or returns low-signal output, redirect once with a tighter scope or a stronger route. Do not treat timeout as completion.

Close a subagent immediately once its result is integrated, superseded, or no longer needed.
