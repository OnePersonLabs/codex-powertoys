## Purpose

Define the dedicated resource panes and shared filtering, expansion, path-copy, and tooltip interactions.

## Requirements

### Requirement: Dedicated flat resource panes
The extension SHALL expose dedicated Skills and MCP native TreeViews in addition to Resources and Agents. Skills and MCP panes SHALL show all discovered records for their type as flat, alphabetical lists, including plugin-owned records, and SHALL retain full selection, source-opening, enablement, inspection, tool-loading, and context-menu behavior applicable to the record.

#### Scenario: Skills list
- **WHEN** the Skills view is opened
- **THEN** it shows a flat alphabetically ordered list of discovered skills with status and type icons, without source/group directory rows

#### Scenario: MCP list
- **WHEN** the MCP view is opened
- **THEN** it shows a flat alphabetically ordered list of discovered MCPs with status and type icons, without plugin or config hierarchy rows

#### Scenario: Pane item interaction
- **WHEN** a user selects or right-clicks a skill or MCP in its dedicated pane
- **THEN** the existing Info/source-opening, enable/disable/reset, edit/delete, explicit tool-loading, copy, move, rename, and delete actions remain available subject to the same plugin read-only protections

### Requirement: Incremental pane filtering
Resources, Skills, and MCP panes SHALL provide a toolbar filter input that applies case-insensitive matching to visible names and full canonical paths as the user types. Each pane SHALL provide an X/clear action while a filter is active, and clearing SHALL restore all records.

#### Scenario: Live filtering
- **WHEN** text is entered into a pane's filter input
- **THEN** the pane refreshes to show only matching records and retains required ancestor groups in Resources

#### Scenario: Clear filtering
- **WHEN** the user invokes the filter clear action
- **THEN** the input and provider filter become empty and all records are visible again

### Requirement: Stateful tree expansion controls
Resources and Agents SHALL be fully expanded by default and SHALL expose a toolbar toggle whose next action and icon reflect the current state: Collapse All when expanded and Expand All when collapsed.

#### Scenario: Default expansion
- **WHEN** Resources or Agents is first opened or refreshed
- **THEN** every materialized directory, group, plugin, skill-supporting entry, and MCP-tool container is expanded by default

#### Scenario: Toggle expansion
- **WHEN** the user invokes the visible expand/collapse toolbar action
- **THEN** all current and subsequently materialized containers use the opposite expansion state and the toolbar switches to the opposite action

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

### Requirement: Canonical path tooltips
All resource and agent items in every tree pane SHALL expose their full canonical path in the hover tooltip, including plugin-owned resources and loaded MCP tools.

#### Scenario: Hover path
- **WHEN** the user hovers a tree item
- **THEN** the tooltip contains the item's absolute source path, with MCP tools identifying their parent MCP configuration path
