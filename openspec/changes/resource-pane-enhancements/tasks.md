## 1. Shared providers and Resources hierarchy

- [x] 1.1 Extend the shared tree node model and item renderer with group nodes, canonical path resolution, full-path tooltips, and view-appropriate context values.
- [x] 1.2 Refactor Resources children to Global/Workspace scope roots with Plugins, MCPs, and Skills groups, preserving plugin-owned MCP/Skill nesting and duplicate-free discovery.
- [x] 1.3 Add dedicated flat Skills and MCP providers with independent state, alphabetical ordering, status/type labels, source-opening/inspection commands, and explicit MCP tool loading.
- [x] 1.4 Implement case-insensitive name/path filtering for Resources, Skills, and MCP providers with live refresh and clearable filter state.
- [x] 1.5 Implement full and workspace-relative path copy commands, including no-workspace fallback and multi-pane context handling.

## 2. Tree views and command contributions

- [x] 2.1 Register Skills and MCP TreeViews alongside Resources and Agents and wire their providers, selection routing, refresh, and drag/drop behavior.
- [x] 2.2 Replace static collapse-all behavior with default-expanded provider modes and dynamic Expand All/Collapse All toolbar commands for Resources and Agents.
- [x] 2.3 Add filter and clear-filter toolbar commands, path-copy commands, and all-pane context-menu predicates while preserving existing resource mutations and plugin guards.
- [x] 2.4 Ensure all tree items expose canonical path tooltips and that flat panes retain the complete applicable right-click action set.

## 3. Verification and documentation

- [x] 3.1 Add provider tests for exact scope/type hierarchy, plugin nesting, flat alphabetical panes, filtering, default expansion, and path resolution.
- [x] 3.2 Add manifest/source tests for restored views, dynamic expand/collapse contexts, filter/clear toolbar actions, and all-pane path context actions.
- [x] 3.3 Update README and extension documentation for the four panes, hierarchy, filters, path-copy behavior, and expand/collapse controls.
- [x] 3.4 Run repository checks, package/install smoke tests, and fix TypeScript, manifest, or test failures before completion.
