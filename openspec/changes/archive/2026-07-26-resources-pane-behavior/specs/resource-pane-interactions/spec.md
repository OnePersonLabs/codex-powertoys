## MODIFIED Requirements

### Requirement: Stateful tree expansion controls
Resources SHALL use a per-node expansion state. On initial materialization, roots, groups, plugins, MCP containers, and ordinary supporting directories SHALL be expanded, while individual skill nodes and their supporting entries SHALL be collapsed. Resources SHALL expose a title action whose label and behavior reflect the current state; Agents SHALL retain their existing expansion controls.

#### Scenario: Skill-specific default expansion
- **WHEN** Resources is first opened or refreshed
- **THEN** non-skill containers are expanded, individual skill nodes are collapsed, and supporting directories/files remain hidden until a skill is expanded

#### Scenario: Collapse when every node is expanded
- **WHEN** every known expandable Resources node, including skills, is expanded
- **THEN** the title action is Collapse All and invoking it collapses every expandable node

#### Scenario: Expand non-skills from a collapsed or mixed tree
- **WHEN** any non-skill Resources node is collapsed
- **THEN** the title action is Expand and invoking it expands all non-skill nodes while leaving individual skill nodes and their supporting entries unchanged

#### Scenario: Expand skills after non-skills are already expanded
- **WHEN** all non-skill Resources nodes are expanded but one or more individual skill nodes are collapsed
- **THEN** the title action is Expand and invoking it expands all known nodes, including individual skills and their supporting entries

### Requirement: Source-aware path tooltips
All resource and agent items in every tree pane SHALL expose their source path in the hover tooltip, including plugin-owned resources and loaded MCP tools. Workspace-scoped items SHALL show a path relative to the active workspace when their source is inside it; global-scoped items and workspace-scoped sources outside the active workspace SHALL show their canonical absolute path. Plugin nodes SHALL identify the plugin by name.

#### Scenario: Workspace item tooltip
- **WHEN** the user hovers a workspace-scoped resource, supporting entry, agent, or loaded MCP tool
- **THEN** its tooltip contains the source path relative to the active workspace using `/` separators

#### Scenario: Global item tooltip
- **WHEN** the user hovers a global-scoped resource or plugin
- **THEN** its tooltip contains the canonical absolute source path

#### Scenario: Plugin tooltip identity
- **WHEN** the user hovers a plugin node
- **THEN** the tooltip identifies the plugin by name and includes its scope-aware root path

## ADDED Requirements

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
