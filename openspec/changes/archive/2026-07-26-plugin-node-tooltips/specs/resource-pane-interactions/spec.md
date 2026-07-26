## MODIFIED Requirements

### Requirement: Source-aware path tooltips
All resource and agent items in every tree pane SHALL expose their source path in the hover tooltip, including plugin-owned resources and loaded MCP tools. Plugin nodes SHALL identify the plugin by name. Global plugin nodes SHALL show the canonical absolute root; workspace plugin nodes SHALL show a path relative to the active workspace when the root is inside it, and SHALL fall back to the canonical absolute root otherwise.

#### Scenario: Hover path
- **WHEN** the user hovers a tree item
- **THEN** the tooltip contains the item's source path, with MCP tools identifying their parent MCP configuration path and plugin nodes identifying the plugin name
