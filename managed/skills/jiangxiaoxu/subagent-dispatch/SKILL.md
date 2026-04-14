---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use when subagents are available and the user explicitly enables `$subagent-dispatch`, asks to `派发子代理` or `使用子代理` for a task, uses an execute-plan phrase such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`, or is in or entering `Plan Mode` information gathering for a concrete task that needs information retrieval for the next planning decision.
---

# Subagent Dispatch

## Activation

Use this skill only when subagents are available and the conversation is about subagent dispatch or the current task is delegated.

Activate this skill when one of these is true:

- explicit enablement of `$subagent-dispatch`
- the user asks to `派发子代理` or `使用子代理` for a task
- the user uses a short execute-plan utterance that clearly targets a visible prior plan, such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`
- the current task is in or entering `Plan Mode` information gathering, has a concrete deliverable, and needs bounded information retrieval that can change the next planning decision
- the conversation is specifically about subagent routing or workflow design

Bare mentions of `子代理` do not count as delegation intent.

Discussion about routing, workflow design, or subagent policy loads this skill for analysis only. It does not by itself authorize spawning subagents for the current task.

`Plan Mode` automatic dispatch is limited to concrete-task information gathering. Pure policy, workflow, routing, or prompting discussion still stays analysis-only.

Current-task delegation requires one of these:

- explicit enablement of `$subagent-dispatch`
- the user explicitly asks to `派发子代理` or `使用子代理` for the current task
- explicit authorization in an active user-scoped instruction file
- the current task is in or entering `Plan Mode` information gathering, needs bounded information retrieval for the next planning decision, and the dispatch stays on the `exploration` lane
- a short execute-plan utterance that clearly targets a visible prior plan, such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`

Default posture:

- ordinary chat, direct Q&A, and trivial edits stay on the main thread
- the main thread must do one local triage pass before dispatch
- for non-trivial execution work, prefer dispatch once the command family is minimally stable
- for non-trivial implementation work, prefer dispatch once the write scope is minimally stable

If the current task is delegated, announce activation and the planned delegation split before spawning subagents.

For `Plan Mode` auto-dispatch, all of these must hold:

- the task has a concrete deliverable instead of only workflow or policy discussion
- the current step needs bounded information retrieval that can change the next planning decision
- the main thread already completed one local triage pass
- bounded unknowns can change the next planning decision
- further local exploration would noticeably bloat main-thread context
- the dispatch remains read-only and stays within the `exploration` lane

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
- `Exploration-enhanced`: use only when bounded unknowns can change the next decision and local exploration would noticeably bloat main-thread context; fan out independent narrow exploration tasks as useful within the current thread budget and keep at most `2` exploration agents active only when they own disjoint broader search surfaces
- `Execution-oriented`: use when the next critical-path step is non-trivial mechanical execution and the command family is minimally stable; keep at most one execution agent active
- `Long-implementation`: use when the task is non-trivial implementation work and the write scope is minimally stable; the main thread preserves decision and integration context
- `Parallel-implementation`: use only after both path ownership and abstraction ownership are explicitly split

In `Plan Mode`, automatic dispatch may enter only `Exploration-enhanced`. Do not auto-enter `Execution-oriented`, `Long-implementation`, or `Parallel-implementation`.

Allow `Long-implementation` or `Parallel-implementation` auto-escalation only after the main thread has done one local triage pass and confirmed all of these:

- the user asked to implement, fix, refactor, or deliver work instead of only discussing it
- the task is not a trivial edit
- the write scope is at least minimally stable, even if the full plan is not yet finished
- the task is multi-file, multi-step, validation-heavy, has an independent sidecar, or is already swelling main-thread context

Allow `Execution-oriented` auto-escalation only after the main thread has done one local triage pass and confirmed all of these:

- the next useful step is execution rather than exploration or implementation
- the task is not a trivial check
- the command family, success criteria, and key parameters are at least minimally stable
- the task is long-running, high-output, validation-heavy, or a clearly independent execution sidecar

## Dispatch

Dispatch by return semantics:

- `exploration`: use only for bounded unknowns whose early signal can change the next step; split independent narrow probes across exploration routes when useful, keep at most `2` exploration routes active only when they cover disjoint broader search surfaces, and do not hand off broad open-ended research
- `execution`: prefer `awaiter` once a controlled command family can be stated; keep the work on the main thread only for trivial checks or when execution scope, parameters, or success criteria are still materially unstable
- `implementation`: prefer `worker` once a controlled write-scope contract can be stated; keep the work on the main thread only for trivial edits or when implementation architecture, ownership, or write scope are still materially unstable

`execution` and `implementation` are mutually exclusive lanes. Do not keep both active at the same time.

When the trigger is `Plan Mode` information gathering, dispatch only `exploration`. Do not auto-dispatch `execution` or `implementation`.

If a task mixes code changes and heavy validation, dispatch `implementation` first and `execution` second.

When implementation work is complete and the next step is primarily mechanical validation, prefer handing off to an `Execution-oriented` subagent by default.

Keep execution work on the main thread only when one of these is true:

- the check is trivial enough that dispatch overhead is not worth it
- command-family choice, success criteria, or key execution parameters are still unresolved
- the execution scope is still materially unstable after the local triage pass

Keep implementation work on the main thread only when one of these is true:

- the edit is trivial enough that dispatch overhead is not worth it
- implementation architecture or ownership decisions are still unresolved
- the write scope is still materially unstable after the local triage pass

Use explicit `fork_context` defaults when dispatching:

- `exploration`: prefer `fork_context=true` unless the parent agent wants an intentionally independent probe or a scoped briefing is clearly sufficient
- `execution`: prefer `fork_context=false`; use `fork_context=true` only when the command depends on recent thread state that cannot be reliably compressed
- `implementation`: prefer `fork_context=true` unless a scoped briefing is clearly sufficient and the current main-thread history is not actually needed

`fork_context=true` may reduce briefing size, but it never replaces an explicit task contract. Always state the concrete mission, owned scope, success condition, and stop or hand-back triggers for the subagent.

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

Treat completed exploration agents as `terminal` once their result is consumed, superseded, or their decision window closes.

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
