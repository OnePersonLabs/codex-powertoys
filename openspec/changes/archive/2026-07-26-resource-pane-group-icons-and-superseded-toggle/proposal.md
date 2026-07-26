## Why

The resource panes currently make group rows visually indistinguishable, can render empty groups, default plugin rows too eagerly expanded, and expose superseded definitions without a way to hide them. MCP entries that are overridden by a matching `config.toml` definition are also treated as unrelated records, producing misleading status glyphs and duplicate active-looking entries.

## What Changes

- Use the stable type glyphs (🔌 plugins, 🧰 MCPs, 💪 skills, 🤖 agents) on every applicable group node in Resources and dedicated panes.
- Omit empty type groups at every scope and plugin level, including empty workspace/global plugin groups.
- Keep resource plugin rows collapsed by default.
- Add a per-pane toolbar toggle to show or hide superseded resource records in Resources, Plugins, MCPs, and Skills; Agents has no toggle.
- Model matching config/plugin MCP definitions as one precedence chain per scope. A matching global/workspace `config.toml` entry supersedes plugin `.mcp.json` entries, and superseded entries use ✖️ while the overriding disabled entry uses ❌.
- Apply the corrected superseded/disabled glyph selection consistently to plugins, MCPs, and skills wherever precedence determines effective state.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `unified-resource-tree`: Typed group labels, empty-group omission, superseded visibility, and effective-state glyphs.
- `resource-pane-interactions`: Per-pane superseded toggle and collapsed plugin defaults.
- `mcp-tool-discovery`: Scope-aware MCP precedence between config.toml and plugin .mcp.json definitions.

## Impact

The VS Code tree providers, pane toolbar commands/context keys, shared resource-group/item label logic, and core MCP/resource discovery models are affected. No external API or persisted data migration is expected; the toggle is session-local unless existing view state storage is reused.
