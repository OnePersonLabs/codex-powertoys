## Purpose

Define the dedicated resource panes and shared filtering, expansion, path-copy, tooltip, and context-menu interactions.

## Requirements

### Requirement: Dedicated flat resource panes
The extension SHALL expose dedicated Plugins, MCP, Skills, and Agents native TreeViews in addition to Resources. Plugins, MCPs, and Skills SHALL show all discovered records for their type as flat, alphabetical lists, including plugin-owned records, while Agents SHALL show all discovered agent files as one flat alphabetical list without Global or Workspace root rows. Plugin and skill rows SHALL be collapsed by default and expandable using the same supporting-child renderer as Resources. All panes SHALL retain applicable selection, source-opening, enablement, inspection, tool-loading, and context-menu behavior.

#### Scenario: Panel order
- **WHEN** the extension contributes native views
- **THEN** the order is Resources, Plugins, MCPs, Skills, Agents

#### Scenario: Plugins list
- **WHEN** the Plugins view is opened
- **THEN** it shows a flat alphabetical list of manifest-backed plugins with collapsed rows

#### Scenario: MCP list
- **WHEN** the MCP view is opened
- **THEN** it shows a flat alphabetical list of discovered MCPs with status and type icons, with cached tools as collapsed children when available and without plugin or config hierarchy rows

#### Scenario: Skills list
- **WHEN** the Skills view is opened
- **THEN** it shows a flat alphabetical list of skills with collapsed rows that expand to the same files and subdirectories shown beneath the corresponding Resources skill

#### Scenario: Agents list
- **WHEN** the Agents view is opened
- **THEN** it shows all global and workspace agents in alphabetical order without Global or Workspace nodes

#### Scenario: Pane item interaction
- **WHEN** a user selects or right-clicks a plugin, skill, MCP, or agent in its dedicated pane
- **THEN** the existing Info/source-opening, enable/disable/reset, edit/delete, explicit re-query, copy, move, rename, and delete actions remain available subject to the same plugin read-only protections

### Requirement: Incremental pane filtering
Resources, Plugins, Skills, and MCP panes SHALL provide a toolbar filter input that applies case-insensitive matching to visible names and full canonical paths as the user types. Each pane SHALL provide an X/clear action while a filter is active, and clearing SHALL restore all records.

#### Scenario: Live filtering
- **WHEN** text is entered into a pane's filter input
- **THEN** the pane refreshes to show only matching records and retains required ancestor groups in Resources

#### Scenario: Clear filtering
- **WHEN** the user invokes the filter clear action
- **THEN** the input and provider filter become empty and all records are visible again

### Requirement: Stateful tree expansion controls
Resources SHALL use a per-node expansion state. On initial materialization, roots, groups, and ordinary supporting directories SHALL be expanded, while plugin rows, individual skill and MCP nodes, and their supporting/tool entries SHALL be collapsed. Dedicated Plugins and Skills providers SHALL initialize each resource row collapsed and preserve expansion only for that provider until refresh. Agents SHALL remain a flat list without scope-root expansion controls.

#### Scenario: Skill-specific default expansion
- **WHEN** Resources is first opened or refreshed
- **THEN** non-skill/non-MCP containers are expanded, individual skill and MCP nodes are collapsed, and supporting directories/files or MCP tools remain hidden until their parent is expanded

#### Scenario: Dedicated collapsed defaults
- **WHEN** Plugins or Skills is first opened or refreshed
- **THEN** every plugin or skill row is collapsed and no child file is visible until explicitly expanded

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
Every item in Resources, Plugins, Skills, MCPs, and Agents SHALL offer `Copy Full Path` and `Copy Relative Path` context actions. Full path copies the canonical source path. Relative path copies the path relative to the active workspace root using `/` separators; when no workspace is open it SHALL copy the full path.

#### Scenario: Copy full path
- **WHEN** the user chooses Copy Full Path for any tree item
- **THEN** the item's canonical path is written to the VS Code clipboard

#### Scenario: Copy relative path
- **WHEN** the user chooses Copy Relative Path with an active workspace
- **THEN** the item's canonical path relative to that workspace root is written to the VS Code clipboard

#### Scenario: Relative path without workspace
- **WHEN** the user chooses Copy Relative Path without an active workspace
- **THEN** the full canonical path is written to the VS Code clipboard

### Requirement: Source-aware path tooltips
All resource and agent items in every tree pane SHALL expose field-labelled hover tooltips, including plugin-owned resources and loaded MCP tools. Workspace-scoped items SHALL show a path relative to the active workspace when their source is inside it; global-scoped items and workspace-scoped sources outside the active workspace SHALL show their canonical absolute path. Plugin nodes SHALL identify the plugin by name and description when available. MCPs SHALL show their description below existing details; tools SHALL show `Tool` followed immediately by `Description`; skills SHALL show their description, then `Display Name`, `Short Description`, and `Default Prompt` metadata from `agents/openai.yml`/`openai.yaml` when present. Global agent rows SHALL show a `~/`-relative path followed by a line break and the complete agent file contents; workspace agent rows SHALL show a workspace-relative path followed by a line break and the complete agent file contents.

#### Scenario: Workspace item tooltip
- **WHEN** the user hovers a workspace-scoped resource, supporting entry, agent, or loaded MCP tool
- **THEN** its tooltip contains the source path relative to the active workspace using `/` separators
- **AND** each tooltip line uses `<fieldname>: <value>` format unless it is the explicitly requested agent-content body

#### Scenario: Global item tooltip
- **WHEN** the user hovers a global-scoped resource or plugin
- **THEN** its tooltip contains the canonical absolute source path

#### Scenario: Agent content tooltip
- **WHEN** the user hovers an agent in the Agents view
- **THEN** the tooltip contains its scope-relative path, a line break, and the agent file contents

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

### Requirement: Panel context actions
Plugins and Skills dedicated rows SHALL expose the same tooltip and right-click context actions as their corresponding Resources rows, including plugin manifest opening, enablement, inspection, copy-path, and read-only protections.

#### Scenario: Shared plugin menu
- **WHEN** a plugin row is right-clicked in the Plugins panel
- **THEN** the menu entries and disabled states match the same plugin row in Resources

### Requirement: State-aware enablement menus
Enable and Disable context commands for plugins, MCPs, and skills SHALL use the selected item's effective state. The Enable command SHALL be disabled when the item is enabled, and the Disable command SHALL be disabled when the item is disabled or unavailable.

#### Scenario: Enabled item
- **WHEN** an enabled plugin, MCP, or skill is selected
- **THEN** its Enable command is disabled and its Disable command remains enabled

#### Scenario: Disabled item
- **WHEN** a disabled or unavailable plugin, MCP, or skill is selected
- **THEN** its Disable command is disabled and its Enable command remains enabled

### Requirement: Per-pane superseded toggle
The Plugins, MCPs, Skills, and Resources panes SHALL each provide an independent toolbar toggle for showing or hiding superseded records. The Agents pane SHALL not provide this toggle.

#### Scenario: Toggle in applicable panes
- **WHEN** the user invokes a pane's superseded toggle
- **THEN** only that pane changes whether records with effective state `shadowed` are rendered

#### Scenario: No Agents toggle
- **WHEN** the Agents pane is opened
- **THEN** no superseded visibility command is contributed to that pane

### Requirement: Collapsed Resources plugin defaults
Resource plugin nodes SHALL be collapsed on initial materialization and after refresh, while roots and type groups retain their existing expanded defaults.

#### Scenario: Plugin rows start collapsed
- **WHEN** Resources first materializes a plugin node
- **THEN** the plugin node is collapsible and its initial state is Collapsed
