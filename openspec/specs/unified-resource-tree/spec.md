## Purpose

Define the unified VS Code resource tree for Skills, Plugins, MCPs, and explicitly loaded MCP tools.

## Requirements

### Requirement: Unified scoped resource tree
The extension SHALL expose Skills, Plugins, and MCPs through one native TreeView with exactly two top-level scope roots: Global and Workspace.

#### Scenario: Global and workspace roots
- **WHEN** the unified resource view is opened
- **THEN** it contains a Global root representing `~/` and a Workspace root representing the active workspace, with no separate Skills, Plugins, or MCP roots

#### Scenario: Resources retain source provenance
- **WHEN** resources are discovered from `~/.agents`, `~/.codex`, configured roots, workspace roots, or plugin subpaths
- **THEN** each resource appears beneath the corresponding scope and source path, and its canonical source path remains available for inspection and actions

### Requirement: Preserve plugin filesystem ownership
The unified tree SHALL represent plugin-owned resources according to the plugin package layout.

#### Scenario: Plugin skills
- **WHEN** a plugin contains a `skills/` directory with one or more discovered skills
- **THEN** the tree shows the plugin beneath its scope, a `skills` child directory, and each plugin skill beneath that directory

#### Scenario: Plugin MCPs
- **WHEN** a plugin contains `.mcp.json` with an `mcpServers` object
- **THEN** the tree shows the plugin's `.mcp.json` descriptor as the parent of its MCP children, and does not place those MCPs under an unrelated managed config file

#### Scenario: Plugin resource protection
- **WHEN** a plugin-owned skill or MCP is selected
- **THEN** the existing read-only guards remain effective for edit, rename, delete, and move operations, while copy/export actions remain available where supported

### Requirement: Status and type icon labels
Resource rows SHALL use the status glyph followed by a stable type icon and the resource name.

#### Scenario: Typed resource labels
- **WHEN** the tree renders a plugin, skill, MCP, or loaded MCP tool
- **THEN** its label uses `🔌` for plugins, `🧠` for skills, `🧰` for MCPs, and `🔨` for MCP tools after the current status glyph where a status exists

#### Scenario: Effective status remains visible
- **WHEN** a resource is active, shadowed, unavailable, or disabled
- **THEN** the existing status glyph (`✅`, `☑️`, `✖️`, or `❌`) reflects that effective state without requiring a native checkbox

#### Scenario: No native resource checkboxes
- **WHEN** a resource row is rendered in the unified view
- **THEN** the row does not set `TreeItem.checkboxState`, and enablement is performed through the existing context or toolbar commands

### Requirement: Explicit MCP tool children
The unified tree SHALL show MCP tools only after explicit tool loading.

#### Scenario: MCP tools are not loaded implicitly
- **WHEN** an MCP is discovered or expanded before the user invokes Load MCP Tools
- **THEN** no process is started, no network request is made, and no tool children are displayed

#### Scenario: Loaded tools are nested under their MCP
- **WHEN** Load MCP Tools succeeds for a selected MCP
- **THEN** the returned tools appear as `🔨` children under that MCP and remain selectable for inspection

#### Scenario: Tool loading failure
- **WHEN** explicit tool loading fails
- **THEN** the MCP remains visible with its static configuration and a visible diagnostic, and no partial tool list is presented as authoritative

### Requirement: Preserve unified-tree interactions
The unified view SHALL preserve applicable selection, inspection, mutation, transfer, and refresh behavior from the existing resource views.

#### Scenario: Resource inspection
- **WHEN** a skill, plugin, MCP, or loaded tool is selected
- **THEN** the existing Info surface or source-opening command receives the selected record and displays the relevant metadata/configuration/content

#### Scenario: Resource mutation
- **WHEN** a user invokes an enable, disable, reset, rename, delete, copy, move, or paste command for an eligible resource
- **THEN** the existing core mutation is invoked with the same scope and read-only protections, and the unified tree refreshes to show the resulting status/path

#### Scenario: Agents remain separate
- **WHEN** the extension exposes the Agents view
- **THEN** Agents continue using their existing recursive Global/Workspace tree and are not duplicated into the unified resource view
