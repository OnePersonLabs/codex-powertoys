## ADDED Requirements

### Requirement: Plain group labels across resource panels
Any Plugins, MCPs, Skills, or Agents group node rendered by a dedicated resource panel SHALL use its plain type name without a leading emoji. Dedicated resource item rows SHALL retain their existing status and type glyphs.

#### Scenario: Dedicated group labels
- **WHEN** a resource panel renders a Plugins, MCPs, Skills, or Agents group node
- **THEN** the label is exactly `Plugins`, `MCPs`, `Skills`, or `Agents` respectively, with no leading emoji

#### Scenario: Dedicated item labels
- **WHEN** a dedicated panel renders an actionable plugin, MCP, skill, agent, or loaded-tool item
- **THEN** the item's existing status/type glyphs remain unchanged
