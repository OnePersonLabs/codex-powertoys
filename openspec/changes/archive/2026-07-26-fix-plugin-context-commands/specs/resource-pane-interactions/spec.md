## MODIFIED Requirements

### Requirement: Plugin manifest activation
Plugin row activation and the Open Plugin Manifest context action SHALL open the plugin's `.codex-plugin/plugin.json` file using the discovered manifest path when available. If the manifest cannot be opened, the extension SHALL report the exact attempted path instead of silently doing nothing. The context action SHALL resolve the selected tree element to its underlying plugin record before determining the manifest path.

#### Scenario: Activate plugin row
- **WHEN** the user clicks a plugin node
- **THEN** the plugin's `plugin.json` manifest opens in the text editor

#### Scenario: Open plugin manifest from context menu
- **WHEN** the user selects Open Plugin Manifest for a plugin
- **THEN** the same plugin manifest-opening command opens the plugin's `plugin.json` file

#### Scenario: Open manifest from a wrapped tree element
- **WHEN** the user selects Open Plugin Manifest from a Resources or Plugins tree item context menu
- **THEN** the command uses the plugin record embedded in the provider node and opens that plugin's discovered manifest

### Requirement: Panel context actions
Plugins and Skills dedicated rows SHALL expose the same tooltip and right-click context actions as their corresponding Resources rows, including plugin manifest opening, enablement, inspection, copy-path, and read-only protections. Commands invoked from those rows SHALL resolve provider wrapper nodes to their underlying resource records before performing actions.

#### Scenario: Shared plugin menu
- **WHEN** a plugin row is right-clicked in the Plugins panel
- **THEN** the menu entries and disabled states match the same plugin row in Resources

#### Scenario: Disable a wrapped plugin row
- **WHEN** an enabled plugin row is right-clicked in either Plugins or Resources and the user selects Disable Plugin
- **THEN** the command writes the disable override for that plugin's actual name, source, and scope
- **AND** the affected pane refreshes to show the disabled status

#### Scenario: Preserve direct resource command arguments
- **WHEN** an action is invoked with an underlying plugin, skill, or MCP record instead of a provider wrapper
- **THEN** the command uses that record directly and applies the same mutation and read-only protections
