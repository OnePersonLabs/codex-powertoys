## MODIFIED Requirements

### Requirement: Stateful tree expansion controls
Resources SHALL maintain stable per-node expansion state and expose a two-state toolbar control. On initial materialization, only the Global and Workspace scope roots SHALL be expanded; every other expandable node SHALL be collapsed. The toolbar SHALL show Expand when no non-root node is expanded and SHALL show Collapse whenever any non-root node is expanded. Every toolbar action SHALL leave both scope roots expanded. Expand SHALL expand every materialized and subsequently materialized non-skill node while leaving individual skill nodes and their supporting file/directory descendants collapsed. Collapse SHALL recursively collapse every non-root expandable node, including skill nodes and their descendants. Dedicated Plugins and Skills providers SHALL continue to initialize each resource row collapsed and preserve expansion only for that provider until refresh. Agents SHALL remain a flat list without scope-root expansion controls.

#### Scenario: Initial Resources state
- **WHEN** Resources is first opened or refreshed
- **THEN** Global and Workspace are expanded, every sub-node is collapsed, and the toolbar is in the Expand state

#### Scenario: Expand from the fully collapsed state
- **WHEN** no non-root Resources node is expanded and the user invokes the toolbar Expand action
- **THEN** Global and Workspace remain expanded, every non-skill node is expanded, and every individual skill node plus its supporting descendants remains collapsed

#### Scenario: Collapse from any mixed state
- **WHEN** any non-root Resources node is expanded and the user invokes the toolbar Collapse action
- **THEN** Global and Workspace are expanded and every non-root expandable node is collapsed recursively

#### Scenario: Root collapse does not determine toolbar state
- **WHEN** the user manually collapses Global or Workspace while all non-root nodes are collapsed
- **THEN** the toolbar remains in the Expand state
- **AND** invoking the toolbar action re-expands both roots

#### Scenario: Manual child expansion updates the toolbar
- **WHEN** the user expands or collapses a non-root node in the native Resources TreeView
- **THEN** the provider records that node's state and the toolbar context is synchronized immediately
- **AND** the toolbar shows Collapse if any non-root node is expanded, otherwise Expand

#### Scenario: Repeated toolbar actions are deterministic
- **WHEN** the user alternates the toolbar action repeatedly after manually expanding a plugin skill and then collapsing its plugin
- **THEN** each click applies the current two-state rule, re-expands both roots, and never leaves the toolbar ineffective or dependent on the obsolete default/manual mode

#### Scenario: Dedicated collapsed defaults
- **WHEN** Plugins or Skills is first opened or refreshed
- **THEN** every plugin or skill row is collapsed and no child file is visible until explicitly expanded

#### Scenario: Agents remain flat
- **WHEN** the Agents view is opened
- **THEN** Agents continue using a flat provider without Global or Workspace root expansion controls
