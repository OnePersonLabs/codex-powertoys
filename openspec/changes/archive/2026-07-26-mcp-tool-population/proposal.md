## Why

MCP rows currently remain empty unless a user manually invokes a one-shot loader, and the Resources and MCPs panes do not share the same tool hierarchy. This makes enabled MCPs hard to inspect and hides the permissions and descriptions that determine whether an individual tool is allowed or requires approval.

## What Changes

- Discover tools for enabled MCPs through a single sequential background queue at startup and after refresh or enablement changes.
- Cache successful and failed probes in memory, replacing cached results on explicit re-query requests while avoiding repeated failed starts.
- Ensure every probe owns and closes its transport/process in `try`/`finally`, including failure paths.
- Render MCP tools beneath MCP nodes in both Resources and MCPs panes, with permission glyphs and shared selection, tooltip, context-menu, and expansion behavior.
- Derive tool permission glyphs from Codex MCP configuration (`enabled_tools`, `disabled_tools`, server defaults, and per-tool approval modes), with deny taking precedence and unknown/write-sensitive modes treated as requiring approval.
- Expand tooltips with field-labelled MCP, plugin, skill, and tool metadata, including skill `openai.yml` interface fields.
- Treat MCP nodes like skill nodes in the Resources expansion state machine, and use `💪` for skills.
- Simplify Resources root labels to `Global` and `Workspace`, retaining full root paths in tooltips.

## Capabilities

### New Capabilities
- `mcp-tool-discovery`: Background MCP probing, lifecycle cleanup, result caching, permission-state derivation, and tool rendering metadata.

### Modified Capabilities
- `resource-pane-interactions`: Populate and interact with MCP tool children consistently across Resources and MCPs, update expansion and tooltip behavior.
- `unified-resource-tree`: Extend the unified tree's MCP tool and label contracts to cover background results, permission glyphs, and concise scope roots.

## Impact

The change affects the core MCP transport/types and TOML-derived permission metadata, the VS Code extension's two MCP-capable providers and shared tree-item rendering, tooltip/expansion helpers, tests, documentation, and the OpenSpec resource-tree contracts. No new runtime dependency is required.
