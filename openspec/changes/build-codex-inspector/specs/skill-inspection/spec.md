## ADDED Requirements

### Requirement: Discover skills and supporting files
The core SHALL discover skill files from active workspace roots, user skill roots, configured skill paths, plugin cache `skills` directories, and system skill directories. It SHALL expose each skill's physical path, scope, source kind, containing directories, supporting files, plugin identity when available, and parse diagnostics.

#### Scenario: Discover a user skill
- **WHEN** a valid `SKILL.md` exists beneath the host user's agents or Codex skills directory
- **THEN** the catalog contains the skill with its absolute path and user scope

#### Scenario: Discover a plugin skill
- **WHEN** a plugin cache version contains a `skills` directory and plugin metadata
- **THEN** the catalog contains the skill and associates it with the plugin and version metadata

#### Scenario: Preserve supporting files
- **WHEN** a skill directory contains `references`, `scripts`, `assets`, `agents`, or other files
- **THEN** the catalog exposes those entries for tree navigation without treating them as separate skills

### Requirement: Compute effective skill state
The core SHALL compute global override state, workspace override state, containing-plugin state, duplicate-name shadowing, and an effective active/inactive result without deleting duplicate records.

#### Scenario: Disabled global skill
- **WHEN** the global config contains a matching skill entry with `enabled = false`
- **THEN** the skill is globally disabled and a workspace enable entry does not make it effective

#### Scenario: Disabled workspace skill
- **WHEN** the workspace config contains a matching skill entry with `enabled = false`
- **THEN** the skill is locally disabled while its global state remains observable

#### Scenario: Shadowed skill
- **WHEN** multiple enabled skills share the same logical name and one wins according to the configured precedence
- **THEN** the winner is marked active and the other enabled records are marked overridden

#### Scenario: Disabled plugin
- **WHEN** the containing plugin has `enabled = false` in plugin configuration
- **THEN** its skills are marked unavailable because of plugin disablement

### Requirement: Mutate skill overrides safely
The core SHALL expose scoped enable, disable, and reset operations. Disable SHALL add or update only the selected skill's `enabled = false` override. Enable and reset SHALL remove the selected explicit override so default/inherited behavior applies. Operations SHALL preserve unrelated TOML content and report write or parse failures.

#### Scenario: Disable a skill
- **WHEN** the user disables a skill in global or workspace scope
- **THEN** the corresponding config contains one matching disabled override and the catalog reports the new effective state

#### Scenario: Reset a skill
- **WHEN** the user resets a skill override
- **THEN** the matching explicit override is removed and the skill returns to default or inherited behavior

#### Scenario: Config write failure
- **WHEN** the selected config cannot be read or written
- **THEN** the operation fails with a diagnostic and does not claim success

### Requirement: Read skill metadata and content
The core SHALL parse `agents/openai.yaml` when present and expose its interface metadata alongside the `SKILL.md` content. Malformed optional metadata SHALL produce diagnostics without hiding the skill.

#### Scenario: Metadata available
- **WHEN** a skill has a valid `agents/openai.yaml`
- **THEN** the Info surface can show display name, description, default prompt, and policy metadata

#### Scenario: Metadata malformed
- **WHEN** the metadata file is invalid
- **THEN** the skill remains selectable and the diagnostic identifies the metadata parse failure
