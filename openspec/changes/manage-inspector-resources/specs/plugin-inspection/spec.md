## ADDED Requirements

### Requirement: Discover plugin packages and ownership
The core SHALL discover global and workspace plugin packages from plugin manifests, remote-install metadata, `skills` directories, and `.mcp.json` descriptors, and SHALL associate contained skills and MCPs with their owning plugin.

#### Scenario: Manifest-backed plugin
- **WHEN** a plugin root contains `.codex-plugin/plugin.json` and a `skills` directory
- **THEN** the catalog exposes the plugin identity, manifest metadata, root, scope, and contained skill records with plugin ownership

#### Scenario: Plugin MCP descriptor
- **WHEN** a plugin root contains `.mcp.json` with an `mcpServers` object
- **THEN** each server is normalized into an MCP record whose source path, plugin owner, and plugin-relative working directory are available without connecting to it

### Requirement: Apply plugin enablement to children
The core SHALL treat a missing plugin `enabled` override as enabled and SHALL mark all contained skills and MCPs unavailable-by-plugin when the matched plugin override is `enabled = false`.

#### Scenario: Disabled plugin hides children
- **WHEN** the matching global or workspace plugin section has `enabled = false`
- **THEN** contained skills and MCPs remain discoverable but have disabled-by-plugin effective state and cannot become active through child enablement

#### Scenario: Non-plugin duplicate remains usable
- **WHEN** a disabled plugin contains a skill or MCP with the same name as a workspace or global config resource
- **THEN** the non-plugin resource participates in normal precedence and is not disabled solely because the plugin copy is disabled

### Requirement: Mutate plugin enablement safely
The core SHALL support plugin enable, disable, and reset operations in the selected global or workspace config while preserving unrelated fields.

#### Scenario: Disable plugin
- **WHEN** the user disables an enabled or default plugin
- **THEN** the selected config contains `enabled = false` in the matching plugin section and unrelated TOML remains unchanged

#### Scenario: Reset plugin
- **WHEN** the user resets a plugin override
- **THEN** the explicit `enabled` field is removed and an otherwise-empty plugin section is removed
