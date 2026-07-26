## ADDED Requirements

### Requirement: Use icon toolbars with tooltips
The extension SHALL render view-title toolbar actions with codicon icons and SHALL retain descriptive command titles as hover tooltips.

#### Scenario: Toolbar action
- **WHEN** a Skills, Agents, MCPs, Plugins, or Info view is visible
- **THEN** its toolbar actions render as icons rather than text labels and hovering an icon exposes the action description

### Requirement: Support multi-selection and scoped actions
Skills, MCPs, agents, and plugins SHALL expose multi-selection where the operation is safe, with context actions for cut, copy, paste, rename, delete, enablement, and reset as applicable.

#### Scenario: Multi-item copy
- **WHEN** multiple managed resources are selected and copied
- **THEN** the extension stores all selected resource identities and permits a single paste operation to process them independently

### Requirement: Confirm destructive and moving operations
The extension SHALL ask for confirmation before moves and permanent deletes and SHALL provide skip, replace, decide-each, and cancel conflict choices without persisting a do-not-ask preference.

#### Scenario: Delete confirmation
- **WHEN** the user presses Delete on a selected resource
- **THEN** a warning modal offers Delete and Cancel and no mutation occurs on Cancel

#### Scenario: Move confirmation
- **WHEN** a drag or cut/paste move is requested
- **THEN** an informational modal names the source and target and offers Move and Cancel

### Requirement: Provide native drag/drop fallback
The extension SHALL support internal TreeView drag/drop as move operations and SHALL provide Copy/Paste as the reliable copy workflow because native drop callbacks do not expose keyboard modifiers.

#### Scenario: Native drag
- **WHEN** a resource is dragged onto a valid scope or directory target
- **THEN** the extension performs the confirmed move and refreshes affected views
