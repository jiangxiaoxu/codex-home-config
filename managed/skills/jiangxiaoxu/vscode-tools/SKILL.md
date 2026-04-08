---
name: vscode-tools
description: Trigger this skill whenever `vscode-tools` is explicitly mentioned.
---
Prefer `lm_tools_bridge` as the default path for follow-up work.

Execution order:
1. Bind the current workspace first.
2. Prefer the bridged tools exposed through `lm_tools_bridge` for search, navigation, diagnostics, and other supported workspace tasks.
3. Fall back to other tools only when `lm_tools_bridge` cannot cover the task, or when the tool is unavailable, failing, or otherwise constrained. When falling back, explain the reason.

If you delegate to a sub-agent:
- Explicitly instruct the sub-agent to use the `vscode-tools` skill as well.
- Explicitly require the sub-agent to bind the workspace first, then prefer `lm_tools_bridge`.
- Do not omit the fallback condition or the requirement to explain why fallback was necessary.




