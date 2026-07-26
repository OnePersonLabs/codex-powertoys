## MODIFIED Requirements

### Requirement: Typed non-empty resource groups
The Resources tree SHALL label Plugins, MCPs, Skills, and Agents group nodes with their plain names (`Plugins`, `MCPs`, `Skills`, and `Agents`) without a leading emoji, and SHALL omit any group whose visible children are empty after filtering and superseded-record visibility rules are applied. Resource item rows SHALL retain their existing status and type glyphs.

#### Scenario: Plain typed scope and plugin groups
- **WHEN** a scope or plugin has visible resources of a type
- **THEN** its group label is exactly the corresponding plain name, without a leading emoji

#### Scenario: Resource item glyphs remain present
- **WHEN** the tree renders a plugin, skill, MCP, loaded MCP tool, or agent item
- **THEN** the item retains its existing status/type glyph label

#### Scenario: Empty plugin scope
- **WHEN** a scope has no visible plugins
- **THEN** the scope does not render an empty Plugins group

#### Scenario: Empty plugin-owned type group
- **WHEN** a plugin has no visible MCPs or Skills of a type
- **THEN** that plugin does not render the corresponding empty typed group
