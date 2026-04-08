---
name: vscode-tools
description: Use this skill when the context indicates vscode-tools should be preferred for workspace tasks, including delegated sub-agents.
---
优先使用 `vscode-tools` 系列工具完成后续任务。
如果派发子代理,必须在派发指令中明确要求子代理同样优先使用 `vscode-tools` 系列工具。
只有在 `vscode-tools` 系列工具无法覆盖当前任务,或工具本身报错/受限时,才允许回退到其他工具,并需要说明原因。
