## Why

The Resources tree currently exposes empty type groups, expands skill internals by default, and uses a binary expand/collapse mode that cannot preserve user-expanded skills while expanding other containers. Plugin actions also need to open the actual manifest, and enable/disable menu commands should communicate their current applicability instead of remaining enabled in both states.

## What Changes

- Hide empty top-level and plugin-owned MCP/Skills groups, including filter-aware empty groups.
- Start Resources with roots, groups, plugins, MCP containers, and ordinary directories expanded while individual skills and their supporting entries remain collapsed.
- Track per-node expansion events and make the title action choose Collapse All, Expand non-skill containers, or Expand All according to the current tree state.
- Render workspace-scoped resource and supporting-entry tooltip paths relative to the active workspace root.
- Open a plugin's `.codex-plugin/plugin.json` when its row is clicked or when Open Plugin Manifest is selected.
- Disable Enable/Disable menu commands according to the selected plugin, MCP, or skill's effective state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `unified-resource-tree`: omit empty MCP/Skills groups while preserving plugin ownership and group order.
- `resource-pane-interactions`: define skill-specific defaults, stateful expansion controls, workspace-relative tooltips, plugin manifest opening, and state-aware enablement menus.

## Impact

- Affects `apps/vscode/src/extension.ts`, the VS Code manifest, and focused provider/helper tests.
- Adds small pure helpers for resource group visibility, tooltip path display, and expansion-state decisions.
- No changes to core discovery or persisted Codex configuration.
