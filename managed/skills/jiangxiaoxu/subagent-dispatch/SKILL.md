---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use when subagent capabilities are available and the user explicitly enables `$subagent-dispatch`, mentions `子代理` or subagent delegation, or uses an execute-plan phrase such as `Implement plan` to execute an already-generated concrete plan.
---

# Subagent Dispatch

Use this skill only when the current thread has subagent capabilities available. If subagent tools are unavailable in the current thread, do not apply this skill.

Apply this skill when the user explicitly enables `$subagent-dispatch`, mentions `子代理`, asks for subagent delegation, or uses an execute-plan phrase such as `Implement plan` to execute a concrete prior plan after the thread has returned to `Default`.

Treat short execute-plan phrases such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `execute plan`, `start implementing the plan`, `按这个计划开始做`, `开始按计划执行`, `"Implement plan"`, `回复: Implement plan`, and `Implement plan;` as equivalent signals when they refer to a visible prior plan.

## TL;DR

- Use this skill only when subagent tools are available and the user clearly authorized delegation.
- Split work by primary deliverable: evidence -> `Read-only exploration`, code changes -> `implementation`, command execution -> `Execution-oriented`.
- Prefer parallel dispatch for independent sidecar work that does not block the next local step.
- Reuse a suitable active subagent before creating a new one.
- Let the main thread keep doing non-overlapping work after dispatch; wait only when the next critical-path step depends on a subagent result.
- Keep integration, prioritization, and final explanation on the main thread.

## Quick Dispatch Table

| Task shape | Default owner |
| --- | --- |
| Read code, trace call chains, confirm scope, collect evidence | `Read-only exploration` |
| Localized repo-tracked edit with clear write scope | `implementation` |
| Build, test, reproduce, benchmark, collect logs | `Execution-oriented` |
| Tiny edit or tiny lookup with no meaningful handoff overhead | Main thread |
| Cross-module change plus separate verification phase | `implementation`, then `Execution-oriented` |

## Authorization

- Apply this skill only when the current thread can actually call and manage subagent features.
- Treat explicit enablement of `$subagent-dispatch`, or any explicit authorization in an active user-scoped instruction file, as permission for the main thread to create and manage subagents.
- Keep responsibility for decomposition, agent selection, waiting, integration, and explanation in the main thread.
- Default to delegating work that is suitable for subagents.

## Agent Classes

- Use `Read-only exploration` for read-only discovery, entry-point location, call-chain tracing, impact analysis, and external verification.
- Use `implementation` for repo-tracked code changes, local fixes, and controlled refactors.
- Use `Execution-oriented` for `build`, `test`, `benchmark`, `diagnostic`, reproduction, regression confirmation, performance checks, and other command-running tasks whose primary deliverable is execution evidence.
- Match the available subagent options in the current environment to these three classes by their primary deliverable and expected depth, without depending on any specific agent label names.

## Dispatch Rules

- Classify work by the current phase's primary deliverable: evidence and conclusions belong to `Read-only exploration`, code changes belong to `implementation`, and command execution plus result summaries belong to `Execution-oriented`.
- If more than one subagent in the same class fits, choose the most suitable one; if still ambiguous, prefer the stronger agent.
- Default to assigning `implementation` work to an `implementation` subagent. Only keep it on the main thread when the task is extremely small, the boundary is clear, and the main thread is obviously faster.
- If an `implementation` task spans multiple files, crosses modules, has notable edge cases, carries higher risk, or requires expensive context gathering, always delegate it to an `implementation` subagent.
- Default to assigning `Read-only exploration` and `Execution-oriented` work to their matching subagent classes.
- If the current phase is mainly about running commands, validating changes, reproducing issues, confirming regressions, measuring performance, or collecting failure evidence, prefer `Execution-oriented`.
- If a task mixes code modification and script-based verification, split it into two phases: finish the `implementation` phase first, then handle the execution-heavy phase through an `Execution-oriented` subagent instead of the main thread.
- If implementation work finishes and the next step still requires command execution, log observation, or failure-evidence collection, reuse a suitable active `Execution-oriented` subagent when available; otherwise create a new one.
- Prefer dispatching multiple independent sidecar tasks in parallel when they do not share a write scope and do not block the same immediate next step.
- Keep the immediate critical-path step on the main thread unless a subagent can do it materially better without creating avoidable waiting.

## Main Thread Constraints

- After launching subagents, continue with meaningful non-overlapping work on the main thread whenever such work exists.
- Wait only when the next critical-path step requires a subagent result, or when integration would otherwise duplicate unresolved delegated work.
- Do not wait by reflex immediately after dispatch if the main thread can still advance the task safely.
- If multiple subagents are running, prefer waiting for the subset whose results are now needed instead of forcing a full-batch barrier.
- Do not redo delegated work on the main thread while that delegated task is still in flight.
- If the previous batch was `implementation` and the next step requires command execution, log observation, or failure-evidence collection, handle that step through an `Execution-oriented` subagent rather than the main thread.
- After auto-applying this skill, announce the activation and state the planned delegation split before spawning subagents.

## Lifecycle And Reuse

- Do not close subagents immediately after a batch returns if they may still be reusable in the following steps.
- Before dispatching any new task, check whether there is an existing active subagent of any class that has not been closed and is suitable for reuse.
- If a suitable active subagent exists, reuse it instead of spawning a new one.
- If no active subagent is suitable for reuse and a new subagent is still required, explicitly review the active subagents of the same class, keep the ones that are still worth preserving, close the ones that are not, and only then create the new one.
- Do not rely on reopening closed subagents. Once a subagent is closed, treat it as terminal and unavailable for future reuse.

## Subagent Invocation Constraints

- Allow only the main thread to create, schedule, and close subagents.
- Do not allow subagents to create additional subagents.
- Always make the context-inheritance choice explicit when creating a subagent.
- For `implementation`, default to inheriting the main thread context; switch to isolated context only when the task is highly independent or inherited history would materially pollute the context.
- For non-`implementation` work, default to isolated context to reduce irrelevant history injection and preserve focused context.
- Use a long default wait timeout, about 30 minutes, unless the task clearly needs a different bound.
