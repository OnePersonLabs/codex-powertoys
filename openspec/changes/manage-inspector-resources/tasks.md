## 1. Core models and plugin discovery

- [x] 1.1 Add plugin, ownership, effective-state, relative-path, and transfer/conflict types to the shared core.
- [x] 1.2 Implement recursive global/workspace plugin discovery from manifests, remote-install metadata, skills directories, and `.mcp.json` descriptors.
- [x] 1.3 Implement plugin config parsing, enable/disable/reset mutations, exact identity matching, and workspace-over-global precedence.
- [x] 1.4 Propagate disabled-by-plugin state to contained skills and MCPs, including duplicate/shadowing behavior and plugin-relative MCP working directories.

## 2. Recursive agents and source-safe mutations

- [x] 2.1 Extend agent discovery to return recursive tree paths for global and workspace roots.
- [x] 2.2 Implement skill, agent, and MCP rename operations with frontmatter, TOML name, path-reference, and cross-scope updates.
- [x] 2.3 Implement protected-root checks and plugin-source mutation rejection.
- [x] 2.4 Implement copy, move, delete, and conflict-aware transfer services for managed resources and plugin-resource export copies.

## 3. CLI surface

- [x] 3.1 Add plugin list/show/set commands and resource rename/delete/transfer commands backed by the core.
- [x] 3.2 Add CLI tests for plugin ownership, disabled propagation, recursive agents, rename behavior, conflicts, and protected roots.

## 4. VS Code views and toolbar

- [x] 4.1 Add the Plugins view and convert Skills, MCP, Agents, and Info views to icon-based toolbar contributions with descriptive tooltips.
- [x] 4.2 Replace the flat Agents provider with expanded global/workspace recursive root nodes.
- [x] 4.3 Add plugin tree rendering, enablement actions, metadata display, child skill/MCP ownership, and read-only source guards.
- [x] 4.4 Create native TreeViews with multi-select, collapse-all, checkbox events, and scoped enablement actions.

## 5. Resource interactions

- [x] 5.1 Add in-memory cut/copy/paste state and context commands for skills, MCPs, agents, and applicable plugin resources.
- [x] 5.2 Add rename and delete commands with resource-specific target resolution and modal confirmation dialogs.
- [x] 5.3 Add conflict resolution prompts for skip, replace, decide-each, and cancel, preserving skipped cut sources.
- [x] 5.4 Add shared native TreeView drag/drop controllers with confirmed move semantics and scope/directory targets.

## 6. Verification and packaging

- [x] 6.1 Add core fixture tests for plugin manifests, plugin MCPs, disabled propagation, recursive agents, rename mutations, transfers, and TOML preservation.
- [x] 6.2 Add extension smoke tests for icons/tooltips, Plugins view, agent roots, multi-select, checkboxes, drag/drop, and interaction commands.
- [x] 6.3 Run `pnpm check`, `pnpm package:cli`, and `pnpm package:vscode`; update README/extension documentation for the new workflows.
