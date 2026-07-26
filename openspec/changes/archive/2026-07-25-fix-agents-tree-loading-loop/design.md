## Context

The core agent catalog already walks both global and workspace agent roots recursively and returns each record with its absolute `rootPath` and root-relative `relativePath`. The VS Code `AgentsProvider` turns those records into native TreeView nodes. A directory node currently uses its own absolute path as the calculation root, then derives an empty relative path from that same path. Every nested directory therefore sees the complete scope record set again and can recreate itself as a child. Because directory nodes are initially expanded, the TreeView requests children indefinitely.

The fix is confined to presentation state. Agent discovery, TOML parsing, resource identities, and filesystem mutations remain unchanged.

## Goals / Non-Goals

**Goals:**

- Enumerate each global or workspace agent directory relative to the original scope root.
- Use the node's stored root-relative path to filter descendants and generate child directory/file paths.
- Guarantee that a directory cannot emit itself or an ancestor as a child.
- Expand only the two scope roots by default; let users expand nested folders on demand.
- Add deterministic regression coverage for nested directory enumeration and expansion state.

**Non-Goals:**

- Changing recursive discovery depth, supported agent file formats, or agent naming.
- Changing the core discovery API or persisted Codex configuration.
- Replacing the native VS Code TreeView with a webview or introducing a new dependency.

## Decisions

1. **Use the scope root plus node-relative path as the traversal coordinate.** For every `getChildren` call, resolve the original global/workspace root from the node scope and use `node.relativePath` (empty for a scope root) as the current parent. This preserves the invariant that `agent.relativePath` and the parent path share the same coordinate system. Computing a relative path by slicing the current node's absolute path is rejected because it loses the parent context and caused the loop.

2. **Keep directory nodes collapsed by default.** Scope roots remain expanded so users see the available top-level entries immediately. Nested folders are collapsible but start collapsed, avoiding a full recursive expansion during refresh while preserving normal navigation. This is complementary to, not a substitute for, correct path filtering.

3. **Test the path/grouping logic independently of VS Code runtime state.** Extract the small child-enumeration calculation into a pure helper (or otherwise expose an equivalent deterministic seam) and cover root, nested-directory, and terminal-file cases with synthetic `AgentRecord` values. Keep one extension smoke assertion for root expansion and directory collapse. This avoids depending on an interactive VS Code host for the regression.

4. **Preserve existing node identity and drag/drop semantics.** Absolute `targetPath`, root-relative `relativePath`, and `entry.path` remain populated for directory nodes so resource targeting, copy/move, and context actions continue to work after traversal is corrected.

## Risks / Trade-offs

- **[Risk] Existing expanded-tree state may change after upgrade** → Only nested directories change to collapsed defaults; users can still expand them, and scope roots retain the intended expanded entry point.
- **[Risk] Platform path separators differ** → Normalize agent record relative paths for comparison, but continue using Node's `join` for filesystem paths and node targets.
- **[Risk] A test seam drifts from the provider** → Keep the helper's input/output shape aligned with `Node` construction and cover the provider's expansion-state mapping in the extension smoke test.

## Migration Plan

No data migration is required. Ship the extension with the corrected provider; reopening or refreshing the Agents view reconstructs the finite tree from existing agent files. Rollback is limited to reverting the extension code and does not alter user state.

## Open Questions

None. The core discovery contract and intended recursive view behavior are already established by the completed inspector change.
