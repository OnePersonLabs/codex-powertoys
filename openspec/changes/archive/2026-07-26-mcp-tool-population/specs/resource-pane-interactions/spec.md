## MODIFIED Requirements

### Requirement: Dedicated flat resource panes
The extension SHALL expose dedicated Skills and MCP native TreeViews in addition to Resources and Agents. Skills and MCP panes SHALL show all discovered records for their type as flat, alphabetical lists, including plugin-owned records, and SHALL retain full selection, source-opening, enablement, inspection, tool-loading, and context-menu behavior applicable to the record. Enabled MCP rows SHALL expose their cached tools as collapsed children in the same way in both MCP-capable panes.

#### Scenario: Skills list
- **WHEN** the Skills view is opened
- **THEN** it shows a flat alphabetically ordered list of discovered skills with status and type icons, without source/group directory rows

#### Scenario: MCP list
- **WHEN** the MCP view is opened
- **THEN** it shows a flat alphabetically ordered list of discovered MCPs with status and type icons, with cached tools as collapsed children when available and without plugin or config hierarchy rows

#### Scenario: Pane item interaction
- **WHEN** a user selects or right-clicks a skill, MCP, or MCP tool in either dedicated pane
- **THEN** the existing Info/source-opening, enable/disable/reset, edit/delete, explicit re-query, copy, move, rename, and delete actions remain available subject to the same plugin read-only protections

### Requirement: Stateful tree expansion controls
Resources SHALL use a per-node expansion state. On initial materialization, roots, groups, and plugins SHALL be expanded, while individual skill nodes, individual MCP nodes, and their nested supporting/tool entries SHALL be collapsed. Resources SHALL expose a title action whose label and behavior reflect the current state; Agents SHALL retain their existing expansion controls.

#### Scenario: Skill and MCP default expansion
- **WHEN** Resources is first opened or refreshed
- **THEN** non-resource containers are expanded, individual skills and MCPs are collapsed, and skill supporting files and MCP tools remain hidden until their parent is expanded

#### Scenario: Collapse when every node is expanded
- **WHEN** every known expandable Resources node, including skill and MCP nodes, is expanded
- **THEN** the title action is Collapse All and invoking it collapses every expandable node

#### Scenario: Expand non-resource nodes from a collapsed or mixed tree
- **WHEN** any non-skill/non-MCP Resources node is collapsed
- **THEN** the title action is Expand and invoking it expands all non-resource nodes while leaving individual skill and MCP nodes and their nested entries unchanged

#### Scenario: Expand nested resources after containers are open
- **WHEN** all non-skill/non-MCP Resources nodes are expanded but one or more individual skills or MCPs are collapsed
- **THEN** the title action is Expand and invoking it expands all known nodes, including individual skills, MCPs, and their nested entries

### Requirement: Source-aware path tooltips
All resource and agent items in every tree pane SHALL expose field-labelled hover tooltips. Workspace-scoped paths SHALL be relative to the active workspace when inside it; global-scoped paths and workspace sources outside it SHALL remain canonical. Tooltips SHALL include descriptions where available: skills SHALL list `Description`, then `Display Name`, `Short Description`, and `Default Prompt` from `agents/openai.yml`; MCPs and plugins SHALL list their descriptions; tools SHALL list `Tool` followed immediately by `Description`.

#### Scenario: Tool tooltip
- **WHEN** the user hovers a cached MCP tool
- **THEN** the tooltip begins with `Tool: <name>` and the next field is `Description: <description>` (or an explicit empty/unavailable value)

#### Scenario: MCP and plugin descriptions
- **WHEN** the user hovers an MCP or plugin
- **THEN** its existing source/status fields remain and a `Description: <value>` field appears below them when provided

#### Scenario: Skill metadata tooltip
- **WHEN** the user hovers a skill with `agents/openai.yml` interface metadata
- **THEN** fields appear after the skill name in order as `Description`, `Display Name`, `Short Description`, and `Default Prompt`, followed by its `Path` and `Status`, omitting absent optional fields

#### Scenario: Root tooltip labels
- **WHEN** the user views a Resources scope root
- **THEN** the row label is exactly `Global` or `Workspace`, and its tooltip contains the full root path
