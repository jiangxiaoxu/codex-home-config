---
name: subagent-dispatch
description: Dispatch workflow rules and trigger normalization for delegated subagent work. Use when the user explicitly references `$subagent-dispatch`, asks to use subagents, discusses subagent workflow design, or uses an execute-plan phrase such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`.
---

# Subagent Dispatch

## Purpose And Boundaries

Use this skill when subagents are available and the conversation needs subagent routing or dispatch workflow guidance.

Authorization and ownership come from higher-level instructions. This skill does not grant delegation permission by itself. Use it to:

- normalize delegation-related triggers into a consistent workflow
- choose the right route: `exploration`, `execution`, or `implementation`
- define a concrete dispatch contract for each subagent
- keep wait, reuse, interrupt, and close decisions consistent

Use `analysis activation` when the conversation is only about routing, workflow, or subagent policy.

Use `delegation activation` when the current task should enter dispatch workflow evaluation under the higher-level delegation rules.

Bare mentions of `子代理` do not count as delegation intent.

## Trigger Normalization

Load this skill when one of these is true:

- explicit enablement of `$subagent-dispatch`
- the user asks to `派发子代理` or `使用子代理` for a task
- the user uses a short execute-plan utterance that clearly targets a visible prior plan, such as `Implement plan`, `PLEASE IMPLEMENT THIS PLAN`, `按这个计划实现`, or `按计划执行`
- the current task is in or entering `Plan Mode` information gathering, has a concrete deliverable, and needs bounded information retrieval that can change the next planning decision
- the conversation is specifically about subagent routing or workflow design

Normalize the trigger into one of these workflow states:

- `analysis activation`: use for routing, workflow, or policy discussion only; analyze the workflow, but do not treat the discussion itself as a reason to dispatch unrelated implementation or execution work
- `delegation activation`: use when the current task carries delegation intent and should enter route selection

Additional normalization rules:

- explicit `$subagent-dispatch` means `delegation activation` for the current task unless the surrounding conversation is clearly only policy analysis
- asking to `派发子代理` or `使用子代理` for the current task means `delegation activation`
- an execute-plan phrase that clearly targets a visible prior plan means `delegation activation` for that planned task
- `Plan Mode` information gathering for a concrete current task means `delegation activation` only for read-only `exploration`
- routing, workflow, or policy discussion without a current-task delegation ask stays `analysis activation`

## Route Entry Gates

Start from this default posture:

- ordinary chat, direct Q&A, and trivial edits stay on the main thread
- the main thread completes one local triage pass before dispatch
- keep work on the main thread while route choice, scope, success criteria, or key parameters are still materially unstable

Enter `exploration` only when all of these hold:

- there are bounded unknowns whose early signal can change the next step
- further local exploration would noticeably bloat main-thread context
- the task is not broad open-ended research

`exploration` route rules:

- split independent narrow probes only when useful
- keep at most `2` exploration agents active at once, and only when they cover disjoint broader search surfaces
- in `Plan Mode`, automatic dispatch may enter only `exploration`
- `Plan Mode` auto-entry still requires a concrete deliverable, bounded information retrieval, one completed local triage pass, and a read-only scope

Enter `execution` only when all of these hold:

- the next useful step is primarily mechanical execution or validation
- the task is not a trivial check
- the command family, success criteria, and key parameters are at least minimally stable
- the work is long-running, high-output, validation-heavy, or a clearly independent execution sidecar

`execution` route rules:

- prefer `awaiter`
- keep execution on the main thread when the check is trivial, the command family is still unstable, or success criteria are still materially unresolved

Enter `implementation` only when all of these hold:

- the user asked to implement, fix, refactor, or deliver work instead of only discussing it
- the task is not a trivial edit
- the write scope is at least minimally stable, even if the full plan is not finished
- the work is multi-file, multi-step, validation-heavy, has an independent sidecar, or is already swelling main-thread context

`implementation` route rules:

- prefer `worker`
- keep implementation on the main thread when the edit is trivial, the architecture or ownership is still unresolved, or the write scope is still materially unstable

`execution` and `implementation` stay serial by default on the same critical path.

Allow parallel `execution` and `implementation` only when all of these hold:

- the owned scopes are explicitly independent
- neither lane needs to wait on the other's in-flight result
- the execution sidecar does not depend on the current implementation result
- ownership, validation claims, and final integration remain unambiguous

If a task mixes code changes and heavy validation, dispatch `implementation` first and `execution` second unless the validation already satisfies the parallel gate above.

When implementation work is complete and the next step is primarily mechanical validation, prefer handing off to the `execution` route.

## Dispatch Contract

Every subagent dispatch must include an explicit contract. State all of these:

- `mission`: the concrete task to complete
- `owned scope`: the files, surfaces, or responsibilities the subagent owns
- `forbidden scope`: the files, surfaces, or decisions the subagent must not touch
- `success condition`: what result makes the task done
- `hand-back trigger`: when the subagent should stop and return control
- `expected output format`: the exact form of the result the main thread should receive

Recommended `fork_context` defaults:

- `exploration`: prefer `fork_context=true` unless an intentionally independent probe or a scoped briefing is clearly sufficient
- `execution`: prefer `fork_context=false`; use `fork_context=true` only when the command depends on recent thread state that cannot be reliably compressed
- `implementation`: prefer `fork_context=true` unless a scoped briefing is clearly sufficient and the current main-thread history is not actually needed

`fork_context` helps with context shape, but it never replaces the dispatch contract.

## Wait, Reuse, Interrupt, Close

After dispatch, keep advancing non-overlapping work on the main thread when possible.

Wait only when the next critical-path step depends on that result:

- `exploration`: wait only when its signal is needed for the next decision; if one or more exploration results already provide enough signal, do not wait for the remaining routes
- `execution`: wait before using its evidence for validation claims
- `implementation`: wait before integration, overlapping edits, result-dependent validation, or the final answer

Review active same-class subagents before creating a new one.

Reuse states:

- `warm-reusable`: class, goal, and success condition still fit, and old context is unlikely to bias the next step incorrectly
- `summarize-first`: reuse would save time, but context pollution is rising; request a short state capsule before continuing
- `terminal`: do not reuse the agent for the current line of work

Additional reuse rules:

- treat interrupted `implementation` agents as `terminal` for repo-tracked write work
- treat completed exploration agents as `terminal` once their result is consumed, superseded, or their decision window closes
- if ambiguity, retained-context needs, or write responsibility grows, upgrade the route instead of stretching a narrow lane too far

Interrupt only for a clear reason:

- wrong scope, wrong target, or new overlap
- the subagent is stuck and the main thread has a better immediate path
- validation disproves the current direction
- the user explicitly requests a stop or redirect
- enough exploration signal already closed the decision window

If a subagent times out or returns low-signal output, redirect once with a tighter scope or a stronger route. Do not treat timeout as completion.

Close a subagent immediately once its result is integrated, superseded, or no longer needed.
