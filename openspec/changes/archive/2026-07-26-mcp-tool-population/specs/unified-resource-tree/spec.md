## MODIFIED Requirements

### Requirement: Status and type icon labels
Resource rows SHALL use the status glyph followed by a stable type icon and the resource name. Skills SHALL use `💪`; MCP tools SHALL prefix the tool name with their derived permission glyph (`✅`, `❌`, or `✋`) before the tool icon and name.

#### Scenario: Typed resource labels
- **WHEN** the tree renders a plugin, skill, MCP, or loaded MCP tool
- **THEN** its label uses `🔌` for plugins, `💪` for skills, `🧰` for MCPs, and the derived permission glyph followed by `🔨` for MCP tools after the current status glyph where a status exists

#### Scenario: Effective status remains visible
- **WHEN** a resource is active, shadowed, unavailable, or disabled
- **THEN** the existing status glyph (`✅`, `☑️`, `✖️`, or `❌`) reflects that effective state without requiring a native checkbox

#### Scenario: No native resource checkboxes
- **WHEN** a resource row is rendered in the unified view
- **THEN** the row does not set `TreeItem.checkboxState`, and enablement is performed through the existing context or toolbar commands

### Requirement: Explicit MCP tool children
The unified tree SHALL show cached MCP tools as collapsed children of their MCP nodes after the background discovery queue has probed them. Discovery SHALL not block tree materialization, and a failed cache entry SHALL leave the MCP visible with a diagnostic and no authoritative tool children.

#### Scenario: Background tools are populated
- **WHEN** an effective enabled MCP probe succeeds
- **THEN** its tools appear as permission-glyph-prefixed `🔨` children under that MCP in Resources and MCPs views

#### Scenario: Disabled MCPs are not probed
- **WHEN** an MCP is disabled, unavailable, or shadowed
- **THEN** it is not added to the background queue and no process or network request is made for it

#### Scenario: Tool loading failure
- **WHEN** an MCP probe fails
- **THEN** the MCP remains visible with its static configuration and cached diagnostic, and no partial tool list is presented as authoritative

### Requirement: Unified scope root labels
Resources SHALL label its two scope roots exactly `Global` and `Workspace`, while exposing each root's full canonical path through its field-labelled tooltip.

#### Scenario: Concise roots
- **WHEN** the Resources view is opened
- **THEN** the two top-level rows are labelled `Global` and `Workspace` and hovering either row reveals its full root path
