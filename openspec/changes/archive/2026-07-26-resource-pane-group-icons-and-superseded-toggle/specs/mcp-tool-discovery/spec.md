## ADDED Requirements

### Requirement: Scope-aware MCP supersession
MCP discovery SHALL group records by name and apply precedence by scope and source before deriving effective state. A matching `mcp_servers.<name>` entry in global or workspace `config.toml` SHALL override plugin `.mcp.json` records at that scope; a disabled overriding config record SHALL remain the disabled winner while overridden plugin records SHALL be marked shadowed.

#### Scenario: Disabled global config overrides plugin definitions
- **WHEN** global config defines `mcp_servers.cloudflare-api` with `enabled = false` and one or more plugin descriptors define the same name
- **THEN** the config record is `❌`/disabled and every plugin record is `✖️`/shadowed rather than active or a separate effective MCP

#### Scenario: Workspace config outranks global config
- **WHEN** both workspace and global config define the same MCP name
- **THEN** the workspace record wins precedence regardless of whether the winning record is enabled

#### Scenario: Only effective enabled winners are probed
- **WHEN** an MCP has a disabled or shadowed winner
- **THEN** no record in that name group is queued for background tool discovery
