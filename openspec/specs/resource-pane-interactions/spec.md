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
Resources SHALL maintain stable per-node expansion state and expose a two-state toolbar control. On initial materialization, only the Global and Workspace scope roots SHALL be expanded; every other expandable node SHALL be collapsed. The toolbar SHALL show Expand when no non-root node is expanded and SHALL show Collapse whenever any non-root node is expanded. Every toolbar action SHALL leave both scope roots expanded. Expand SHALL expand every materialized and subsequently materialized non-skill node while leaving individual skill nodes and their supporting file/directory descendants collapsed. Collapse SHALL recursively collapse every non-root expandable node, including skill nodes and their descendants. Dedicated Plugins and Skills providers SHALL continue to initialize each resource row collapsed and preserve expansion only for that provider until refresh. Agents SHALL remain a flat list without scope-root expansion controls.

#### Scenario: Initial Resources state
- **WHEN** Resources is first opened or refreshed
- **THEN** Global and Workspace are expanded, every sub-node is collapsed, and the toolbar is in the Expand state

#### Scenario: Expand from the fully collapsed state
- **WHEN** no non-root Resources node is expanded and the user invokes the toolbar Expand action
- **THEN** Global and Workspace remain expanded, every non-skill node is expanded, and every individual skill node plus its supporting descendants remains collapsed

#### Scenario: Collapse from any mixed state
- **WHEN** any non-root Resources node is expanded and the user invokes the toolbar Collapse action
- **THEN** Global and Workspace are expanded and every non-root expandable node is collapsed recursively

#### Scenario: Root collapse does not determine toolbar state
- **WHEN** the user manually collapses Global or Workspace while all non-root nodes are collapsed
- **THEN** the toolbar remains in the Expand state
- **AND** invoking the toolbar action re-expands both roots

#### Scenario: Manual child expansion updates the toolbar
- **WHEN** the user expands or collapses a non-root node in the native Resources TreeView
- **THEN** the provider records that node's state and the toolbar context is synchronized immediately
- **AND** the toolbar shows Collapse if any non-root node is expanded, otherwise Expand

#### Scenario: Repeated toolbar actions are deterministic
- **WHEN** the user alternates the toolbar action repeatedly after manually expanding a plugin skill and then collapsing its plugin
- **THEN** each click applies the current two-state rule, re-expands both roots, and never leaves the toolbar ineffective or dependent on the obsolete default/manual mode

#### Scenario: Dedicated collapsed defaults
- **WHEN** Plugins or Skills is first opened or refreshed
- **THEN** every plugin or skill row is collapsed and no child file is visible until explicitly expanded

#### Scenario: Agents remain flat
- **WHEN** the Agents view is opened
- **THEN** Agents continue using a flat provider without Global or Workspace root expansion controls

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
