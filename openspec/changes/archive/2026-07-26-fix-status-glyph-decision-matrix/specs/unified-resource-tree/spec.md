## MODIFIED Requirements

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
