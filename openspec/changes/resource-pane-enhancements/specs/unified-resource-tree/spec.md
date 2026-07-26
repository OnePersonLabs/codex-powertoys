## MODIFIED Requirements

### Requirement: Unified scoped resource tree
The extension SHALL expose Skills, Plugins, and MCPs through one native Resources TreeView with exactly two top-level scope roots: Global and Workspace. Each scope SHALL contain `Plugins`, `MCPs`, and `Skills` group nodes in that order; standalone resources SHALL appear under their type group and plugin-owned resources SHALL appear beneath their owning plugin's corresponding type group.

#### Scenario: Global and workspace roots
- **WHEN** the Resources view is opened
- **THEN** it contains a Global root representing `~/` and a Workspace root representing the active workspace, with no type roots above those scope roots

#### Scenario: Explicit type groups
- **WHEN** a scope root is expanded
- **THEN** it contains `Plugins`, `MCPs`, and `Skills` groups, and standalone MCPs and Skills are not mixed into the Plugins group

#### Scenario: Resources retain source provenance
- **WHEN** resources are discovered from `~/.agents`, `~/.codex`, configured roots, workspace roots, or plugin subpaths
- **THEN** each resource appears beneath the corresponding scope and type/plugin group, and its canonical source path remains available for inspection and actions

#### Scenario: Resources filter by visible text
- **WHEN** a Resources filter is active
- **THEN** only matching resources and the ancestor groups required to reach them are shown, with matches evaluated against the resource name and canonical path
