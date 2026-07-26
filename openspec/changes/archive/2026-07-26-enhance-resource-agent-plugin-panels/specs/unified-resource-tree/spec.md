## MODIFIED Requirements

### Requirement: Unified scoped resource tree
The extension SHALL expose Skills, Plugins, MCPs, and Agents through one native Resources TreeView with exactly two top-level scope roots: Global and Workspace. Each scope SHALL contain a `Plugins` group, SHALL contain an `MCPs` group only when at least one visible standalone MCP exists, SHALL contain a `Skills` group only when at least one visible standalone skill exists, and SHALL contain an `Agents` group when agent files are available. Standalone resources SHALL appear under their type group and plugin-owned resources SHALL appear beneath their owning plugin's corresponding non-empty type group.

#### Scenario: Global and workspace roots
- **WHEN** the Resources view is opened
- **THEN** it contains a Global root representing `~/` and a Workspace root representing the active workspace, with no type roots above those scope roots

#### Scenario: Agents groups
- **WHEN** global or workspace agent files exist
- **THEN** the corresponding scope contains an `Agents` group whose children mirror the recursive subdirectory structure under that scope's agents root

#### Scenario: Empty type groups are omitted
- **WHEN** a scope has no visible standalone MCPs, Skills, or Agents
- **THEN** the corresponding empty group node is not shown

#### Scenario: Resources retain source provenance
- **WHEN** resources are discovered from `~/.agents`, `~/.codex`, configured roots, workspace roots, or plugin subpaths
- **THEN** each resource appears beneath the corresponding scope and type/plugin group, and its canonical source path remains available for inspection and actions

### Requirement: Status and type icon labels
Resource rows SHALL use the effective-state glyph followed by a stable type icon and the resource name. Plugins SHALL use 🤖 for agents and 🔌 for plugins; skills SHALL use 💪; MCPs SHALL use 🧰; loaded MCP tools SHALL use 🔨 after their permission glyph.

#### Scenario: Consistent effective status
- **WHEN** a plugin, MCP, skill, or plugin-owned record is active, shadowed, disabled, or unavailable
- **THEN** its label uses ✅, ☑️, ✖️, or ❌ according to the shared effective-state precedence

#### Scenario: Agent labels
- **WHEN** an agent row is rendered in Resources or Agents
- **THEN** its label contains the 🤖 icon

### Requirement: Unified scope root labels
Resources SHALL label its two scope roots exactly `Global` and `Workspace`, with each root's full canonical path available in a field-labelled tooltip.

#### Scenario: Concise scope roots
- **WHEN** the Resources view is opened
- **THEN** the top-level rows are labelled `Global` and `Workspace`, and hovering either row reveals its full root path

### Requirement: Agents remain separate
The extension SHALL keep Agents in a dedicated flat provider while also exposing scoped recursive Agents groups in Resources.

#### Scenario: Dedicated and scoped agent views
- **WHEN** the extension exposes the Agents view
- **THEN** Agents continue using a dedicated provider, while Resources also exposes scoped Agents groups and recursive agent children without duplicating scope-root rows inside the dedicated provider
