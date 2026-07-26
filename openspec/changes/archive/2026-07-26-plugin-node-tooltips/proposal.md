## Why

Plugin rows previously exposed an unlabeled, raw root path in their hover tooltip. That made it harder to distinguish the plugin identity from its filesystem location and made workspace-installed plugins unnecessarily noisy. This reverse-engineered change records the already-uncommitted implementation so the resource-pane contract matches the shipped behavior.

## What Changes

- Identify plugin rows by name in their hover tooltip alongside version and enabled state.
- Display workspace plugin roots relative to the active workspace when they are inside it, while retaining canonical absolute paths for global or out-of-workspace plugins.
- Keep the tooltip formatting in a pure, tested helper and route plugin TreeItems through it.
- Update user-facing documentation and the resource-pane interaction requirement to describe the scope-aware path behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resource-pane-interactions`: make plugin tooltips identify the plugin and use workspace-relative roots for workspace plugins.

## Impact

- Affects the VS Code extension TreeItem renderer and its tooltip tests.
- Adds a small path-formatting helper with no core API or persisted-data changes.
- Updates README documentation and the main resource-pane specification.
