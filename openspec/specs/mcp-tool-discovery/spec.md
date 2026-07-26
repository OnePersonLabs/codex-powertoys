## Purpose

Define safe, cached MCP tool discovery and effective permission presentation.

## Requirements

### Requirement: Background MCP tool discovery
The extension SHALL maintain an in-memory, sequential MCP probe queue. At startup and after refresh it SHALL enqueue only effective enabled MCP winners that have no cache entry, and after an MCP is enabled it SHALL enqueue that MCP for a forced re-query. Queue entries with an existing cache entry SHALL replace that entry with fresh results. A successful or failed probe SHALL create a cache entry, and a failed entry SHALL suppress passive retry until an explicit refresh/re-query request.

#### Scenario: Startup queue
- **WHEN** the extension starts with enabled MCPs
- **THEN** it queues each effective enabled MCP once, drains the queue in the background one MCP at a time, and leaves disabled, shadowed, unavailable, and duplicate superseded records out of the queue

#### Scenario: Enablement and refresh queueing
- **WHEN** a user enables an MCP or refresh discovers an enabled MCP without a cache entry
- **THEN** the MCP is queued for probing and the resulting tools or failure replace any previous result for that logical MCP

#### Scenario: Cached failure is stable
- **WHEN** a probe fails
- **THEN** its diagnostic is cached and passive refresh does not start the MCP again until an explicit enablement or Load MCP Tools re-query queues it

### Requirement: MCP probe lifecycle safety
Every MCP probe SHALL initialize the server, request its tool list, and disconnect or terminate the owned transport in a `finally` block. Stdio children SHALL be killed after the attempt, HTTP transports SHALL release their request/session resources, and one probe failure SHALL not prevent later queue entries from running.

#### Scenario: Successful stdio probe cleanup
- **WHEN** an enabled stdio MCP returns a valid `tools/list` response
- **THEN** its tools are cached and the child process is terminated before the probe completes

#### Scenario: Failed probe cleanup
- **WHEN** initialization, tool listing, timeout, or parsing fails
- **THEN** a diagnostic is cached, partial tools are not presented as authoritative, and the child or transport is still disconnected before the queue continues

### Requirement: MCP tool permission state
The extension SHALL derive each discovered tool's display permission from the effective MCP configuration. `disabled_tools` SHALL take precedence over `enabled_tools`; a non-empty allow list SHALL deny tools not listed. Otherwise a per-tool approval mode SHALL override the server default. `auto` SHALL display ✅, while `prompt`, `writes`, `approve`, missing, and unknown modes SHALL display ✋.

#### Scenario: Allow and deny lists
- **WHEN** a tool is listed in `disabled_tools`, or is absent from a non-empty `enabled_tools` list
- **THEN** it is rendered with ❌ regardless of the server approval mode

#### Scenario: Per-tool approval override
- **WHEN** a tool has a `tools.<tool>.approval_mode` override
- **THEN** the override determines its glyph ahead of `default_tools_approval_mode`

#### Scenario: Plugin policy overlay
- **WHEN** an MCP is supplied by a plugin and matching plugin MCP policy exists in global or workspace `config.toml`
- **THEN** the effective plugin policy is applied to that MCP's tool glyphs without changing its transport configuration

### Requirement: Scope-aware MCP supersession
MCP discovery SHALL group records by name and apply precedence by scope and source before deriving effective state. A matching `mcp_servers.<name>` entry in global or workspace `config.toml` SHALL override plugin `.mcp.json` records at that scope; a disabled overriding config record SHALL remain the disabled winner while overridden plugin records SHALL be marked shadowed.

#### Scenario: Disabled global config overrides plugin definitions
- **WHEN** global config defines `mcp_servers.cloudflare-api` with `enabled = false` and one or more plugin descriptors define the same name
- **THEN** the config record is ❌/disabled and every plugin record is ✖️/shadowed rather than active or a separate effective MCP

#### Scenario: Workspace config outranks global config
- **WHEN** both workspace and global config define the same MCP name
- **THEN** the workspace record wins precedence regardless of whether the winning record is enabled

#### Scenario: Only effective enabled winners are probed
- **WHEN** an MCP has a disabled or shadowed winner
- **THEN** no record in that name group is queued for background tool discovery
