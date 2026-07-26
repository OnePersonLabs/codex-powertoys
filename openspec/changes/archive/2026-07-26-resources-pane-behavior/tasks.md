## 1. Resource Group Materialization

- [x] 1.1 Use filtered record presence to omit empty standalone and plugin-owned MCP/Skills group nodes while preserving group order and ancestor filtering.
- [x] 1.2 Add pure group-visibility tests and Resources provider regression coverage.

## 2. Expansion State and Toolbar Behavior

- [x] 2.1 Implement per-node expansion state with skill-related defaults and state-machine actions for collapse all, expand non-skills, and expand all.
- [x] 2.2 Wire Resources TreeView expand/collapse events, refresh/materialization behavior, and dynamic title context updates.
- [x] 2.3 Add state-machine tests for default, collapsed, mixed, and skill-expansion cases.

## 3. Paths, Plugin Actions, and Menus

- [x] 3.1 Apply workspace-root-relative tooltip paths to workspace-scoped Resources subitems, agents, and loaded MCP tools while preserving canonical global paths.
- [x] 3.2 Route plugin row activation and Open Plugin Manifest to the plugin manifest path with actionable missing-file errors.
- [x] 3.3 Add state-aware Enable/Disable command enablement context keys for plugin, MCP, and skill menu entries.
- [x] 3.4 Add focused path, manifest wiring, and manifest enablement tests.

## 4. Verification and Spec Sync

- [x] 4.1 Update user-facing documentation and validate the OpenSpec change.
- [x] 4.2 Run repository tests/build, package/install smoke validation, then sync and archive the completed change.
