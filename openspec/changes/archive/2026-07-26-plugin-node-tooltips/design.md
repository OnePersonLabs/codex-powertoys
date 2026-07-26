## Context

The VS Code extension renders plugin records through the shared TreeItem factory. Plugin records already carry an absolute `root`, scope, name, version, and enabled state, but the previous tooltip treated the root as an unlabeled first line and did not distinguish workspace paths from global paths. The implementation already present in the worktree introduces a pure formatter and routes plugin nodes through it.

## Goals / Non-Goals

**Goals:**

- Keep plugin identity, location, version, and status readable in one tooltip.
- Use a workspace-root-relative path for workspace plugins contained by the active workspace.
- Preserve absolute paths for global plugins, missing workspace roots, and workspace plugins outside the active workspace.
- Test path-boundary and scope behavior independently from VS Code APIs.

**Non-Goals:**

- No changes to plugin discovery, plugin identity, enablement, or filesystem ownership.
- No changes to copy-path commands or tooltips for non-plugin nodes.
- No new dependencies or persisted configuration.

## Decisions

- **Use a dedicated pure formatter.** `plugin-tooltip.ts` accepts the plugin fields needed for presentation and an optional workspace root, returning a deterministic multiline string. This keeps path policy out of the VS Code TreeItem factory and makes it directly testable without a VS Code host.
- **Relativize only workspace-scoped paths inside the workspace.** A `path.relative` result is accepted only when it is not an ancestor escape or absolute path. The result is normalized to `/` separators and prefixed with `./`; all other cases retain the plugin's canonical root.
- **Make identity explicit.** The tooltip starts with `Plugin: <name>` and labels the location as `Path: <path>`, followed by optional version and status lines. The visible row label remains the existing status/type/name label.

## Risks / Trade-offs

- [Workspace path casing or separator differences] → Use Node's platform-native `relative` and normalize only the displayed relative result.
- [A plugin root outside the workspace is accidentally shortened] → Reject `..` escapes and absolute relative results before formatting.
- [Tooltip format drift] → Keep direct formatter tests for workspace, global, and out-of-workspace cases.

## Migration Plan

No migration is required. The formatter is used on the next extension activation; existing plugin records and paths remain unchanged. Reverting the extension change restores the previous tooltip format.
