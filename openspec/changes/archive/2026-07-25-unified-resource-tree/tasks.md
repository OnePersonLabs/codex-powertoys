## 1. Unified tree model and indexing

- [x] 1.1 Define the unified resource node discriminated union, stable IDs, canonical paths, source labels, and scope-root metadata for Global and Workspace nodes.
- [x] 1.2 Implement a `ResourcesProvider` that indexes discovered skills, plugins, MCPs, plugin ownership, source roots, config files, and plugin `.mcp.json` descriptors into a lazy filesystem-shaped tree.
- [x] 1.3 Render standalone skills from `~/.agents`, `~/.codex`, configured roots, and workspace equivalents beneath the correct source directory nodes.
- [x] 1.4 Render managed MCPs beneath their owning global/workspace configuration source and plugin MCPs beneath the owning plugin `.mcp.json` node without duplication.
- [x] 1.5 Render plugin nodes with `skills/` and `.mcp.json` descendants, preserving read-only ownership and plugin metadata on child resource nodes.
- [x] 1.6 Add status/type label helpers that produce the agreed glyph order: status, then `🔌` plugin, `🧰` MCP, `🔨` tool, or `🧠` skill.

## 2. VS Code surface migration

- [x] 2.1 Replace the separate Skills, Plugins, and MCP view contributions with one unified resource view while keeping the Agents and Info views intact.
- [x] 2.2 Update toolbar and context-menu `when` clauses, view IDs, selection routing, drag/drop targets, and command arguments for unified resource nodes.
- [x] 2.3 Remove resource `TreeItem.checkboxState` assignments and checkbox listeners; retain enable/disable/reset commands and refresh-driven status glyph updates.
- [x] 2.4 Add explicit MCP tool loading state to the provider and render loaded tools as `🔨` children only after a successful Load MCP Tools action.
- [x] 2.5 Preserve Info inspection, read-only plugin guards, rename/delete/copy/move/paste behavior, source opening, and refresh behavior from the existing providers.
- [x] 2.6 Decide and apply final user-facing naming for the unified view, default expansion behavior, and path labels for sources outside the displayed scope anchor.

## 3. Verification and documentation

- [x] 3.1 Add provider/indexing tests for the two scope roots, source-path provenance, plugin `skills/` nesting, plugin `.mcp.json` nesting, and duplicate prevention.
- [x] 3.2 Add label tests covering active, shadowed, unavailable, and disabled status glyphs plus all four type icons, and assert that no unified resource row sets `checkboxState`.
- [x] 3.3 Add interaction tests for explicit MCP tool loading, selection/Info routing, read-only plugin operations, and command-driven enablement refresh.
- [x] 3.4 Update extension manifest tests, README, and relevant OpenSpec documentation for the unified view and retained separate Agents view.
- [x] 3.5 Run the repository checks and VS Code packaging smoke test, fixing any manifest, TypeScript, or test failures before marking the change complete.
