## Context

The repository currently contains only OpenSpec support files. Codex state is distributed across project `.agents`/`.codex` directories, user directories, plugin caches, plugin manifests, and global/workspace TOML configuration. The product must inspect the machine where its process runs, work in local and remote VS Code extension hosts, and share behavior between a CLI and a desktop VS Code extension.

## Goals / Non-Goals

**Goals:**

- Normalize skills, plugin metadata, agents, MCP definitions, origins, diagnostics, and effective state behind one runtime-neutral TypeScript core.
- Preserve duplicate records and explain shadowing instead of silently deduplicating them.
- Apply narrow TOML edits that preserve unrelated fields, ordering, and comments as far as the source editor permits.
- Provide human and JSON CLI output plus an Explorer-like VS Code experience.
- Keep MCP process/network access explicit and user-triggered.

**Non-Goals:**

- Implement a browser/web VS Code extension.
- Execute skill instructions or edit skill content.
- Infer unsupported Codex runtime session state beyond filesystem/config/plugin evidence.
- Replace Codex's own configuration or MCP runtime.

## Decisions

1. **Monorepo package boundaries.** Use `packages/core`, `apps/cli`, and `apps/vscode` in a pnpm workspace. The core has no `vscode` dependency. The extension bundles the core with esbuild and owns its VS Code manifest and release version.

2. **Host-relative discovery.** Resolve project roots from the active workspace and user/plugin roots from the extension host's home/Codex directory. Remote VS Code hosts therefore inspect remote global state. Include canonical roots, config-referenced skill paths, and plugin metadata paths; do not rely on one cache naming convention.

3. **Source-aware domain model.** Represent each physical skill and MCP definition with scope, absolute path, source kind, plugin identity, metadata, parse diagnostics, and effective-state fields. Keep all same-name records and compute the active winner separately.

4. **Config mutation.** Treat absent `enabled` as default-enabled. Disable by adding or changing `enabled = false`; enable/reset removes the explicit override. Use source-aware TOML edits for known fields and preserve unknown fields. Add/edit/delete MCP definitions through a structured common form plus an advanced arbitrary-field representation.

5. **VS Code UI.** Contribute one Activity Bar container with Skills, MCP, and Info views. Use native TreeViews for tree/flat navigation, emoji status prefixes, filtering, tooltips, and context menus. The Info view is a WebviewView for wrapped Markdown, metadata, MCP details, and collapsible tools.

6. **MCP inspection safety.** Selecting an MCP reads only configuration. A separate Load/Refresh action starts or connects to the server and performs tool discovery; failures become visible diagnostics.

7. **Codex chat integration.** Discover a supported Codex command when available. If unavailable, focus/open Codex and copy `$skill-creator ` with a notification; never depend on private DOM or undocumented UI manipulation as the sole path.

8. **CLI.** Use Commander with human-readable defaults and `--json` output. Commands call core services directly so CLI behavior remains independent of VS Code presentation.

## Risks / Trade-offs

- **[Codex layout drift]** Plugin cache and config schemas may change → isolate path discovery and parsers behind providers, surface diagnostics, and keep custom roots configurable.
- **[TOML fidelity]** Generic stringify can reorder or remove comments → use source-aware targeted edits and tests with representative comments/unknown tables.
- **[Remote ambiguity]** Users may confuse local and remote global state → label host/scope in the UI and CLI output.
- **[MCP side effects]** Tool discovery can execute commands or use networks → require explicit Load/Refresh and show the target before connecting.
- **[Native TreeView styling]** VS Code does not support arbitrary row typography → use status glyphs/muted icons and tooltips; defer custom rendering if exact gray/italic styling becomes essential.

## Migration Plan

No existing application code or persisted schema requires migration. Initial setup creates workspace manifests, packages, tests, and CI scripts. Configuration changes are opt-in and limited to the selected global/workspace TOML file. Rollback is removal of the new packages and extension; existing Codex configuration remains valid because mutations use existing keys.

## Open Questions

None for the initial implementation. The custom TreeView renderer and a formal Codex chat API can be considered in a later change.
