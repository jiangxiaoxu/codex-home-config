# Subagent Dispatch Protocol

This document is a maintenance companion for `SKILL.md`. Keep runtime behavior in `SKILL.md` and role-local behavior in `managed/agents/*.toml`.

## Mode Guide

- `Chat`: ordinary chat, direct Q&A, and trivial edits; stay local
- `Exploration-enhanced`: a bounded unknown can change the next main-thread decision; use at most one exploration agent
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

## Routing Checklist

- `exploration -> explorer_fast` only when the task is a single hypothesis check, a tiny candidate search, or a narrow call-path trace
- `exploration -> explorer` when the search surface, ambiguity, or retained context is too large for a fast lane
- `execution -> awaiter_fast` only for one command family, one watch loop, or narrow artifact/log collection
- `execution -> awaiter` when logs are large, diagnosis needs more context, or the command family is long-lived
- `implementation -> worker` for one module or tightly bounded local ownership
- `implementation -> worker_heavy` for multi-file or cross-module work inside a still-controlled ownership boundary

Upgrade immediately when any of these appear:

- retained context matters across multiple steps
- the task needs cross-module synthesis
- multiple candidates must be weighed together
- write ownership or abstraction ownership is not yet stable
- the fast route would need a second redirect

## Spark-Safe Checklist

Use `gpt-5.3-codex-spark` only when every item below is true:

- the current context can actually dispatch `gpt-5.3-codex-spark`
- the task is narrow and single-pass
- the expected output is a quick signal, failure signature, or small candidate set
- the search or execution surface is explicitly bounded
- the task does not own repo-tracked writes
- a wrong first route is cheap to recover from

If that model is unavailable, fall back to the non-fast same-class route instead of forcing the fast lane.

Do not use Spark for:

- broad repo exploration
- long-lived retained context
- cross-module implementation
- shared contract preservation
- final synthesis or architecture judgment

## Reuse States

- `warm-reusable`: same class, same goal, same success condition, low context-pollution risk
- `summarize-first`: same class and nearby goal, but the old history is getting noisy; ask for a short state capsule first
- `terminal`: wrong class, wrong goal, invalidated context, or interrupted repo write ownership

Treat interrupted `implementation` agents as `terminal`.

## State Capsule Template

When reusing via summary, request a compact capsule with:

- `Mission`
- `Scope owned`
- `Facts learned`
- `Artifacts or logs`
- `Open fork`
- `Next recommendation`
