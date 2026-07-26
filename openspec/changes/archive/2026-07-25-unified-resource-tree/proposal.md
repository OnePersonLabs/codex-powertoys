## Why

The current extension splits Skills, Plugins, and MCPs across separate views and mixes native checkboxes with status emojis, making it difficult to understand where a resource comes from or which plugin owns it. A single filesystem-shaped tree will make global/workspace scope, plugin ownership, skill directories, MCP descriptors, and loaded tools visible in one place while preserving the existing status indicators and management actions.

## What Changes

- **BREAKING** Replace the separate Skills, Plugins, and MCPs navigation surfaces with one unified resource tree view.
- Organize the unified tree under exactly two roots: `Global — ~/` and `Workspace — <workspace root>`.
- Render discovered global resources from `~/.agents`, `~/.codex`, configured roots, and plugin subpaths beneath the Global root; render workspace equivalents beneath Workspace.
- Preserve the physical plugin layout: plugin directories expose their `skills/` contents as child skills and their `.mcp.json` as the parent descriptor for plugin-provided MCP servers.
- Keep standalone skills and managed MCP definitions in their source/configuration locations rather than flattening them into type-only groups.
- Use the existing status checkbox/emoji state followed by stable type icons: `🔌` plugin, `🧰` MCP, `🔨` MCP tool, and `🧠` skill.
- Keep MCP tool loading explicit; tools appear under their MCP only after the user loads them.
- Preserve selection, inspection, enablement, rename/delete/copy/move guards, and read-only behavior for plugin-owned resources.
- Keep the Agents view and recursive Global/Workspace agent navigation unchanged unless shared tree plumbing requires a non-user-visible refactor.

## Capabilities

### New Capabilities

- `unified-resource-tree`: A single scope- and source-oriented tree for Skills, Plugins, MCPs, and explicitly loaded MCP tools.

### Modified Capabilities

- None. The existing canonical agent-tree contract is not changing; this proposal changes the resource surfaces for Skills, Plugins, and MCPs.

## Impact

- Affected VS Code extension providers, view contributions, tree-node models, selection/checkbox event wiring, drag-and-drop targets, and context-menu conditions.
- Core discovery records remain the source of truth, but the extension must retain source roots, plugin paths, `.mcp.json` ownership, and loaded MCP tool state when constructing tree nodes.
- Existing separate view IDs and commands may need migration or removal from the extension manifest; resource operations and Info selection behavior must continue to work from the unified tree.
- No Codex configuration schema or on-disk resource format changes are required.
