## 1. Core discovery and shared state

- [x] 1.1 Deduplicate plugin discovery by canonical `.codex-plugin/plugin.json` manifest path and exclude `.claude-plugin` manifests and wrapper directories.
- [x] 1.2 Add shared effective-state glyph formatting and apply it to plugin, MCP, skill, and plugin-owned records while preserving tool permission glyphs.
- [x] 1.3 Extend agent discovery/tree data to expose recursive scope-relative nodes for Resources and flattened file records for the dedicated Agents provider.

## 2. Resources tree

- [x] 2.1 Add scoped Agents groups under Global and Workspace with recursive directory/file children and 🤖 labels.
- [x] 2.2 Ensure Global and Workspace roots display concise labels with absolute-path tooltips and preserve existing resource filtering, expansion, and provenance.
- [x] 2.3 Update shared resource renderers, tooltips, and context values so plugin/skill/MCP status glyphs and manifest-backed plugin identity are consistent.

## 3. Specialized panels

- [x] 3.1 Add a collapsed-by-default flat Plugins provider with alphabetical ordering, shared child expansion, tooltips, and context menus.
- [x] 3.2 Update Skills provider to use collapsed-by-default expandable resource children and Resources-equivalent tooltip/context behavior.
- [x] 3.3 Flatten Agents provider into one alphabetical global/workspace list with 🤖 labels, scope-relative path tooltips, and agent file contents after a line break.
- [x] 3.4 Keep MCP provider behavior aligned with shared glyph formatting and existing cached-tool children.
- [x] 3.5 Register and order views as Resources, Plugins, MCPs, Skills, Agents; update activation and menu enablements as needed.

## 4. Verification and documentation

- [x] 4.1 Add or update core and VS Code tests for manifest deduplication, glyph precedence, agent nesting/flattening, panel order, collapsed defaults, tooltips, and context menus.
- [x] 4.2 Run the full test suite and package build; run `pnpm run build-package-install` as the final delivery verification.
- [x] 4.3 Sync the delta specs into main specs and archive the completed OpenSpec change.
