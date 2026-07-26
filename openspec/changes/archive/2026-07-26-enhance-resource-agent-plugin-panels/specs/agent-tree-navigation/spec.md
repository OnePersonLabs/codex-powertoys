## MODIFIED Requirements

### Requirement: Render finite scoped agent trees
The Resources Agents groups SHALL render global and workspace agent records as finite recursive trees whose directory children are calculated relative to the original scope root and the current directory's root-relative path. The dedicated Agents view SHALL flatten all discovered agent files across both scopes into one alphabetical list and SHALL not render scope-root nodes.

#### Scenario: Nested global agent directory
- **WHEN** the global agents root contains `model-effort/sol-high.toml`
- **THEN** the Global Agents group contains one `model-effort` directory and expanding it contains `sol-high.toml` as an agent file

#### Scenario: Flattened dedicated agent list
- **WHEN** global and workspace agent files are discovered
- **THEN** the Agents view lists every file alphabetically and each row retains its canonical scope for tooltip and actions

#### Scenario: Directory has no direct files
- **WHEN** a directory contains only deeper agent directories
- **THEN** the view renders each next directory level once and does not emit the current directory or an ancestor as a child

### Requirement: Load recursive agent trees lazily
The Resources Agents groups SHALL initially enumerate only their scope root and immediate children, leaving nested directories collapsed until explicitly expanded. The dedicated Agents view SHALL materialize its flat file list without recursively rendering directory rows.

#### Scenario: View refresh with nested agents
- **WHEN** Resources is refreshed and nested agents exist
- **THEN** loading completes after enumerating the two scope roots and immediate children without recursively expanding every directory

#### Scenario: No workspace is open
- **WHEN** no workspace folder is available
- **THEN** the Global Agents group and dedicated Agents view remain usable and Workspace contributes no children without repeated loading
