## Context

Codex PowerToys currently discovers skills, MCP definitions, and agents through a small runtime-neutral core, while the VS Code extension renders mostly flat native trees and performs only enablement/configuration edits. Codex plugins add another ownership layer: plugin manifests identify the package, plugin caches contain skills and `.mcp.json` descriptors, and global/workspace TOML controls whether a plugin is enabled. The change crosses discovery, effective-state calculation, TOML/JSON interpretation, filesystem mutation, and VS Code TreeView interaction.

## Goals / Non-Goals

**Goals:**

- Add one normalized plugin/resource model shared by the core, CLI, and extension.
- Keep plugin cache sources immutable while supporting safe exports and managed-scope edits.
- Make resource operations scope-aware, conflict-aware, confirmable, and path-safe.
- Use native VS Code TreeViews with icons, tooltips, multi-selection, checkboxes, and drag/drop.
- Preserve comments and unknown fields for targeted TOML mutations.

**Non-Goals:**

- No custom webview tree renderer or browser-hosted extension.
- No copying or moving plugin packages themselves.
- No persistent “do not ask again” preference.
- No guarantee of modifier-aware Ctrl-drag behavior because the native TreeView drop API does not expose keyboard modifiers.

## Decisions

1. **Plugin catalog and ownership.** Add a plugin catalog service that scans global `$CODEX_HOME/plugins/**` and workspace `.codex/plugins/**` for `.codex-plugin/plugin.json`, remote-install metadata, declared/present `skills` directories, and `.mcp.json`. Plugin identity uses manifest name/version plus the nearest source namespace. Configuration is matched against the exact `[plugins."name@source"]` key when available, with name-only fallback for legacy entries. A workspace entry overrides a global entry for the same identity.

2. **Effective state propagation.** Plugin records default to enabled when no override exists. `enabled = false` makes every contained skill and MCP unavailable-by-plugin; direct child overrides do not defeat the plugin gate. Non-plugin duplicates still participate in ordinary workspace > global > plugin precedence. MCP records gain plugin ownership, source kind, effective state, and optional working directory.

3. **Source-safe mutation boundary.** TOML edits remain line-targeted. Plugin manifests and plugin `.mcp.json` files are inspection-only. Skill and agent filesystem operations use `fs.cp`, `fs.rename`, and `fs.rm` only after resolving a canonical resource root and rejecting root deletion/replacement. Copying plugin-owned skills/MCPs creates managed-scope resources without editing the plugin source.

4. **Transfer protocol.** The core exposes transfer requests and conflict decisions independently of VS Code. A request contains resource kind, source identity, source scope, target scope/path, operation (`copy` or `move`), and conflict mode (`skip`, `replace`, or `decide-each`). The extension stores cut/copy selections in memory, asks for conflict decisions, confirms moves/deletes, then invokes the core. Skipped cut items remain at their source.

5. **Native TreeView wiring.** Providers become `createTreeView` instances with `canSelectMany`, collapse-all, checkbox events, and a shared internal MIME payload. All view-title commands declare codicon `icon` values while retaining descriptive `title` strings as hover tooltips. Agents expose explicit global/workspace root nodes and recursively generated folder/file children. Native drag is a move after confirmation; Copy/Paste is the reliable copy path because `handleDrop` cannot observe Ctrl.

6. **Rename semantics.** Skill rename targets the skill directory, updates an existing frontmatter `name`, and updates matching `skills.config` paths. Agent rename targets the file and first `name` assignment. MCP rename updates the source table and any same-name definition in the other scope. Plugin-owned originals reject rename/delete/move/edit commands.

## Risks / Trade-offs

- **Plugin layout drift** → support manifest-declared and conventional paths, retain diagnostics, and avoid assuming one cache depth.
- **TOML fidelity** → keep known-field edits source-targeted and test comments, nested tables, and unknown keys.
- **Cross-scope conflicts** → require explicit conflict decisions and never silently replace a destination.
- **Filesystem failure midway through a multi-item transfer** → process items independently, report per-item diagnostics, and delete a cut source only after its destination succeeds.
- **Native drag limitations** → document ordinary drag as move and provide reliable Copy/Paste; defer modifier-aware behavior to a future custom renderer.
- **Plugin MCP side effects** → retain explicit tool loading and resolve plugin-relative working directories without connecting during discovery.

## Migration Plan

No persisted application schema is introduced. Existing plugin, skill, MCP, and agent files remain valid. The extension adds commands and views without changing files until the user invokes an operation. Rollback is removal of the new package code; source plugin caches remain untouched by design.

## Open Questions

None. The native drag modifier limitation and plugin read-only boundary are explicit v1 decisions.
