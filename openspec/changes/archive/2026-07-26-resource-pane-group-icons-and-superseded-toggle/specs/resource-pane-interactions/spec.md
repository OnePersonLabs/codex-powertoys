## ADDED Requirements

### Requirement: Per-pane superseded toggle
The Plugins, MCPs, Skills, and Resources panes SHALL each provide an independent toolbar toggle for showing or hiding superseded records. The Agents pane SHALL not provide this toggle.

#### Scenario: Toggle in applicable panes
- **WHEN** the user invokes a pane's superseded toggle
- **THEN** only that pane changes whether records with effective state `shadowed` are rendered

#### Scenario: No Agents toggle
- **WHEN** the Agents pane is opened
- **THEN** no superseded visibility command is contributed to that pane

### Requirement: Collapsed Resources plugin defaults
Resource plugin nodes SHALL be collapsed on initial materialization and after refresh, while roots and type groups retain their existing expanded defaults.

#### Scenario: Plugin rows start collapsed
- **WHEN** Resources first materializes a plugin node
- **THEN** the plugin node is collapsible and its initial state is Collapsed
