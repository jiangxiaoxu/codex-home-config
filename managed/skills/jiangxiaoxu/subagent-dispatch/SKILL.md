---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use when subagents are available and the user explicitly enables `$subagent-dispatch`, mentions `子代理` or subagent delegation, or uses an execute-plan phrase such as `Implement plan` to execute an already-generated concrete plan.
---

# Subagent Dispatch

## Activation

Use this skill only when subagents are available and the user clearly authorized delegation.

Authorization includes:

- explicit enablement of `$subagent-dispatch`
- mention of `子代理` or subagent delegation
- explicit authorization in an active user-scoped instruction file
- a short execute-plan utterance that clearly refers to a visible prior plan, such as `Implement plan`

Default-off posture:

- ordinary chat, direct Q&A, and trivial edits stay on the main thread
- subagents are opt-in or clearly justified, not the default response shape
- the skill defines dispatch semantics and escalation rules
- agent instructions define task-local contract details and output shape

After auto-applying this skill, announce activation and the planned delegation split before spawning subagents.

## Ownership

Only the main thread may create, steer, interrupt, wait on, close, and integrate subagents.

Only the main thread may decide:

- whether a partial result is already enough
- whether direction changes are required
- whether implementation results are ready to integrate
- what final judgment to present

Subagents must not create additional subagents.

Prefer fresh or isolated context for `exploration` and `execution`. Prefer inherited context for `implementation` only when the current main-thread history is actually needed.

## Dispatch

Stay local for:

- one quick lookup that is faster locally than via dispatch
- a trivial tightly scoped edit with low coordination cost
- exploration whose result is unlikely to affect the current decision window

Escalate only when delegation is likely to save main-thread context, wall-clock time, or both.

Classify delegated work by return semantics:

- `exploration`: return partial signal quickly so the main thread can decide what to do next
- `execution`: run mechanical command work until completion or until a decision fork must be handed back
- `implementation`: own a bounded write scope and return only when that owned scope is complete or blocked
- `default`: fallback only when the specialized classes do not fit cleanly

If a task mixes code changes and heavy validation, finish `implementation` first, then use `execution`.

## Class Semantics

Parent agents must provide an explicit bounded contract before dispatch.

For `exploration`:

- the goal is partial signal, not full closure
- use it only for bounded questions
- enough signal is enough; return early
- if broader synthesis is needed or the decision window closes, stop or hand control back

For `execution`:

- it owns mechanical run, not policy decisions
- a decision fork must be surfaced to the main thread immediately
- the main thread must wait for its evidence before claiming validation conclusions

For `implementation`:

- require an explicit write scope contract before dispatch
- default to waiting for completion or a real blocker
- if scope expansion, abstraction conflict, or architecture decision appears, hand control back
- parallel implementation is allowed only when both path ownership and abstraction ownership are disjoint

## Reuse And Routing

Review active same-class subagents before creating a new one.

Treat each active subagent as one of these states:

- `warm-reusable`
- `summarize-first`
- `terminal`

Direct reuse is allowed only when class, goal, and success condition still fit and the old context is unlikely to bias the next step incorrectly.

Use `summarize-first` when reuse would save time but context pollution risk is rising: request a short state capsule, then continue from that capsule instead of the full old history.

Treat interrupted `implementation` agents as `terminal` for repo-tracked write work.

Prefer stable defaults plus dynamic escalation:

- `exploration -> balanced`, but very narrow exploration can use a fast short-context model
- `execution -> fast short-context` when the task is mostly launch, waiting, log scanning, or artifact collection
- `implementation -> balanced/strong` depending on scope and coupling

If ambiguity, search surface, retained-context needs, or write responsibility grows, escalate to the stronger route instead of stretching a narrow or fast route too far.

## Wait, Interrupt, And Close

After dispatch, keep advancing non-overlapping work on the main thread when possible.

Wait only for the subset of subagent results that the next critical-path step now depends on.

Apply that by class:

- `exploration`: enough signal is enough
- `execution`: wait before using its evidence for validation conclusions
- `implementation`: wait for completion or blocker before integration, overlapping edits, result-dependent validation, or the final answer

Prefer wrap-up steering over interrupt when there is no urgent scope conflict.

Interrupt only for a clear reason:

- wrong scope, wrong target, or new overlap
- the subagent is stuck and the main thread has a better immediate path
- validation disproves the current direction
- the user explicitly requests a stop or redirect

If a subagent times out or returns low-signal output, redirect once with a tighter scope or switch to a better-scoped or stronger agent. Do not treat timeout as completion.

Close a subagent immediately once its result is integrated, superseded, or no longer needed.
