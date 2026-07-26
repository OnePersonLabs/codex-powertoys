## ADDED Requirements

### Requirement: Typed non-empty resource groups
The Resources tree SHALL label Plugins, MCPs, Skills, and Agents group nodes with 🔌, 🧰, 💪, and 🤖 respectively, and SHALL omit any group whose visible children are empty after filtering and superseded-record visibility rules are applied.

#### Scenario: Typed scope and plugin groups
- **WHEN** a scope or plugin has visible resources of a type
- **THEN** its group label contains the corresponding type glyph before the group name

#### Scenario: Empty plugin scope
- **WHEN** a scope has no visible plugins
- **THEN** the scope does not render an empty Plugins group

#### Scenario: Empty plugin-owned type group
- **WHEN** a plugin has no visible MCPs or Skills of a type
- **THEN** that plugin does not render the corresponding empty typed group

### Requirement: Superseded resource visibility
The Resources tree SHALL provide a toolbar toggle that hides or shows records whose effective state is `shadowed`; when hidden, those records and any groups that would contain only them SHALL be omitted, and Agents SHALL not expose this toggle.

#### Scenario: Hide superseded records
- **WHEN** superseded visibility is off
- **THEN** shadowed plugins, MCPs, and Skills are absent and non-empty ancestor groups remain visible

#### Scenario: Show superseded records
- **WHEN** the user enables the Resources superseded toggle
- **THEN** shadowed records appear with their original source paths and ✖️ status glyphs
