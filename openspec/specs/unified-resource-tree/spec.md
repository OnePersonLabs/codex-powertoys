## Purpose

Define the unified VS Code resource tree for Skills, Plugins, MCPs, Agents, and explicitly loaded MCP tools.
## Requirements
### Requirement: Unified scoped resource tree
The extension SHALL expose Skills, Plugins, MCPs, and Agents through one native Resources TreeView with exactly two top-level scope roots: Global and Workspace. Each scope SHALL contain a `Plugins` group, SHALL contain an `MCPs` group only when at least one visible standalone MCP exists, SHALL contain a `Skills` group only when at least one visible standalone skill exists, and SHALL contain an `Agents` group when agent files are available. Standalone resources SHALL appear under their type group and plugin-owned resources SHALL appear beneath their owning plugin's corresponding non-empty type group.

#### Scenario: Global and workspace roots
- **WHEN** the Resources view is opened
- **THEN** it contains a Global root representing `~/` and a Workspace root representing the active workspace, with no type roots above those scope roots

#### Scenario: Agents groups
- **WHEN** global or workspace agent files exist
- **THEN** the corresponding scope contains an `Agents` group whose children mirror the recursive subdirectory structure under that scope's agents root

#### Scenario: Non-empty type groups
- **WHEN** a scope root is expanded
- **THEN** it contains `Plugins` plus only the non-empty `MCPs`, `Skills`, and `Agents` groups, and standalone MCPs and Skills are not mixed into the Plugins group

#### Scenario: Empty type groups are omitted
- **WHEN** a scope has no visible standalone MCPs, Skills, or Agents, or a plugin has no visible MCPs or Skills
- **THEN** the corresponding empty group node is not shown

#### Scenario: Resources retain source provenance
- **WHEN** resources are discovered from `~/.agents`, `~/.codex`, configured roots, workspace roots, or plugin subpaths
- **THEN** each resource appears beneath the corresponding scope and type/plugin group, and its canonical source path remains available for inspection and actions

#### Scenario: Resources filter by visible text
- **WHEN** a Resources filter is active
- **THEN** only matching resources and the non-empty ancestor groups required to reach them are shown, with matches evaluated against the resource name and canonical path

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
Resource rows SHALL use a shared status-glyph decision matrix followed by a stable type icon and the resource name. Plugins SHALL use 🔌, agents SHALL use 🤖, skills SHALL use 💪, MCPs SHALL use 🧰, and loaded MCP tools SHALL use 🔨 after their permission glyph. For plugins, MCPs, and skills, an enabled winning record SHALL render ✅, an enabled record superseded by another record SHALL render ☑️, a disabled or unavailable winning record SHALL render ❌, and a record superseded by a disabled or unavailable winner SHALL render ✖️.

#### Scenario: Typed resource labels
- **WHEN** the tree renders a plugin, skill, MCP, loaded MCP tool, or agent
- **THEN** its label uses the corresponding stable type icon after the effective status or permission glyph where a status exists

#### Scenario: Enabled winner
- **WHEN** an item is not disabled by its applicable global or workspace configuration, or a workspace explicit enablement overrides a global disablement, and it wins same-name precedence
- **THEN** the item renders ✅

#### Scenario: Workspace plugin winner
- **WHEN** a workspace plugin contribution is not disabled at workspace level and a different global item with the same name is explicitly disabled
- **THEN** the workspace contribution is treated as enabled, wins precedence, and renders ✅

#### Scenario: Shadowed enabled record
- **WHEN** an enabled item loses same-name precedence to another item whose effective state is enabled
- **THEN** the losing item renders ☑️ and retains its original source path

#### Scenario: Disabled winner
- **WHEN** the highest-precedence item for a name is disabled by its applicable configuration or unavailable because its owning plugin is disabled
- **THEN** the winning item renders ❌ and no item in the group is treated as an enabled winner

#### Scenario: Shadowed disabled record
- **WHEN** an item is superseded by a higher-precedence item whose effective state is disabled or unavailable, such as an enabled global MCP overridden by a disabled workspace MCP of the same name
- **THEN** the losing item renders ✖️

#### Scenario: Matrix applies to every resource type
- **WHEN** plugins, MCPs, and skills appear in active, disabled, shadowed-enabled, or shadowed-disabled combinations
- **THEN** each type uses the same ✅/☑️/❌/✖️ matrix rather than type-specific glyph rules

#### Scenario: No native resource checkboxes
- **WHEN** a resource row is rendered in the unified view
- **THEN** the row does not set `TreeItem.checkboxState`, and enablement is performed through the existing context or toolbar commands

### Requirement: Explicit MCP tool children
The unified tree SHALL show cached MCP tools as collapsed children after the background MCP discovery queue probes an effective enabled MCP. Discovery SHALL not block tree materialization; a failed cache entry SHALL leave the MCP visible with a diagnostic and no authoritative tool children.

#### Scenario: MCP tools are not loaded implicitly
- **WHEN** an MCP is disabled, unavailable, or shadowed
- **THEN** no process is started, no network request is made, and no tool children are displayed

#### Scenario: Loaded tools are nested under their MCP
- **WHEN** the background probe or an explicit Load MCP Tools re-query succeeds for an effective MCP
- **THEN** the returned tools appear as permission-glyph-prefixed 🔨 children under that MCP in both MCP-capable panes and remain selectable for inspection

#### Scenario: Tool loading failure
- **WHEN** a background or explicit tool probe fails
- **THEN** the MCP remains visible with its static configuration and a visible diagnostic, and no partial tool list is presented as authoritative

### Requirement: Unified scope root labels
Resources SHALL label its two scope roots exactly `Global` and `Workspace`, with each root's full canonical path available in a field-labelled tooltip.

#### Scenario: Concise scope roots
- **WHEN** the Resources view is opened
- **THEN** the top-level rows are labelled `Global` and `Workspace`, and hovering either row reveals its full root path

### Requirement: Preserve unified-tree interactions
The unified view SHALL preserve applicable selection, inspection, mutation, transfer, and refresh behavior from the existing resource views. When a command is invoked from a tree item context menu, the command SHALL resolve the provider wrapper to the underlying skill, plugin, or MCP record before invoking core operations. Refresh commands SHALL invoke the normal refresh pipeline without treating incidental VS Code view arguments as MCP force-name state.

#### Scenario: Resource inspection
- **WHEN** a skill, plugin, MCP, agent, or loaded tool is selected
- **THEN** the existing Info surface or source-opening command receives the selected record and displays the relevant metadata/configuration/content

#### Scenario: Resource mutation
- **WHEN** a user invokes an enable, disable, reset, rename, delete, copy, move, or paste command for an eligible resource
- **THEN** the existing core mutation is invoked with the same scope and read-only protections, and the unified tree refreshes to show the resulting status/path

#### Scenario: Wrapped resource mutation
- **WHEN** a user invokes an enable, disable, reset, edit, delete, or tool-loading context action on a unified-tree skill, plugin, or MCP node
- **THEN** the command operates on the underlying resource record embedded in that node
- **AND** no wrapper-only fields are used as the resource name, source, path, scope, or configuration key

#### Scenario: Toolbar refresh with a view argument
- **WHEN** VS Code invokes the Resources or Agents refresh command from a view toolbar and supplies a view-related argument
- **THEN** the command performs the normal refresh without throwing a `forceNames.has is not a function` error
- **AND** explicit internal refresh calls may still force re-query for a supplied set of MCP names

### Requirement: Agents remain separate
The extension SHALL keep Agents in a dedicated flat provider while also exposing scoped recursive Agents groups in Resources.

#### Scenario: Dedicated and scoped agent views
- **WHEN** the extension exposes the Agents view
- **THEN** Agents continue using a dedicated provider, while Resources also exposes scoped Agents groups and recursive agent children without duplicating scope-root rows inside the dedicated provider

### Requirement: Typed non-empty resource groups
The Resources tree SHALL label Plugins, MCPs, Skills, and Agents group nodes with their plain names (`Plugins`, `MCPs`, `Skills`, and `Agents`) without a leading emoji, and SHALL omit any group whose visible children are empty after filtering and superseded-record visibility rules are applied. Resource item rows SHALL retain their existing status and type glyphs.

#### Scenario: Plain typed scope and plugin groups
- **WHEN** a scope or plugin has visible resources of a type
- **THEN** its group label is exactly the corresponding plain name, without a leading emoji

#### Scenario: Resource item glyphs remain present
- **WHEN** the tree renders a plugin, skill, MCP, loaded MCP tool, or agent item
- **THEN** the item retains its existing status/type glyph label

#### Scenario: Empty plugin scope
- **WHEN** a scope has no visible plugins
- **THEN** the scope does not render an empty Plugins group

#### Scenario: Empty plugin-owned type group
- **WHEN** a plugin has no visible MCPs or Skills of a type
- **THEN** that plugin does not render the corresponding empty typed group

### Requirement: Superseded resource visibility
The Resources tree SHALL provide a toolbar toggle that hides or shows records whose effective state is `shadowed`; when hidden, those records and any groups that would contain only them SHALL be omitted, and Agents SHALL not expose this toggle.

#### Scenario: Hide superseded records
- **WHEN** superseded visibility is off
- **THEN** shadowed plugins, MCPs, and Skills are absent and non-empty ancestor groups remain visible

#### Scenario: Show superseded records
- **WHEN** the user enables the Resources superseded toggle
- **THEN** shadowed records appear with their original source paths and ✖️ status glyphs
