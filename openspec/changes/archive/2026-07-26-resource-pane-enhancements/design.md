## Context

The extension currently has one source-oriented Resources tree and a recursive Agents tree. Both use native TreeView title actions, but the resource tree does not expose the requested type groups, Skills/MCPs are not independently browsable, filtering is a one-shot input command, and VS Code's built-in collapse-all affordance does not expose a reliable current action. The core discovery records already contain canonical paths, scope, status, plugin ownership, and MCP tool loading; this change is a VS Code presentation and interaction refactor over those records.

## Goals / Non-Goals

**Goals:**

- Provide Resources, Skills, MCPs, and Agents views with consistent path tooltips and context actions.
- Make Resources a two-scope tree whose descendants are explicit Plugins, MCPs, and Skills groups, with plugin-owned resources nested under the owning plugin.
- Keep Skills and MCPs flat and alphabetically sorted while preserving all existing inspection and mutation behavior.
- Make filtering incremental and clearable, and make expand/collapse title actions reflect the action that will run.
- Keep path-copy operations deterministic, workspace-relative when possible, and available for every tree item.

**Non-Goals:**

- No changes to Codex TOML/JSON schemas, discovery precedence, or core mutation APIs.
- No implicit MCP connections or tool loading.
- No custom webview replacement for native tree panes.
- No migration of user files or changes to the Agents resource model beyond expansion controls and shared path actions.

## Decisions

### 1. Share one node model and item renderer across four providers

Extend the existing discriminated node model with logical group nodes and use a shared TreeItem factory. Resources uses group and plugin nodes; Skills and MCPs map the same discovered records directly to flat leaves; Agents keeps its recursive directory nodes. This avoids divergent tooltip, context-value, command, and path behavior. A separate provider per view is preferred over filtering one provider because each TreeView can have independent filter and expansion state.

### 2. Build explicit scope/type groups in Resources

Each scope root always returns `Plugins`, `MCPs`, and `Skills` groups. The Plugins group returns plugin records. Each plugin returns `MCPs` and `Skills` child groups whose target paths are the plugin `.mcp.json` and `skills/` roots. The top-level MCPs and Skills groups contain only non-plugin records. Filtering removes non-matching leaves while retaining ancestor groups and plugins that contain a matching descendant.

### 3. Use provider expansion mode plus dynamic context keys

Resources and Agents providers expose `setExpanded(boolean)`. Every collapsible TreeItem uses `Expanded` or `Collapsed` from that mode, while leaves remain non-collapsible. The providers default to expanded. The extension hides the static `showCollapseAll` button and contributes paired Expand All/Collapse All title commands gated by per-view context keys, so the visible command switches after each click and refresh.

### 4. Use a reusable InputBox filter session

The filter toolbar command opens a VS Code InputBox and applies `onDidChangeValue` immediately to the owning provider. The InputBox supplies the editable text and clear affordance; a separate close-icon toolbar command is shown while a filter is active and clears both provider state and the session value. Filters match case-insensitively against names and canonical paths, and are independent for Resources, Skills, and MCPs.

### 5. Copy canonical paths through shared commands

Every node resolves to one canonical path: resource source path, plugin root, agent file/directory, source/group target, or MCP config path for a tool. `Copy Full Path` writes that path to the VS Code clipboard. `Copy Relative Path` uses the active workspace folder and POSIX separators; when no workspace is open it writes the full path because no relative base exists. Both commands accept the context-menu node and are contributed to all tree views.

### 6. Preserve existing command routing and protections

Selection continues to route resource records to Info and source-opening commands. Existing context values and command IDs remain stable, with `view` predicates expanded to the Skills and MCP views. Plugin-owned leaves stay read-only for cut, rename, delete, and edit, while copy/export remains available. MCP tool loading remains explicit and stores tool children only in Resources.

## Risks / Trade-offs

- **Large expanded trees** → Default expansion meets the requested scanability, while provider filtering and VS Code's lazy child requests avoid eagerly materializing every descendant.
- **InputBox is not an embedded TreeView control** → Use the supported VS Code InputBox session plus a visible clear command; this avoids unsupported webview replacement while still providing live text filtering and a clear affordance.
- **Workspace-relative paths outside the workspace** → `path.relative` may contain `..`; preserve that exact relative path so the copy action remains truthful and deterministic.
- **Tree expansion state after refresh** → Refresh fires provider changes without mutating the mode; the next action remains represented by the same context key and all newly materialized containers use the selected mode.

## Migration Plan

1. Add shared node/item/path/filter helpers and flat Skills/MCP providers.
2. Replace Resources source nodes with explicit type groups and plugin child groups.
3. Register the two restored views, toolbar commands, context menus, and dynamic expand/filter contexts.
4. Add provider/manifest tests and update README wording.
5. Run full checks, package/install smoke tests, sync the delta specs, then archive the change. Rollback is limited to reverting the extension and manifest changes; no user data migration is needed.

## Open Questions

- None; the supported VS Code InputBox is the implementation for the requested filter field because the native TreeView API does not expose an embedded text-input contribution point.
