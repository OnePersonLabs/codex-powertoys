## Why

Group nodes currently prepend type emoji to `Plugins`, `MCPs`, `Skills`, and `Agents` in the Resources tree and dedicated panels. Those icons duplicate the group names, add visual noise, and make container rows compete with the status/type glyphs that are useful on actual resource items.

## What Changes

- Remove the leading emoji from all Plugins, MCPs, Skills, and Agents group-node labels in every applicable panel.
- Keep group names, ordering, visibility filtering, expansion behavior, and tooltips unchanged.
- Preserve status and type icons on resource rows, including plugin, MCP, skill, agent, and loaded-tool items.
- Update source-contract/unit coverage so group labels are asserted as plain names.

## Capabilities

### New Capabilities

<!-- No new capability is introduced. -->

### Modified Capabilities

- `unified-resource-tree`: group nodes use plain type names without leading emoji while resource-row glyphs remain unchanged.
- `resource-pane-interactions`: dedicated Plugins, MCPs, Skills, and Agents group labels follow the same plain-name convention.

## Impact

The shared VS Code resource-group label helper and its tests will change, along with the two affected OpenSpec capability deltas. No discovery, persistence, command, API, or dependency changes are expected.
