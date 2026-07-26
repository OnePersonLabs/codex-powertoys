## 1. Monorepo and Core Foundations

- [x] 1.1 Create pnpm workspace manifests, shared TypeScript configuration, package scripts, and package boundaries for `packages/core`, `apps/cli`, and `apps/vscode`.
- [x] 1.2 Define core domain types for roots, skills, supporting files, plugin metadata, MCPs, diagnostics, effective state, source ranges, and scoped operations.
- [x] 1.3 Implement host/workspace path resolution with configurable Codex home, user roots, plugin cache roots, workspace roots, and config-referenced paths.

## 2. Skill and Plugin Inspection

- [x] 2.1 Implement recursive skill discovery, supporting-file enumeration, plugin manifest correlation, and `agents/openai.yaml` metadata parsing.
- [x] 2.2 Implement global/local/plugin state computation, duplicate-name precedence/shadowing, status glyph mapping, and diagnostics.
- [x] 2.3 Implement source-aware TOML skill override operations for enable, disable, and reset while preserving unrelated content.

## 3. MCP Inspection and Configuration

- [x] 3.1 Implement global/workspace MCP discovery with complete nested-field preservation and source line/range tracking.
- [x] 3.2 Implement scoped MCP enable, disable, reset, add, edit, and delete operations with targeted TOML edits and unknown-field preservation.
- [x] 3.3 Implement explicit MCP tool discovery for stdio and URL-based transports with lifecycle, timeout, and diagnostic reporting.

## 4. CLI Surface

- [x] 4.1 Implement Commander commands for roots, skills, agents, MCPs, status, and scoped mutations with human-readable output and `--json` output.
- [x] 4.2 Add CLI tests for discovery, state calculation, JSON stability, mutation errors, and source-location reporting.

## 5. VS Code Extension Surface

- [x] 5.1 Create the desktop VS Code extension manifest, Activity Bar container, Skills/MCP/Info views, esbuild bundle, and extension-host service wiring.
- [x] 5.2 Implement Skills TreeView tree/flat modes, supporting-entry filtering, refresh, emoji status labels, tooltips, context actions, and file opening.
- [x] 5.3 Implement MCP TreeView grouping, add/edit/delete flows, scope actions, source navigation, Info rendering, and explicit Load/Refresh tools.
- [x] 5.4 Implement the Info view's wrapped skill/MCP content, metadata display, tool expansion state, and expand-all/collapse-all behavior.
- [x] 5.5 Implement best-effort Codex chat integration and clipboard/focus fallback for `$skill-creator `.

## 6. Verification and Packaging

- [x] 6.1 Add core fixture tests for path discovery, malformed metadata/TOML, duplicate skills, plugin disablement, scope precedence, and comment/unknown-field preservation.
- [x] 6.2 Add VS Code smoke tests for view registration, tree/flat/filter actions, context commands, MCP selection, and Info updates.
- [x] 6.3 Add build, VSIX packaging, CLI packaging, README usage documentation, and independent release scripts; run the full validation suite.
