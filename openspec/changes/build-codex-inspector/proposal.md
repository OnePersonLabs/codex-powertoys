## Why

Codex exposes skills, plugins, agents, and MCP configuration across several filesystem locations, but offers no unified way to inspect their origins, effective enablement, overrides, or supporting files. A shared TypeScript core with CLI and VS Code surfaces will make this configuration observable and safely manageable from the machine where Codex is running.

## What Changes

- Add a shared TypeScript core for discovering skills, plugin metadata, agent files, and global/workspace MCP configuration.
- Add effective-state analysis for global/local overrides, plugin disablement, duplicate-name shadowing, and missing or malformed metadata.
- Add targeted TOML mutation for skill/MCP enable, disable, reset, add, edit, and delete operations while preserving unrelated configuration.
- Add a Commander-based CLI with human-readable and JSON inspection commands.
- Add a desktop VS Code extension with Skills, MCP, and Info views, tree/flat skill modes, filtering, context menus, file navigation, and best-effort Codex chat integration.
- Add explicit MCP tool discovery so selecting a server never starts a process or makes a network request implicitly.

## Capabilities

### New Capabilities

- `skill-inspection`: Discover skills and supporting files across project, user, config-referenced, and plugin roots; expose metadata, origins, effective state, shadowing, and scoped overrides.
- `mcp-inspection`: Discover global/workspace MCP definitions, expose effective state and source locations, mutate enabled flags and definitions safely, and explicitly query server tools.
- `inspector-surfaces`: Provide CLI and desktop VS Code interfaces over the shared inspection core, including navigation, filtering, status indicators, and Codex chat integration fallback behavior.

### Modified Capabilities

None.

## Impact

- New TypeScript monorepo packages for core, CLI, and VS Code extension.
- New runtime dependencies for TOML parsing, bundling, CLI parsing, and VS Code testing.
- Read/write access to Codex and workspace configuration files on the extension-host machine.
- VSIX and npm packaging/release workflows with independent package versions.
