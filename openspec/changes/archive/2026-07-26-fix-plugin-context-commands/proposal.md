## Why

The unified VS Code tree passes wrapper `Node` objects to item context commands, but several handlers expected the underlying resource records. As a result, disabling a plugin could write an override using undefined wrapper fields and appear to do nothing. The refresh command also accepted incidental menu arguments as its MCP force-name set, causing `forceNames.has is not a function` instead of refreshing the panes.

## What Changes

- Normalize tree context-command arguments to their underlying plugin, skill, and MCP records before invoking mutation, inspection, tool-loading, manifest, or directory actions.
- Register refresh commands through zero-argument wrappers so VS Code menu arguments cannot be interpreted as MCP refresh state.
- Keep plugin disable, enable, reset, manifest, and directory actions functional in both Resources and Plugins views.
- Add regression coverage for wrapped and direct command targets and for the refresh/disable command wiring.

## Capabilities

### New Capabilities

<!-- No new capability is introduced. -->

### Modified Capabilities

- `resource-pane-interactions`: context-menu actions must operate on the selected resource records rather than provider wrapper nodes, and refresh actions must remain safe when invoked by VS Code views.
- `unified-resource-tree`: unified-tree mutation and refresh commands must preserve resource identity, scope, and status updates when invoked from wrapped tree elements.

## Impact

The VS Code extension command boundary and its tests are affected, primarily `apps/vscode/src/extension.ts` plus a small target-normalization helper and regression tests. No core discovery, persistence, public API, dependency, or configuration format changes are required. Existing unrelated OpenSpec work remains out of scope.
