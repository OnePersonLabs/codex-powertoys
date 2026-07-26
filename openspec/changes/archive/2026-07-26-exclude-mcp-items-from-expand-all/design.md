## Context

The Resources TreeView has a two-state toolbar action that expands or collapses non-root nodes. Its current expansion predicate excludes skill nodes and their descendants, but MCP item nodes are treated as ordinary expandable nodes. MCP items can contain cached tool children, so Expand All can expose a large amount of detail and differs from the collapsed-by-default behavior used by skills.

The change is limited to the existing resource tree provider and its expansion-state synchronization. Global and Workspace roots must remain expanded by toolbar actions, manual node expansion must continue to work, and Collapse All must remain recursive.

## Goals / Non-Goals

**Goals:**

- Make Expand All leave MCP item nodes and all descendants collapsed, matching skill-item treatment.
- Preserve deterministic toolbar state, root expansion, manual MCP expansion, and recursive Collapse behavior.
- Cover the behavior with focused provider/UI interaction tests.

**Non-Goals:**

- Changing MCP discovery, cached tool loading, MCP row rendering, or context menus.
- Changing initial expansion defaults outside the Expand All action.
- Changing dedicated MCP pane behavior.

## Decisions

- **Use one shared excluded-item predicate for bulk expansion.** Extend the existing skill exclusion logic to recognize MCP item nodes (using the canonical node kind/type already used by the provider). This keeps Expand All semantics centralized and prevents MCP descendants from being expanded indirectly.
- **Retain recursive Collapse All.** Collapse continues to traverse every non-root expandable node, including MCP and skill nodes, so a prior manual MCP expansion is fully reset.
- **Keep manual expansion state independent.** Native TreeView expansion events and state bookkeeping remain unchanged; a user can still expand an MCP item directly after Expand All.
- **Test at the toolbar behavior boundary.** Add cases for MCP items with cached children, mixed skill/MCP/plugin trees, repeated Expand/Collapse, and manual MCP expansion so the contract is validated without coupling tests to implementation details.

## Risks / Trade-offs

- [Node-kind mismatch] MCP item records could be represented by more than one internal node type → identify and cover the provider's canonical MCP item kind in tests; apply the predicate before traversing descendants.
- [Stale expansion state] Previously expanded MCP nodes may remain open after an Expand action if state is only partially updated → assert the action explicitly sets excluded MCP nodes and descendants to collapsed state.
- [Regression in toolbar context] Excluding MCP nodes could affect whether the toolbar shows Expand or Collapse → preserve existing non-root expanded-state calculation and test manual MCP expansion/collapse transitions.
