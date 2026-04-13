---
name: subagent-dispatch
description: Subagent dispatch rules for Codex. Use only when the current thread has subagent capabilities available, and when the user explicitly enables `$subagent-dispatch`, mentions `子代理` or subagent delegation, or later issues `Implement plan` for a concrete plan that was produced in Plan Mode after the thread has returned to Default mode.
---

# Subagent Dispatch

Use this skill only when the current thread has subagent capabilities available. If subagent tools are unavailable in the current thread, do not apply this skill.

When subagent capabilities are available, use this skill after the user explicitly enables `$subagent-dispatch`, or when the request implicitly signals structured subagent orchestration, such as mentioning `子代理`, asking for subagent delegation, or later issuing `Implement plan` for a concrete plan that was produced in Plan Mode after the thread has returned to Default mode.

For the `Implement plan` family, auto-apply this skill only when:

- the thread already contains a concrete plan produced in `Plan Mode`
- the visible context shows that the thread is now in `Default mode`
- the `Implement plan` style instruction clearly refers to that prior plan

Otherwise, `Implement plan` alone does not trigger this skill.

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

## Main Thread Constraints

- After launching a batch of subagents, default to waiting for the entire batch to return before continuing.
- Before the current batch has fully returned, limit the main thread to waiting, receiving results, and giving progress updates. Do not continue analysis, implementation, validation, or additional delegation during that time.
- After the current batch has fully returned, decide whether to launch the next batch or continue to the next step.
- If the previous batch was `implementation` and the next step requires command execution, log observation, or failure-evidence collection, handle that step through an `Execution-oriented` subagent rather than the main thread.


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
