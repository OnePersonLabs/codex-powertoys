## ADDED Requirements

### Requirement: Discover scoped MCP definitions
The core SHALL discover global and workspace MCP server tables, preserve their complete TOML representation including unknown fields, expose source paths and line locations, and compute enabled state with absent `enabled` treated as default-enabled.

#### Scenario: Discover global and workspace MCPs
- **WHEN** MCP tables exist in either configured scope
- **THEN** the catalog exposes each server with its scope, name, source file, and parsed fields

#### Scenario: Preserve arbitrary transport fields
- **WHEN** an MCP definition uses stdio, URL, headers, environment, tool-specific, or unknown nested fields
- **THEN** inspection retains those fields for display and round-trip editing

### Requirement: Mutate MCP state and definitions
The core SHALL support scoped enable, disable, reset, add, edit, and delete operations. Known enabled flags SHALL be changed narrowly, and add/edit operations SHALL preserve unknown fields unless the user explicitly removes them.

#### Scenario: Disable an MCP
- **WHEN** the user disables a server in a selected scope
- **THEN** the selected config contains or updates `enabled = false` for that server without rewriting unrelated tables

#### Scenario: Enable or reset an MCP
- **WHEN** the user enables or resets a server
- **THEN** the selected explicit disabled override is removed so default or inherited behavior applies

#### Scenario: Delete an MCP
- **WHEN** the user confirms deletion of a server definition
- **THEN** only that server table and its owned nested fields are removed from the selected config

### Requirement: Locate MCP definitions
The core SHALL expose source line/range information for each MCP definition so clients can open the defining TOML file at the relevant location.

#### Scenario: Open MCP source
- **WHEN** a client selects an MCP
- **THEN** it can open the correct global or workspace config and position the editor at the server definition

### Requirement: Explicitly discover MCP tools
The core SHALL provide an explicit operation to start or connect to a selected MCP and query its available tools. Selecting or listing an MCP SHALL NOT implicitly start a process or make a network request.

#### Scenario: Load tools successfully
- **WHEN** the user invokes Load/Refresh for a valid MCP
- **THEN** the result contains tool names and descriptions and the connection lifecycle is reported

#### Scenario: Tool discovery fails
- **WHEN** the selected MCP cannot start, connect, or respond
- **THEN** the client receives a visible diagnostic and the static MCP configuration remains available
