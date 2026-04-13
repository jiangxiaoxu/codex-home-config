---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use when subagent capabilities are available and the user explicitly enables `$subagent-dispatch`, mentions `子代理` or subagent delegation, or uses an execute-plan phrase such as `Implement plan` to execute an already-generated concrete plan.
---

# Subagent Dispatch

## Activation

Use this skill only when the current thread can create and manage subagents, and the user clearly authorized delegation.

Authorization includes explicit enablement of `$subagent-dispatch`, mention of `子代理` or subagent delegation, explicit authorization in an active user-scoped instruction file, or a short execute-plan utterance that clearly refers to a visible prior plan, such as `Implement plan` or `PLEASE IMPLEMENT THIS PLAN`.

Keep decomposition, prioritization, waiting, integration, and the final explanation on the main thread.

## Core Model

Classify each phase by its primary deliverable:

- `Read-only exploration`: evidence, scope, entry points, call chains, impact analysis, `Web Search`, and external verification.
- `implementation`: repo-tracked code changes, local fixes, and controlled refactors.
- `Execution-oriented`: command execution, validation, reproduction, logs, benchmarks, and regression evidence.
- `default`: general-purpose delegated work that does not fit the classes above, but still benefits from handoff.

Tiny local exception: keep work on the main thread for one quick lookup, or a trivial tightly scoped change with clear boundaries, low coordination cost, and no separate verification phase.

Expected outputs:

- `Read-only exploration`: evidence and a conclusion.
- `implementation`: changed scope plus assumptions or risks.
- `Execution-oriented`: commands run, status, and a failure summary when relevant.
- `default`: the requested deliverable plus concise status, assumptions, and open questions.

Match available subagent options to these classes by primary deliverable and expected depth, without relying on specific agent label names. Use `default` only as a fallback when the specialized classes do not fit cleanly.

## Decision Policy

If this skill is active, the main thread is authorized to dispatch subagents under the activation criteria.

Use this precedence:

1. Apply the tiny local exception if it clearly fits.
2. Otherwise assign by primary deliverable.
3. Then optimize for reuse, parallelism, and waiting.

Prefer delegating suitable `implementation` work.

Prefer an `implementation` subagent when the task spans files, crosses modules, has meaningful edge cases or risk, or requires expensive context gathering.

Prefer matching `Read-only exploration` and `Execution-oriented` work to their own classes.

If no specialized class fits cleanly but delegation is still useful, use `default` for general-purpose delegated work.

If a task mixes code changes and command-heavy verification, split it into phases: finish `implementation` first, then use `Execution-oriented` for verification.

If multiple subagents fit, choose the most suitable one. If still ambiguous, prefer the stronger agent.

Prefer parallel dispatch for independent sidecar tasks with separate write scopes that do not block the same immediate next step.

## Execution Conventions

Before creating a new subagent, reuse a suitable active one when practical.

If no active subagent is suitable, review same-class active subagents, keep reusable ones, close stale ones, then create a new one.

Treat closed subagents as terminal and unavailable for reuse.

Only the main thread may create, schedule, and close subagents. Subagents must not create additional subagents.

Always choose context inheritance explicitly: prefer inherited context for `implementation`, and isolated context for non-`implementation` work unless shared history is clearly useful.

When using `default`, give a tighter task contract than usual: state the requested deliverable, constraints, and success condition explicitly.

Prefer a long wait timeout, about 30 minutes, unless the task clearly needs a different bound.

If a subagent times out or returns low-signal output, redirect once with a tighter scope or switch to a better-scoped or stronger subagent. Do not treat timeout as completion.

## Main Thread Ownership

After dispatch, keep advancing non-overlapping work on the main thread when possible.

Wait only when the next critical-path step depends on a subagent result, and wait only for the subset now needed.

Do not redo delegated work on the main thread while that delegated task is still in flight.

Prefer an `Execution-oriented` subagent when the next phase after `implementation` is command execution, validation, or evidence collection.

After auto-applying this skill, announce activation and the planned delegation split before spawning subagents.
