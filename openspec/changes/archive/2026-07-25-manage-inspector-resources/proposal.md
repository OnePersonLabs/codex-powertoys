## Why

Codex PowerToys can inspect skills, agents, and MCP configuration, but it cannot yet explain plugin ownership or safely manage those resources across global and workspace scopes. The VS Code views also become difficult to use as their toolbar actions grow, and there is no consistent workflow for recursive agent discovery, resource transfer, rename, or deletion.

## What Changes

- Discover plugins from manifests, remote-install metadata, skills directories, and plugin MCP descriptors.
- Propagate plugin enablement to contained skills and MCPs while preserving source ownership and effective-state diagnostics.
- Add recursive global/workspace agent trees with stable relative paths.
- Replace text-heavy toolbar actions with icon commands that retain descriptive tooltips.
- Add native multi-selection, scoped cut/copy/paste, rename, delete, move, conflict resolution, confirmation dialogs, and internal drag/drop for skills, MCPs, and agents.
- Preserve plugin cache sources as read-only while allowing plugin-owned resources to be copied into managed scopes.
- Add source-aware rename and transfer mutations that preserve unrelated TOML and metadata.

## Capabilities

### New Capabilities

- `plugin-inspection`: Discover plugin metadata and plugin-owned skills/MCPs, compute plugin enablement, and expose ownership diagnostics.
- `resource-management`: Rename, delete, move, copy, cut, paste, and conflict-resolve skills, MCPs, and agents across global/workspace scopes.
- `agent-tree-inspection`: Recursively discover and present global/workspace agent directories and TOML files.
- `inspector-interactions`: Add icon toolbars, multi-select tree views, scoped checkboxes/actions, confirmations, and native drag/drop behavior.

### Modified Capabilities

- `skill-inspection`: Include plugin ownership and disabled-by-plugin effective state, plus safe skill rename/transfer behavior.
- `mcp-inspection`: Include plugin MCP discovery, plugin ownership/effective state, and source-aware rename/transfer behavior.

## Impact

- Extends `packages/core` domain types, discovery, TOML/JSON mutation services, filesystem transfers, and diagnostics.
- Extends the Commander CLI with plugin and resource-management operations.
- Reworks `apps/vscode` providers to use configured `TreeView` instances with multi-select, checkboxes, drag/drop, icon commands, and confirmation flows.
- Adds tests and packaging validation; no browser-hosted extension target or persisted “do not ask again” preference is introduced.
