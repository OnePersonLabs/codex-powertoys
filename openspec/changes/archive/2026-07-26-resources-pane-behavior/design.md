## Context

The Resources provider currently uses a single boolean expansion mode and emits all type groups regardless of whether filtered children exist. VS Code exposes expansion events on `TreeView`, so the extension can maintain per-node state without replacing the native tree. Plugin records already expose manifest paths, resource records expose scope, and the existing command contributions can use context-key enablement expressions.

## Goals / Non-Goals

**Goals:**

- Make group materialization reflect actual filtered children.
- Give Resources a deliberate initial expansion policy that keeps skill internals quiet.
- Track user expansion/collapse events and select the correct toolbar action for mixed states.
- Apply workspace-relative display paths consistently to workspace-scoped tree items.
- Route plugin activation and manifest context actions to the plugin manifest and expose state-aware enablement commands.

**Non-Goals:**

- No changes to core discovery, plugin manifests, resource mutation semantics, or persisted configuration.
- No replacement of the native VS Code TreeView or custom expand/collapse UI.
- No change to the independent flat Skills/MCP panes' list shape.

## Decisions

- **Filter groups before creating group nodes.** A pure ordered group-presence helper retains `Plugins` and removes empty `MCPs`/`Skills`; provider-specific filtered records determine presence, so ancestor retention remains filter-aware.
- **Use per-node expansion state.** A `ResourceExpansionState` registry keys expandable nodes by their stable TreeItem IDs, classifies skill nodes/supporting entries separately, and records `onDidExpandElement`/`onDidCollapseElement` events. This is preferred over a single mode because the toolbar must preserve skill states in partial trees.
- **Define three toolbar actions.** The state machine returns `collapseAll`, `expandNonSkills`, or `expandAll`. Expand-non-skills sets ordinary containers to expanded and leaves skill-related nodes unchanged; expand-all sets every known node expanded. Newly materialized nodes use the active mode's default.
- **Centralize tooltip path formatting.** A path helper accepts the node scope and active workspace. Workspace paths are relativized only when contained by the workspace and normalized to `/`; global and out-of-workspace paths remain canonical.
- **Use command enablement context keys.** Selection updates `resourceEnabled`; command contributions use `enablement` expressions so the opposite Enable/Disable action is disabled without hiding the command or duplicating menu predicates.
- **Open manifests through one command.** Both plugin row activation and Open Plugin Manifest call the same command, which uses the discovered manifest path or the conventional `.codex-plugin/plugin.json` fallback and reports a useful error if no file exists.

## Risks / Trade-offs

- [Lazy materialization means not every node is registered immediately] → Include discovered skill counts in toolbar-state calculation and apply the active mode to nodes registered later.
- [Stale node IDs after refresh] → Reset the materialized-node registry and state overrides on refresh so the documented initial expansion policy is reapplied; filter and supporting-file transitions rematerialize visible nodes before recalculating the toolbar action.
- [Remote plugin installs may not include plugin.json] → Attempt the conventional path and surface the exact missing path instead of silently returning.
- [VS Code command enablement context can lag selection] → Update status context keys in the same selection handler that updates scope and Info routing, and resolve the selected record again after provider refreshes.

## Migration Plan

No data migration is required. The change is limited to extension presentation and manifest wiring; reinstalling/reloading the extension activates the new behavior. Reverting the extension and manifest changes restores the previous tree policy.
