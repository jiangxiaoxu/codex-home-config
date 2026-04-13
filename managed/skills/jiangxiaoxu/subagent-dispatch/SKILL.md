---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use when subagent capabilities are available and the user explicitly enables `$subagent-dispatch`, mentions `子代理` or subagent delegation, or uses an execute-plan phrase such as `Implement plan` to execute an already-generated concrete plan.
---

# Subagent Dispatch

## Activation And Ownership

Use this skill only when subagents are available and the user clearly authorized delegation.

Authorization includes:

- explicit enablement of `$subagent-dispatch`
- mention of `子代理` or subagent delegation
- explicit authorization in an active user-scoped instruction file
- a short execute-plan utterance that clearly refers to a visible prior plan, such as `Implement plan`

Keep decomposition, prioritization, waiting, integration, the final explanation, and all subagent lifecycle control on the main thread. Only the main thread may create, schedule, steer, interrupt, and close subagents. Subagents must not create additional subagents.

Prefer inherited context for `implementation` and isolated context for non-`implementation` work unless shared history is clearly useful.

## Task Selection

Classify delegated work by primary deliverable:

- `Read-only exploration`: evidence, scope, call chains, impact analysis, `Web Search`, external verification, plus a conclusion
- `implementation`: repo-tracked code changes, localized fixes, controlled refactors, plus changed scope and assumptions or risks
- `Execution-oriented`: commands, validation, reproduction, logs, benchmarks, regression evidence, plus status and failure summary when relevant
- `default`: general delegated work that does not fit the classes above, plus the requested deliverable, concise status, assumptions, and open questions

Tiny local exception: keep the work on the main thread for one quick lookup or a trivial tightly scoped change with low coordination cost.

Use this order:

1. Apply the tiny local exception if it clearly fits.
2. Otherwise assign by primary deliverable.
3. Then optimize for reuse, parallelism, and waiting.

Prefer an `implementation` subagent when the task spans files, crosses modules, has meaningful edge cases or risk, or needs expensive context gathering.

Prefer matching `Read-only exploration` and `Execution-oriented` work to their own classes.

For `Read-only exploration`, prefer narrow, conclusion-oriented task slices over broad surveys. A good default is one focused question, or one tightly related mini-cluster whose result can be consumed independently.

Use `default` only as a fallback when the specialized classes do not fit cleanly, and give it a tighter task contract than usual: requested deliverable, constraints, and success condition.

If multiple subagents fit the same task, choose the most suitable one. If the choice is still ambiguous, prefer the stronger agent.

If a task mixes code changes and command-heavy verification, split it into phases: finish `implementation` first, then use `Execution-oriented` for validation.

Prefer parallel dispatch only for independent sidecar tasks with clearly separate scopes that do not block the same immediate next step.

For `Read-only exploration`, prefer small-batch parallelism over single large exploration tasks when the questions can be split cleanly. Favor more, narrower explorations when that is likely to produce earlier decision-useful results, but avoid duplicate or highly overlapping asks that only increase integration cost.

Before creating a new subagent, review active same-class subagents first. Keep reusable ones, close open agents that are stale or no longer fit the current goal, then create a new subagent only if none of the remaining active agents fit the current goal.

Reuse `Read-only exploration` and `Execution-oriented` subagents when their class, topic, and success condition still fit. Reuse an `implementation` subagent only when the task remains `implementation`, its write scope is unchanged, its success condition still fits, and it has not been interrupted. Treat closed subagents as terminal.

Do not dispatch exploration work that the main thread is unlikely to consume in the current turn. If an exploration result will probably not affect the current decision window, defer it or narrow it further before dispatch.

## Implementation Scope Contract

Before spawning any `implementation` subagent, define a write scope contract on the main thread.

The contract must state:

- allowed files or directories
- out-of-bounds files or directories
- success condition
- whether incidental compile, format, or test fixes are allowed

If the scope cannot be stated clearly enough to prevent overlap, do not dispatch parallel `implementation` work.

If the main thread expects to continue editing repo-tracked files while `implementation` subagents are active, define the main thread's own write scope first, keep it disjoint from every active `implementation` scope, do not edit an active subagent's scope, and continue only with non-overlapping edits, read-only analysis, documentation, validation preparation, or integration planning.

If the main thread needs to enter that scope, stop delegated write work first, then continue locally.

## Steer, Interrupt, And Close

The main thread may steer an active subagent by sending additional input.

Prefer controlled wrap-up steering over interrupt when there is no urgent scope conflict and the goal is to stop expansion, collect the current result, and return control cleanly.

Use wrap-up steering to ask the subagent to:

- stop taking on new work
- finish the current bounded step if the cost is low
- summarize completed work
- report remaining risks, assumptions, and unfinished items
- return control to the main thread

For `implementation` subagents, wrap-up steering is preferred only while the task remains within the same write scope and task class.

Interrupt an `implementation` subagent only for a clear reason:

- the scope was defined incorrectly and overlap now exists or is imminent
- the subagent is working on the wrong target
- the subagent is stuck and the main thread has a better immediate path
- validation disproves the current implementation direction
- the user explicitly requests a stop or redirect

Do not interrupt implementation work merely for convenience or opportunistic local edits.

Once an `implementation` subagent is interrupted, treat it as terminal for all repo-tracked write work. Do not reuse or reassign it. If more implementation or documentation work is needed, spawn a new subagent with a fresh contract.

Do not use steering to silently repurpose an active `implementation` subagent into a different write scope or task class.

Do not keep completed `implementation` subagents open for speculative reuse. Treat `still open` as a short-lived transitional condition, not a steady state. Close a subagent immediately once its result is integrated, superseded, or no longer needed, and close a completed subagent in the same handling phase unless it is being immediately reused under an allowed reuse rule.

## Execution Flow

After dispatch, keep advancing non-overlapping work on the main thread when possible.

Wait only when the next critical-path step depends on a subagent result, and wait only for the subset now needed, not for every in-flight subagent by default. For `Read-only exploration`, the goal is usually enough information to make the next decision safely, not full exploration completion.

Apply that flexibility differently by class. For `implementation`, default to waiting for completion or explicit wrap-up before integration, overlapping edits, result-dependent validation, or the final answer. Do not proceed past those checkpoints as if the implementation result were settled while it is still in flight.

For `Execution-oriented`, do not require unconditional waiting immediately after dispatch, but do wait before using its evidence to declare pass or fail, close out validation, or present a final outcome. The main thread may continue unrelated preparation while the command work is running.

Treat `enough information` as the point where the next step is unlikely to change materially if additional in-flight exploration finishes later. Prefer waiting at decision checkpoints such as approach selection, implementation direction changes, validation conclusions, and the final answer.

Do not redo delegated work on the main thread while that delegated task is still in flight.

If enough information has arrived, the main thread may continue while other exploration work remains in flight, but it must keep a clear plan for each remaining subagent: continue as a sidecar, steer to wrap up, or close it.

If the main thread takes over an overlapping write scope, stop delegated write work before continuing. Main-thread integration does not justify leaving overlapping `implementation` agents running.

Prefer an `Execution-oriented` subagent when the next phase after `implementation` is command execution, validation, or evidence collection.

If later exploration disproves the direction chosen from earlier partial results, explicitly replan instead of silently continuing on the stale path.

If a subagent times out or returns low-signal output, redirect once with a tighter scope or switch to a better-scoped or stronger subagent. Do not treat timeout as completion.

After auto-applying this skill, announce activation and the planned delegation split before spawning subagents.
