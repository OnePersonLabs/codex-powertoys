## 1. Expansion policy

- [x] 1.1 Extend `ExpansionNode` metadata and the shared exclusion predicate in `apps/vscode/src/resource-expansion.ts` so MCP item nodes and all supporting descendants are treated like skill-related nodes during `expandNonSkills`.
- [x] 1.2 Preserve root handling, materialized-node policy, manual expansion bookkeeping, and recursive `collapseAll` behavior for MCP nodes.
- [x] 1.3 Verify the Resources provider in `apps/vscode/src/extension.ts` supplies the MCP item/descendant metadata needed by the expansion policy without changing dedicated MCP pane defaults.

## 2. Verification

- [x] 2.1 Update `apps/vscode/test/resource-expansion.test.ts` to assert Expand All leaves MCP items and cached tool/supporting descendants collapsed while expanding other non-skill nodes.
- [x] 2.2 Add coverage for manually expanded MCP items, repeated toolbar actions, root re-expansion, and Collapse All recursively clearing MCP expansion.
- [x] 2.3 Run the VS Code app test suite and OpenSpec validation; fix any regressions in existing resource expansion tests.
