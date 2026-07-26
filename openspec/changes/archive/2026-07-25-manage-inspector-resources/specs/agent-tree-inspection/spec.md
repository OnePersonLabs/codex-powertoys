## ADDED Requirements

### Requirement: Discover recursive agent trees
The core SHALL recursively discover `.toml` agent files beneath the global Codex agents directory and the workspace `.codex/agents` directory, preserving each file's root and relative path.

#### Scenario: Nested agent directory
- **WHEN** an agent TOML exists below a nested directory
- **THEN** discovery returns the agent and its complete relative path beneath the appropriate root

#### Scenario: Missing workspace
- **WHEN** no workspace is open
- **THEN** global agents remain available and the workspace root is omitted without failing discovery
