## ADDED Requirements

### Requirement: Transfer managed resources across scopes
The core SHALL support copying and moving skills, agents, and config-owned MCP definitions between global and workspace scopes using explicit conflict decisions.

#### Scenario: Copy skill preserving directory contents
- **WHEN** a skill is copied to a target scope
- **THEN** the complete skill directory is created at the target relative path without modifying the source

#### Scenario: Move agent after confirmation
- **WHEN** a cut agent is pasted to a target scope and the destination is conflict-free
- **THEN** the agent file and required parent directories are moved and the source is removed only after the destination succeeds

#### Scenario: Conflict skip and replace
- **WHEN** a transfer encounters an existing destination
- **THEN** `skip` leaves the destination and source unchanged, while `replace` replaces the destination according to the operation's copy/move semantics

### Requirement: Protect plugin sources and discovery roots
The core SHALL reject direct rename, delete, move, or edit operations against plugin-owned originals and protected global/workspace discovery roots.

#### Scenario: Plugin source mutation rejected
- **WHEN** a user attempts to delete or rename a skill, MCP, or agent owned by a plugin
- **THEN** the operation fails with a diagnostic and the plugin source remains unchanged

#### Scenario: Root deletion rejected
- **WHEN** a transfer or delete target resolves to a protected discovery root
- **THEN** the operation fails before any filesystem mutation

### Requirement: Rename source-aware resources
The core SHALL rename skills, agents, and MCPs according to their resource-specific source rules while preserving unrelated content.

#### Scenario: Rename skill
- **WHEN** a skill directory is renamed
- **THEN** the directory changes name, an existing frontmatter `name` field is updated, and matching `skills.config` path entries are updated

#### Scenario: Rename agent
- **WHEN** an agent is renamed
- **THEN** its `.toml` filename and existing `name` property are updated

#### Scenario: Rename MCP in both scopes
- **WHEN** matching MCP definitions exist in global and workspace config files
- **THEN** both table headers are renamed while their other fields remain unchanged
