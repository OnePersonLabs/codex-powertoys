## ADDED Requirements

### Requirement: Provide CLI inspection commands
The CLI SHALL expose skill, MCP, root, and diagnostic inspection commands with human-readable output by default and machine-readable JSON output through a consistent option.

#### Scenario: List skills as JSON
- **WHEN** the user requests skills with the JSON option
- **THEN** the CLI returns normalized records including origins and effective state without presentation-only formatting

#### Scenario: Show an MCP
- **WHEN** the user requests one MCP
- **THEN** the CLI displays its scope, source path, enabled state, complete config fields, and available diagnostics

### Requirement: Provide a VS Code inspector container
The extension SHALL contribute a desktop Activity Bar container with Skills, MCP, and Info views backed by the shared core and resolved on the active extension host machine.

#### Scenario: Remote workspace
- **WHEN** VS Code is connected to a remote workspace
- **THEN** global and workspace discovery uses the remote extension host and the UI labels the inspected host/scope

#### Scenario: Local workspace
- **WHEN** VS Code is not connected to a remote workspace
- **THEN** discovery uses the local machine's user and workspace roots

### Requirement: Navigate and filter skills
The Skills view SHALL support tree and flat modes, a toggle for showing supporting/non-skill entries, alphabetical flat ordering, emoji status indicators, refresh, and opening the selected physical file.

#### Scenario: Tree mode
- **WHEN** tree mode and supporting entries are enabled
- **THEN** the view shows source roots, skill directories, skill files, and supporting files/folders with skill status indicators

#### Scenario: Flat mode
- **WHEN** flat mode is selected
- **THEN** only skill records are shown in alphabetical order with their effective status

#### Scenario: Skill context action
- **WHEN** the user right-clicks a skill
- **THEN** scope-appropriate Enable, Disable, and Reset actions are available and update the view after mutation

### Requirement: Inspect and manage MCPs
The MCP view SHALL group global and workspace servers, expose scope-appropriate context actions, provide add/edit/delete controls, open source TOML locations, and offer explicit tool loading.

#### Scenario: Inspect MCP details
- **WHEN** the user selects an MCP
- **THEN** the Info view shows status and configuration immediately without connecting to the server

#### Scenario: Expand tool descriptions
- **WHEN** tools have been loaded and the user expands or collapses a tool or uses expand-all/collapse-all
- **THEN** descriptions update without changing the selected MCP, and the panel remembers the last expansion default for subsequent selections

### Requirement: Integrate with Codex chat safely
The extension SHALL provide a skill-creation action that attempts a supported Codex command/API and SHALL provide a visible fallback that focuses or opens Codex and copies `$skill-creator ` when direct insertion is unavailable.

#### Scenario: Supported Codex command
- **WHEN** the installed Codex extension exposes a usable supported command
- **THEN** the action starts a new chat and supplies the skill-creator prefix

#### Scenario: Unsupported Codex command
- **WHEN** no supported command/API is available
- **THEN** the action does not manipulate private UI internals and instead provides the prompt through clipboard/focus fallback feedback
