## Context

The extension currently has independent Skills, Plugins, and MCP TreeViews. Core discovery already knows the physical roots, plugin ownership, effective status, source paths, and plugin `.mcp.json` files, but the VS Code layer flattens those relationships into separate providers. Native `TreeItem.checkboxState` also duplicates the status glyphs that are already part of the row labels.

The new surface must make scope and provenance legible without changing Codex's on-disk layout. Global resources can originate under `~/.agents`, `~/.codex`, configured skill paths, plugin directories, and global config; workspace resources have the corresponding workspace-local roots. Plugin skills and plugin MCPs must retain their physical relationship to the owning plugin package.

## Goals / Non-Goals

**Goals:**

- Provide one unified Skills/Plugins/MCPs TreeView with exactly `Global — ~/` and `Workspace — <workspace root>` roots.
- Render source-oriented, filesystem-shaped descendants so users can see where a resource came from.
- Nest plugin skills below the plugin's `skills/` directory and plugin MCPs below the plugin's `.mcp.json` descriptor.
- Render status glyph, type icon, and resource name in a stable order: status (`✅`, `☑️`, `✖️`, or `❌`), then type (`🔌`, `🧰`, `🔨`, or `🧠`), then name.
- Remove native row checkboxes while retaining enable/disable/reset commands and status glyphs.
- Keep Info selection, explicit MCP tool loading, read-only plugin guards, and resource transfer actions available from the unified tree.

**Non-Goals:**

- Do not merge Agents into this tree; the Agents view remains a separate recursive Global/Workspace tree.
- Do not change core discovery schemas, Codex TOML/JSON formats, plugin manifests, or filesystem roots.
- Do not automatically connect to MCPs or load tools during discovery or tree expansion.
- Do not add custom webview rendering; use the native VS Code TreeView API.

## Decisions

### 1. Use a single provider with explicit source nodes

Replace the three resource providers with one `ResourcesProvider` and a discriminated node model. Root nodes represent Global and Workspace scopes. Descendants represent physical source directories/files (`.agents/skills`, `.codex/skills`, plugin directories, `config.toml`, and plugin `.mcp.json`), followed by resource nodes and, when available, MCP tool nodes.

This is preferred over a type-grouped tree because it preserves provenance and ownership. It also avoids inventing a second ownership model in the UI when the core already reports canonical paths.

### 2. Build the tree from canonical paths, not string grouping

The provider will index discovery records by scope, plugin identity, root path, config path, and plugin descriptor path. It will create only source nodes that have discovered descendants, while retaining the canonical absolute path on every node for commands, drag/drop targets, tooltips, and stable IDs.

Global and workspace roots are display anchors; source nodes may carry absolute paths outside the display anchor when a configured path is external. Labels must show the source path or a concise path-relative name so a user can distinguish `~/.agents/skills` from `~/.codex/skills`.

### 3. Preserve plugin package structure

Each plugin node is placed below the corresponding scope and plugin source directory. Its children include a `skills` directory node containing plugin-owned skills and a `.mcp.json` descriptor node containing plugin-owned MCP nodes. A plugin MCP is never duplicated under the general config MCP file. A plugin-owned skill/MCP keeps its read-only identity and plugin metadata.

### 4. Use labels for status and type; use commands for mutation

The provider will set `TreeItem.label` to `${statusGlyph} ${typeIcon} ${name}` for resource rows. The native `checkboxState` property and all checkbox-change listeners will be removed from this surface. Enablement remains available through the existing context commands and plugin/MCP/skill actions, with refresh rebuilding the status glyph after mutation.

This separates passive state from interaction and prevents VS Code's checkbox chrome from competing with the agreed emoji vocabulary.

### 5. Keep MCP tools explicit and ephemeral

MCP nodes expose the existing Load MCP Tools command. Loaded tools are stored in the provider's in-memory state keyed by MCP identity and rendered as `🔨` children under that MCP. Refresh/discovery clears tool state unless the implementation can safely retain it for an unchanged MCP record; no tree expansion may start a process or network request.

### 6. Migrate manifest and menu wiring together

Contribute one resource view in place of the three resource views, update title/context menu `when` clauses to target the unified view, and preserve command IDs where their handlers remain valid. Selection events route Skills, MCPs, and Plugins to the existing Info view. Agent view contributions and commands are left intact.

## Risks / Trade-offs

- **[Large or deep plugin trees]** A physical tree can be deeper than the current flat views → create source nodes lazily and keep only the two scope roots initially expanded.
- **[Configured paths outside `~/` or the workspace]** A display root may not contain every configured path → retain absolute canonical paths and label external sources explicitly instead of hiding them.
- **[Duplicate records across roots]** The same logical skill/MCP may appear more than once → preserve physical records and use existing effective-state glyphs/tooltips to explain shadowing.
- **[Loss of direct checkbox toggling]** Removing native checkboxes adds one interaction step → keep enable/disable/reset commands in context menus and make status/tooltips explicit.
- **[MCP tool state loss on refresh]** Tool nodes are runtime data, not source data → clear them predictably on refresh and show the explicit Load MCP Tools action when absent.

## Migration Plan

1. Add the unified node model/provider and provider-level tool cache while leaving existing core discovery APIs unchanged.
2. Replace Skills/Plugins/MCP view registration and menu predicates with the unified view; keep command handlers and Agent registration working.
3. Remove resource `checkboxState` assignments and checkbox listeners; verify status glyphs and command-driven mutations.
4. Update extension tests, README, and OpenSpec scenarios for the two-root hierarchy and plugin descriptor nesting.
5. Package and smoke-test the extension. Rollback is reverting the view/provider and manifest changes; no user files require migration.

## Open Questions

- Whether the unified view should be named `Resources` or retain one of the current names. The design assumes `Resources` unless product copy chooses another label.
