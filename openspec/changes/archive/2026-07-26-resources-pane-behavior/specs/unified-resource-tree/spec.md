## MODIFIED Requirements

### Requirement: Unified scoped resource tree
The extension SHALL expose Skills, Plugins, and MCPs through one native Resources TreeView with exactly two top-level scope roots: Global and Workspace. Each scope SHALL contain a `Plugins` group, SHALL contain an `MCPs` group only when at least one visible standalone MCP exists, and SHALL contain a `Skills` group only when at least one visible standalone skill exists. Standalone resources SHALL appear under their type group and plugin-owned resources SHALL appear beneath their owning plugin's corresponding non-empty type group.

#### Scenario: Global and workspace roots
- **WHEN** the Resources view is opened
- **THEN** it contains a Global root representing `~/` and a Workspace root representing the active workspace, with no type roots above those scope roots

#### Scenario: Non-empty type groups
- **WHEN** a scope root is expanded
- **THEN** it contains `Plugins` plus only the non-empty `MCPs` and `Skills` groups, and standalone MCPs and Skills are not mixed into the Plugins group

#### Scenario: Empty type groups are omitted
- **WHEN** a scope has no visible standalone MCPs or Skills, or a plugin has no visible MCPs or Skills
- **THEN** the corresponding empty `MCPs` or `Skills` group node is not shown

#### Scenario: Resources retain source provenance
- **WHEN** resources are discovered from `~/.agents`, `~/.codex`, configured roots, workspace roots, or plugin subpaths
- **THEN** each resource appears beneath the corresponding scope and type/plugin group, and its canonical source path remains available for inspection and actions

#### Scenario: Resources filter by visible text
- **WHEN** a Resources filter is active
- **THEN** only matching resources and the non-empty ancestor groups required to reach them are shown, with matches evaluated against the resource name and canonical path
