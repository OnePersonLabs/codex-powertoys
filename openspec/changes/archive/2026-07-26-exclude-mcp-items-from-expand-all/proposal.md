## Why

The Resources panel's Expand All action currently expands MCP item nodes and their cached tool children. This makes the panel noisy and inconsistent with skill items, whose details remain collapsed until explicitly opened. Treating MCP items like skills keeps bulk expansion useful for navigating resource structure while avoiding a large, low-signal expansion of MCP contents.

## What Changes

- Update Resources Expand All behavior so MCP item nodes are excluded from bulk expansion, along with skill item nodes and their descendants.
- Keep Collapse All behavior recursive and unchanged: it collapses MCP, skill, and all other non-root expandable nodes while preserving expanded Global and Workspace roots.
- Preserve manual expansion and collapse of individual MCP nodes and their children.
- Add or update tests covering mixed resource trees and repeated Expand/Collapse toolbar actions.

## Capabilities

### New Capabilities

### Modified Capabilities

- `resource-pane-interactions`: Expand All must leave MCP item nodes and their supporting descendants collapsed, treating them the same as skill items.

## Impact

- Resources tree provider expansion-state handling and toolbar command behavior.
- Resource pane interaction tests and the existing `resource-pane-interactions` contract.
- No public API, storage, or dependency changes.
