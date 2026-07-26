## ADDED Requirements

### Requirement: Render finite scoped agent trees
The Agents view SHALL render global and workspace agent records as finite recursive trees whose directory children are calculated relative to the original scope root and the current directory's root-relative path.

#### Scenario: Nested global agent directory
- **WHEN** the global agents root contains `model-effort/sol-high.toml`
- **THEN** the Global node contains one `model-effort` directory and expanding it contains `sol-high.toml` as an agent file

#### Scenario: Nested workspace agent directory
- **WHEN** the workspace `.codex/agents` root contains `team/reviewer.toml`
- **THEN** the Workspace node contains one `team` directory and expanding it contains `reviewer.toml` as an agent file

#### Scenario: Directory has no direct files
- **WHEN** a directory contains only deeper agent directories
- **THEN** the view renders each next directory level once and does not emit the current directory or an ancestor as a child

### Requirement: Load recursive agent trees lazily
The Agents view SHALL initially expand the Global and Workspace scope roots, but SHALL leave nested agent directories collapsed until the user explicitly expands them.

#### Scenario: View refresh with nested agents
- **WHEN** the Agents view is refreshed and nested agent directories exist
- **THEN** loading completes after enumerating the two scope roots and their immediate children without recursively expanding every directory

#### Scenario: User expands a directory
- **WHEN** the user expands a nested agent directory
- **THEN** the view returns only that directory's direct child directories and agent files, with no repeated self or ancestor nodes

#### Scenario: No workspace is open
- **WHEN** no workspace folder is available
- **THEN** the Global node remains usable and the Workspace node has no children without causing repeated loading
