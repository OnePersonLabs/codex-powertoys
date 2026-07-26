## Why

The unified resource tree now exposes the right data, but its hierarchy is difficult to scan and the separate flat Skills and MCP workflows are no longer available. The tree controls also do not communicate their current expand/collapse action, and users cannot quickly filter or copy canonical paths from the panes.

## What Changes

- Restore dedicated Skills and MCP TreeViews alongside Resources and Agents.
- Keep Skills and MCP panes flat, alphabetically ordered, fully expanded by default, and backed by the same selection, source opening, status, enablement, tool-loading, and context-menu operations as Resources.
- Organize Resources under `Global` and `Workspace`, each containing `Plugins/MCPs/Skills` groups, with plugin-owned MCPs and Skills nested under their plugin group.
- Add a text filter input with a clear action to the Resources, Skills, and MCP toolbars; filtering matches visible names and full paths.
- Add stateful expand-all/collapse-all toolbar actions for Resources and Agents so the command title and icon reflect the next action.
- Add `Copy Full Path` and `Copy Relative Path` context actions to every pane. Relative paths are computed from the active workspace root and fall back to the full path when no workspace is open.
- Preserve full canonical paths in item tooltips and keep existing right-click actions, plugin read-only protections, drag/drop, and Info routing.

## Capabilities

### New Capabilities

- `resource-pane-interactions`: Dedicated Skills/MCP panes, filtering, path-copy actions, and stateful tree toolbar controls.

### Modified Capabilities

- `unified-resource-tree`: Change the Resources descendants to explicit Plugins, MCPs, and Skills groups while preserving scope and plugin ownership.

## Impact

- VS Code extension providers, tree node models, view registration, toolbar/menu contributions, context keys, selection routing, and clipboard commands.
- Extension tests and README documentation for the restored panes, hierarchy, filters, path actions, and expand/collapse state.
- Core discovery and on-disk resource formats remain unchanged.
