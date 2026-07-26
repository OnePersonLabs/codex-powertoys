# Codex PowerToys

Codex PowerToys is a TypeScript monorepo for exploring Codex skills, plugin origins, subagent TOML files, and MCP configuration.

## Packages

- `@codex-powertoys/core` — discovery, effective-state analysis, TOML mutations, and explicit MCP tool loading.
- `@codex-powertoys/cli` — `codex-inspect` commands for roots, skills, plugins, agents, MCPs, and resource transfers.
- `codex-powertoys-vscode` — desktop VS Code Activity Bar views for Resources, Skills, MCPs, Agents, and Info.

## Development

```bash
pnpm install
pnpm check
pnpm package:cli
pnpm package:vscode
```

The extension resolves user and plugin paths on the active extension host. MCP tool discovery is explicit and never happens merely by selecting a server.

## CLI examples

All discovery commands accept `--codex-home <path>`, `--workspace <path>`, and `--json`.

```bash
codex-inspect plugins list --json
codex-inspect plugins set "my-plugin@local" --scope global --disable
codex-inspect agents list
codex-inspect mcp list --workspace .
codex-inspect resource rename skill /path/to/skill renamed-skill
codex-inspect resource transfer skill old-name --scope workspace --operation copy --conflict replace
```

Plugin manifests and plugin-owned resources are discovered from the Codex plugin cache and workspace plugin directories. Plugin sources are read-only; copying a plugin skill or MCP into a managed scope is the supported export path. A disabled plugin makes its contained skills and MCPs unavailable.

## VS Code workflows

Open the **Codex PowerToys** Activity Bar container to use the Resources, Skills, MCPs, Agents, and Info views. Resources has Global (`~/`) and Workspace roots; each scope contains Plugins, MCPs, and Skills groups, with plugin-owned MCPs and skills nested under their plugin. Skills and MCPs are also available as flat alphabetical panes. Every item keeps its source path in the tooltip; plugin rows also identify the plugin by name and show workspace plugin roots relative to the active workspace. Filters match names and paths while typing.

Rows use status glyphs followed by type icons (`🔌` plugin, `🧰` MCP, `🔨` tool, `🧠` skill). Resources omit empty MCP/Skills groups, expand containers by default, and keep individual skills' supporting files collapsed. Its title action tracks the tree: it collapses everything when fully expanded, expands non-skill nodes for mixed/collapsed states, and expands skills when all other nodes are already open. Workspace-scoped tooltips use workspace-relative paths; global paths remain canonical. All panes support multi-selection, context-menu cut/copy/paste, rename, delete, native drag/drop, and Copy Full Path/Copy Relative Path. Relative paths use the active workspace root; without a workspace the full path is copied. Move and delete operations use modal confirmations; paste conflicts offer skip, replace, decide-each, or cancel.

The Agents view starts with expanded global (`~/.codex/agents`) and workspace (`.codex/agents`) roots and preserves relative paths during transfers. Clicking a plugin or choosing Open Plugin Manifest opens its `.codex-plugin/plugin.json`; Enable/Disable menu items reflect the selected resource's current state. Plugin entries expose metadata, enable/disable/reset actions, manifests, and child resources while keeping the plugin cache immutable. MCP tools are loaded only when **Load MCP Tools** is explicitly invoked.

Native VS Code TreeViews do not expose Ctrl/Shift modifier state to drag/drop handlers, so drag/drop is a confirmed move. Use **Copy** followed by **Paste** for a reliable copy operation.
