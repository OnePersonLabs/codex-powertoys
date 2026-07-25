## ADDED Requirements

### Requirement: Expose plugin-aware skill state
Skill records SHALL expose plugin ownership and SHALL distinguish disabled-by-plugin from ordinary disabled and shadowed states.

#### Scenario: Plugin-owned skill
- **WHEN** a skill is discovered beneath a plugin-owned skills root
- **THEN** its plugin identity and plugin-enabled state are included in the record

#### Scenario: Plugin disabled
- **WHEN** the owning plugin is disabled
- **THEN** the skill remains visible for inspection with unavailable-by-plugin state
