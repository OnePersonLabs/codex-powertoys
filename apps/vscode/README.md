# Codex PowerToys

**See where every Codex skill, MCP server, plugin, and subagent comes from—and manage global and workspace configuration from one sidebar.**

![Codex PowerToys demo](https://raw.githubusercontent.com/OnePersonLabs/codex-powertoys/main/docs/resources/demo.gif)

Codex can load resources from `~/.codex`, the current workspace, and installed plugins. Codex PowerToys puts those sources in one view and shows which resource is actually in effect.

Use it to:

- Find the source file for any skill, MCP, plugin, or subagent
- Spot duplicate, disabled, and superseded resources
- Open definitions without searching through folders and TOML files
- Enable or disable skills, MCPs, and plugins at global or workspace scope
- Browse every file packaged inside a skill
- Inspect the tools and permissions exposed by an MCP server
- Copy, move, rename, or remove managed resources

## How to read the tree

Resource rows use a simple two-icon format:

```text
[state or permission] [item type] name
```

For example:

```text
✅ 💪 skill-creator     enabled skill Codex will use
☑️ 💪 skill-creator     enabled skill superseded by another copy
❌ 🧰 github            disabled MCP server
✋ 🔨 create_issue      MCP tool that requires approval
```

The **first icon** has a different meaning for MCP tools:

| First icon | Skill, MCP, or plugin | MCP tool |
| :---: | --- | --- |
| ✅ | Enabled and effective | Allowed |
| ☑️ | Enabled, but superseded by another copy | — |
| ❌ | Disabled | Denied |
| ✖️ | Superseded by a higher-precedence disabled entry | — |
| ✋ | — | Ask for approval |

The **second icon** identifies the item:

| Icon | Item type |
| :---: | --- |
| 🔌 | Plugin |
| 🧰 | MCP server |
| 🔨 | MCP tool |
| 💪 | Skill |
| 🤖 | Subagent |

Subagents show only the type icon because they do not have an effective-state indicator. Type-group headings also show only their type icon. Supporting files have no prefix icons.

## Safe to explore

Opening the sidebar does not rewrite your configuration. Changes happen through explicit commands.

- Plugin-owned files stay read-only
- Moves and deletes require confirmation
- Paste conflicts can be skipped, replaced, or reviewed one at a time
- Plugin skills and MCPs can be copied into a managed scope before editing
- MCP tool discovery runs one server at a time and cleans up each process and transport

## See what Codex will use

The **Resources** view shows global and workspace configuration together. Plugin-owned skills and MCPs remain nested under the plugin that supplied them, so their origin is visible instead of inferred from a path.

When the same name appears more than once, PowerToys identifies the effective copy and marks the others as superseded. Older versions, redundant resources, and disabled overrides are visible immediately. Superseded rows can be shown or hidden from the toolbar.

Dedicated **Plugins**, **MCPs**, **Skills**, and **Agents** views provide flat lists when you already know what you are looking for. Filters match names and source paths as you type.

## Open the right file immediately

- Click a skill to open its `SKILL.md`
- Expand a skill to browse and open its supporting files
- Click an MCP to open its exact definition in `codex.toml`
- Click a subagent to open its TOML file
- Open a plugin manifest or reveal its source directory
- Copy the full source path or its workspace-relative path

Selecting an item also shows its path, scope, state, description, metadata, and related information in the **Info** view.

## Manage both scopes in one place

Enable, disable, or reset skill and plugin overrides from the tree. Enable or disable MCP servers at the scope where they are defined.

Managed skills, MCP definitions, and subagent configs can be copied or moved between global and workspace scope. Multi-select, cut/copy/paste, rename, delete, and native drag and drop are supported.

Plugin cache contents are not modified in place. Copy a plugin-owned skill or MCP into a global or workspace scope if you want an editable version.

> VS Code TreeViews do not expose Ctrl/Shift modifier state during drag and drop, so dragging performs a confirmed move. Use **Copy** and **Paste** to duplicate a resource.

## Inspect MCP tools

PowerToys queries enabled, effective MCP servers in the background and lists their tools beneath each server. Tool descriptions and configured permissions appear in the tree and Info view.

Successful results and failed probes are cached for the session to avoid repeatedly starting servers. Run **Load MCP Tools** when you want to query a server again.

## Get started

1. Install **Codex PowerToys**.
2. Open a folder or workspace in VS Code.
3. Select the Codex PowerToys icon in the Activity Bar.
4. Open **Resources** to see the combined global and workspace configuration.
5. Click an item to open it, or right-click it for available actions.

Codex PowerToys runs in the desktop VS Code extension host and resolves Codex paths on the active extension host.

## Open source

Codex PowerToys is available under the MIT License. Report a problem, request a feature, or review the source at [OnePersonLabs/codex-powertoys](https://github.com/OnePersonLabs/codex-powertoys).
