---
name: subagent-dispatch
description: Main-thread subagent dispatch rules for Codex. Use when the user explicitly authorizes delegation for the current task or uses an execute-plan phrase such as `Implement plan` or `PLEASE IMPLEMENT THIS PLAN`.
---

# Subagent Dispatch

## Activation

Use this skill only when subagents are available and the current task is delegated.

Delegation authorization includes:

- explicit enablement of `$subagent-dispatch`
- explicit authorization in an active user-scoped instruction file
- a short execute-plan utterance that clearly targets a visible prior plan, such as `Implement plan` or `PLEASE IMPLEMENT THIS PLAN`

Do not auto-activate just because the user is discussing `子代理`, routing, or workflow design.

Default posture:

- ordinary chat, direct Q&A, and trivial edits stay on the main thread
- the main thread must do one local triage pass before dispatch
- stay local when local work is faster and cheaper than delegation

After auto-applying this skill, announce activation and the planned delegation split before spawning subagents.

## Ownership

Only the main thread may create, steer, interrupt, wait on, close, and integrate subagents.

Only the main thread may decide:

- whether delegation is worth it
- whether a partial result is already enough
- whether route upgrades or direction changes are required
- whether implementation results are ready to integrate
- what final judgment to present

Subagents must not create additional subagents.

## Main-Thread Modes

- `Chat`: default mode; do not dispatch
- `Exploration-enhanced`: use only when one bounded unknown can change the next decision and local exploration would noticeably bloat main-thread context; keep at most one exploration agent active
- `Slow-execution`: use when the next critical-path step is long mechanical execution such as build, test, script, benchmark, or diagnostics; keep at most one execution agent active
- `Long-implementation`: use when the task is clearly implementation-heavy and the main thread needs to preserve decision and integration context
- `Parallel-implementation`: use only after both path ownership and abstraction ownership are explicitly split

Allow `Long-implementation` or `Parallel-implementation` auto-escalation only after the main thread has done one local triage pass and confirmed all of these:

- the user asked to implement, fix, refactor, or deliver work instead of only discussing it
- the task is multi-file, multi-step, validation-heavy, has an independent sidecar, or is already swelling main-thread context

## Dispatch

Dispatch by return semantics:

- `exploration`: use only for bounded unknowns whose early signal can change the next step; do not hand off broad open-ended research
- `execution`: use for mechanical runs; the main thread owns policy changes and decision forks
- `implementation`: use only with an explicit write-scope contract and owned abstraction boundary

If a task mixes code changes and heavy validation, dispatch `implementation` first and `execution` second.

Prefer fresh or isolated context for `exploration` and `execution`. Prefer inherited context for `implementation` only when the current main-thread history is actually needed.

## Wait And Reuse

After dispatch, keep advancing non-overlapping work on the main thread when possible.

Wait only when the next critical-path step depends on that result:

- `exploration`: wait only when its signal is needed for the next decision
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

If ambiguity, retained-context needs, or write responsibility grows, upgrade the route instead of stretching a fast or narrow lane too far.

## Interrupt And Close

Prefer wrap-up steering over interrupt when there is no urgent scope conflict.

Interrupt only for a clear reason:

- wrong scope, wrong target, or new overlap
- the subagent is stuck and the main thread has a better immediate path
- validation disproves the current direction
- the user explicitly requests a stop or redirect

If a subagent times out or returns low-signal output, redirect once with a tighter scope or a stronger route. Do not treat timeout as completion.

Close a subagent immediately once its result is integrated, superseded, or no longer needed.
