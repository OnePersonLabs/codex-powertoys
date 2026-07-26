# Codex PowerToys VS Code Extension

This desktop extension provides unified Resources, Agents, and Info views over the shared Codex PowerToys core. Install the generated VSIX with `code --install-extension <file>.vsix`.

The extension runs in a desktop Node extension host and resolves global Codex paths on that host. It discovers plugin manifests, remote-install metadata, plugin skills, and plugin `.mcp.json` files, while keeping plugin source files read-only.

Resources and agents are native multi-select TreeViews. The Resources tree has Global (`~/`) and Workspace roots and keeps plugin skills under `skills/` and plugin MCPs under `.mcp.json`. Resource rows use status glyphs followed by type icons: `🔌` plugin, `🧰` MCP, `🔨` tool, and `🧠` skill. Use the icon toolbar or an item context menu to refresh, filter, enable/disable, cut, copy, paste, rename, delete, and load MCP tools. Moves and deletes are confirmed with modal dialogs, and paste conflicts provide Skip all, Replace all, Decide each, or Cancel choices. Dragging is a confirmed move because the native VS Code TreeView API does not expose Ctrl-drag modifier state; Copy/Paste is the supported copy workflow.

The Agents view opens global and workspace roots expanded by default. Selecting a skill, MCP, agent, or plugin updates the Info panel; MCP tools are fetched only after explicitly choosing **Load MCP Tools**.
