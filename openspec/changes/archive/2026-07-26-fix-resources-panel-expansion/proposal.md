## Why

The Resources toolbar expand/collapse control can become desynchronized from the actual VS Code TreeView state. After expanding plugin skills, collapsing a plugin, and using the toolbar repeatedly, the action may appear ineffective or collapse skill descendants unexpectedly. The state model also treats `default`, `collapseAll`, and `manual` as separate modes even though the UI needs one clear initial policy plus explicit per-node state.

## What Changes

- Define one deterministic Resources expansion policy: Global and Workspace roots start expanded; all other nodes start collapsed, and the expand action expands every sub-node except individual skill nodes and their supporting descendants.
- Derive the toolbar button from whether any non-root node is expanded, so it shows Expand when fully collapsed and Collapse whenever any sub-node is open.
- Make every toolbar click re-expand both scope roots, then either expand all non-skill nodes or recursively collapse all non-root nodes according to the current action.
- Keep individual skill nodes and their file/subdirectory descendants collapsed during expand-all toolbar behavior.
- Synchronize expansion state and the toolbar context after both programmatic actions and TreeView expand/collapse events.
- Add regression coverage for mixed plugin/skill expansion, root-node collapse, repeated toolbar clicks, and the initial/default state.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `resource-pane-interactions`: Clarify the Resources expansion state machine and toolbar behavior.

## Impact

- `apps/vscode/src/resource-expansion.ts` and `apps/vscode/src/extension.ts` expansion state, TreeView event wiring, and toolbar context updates.
- `apps/vscode/test/resource-expansion.test.ts` and related source-wiring tests.
- No public API or dependency changes.
