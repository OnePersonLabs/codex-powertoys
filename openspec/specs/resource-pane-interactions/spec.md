## Purpose

Define the dedicated resource panes and shared filtering, expansion, path-copy, and tooltip interactions.

## Requirements

### Requirement: Dedicated flat resource panes
The extension SHALL expose dedicated Skills and MCP native TreeViews in addition to Resources and Agents. Skills and MCP panes SHALL show all discovered records for their type as flat, alphabetical lists, including plugin-owned records, and SHALL retain full selection, source-opening, enablement, inspection, tool-loading, and context-menu behavior applicable to the record. Enabled MCP rows SHALL expose cached tools as collapsed children using the same shared renderer as Resources.

#### Scenario: Skills list
- **WHEN** the Skills view is opened
- **THEN** it shows a flat alphabetically ordered list of discovered skills with status and type icons, without source/group directory rows

#### Scenario: MCP list
- **WHEN** the MCP view is opened
- **THEN** it shows a flat alphabetically ordered list of discovered MCPs with status and type icons, with cached tools as collapsed children when available and without plugin or config hierarchy rows

#### Scenario: Pane item interaction
- **WHEN** a user selects or right-clicks a skill or MCP in its dedicated pane
- **THEN** the existing Info/source-opening, enable/disable/reset, edit/delete, explicit re-query, copy, move, rename, and delete actions remain available subject to the same plugin read-only protections

### Requirement: Incremental pane filtering
Resources, Skills, and MCP panes SHALL provide a toolbar filter input that applies case-insensitive matching to visible names and full canonical paths as the user types. Each pane SHALL provide an X/clear action while a filter is active, and clearing SHALL restore all records.

#### Scenario: Live filtering
- **WHEN** text is entered into a pane's filter input
- **THEN** the pane refreshes to show only matching records and retains required ancestor groups in Resources

#### Scenario: Clear filtering
- **WHEN** the user invokes the filter clear action
- **THEN** the input and provider filter become empty and all records are visible again

### Requirement: Stateful tree expansion controls
Resources SHALL use a per-node expansion state. On initial materialization, roots, groups, plugins, and ordinary supporting directories SHALL be expanded, while individual skill nodes, individual MCP nodes, and their supporting/tool entries SHALL be collapsed. Resources SHALL expose a title action whose label and behavior reflect the current state; Agents SHALL retain their existing expansion controls.

#### Scenario: Skill-specific default expansion
- **WHEN** Resources is first opened or refreshed
- **THEN** non-skill/non-MCP containers are expanded, individual skill and MCP nodes are collapsed, and supporting directories/files or MCP tools remain hidden until their parent is expanded

#### Scenario: Collapse when every node is expanded
- **WHEN** every known expandable Resources node, including skills and MCPs, is expanded
- **THEN** the title action is Collapse All and invoking it collapses every expandable node

#### Scenario: Expand non-skills from a collapsed or mixed tree
- **WHEN** any non-skill/non-MCP Resources node is collapsed
- **THEN** the title action is Expand and invoking it expands all non-skill/non-MCP nodes while leaving individual skill and MCP nodes and their nested entries unchanged

#### Scenario: Expand skills after non-skills are already expanded
- **WHEN** all non-skill/non-MCP Resources nodes are expanded but one or more individual skills or MCPs are collapsed
- **THEN** the title action is Expand and invoking it expands all known nodes, including individual skills, MCPs, and their nested entries

### Requirement: Copy full and workspace-relative paths
Every item in Resources, Skills, MCPs, and Agents SHALL offer `Copy Full Path` and `Copy Relative Path` context actions. Full path copies the canonical source path. Relative path copies the path relative to the active workspace root using `/` separators; when no workspace is open it SHALL copy the full path.

#### Scenario: Copy full path
- **WHEN** the user chooses Copy Full Path for any tree item
- **THEN** the item's canonical path is written to the VS Code clipboard

#### Scenario: Copy relative path
- **WHEN** the user chooses Copy Relative Path with an active workspace
- **THEN** the item's canonical path relative to that workspace root is written to the clipboard

#### Scenario: Relative path without workspace
- **WHEN** the user chooses Copy Relative Path without an active workspace
- **THEN** the full canonical path is written to the clipboard

### Requirement: Source-aware path tooltips
All resource and agent items in every tree pane SHALL expose field-labelled hover tooltips, including plugin-owned resources and loaded MCP tools. Workspace-scoped items SHALL show a path relative to the active workspace when their source is inside it; global-scoped items and workspace-scoped sources outside the active workspace SHALL show their canonical absolute path. Plugin nodes SHALL identify the plugin by name and description when available. MCPs SHALL show their description below existing details; tools SHALL show `Tool` followed immediately by `Description`; skills SHALL show their description, then `Display Name`, `Short Description`, and `Default Prompt` metadata from `agents/openai.yml`/`openai.yaml` when present.

#### Scenario: Workspace item tooltip
- **WHEN** the user hovers a workspace-scoped resource, supporting entry, agent, or loaded MCP tool
- **THEN** its tooltip contains the source path relative to the active workspace using `/` separators
- **AND** each tooltip line uses `<fieldname>: <value>` format

#### Scenario: Global item tooltip
- **WHEN** the user hovers a global-scoped resource or plugin
- **THEN** its tooltip contains the canonical absolute source path

#### Scenario: Plugin tooltip identity
- **WHEN** the user hovers a plugin node
- **THEN** the tooltip identifies the plugin by name and includes its scope-aware root path

#### Scenario: MCP and tool descriptions
- **WHEN** the user hovers an MCP or cached MCP tool
- **THEN** the tooltip includes a labelled MCP/tool description, with the tool description immediately below `Tool: <name>`

### Requirement: Plugin manifest activation
Plugin row activation and the Open Plugin Manifest context action SHALL open the plugin's `.codex-plugin/plugin.json` file using the discovered manifest path when available. If the manifest cannot be opened, the extension SHALL report the exact attempted path instead of silently doing nothing.

#### Scenario: Activate plugin row
- **WHEN** the user clicks a plugin node
- **THEN** the plugin's `plugin.json` manifest opens in the text editor

#### Scenario: Open plugin manifest from context menu
- **WHEN** the user selects Open Plugin Manifest for a plugin
- **THEN** the same plugin manifest-opening command opens the plugin's `plugin.json` file

### Requirement: State-aware enablement menus
Enable and Disable context commands for plugins, MCPs, and skills SHALL use the selected item's effective state. The Enable command SHALL be disabled when the item is enabled, and the Disable command SHALL be disabled when the item is disabled or unavailable.

#### Scenario: Enabled item
- **WHEN** an enabled plugin, MCP, or skill is selected
- **THEN** its Enable command is disabled and its Disable command remains enabled

#### Scenario: Disabled item
- **WHEN** a disabled or unavailable plugin, MCP, or skill is selected
- **THEN** its Disable command is disabled and its Enable command remains enabled
