## MODIFIED Requirements

### Requirement: Dedicated flat resource panes
The extension SHALL expose dedicated Plugins, MCP, Skills, and Agents native TreeViews in addition to Resources. Plugins, MCPs, and Skills SHALL show all discovered records for their type as flat, alphabetical lists, including plugin-owned records, while Agents SHALL show all discovered agent files as one flat alphabetical list without Global or Workspace root rows. Plugin and skill rows SHALL be collapsed by default and expandable using the same supporting-child renderer as Resources. All panes SHALL retain applicable selection, source-opening, enablement, inspection, tool-loading, and context-menu behavior.

#### Scenario: Panel order
- **WHEN** the extension contributes native views
- **THEN** the order is Resources, Plugins, MCPs, Skills, Agents

#### Scenario: Plugins list
- **WHEN** the Plugins view is opened
- **THEN** it shows a flat alphabetical list of manifest-backed plugins with collapsed rows

#### Scenario: Skills list
- **WHEN** the Skills view is opened
- **THEN** it shows a flat alphabetical list of skills with collapsed rows that expand to the same files and subdirectories shown beneath the corresponding Resources skill

#### Scenario: Agents list
- **WHEN** the Agents view is opened
- **THEN** it shows all global and workspace agents in alphabetical order without Global or Workspace nodes

### Requirement: Source-aware path tooltips
All resource and agent items in every tree pane SHALL expose field-labelled hover tooltips. Global agent rows SHALL show a `~/`-relative path followed by a line break and the complete agent file contents; workspace agent rows SHALL show a workspace-relative path followed by a line break and the complete agent file contents. Plugin and skill rows SHALL use the same path, description, metadata, and child detail tooltip behavior as Resources.

#### Scenario: Agent content tooltip
- **WHEN** the user hovers an agent in the Agents view
- **THEN** the tooltip contains its scope-relative path, a line break, and the agent file contents

### Requirement: Stateful tree expansion controls
Resources SHALL use a per-node expansion state. On initial materialization, roots, groups, plugins, and ordinary supporting directories SHALL be expanded, while individual skill and MCP nodes and their supporting/tool entries SHALL be collapsed. Dedicated Plugins and Skills providers SHALL initialize each resource row collapsed and preserve expansion only for that provider until refresh.

#### Scenario: Dedicated collapsed defaults
- **WHEN** Plugins or Skills is first opened or refreshed
- **THEN** every plugin or skill row is collapsed and no child file is visible until explicitly expanded

### Requirement: Panel context actions
Plugins and Skills dedicated rows SHALL expose the same tooltip and right-click context actions as their corresponding Resources rows, including plugin manifest opening, enablement, inspection, copy-path, and read-only protections.

#### Scenario: Shared plugin menu
- **WHEN** a plugin row is right-clicked in the Plugins panel
- **THEN** the menu entries and disabled states match the same plugin row in Resources
