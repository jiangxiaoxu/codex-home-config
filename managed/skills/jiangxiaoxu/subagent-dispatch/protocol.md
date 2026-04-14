# Subagent Dispatch Protocol

This document is a maintenance companion for `SKILL.md`. Keep runtime behavior in `SKILL.md` and role-local behavior in `managed/agents/*.toml`.

## Mode Guide

- `Chat`: ordinary chat, direct Q&A, and trivial edits; stay local
- `Exploration-enhanced`: bounded unknowns can change the next main-thread decision; fan out independent narrow exploration probes as useful within the thread budget and keep at most `2` exploration agents active only when they own disjoint broader search surfaces
- `Slow-execution`: the next critical-path step is long mechanical execution; use at most one execution agent
- `Long-implementation`: the task is clearly implementation-heavy and the main thread should preserve decision and integration context
- `Parallel-implementation`: only after both path ownership and abstraction ownership are explicitly split

Exit any enhanced mode when the critical path no longer depends on delegated work or the remaining work becomes cheaper locally.

## Auto Long-Task Gate

Allow automatic dispatch only when all of these are true:

- the user asked to implement, fix, refactor, or deliver work
- the main thread already completed one local triage pass
- delegation is likely to save main-thread context, wall-clock time, or both

Useful positive signals:

- the task is multi-file or multi-step
- long execution validation is clearly required
- there is an independent sidecar task
- the main-thread context is already swelling

Do not auto-dispatch when the user is only discussing workflow design, prompting strategy, or subagent policy.

## Plan Mode Exploration Auto-Dispatch

Allow `Plan Mode` auto-dispatch only when all of these are true:

- the task has a concrete deliverable instead of only workflow or policy discussion
- the current task is in or entering `Plan Mode` information gathering
- the current step needs bounded information retrieval that can change the next planning decision
- the main thread already completed one local triage pass
- bounded unknowns remain and further local exploration would noticeably bloat main-thread context
- the delegated work can stay fully read-only

Positive signals:

- repo exploration, entry-point discovery, call-path tracing, or targeted web verification can narrow the next planning fork
- the work can be split into narrow probes or a small number of disjoint broader exploration surfaces
- early partial signal is enough to keep planning moving

Negative signals:

- the user is only discussing workflow design, routing strategy, prompting strategy, or subagent policy
- the exchange is ordinary Q&A without a concrete delivery target
- the unknowns are too broad for bounded exploration
- the next useful step is execution or implementation rather than exploration

When this path is active:

- enter only `Exploration-enhanced`
- dispatch only the `exploration` lane
- do not auto-upgrade into `execution` or `implementation`

## Routing Checklist

- `exploration -> explorer` when the task needs bounded repo exploration, entry-point discovery, call-path tracing, impact analysis, scope confirmation, or targeted web verification; keep at most `2` exploration routes active at a time, and only when they cover disjoint broader search surfaces
- `execution -> awaiter` for mechanical runs, watch loops, or artifact and log collection
- `implementation -> worker` for implementation work inside a controlled ownership boundary, including multi-file or cross-module edits that still have explicit ownership

`execution` and `implementation` are mutually exclusive lanes. Finish, stop, or hand back one before starting the other.

For mixed exploration routing:

- prefer bounded fan-out when the problem can be decomposed into narrow independent probes
- when broader retained context still seems necessary, start or keep up to `2` exploration routes instead of serializing them
- only use multiple exploration routes when their broader search surfaces are meaningfully disjoint
- if any exploration results already provide enough decision-useful signal, stop waiting on the remaining exploration routes and wrap them up or interrupt them

Upgrade immediately when any of these appear:

- retained context matters across multiple steps
- the task needs cross-module synthesis
- multiple candidates must be weighed together
- write ownership or abstraction ownership is not yet stable
- the current route would need a second redirect

## Context Inheritance

Use explicit `fork_context` defaults instead of implicit wording:

- `exploration`: prefer `fork_context=true` unless the parent agent wants an intentionally independent probe or a scoped briefing is clearly sufficient
- `execution`: prefer `fork_context=false`; use `fork_context=true` only when the command depends on recent thread state that cannot be reliably compressed
- `implementation`: prefer `fork_context=true` unless a scoped briefing is clearly sufficient and the current main-thread history is not actually needed

`fork_context=true` may reduce briefing size, but it never replaces an explicit task contract. The parent agent must still specify the concrete mission, owned scope, success condition, and stop or hand-back triggers.

## Reuse States

- `warm-reusable`: same class, same goal, same success condition, low context-pollution risk
- `summarize-first`: same class and nearby goal, but the old history is getting noisy; ask for a short state capsule first
- `terminal`: wrong class, wrong goal, invalidated context, or interrupted repo write ownership

Treat interrupted `implementation` agents as `terminal`.
Treat completed exploration agents as `terminal` once their result is consumed, superseded, or their decision window closes.

## State Capsule Template

When reusing via summary, request a compact capsule with:

- `Mission`
- `Scope owned`
- `Facts learned`
- `Artifacts or logs`
- `Open fork`
- `Next recommendation`
