# Codex PowerToys

Codex PowerToys is a TypeScript monorepo for discovering and managing the skills, MCP servers, plugins, and subagent configurations available to Codex.

## VS Code extension

The **Codex PowerToys** extension gives Codex users a visual control plane for their global and workspace configuration. It shows where every resource came from, which copy is effective, what has been disabled or superseded, and where to edit it.

See the [VS Code extension README](apps/vscode/README.md) for the demo, feature tour, status icon guide, and marketplace documentation.

## CLI

The `codex-inspect` CLI exposes the same discovery and effective-state engine for terminals, scripts, and automation.

All discovery commands accept `--codex-home <path>`, `--workspace <path>`, and `--json`.

```bash
codex-inspect plugins list --json
codex-inspect plugins set "my-plugin@local" --scope global --disable
codex-inspect agents list
codex-inspect mcp list --workspace .
codex-inspect resource rename skill /path/to/skill renamed-skill
codex-inspect resource transfer skill old-name --scope workspace --operation copy --conflict replace
```

Plugin manifests and plugin-owned resources are discovered from the Codex plugin cache and workspace plugin directories. Plugin sources remain read-only; copy a plugin skill or MCP into a managed scope before customizing it.

## Packages

- `@codex-powertoys/core` — discovery, effective-state analysis, TOML mutations, resource transfers, and safe MCP tool probing
- `@codex-powertoys/cli` — the `codex-inspect` command-line interface
- `codex-powertoys-vscode` — the desktop VS Code extension

## Development

```bash
pnpm install
pnpm check
pnpm package:cli
pnpm package:vscode
```

Codex PowerToys is open source under the [MIT License](LICENSE).
