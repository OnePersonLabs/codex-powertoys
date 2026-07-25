# Codex Inspector

Codex Inspector is a TypeScript monorepo for exploring Codex skills, plugin origins, subagent TOML files, and MCP configuration.

## Packages

- `@codex-inspector/core` — discovery, effective-state analysis, TOML mutations, and explicit MCP tool loading.
- `@codex-inspector/cli` — `codex-inspect roots`, `skills`, `agents`, and `mcp` commands.
- `codex-inspector-vscode` — desktop VS Code Activity Bar views for Skills, Agents, MCPs, and Info.

## Development

```bash
pnpm install
pnpm check
pnpm package:cli
pnpm package:vscode
```

The extension resolves user and plugin paths on the active extension host. MCP tool discovery is explicit and never happens merely by selecting a server.
