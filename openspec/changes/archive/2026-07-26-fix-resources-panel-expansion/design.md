## Context

Resources uses a native VS Code `TreeView` backed by a provider-local expansion map. The current implementation mixes a default mode, toolbar actions, and manual event updates, while roots are not distinguishable from other nodes. VS Code asks the provider for `TreeItem.collapsibleState` as nodes materialize, and emits expand/collapse events after user interaction; a provider must therefore persist state by stable node id and fire its data-change event after programmatic state changes. A full-tree refresh can also rematerialize nodes, so the state policy must apply consistently to nodes discovered after a toolbar action.

## Goals / Non-Goals

**Goals:**

- Make the Resources toolbar a two-state control: Expand when no non-root node is open, Collapse when any non-root node is open.
- Keep Global and Workspace expanded on startup and after either toolbar action.
- Make Expand open every non-skill node and leave skill nodes and their supporting descendants collapsed.
- Make Collapse close every non-root node, including manually expanded skill descendants.
- Keep the toolbar context synchronized with TreeView events, filtering, refreshes, and programmatic actions.

**Non-Goals:**

- Changing expansion behavior in the dedicated Plugins, MCPs, or Skills panes.
- Adding a new VS Code command or dependency.
- Persisting expansion state across extension reloads.

## Decisions

1. **Use explicit node metadata instead of inferred root/nested categories.**
   `ExpansionNode` will carry `root` and `skillRelated` flags. Resources registrations mark only Global and Workspace as roots; skill rows and supporting entries are skill-related. Existing `nestedResource` metadata remains available for dedicated-pane default behavior but is not used to decide the Resources toolbar state.

2. **Replace the mode union with a small desired-policy state.**
   The state object will track a collapsed policy or an expanded-non-skill policy for nodes that have not yet materialized, plus explicit per-node overrides. This removes the ambiguous `default | ExpansionAction | manual` mode while still making later `getTreeItem` calls agree with the most recent toolbar action.

3. **Derive the button from any expanded non-root node.**
   `toolbarAction()` will return `collapseAll` if at least one registered non-root node is expanded; otherwise it will return `expandNonSkills`. Roots are ignored, so a user-collapsed root cannot make the button appear to be in the wrong state.

4. **Normalize roots during every toolbar operation.**
   Applying either action sets all registered roots to expanded. Collapse sets every other registered node to collapsed. Expand sets every non-skill-related node to expanded and every skill-related node to collapsed. Newly materialized nodes use the same policy.

5. **Synchronize UI state at event boundaries.**
   Resources provider methods will continue firing `onDidChangeTreeData` after programmatic changes. The command handlers and `onDidExpandElement`/`onDidCollapseElement` listeners will recalculate the `codexPowerToys.resourcesTreeExpanded` context after state mutation, ensuring the contributed button reflects the provider map rather than stale UI state.

## Risks / Trade-offs

- [Risk] Nodes not yet materialized cannot be changed by iterating the map. → Mitigation: retain the last toolbar policy and apply it when `register` first sees each node.
- [Risk] VS Code may restore a visual expansion before the provider event arrives. → Mitigation: event handlers remain the source of manual overrides, and the context is synchronized after each event.
- [Risk] Existing tests encode the old three-action behavior. → Mitigation: replace those assertions with explicit root, mixed-state, repeated-toggle, and rematerialization regression cases.

## Migration Plan

No persisted data or external migration is required. Ship the provider/state changes with the extension; a refresh or reload initializes the new policy.

## Open Questions

None.
