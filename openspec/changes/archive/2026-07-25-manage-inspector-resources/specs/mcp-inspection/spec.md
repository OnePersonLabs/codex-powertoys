## ADDED Requirements

### Requirement: Expose plugin-owned MCP state
MCP records SHALL include plugin ownership, source kind, effective state, and plugin-relative execution context when discovered from a plugin descriptor.

#### Scenario: Plugin MCP inspection
- **WHEN** a plugin `.mcp.json` contains a server definition
- **THEN** the MCP appears in the catalog with its source file, plugin owner, and normalized transport fields without starting a server

#### Scenario: Plugin disabled
- **WHEN** the MCP's owning plugin is disabled
- **THEN** the MCP remains inspectable but is unavailable-by-plugin and cannot be enabled independently
