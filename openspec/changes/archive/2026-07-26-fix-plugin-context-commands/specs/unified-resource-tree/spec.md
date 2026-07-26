## MODIFIED Requirements

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
