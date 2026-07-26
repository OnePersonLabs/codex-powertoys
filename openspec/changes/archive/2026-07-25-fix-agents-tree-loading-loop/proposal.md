## Why

The VS Code Agents view never finishes loading when the Codex agents directory contains nested folders. Its recursive tree provider computes each folder's path relative to itself, causing the same folder to be emitted as its own child indefinitely; the view eagerly expands those folders and becomes stuck. The recursive agent discovery data is valid, so the fix belongs at the TreeView rendering boundary.

## What Changes

- Make recursive Agents TreeView children resolve against the original global or workspace agents root and the current node's stored relative path.
- Prevent a directory node from producing itself or ancestors as descendants.
- Keep global and workspace root nodes expanded while leaving nested directory nodes collapsed until the user opens them.
- Add regression coverage for nested agent directories and finite child enumeration.

## Capabilities

### New Capabilities

- `agent-tree-navigation`: Render finite, correctly scoped global and workspace agent trees, including nested directories and agent files.

### Modified Capabilities

<!-- No repository-level capability specs exist yet; this change introduces the explicit navigation contract for the existing Agents view. -->

## Impact

- `apps/vscode/src/extension.ts` Agents TreeDataProvider path calculation and expansion state.
- VS Code extension tests, with coverage for nested agent tree rendering.
- No changes to the core discovery API, agent file format, persisted configuration, or external dependencies.
