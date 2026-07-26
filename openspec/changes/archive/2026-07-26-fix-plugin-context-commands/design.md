## Context

The VS Code extension uses `Node` objects as the elements returned by its native TreeDataProviders. A `Node` keeps the rendered kind, parent context, and the underlying `plugin`, `skill`, or `mcp` record. Commands declared in `view/item/context` receive that provider element, whereas row activation commands explicitly pass the underlying record in `TreeItem.command.arguments`.

Several context-command handlers were typed and implemented as if they always received raw core records. In particular, plugin enable/disable/reset passed a `Node` into `setPluginEnabled`, so the mutation code read missing `name`, `source`, and `configKey` fields. The refresh command was registered directly to `refreshAll`, allowing any command argument supplied by a view to flow into the `ReadonlySet` parameter used by `McpToolCache.enqueueEnabled`.

The fix is constrained to the VS Code command boundary. Core discovery and mutation APIs remain the source of truth, and the existing refresh pipeline continues to accept explicit MCP-name sets from internal callers.

## Goals / Non-Goals

**Goals:**

- Normalize both wrapped tree elements and direct resource records before context actions use them.
- Make plugin disable/enable/reset and plugin manifest/directory actions work from both Resources and Plugins views.
- Apply the same boundary normalization to skill and MCP context actions that receive the same wrapper shape.
- Ensure refresh commands always invoke the no-argument refresh path and never reinterpret VS Code menu arguments as force-name state.
- Preserve current scope, read-only, cache, and refresh behavior after a successful mutation.

**Non-Goals:**

- Do not change the `Node` model, TreeDataProvider hierarchy, or VS Code manifest menu contributions.
- Do not change core `setPluginEnabled`, skill, MCP, discovery, or persistence APIs.
- Do not alter the semantics of explicit `refreshAll(new Set(...))` calls used to force MCP re-queries.
- Do not add user-facing configuration, migration, or new dependencies.

## Decisions

1. **Normalize at the command boundary.** Add one small generic helper that accepts an unknown command argument and a resource property key, returning the embedded record for wrapper nodes or the value itself for direct record arguments. This keeps provider data structures intact and avoids duplicating shape checks in every handler.

   Alternatives considered:
   - Change every provider to return raw records: rejected because the tree needs wrapper metadata such as node kind, parent, target path, and nested context.
   - Encode resource arguments in every `package.json` context menu contribution: rejected because VS Code supplies the provider element to `view/item/context` commands by API contract; manifest changes would not solve the shared mismatch.

2. **Use zero-argument refresh adapters.** Register `codexPowerToys.refresh` and `codexPowerToys.refreshAgents` with `() => refreshAll()` while retaining the typed `refreshAll(forceMcpNames)` function for internal callers that intentionally pass a `Set`.

   Alternatives considered:
   - Make `refreshAll` validate or coerce arbitrary values: rejected because it would hide an invocation-boundary error and weaken the internal `ReadonlySet` contract.
   - Remove the force-name parameter: rejected because edit and enable actions rely on explicit forced MCP tool re-queries.

3. **Cover the regression at both helper and integration-contract levels.** Unit-test wrapped/direct target normalization, and keep source-contract assertions for the refresh registrations and plugin-disable handler. This matches the extension test strategy, which does not load the real VS Code host in unit tests.

## Risks / Trade-offs

- [Risk] A future command may introduce a different wrapper property or bypass the helper. → Mitigation: keep the helper local and obvious at the command boundary, and extend source-contract tests when adding new resource context commands.
- [Risk] Passing an invalid or missing command argument becomes a no-op rather than a user-visible error. → Mitigation: VS Code supplies valid elements for enabled context menu entries; the guard prevents malformed command invocations from corrupting configuration or throwing unrelated property errors.
- [Risk] Source-regex tests can miss runtime wiring mistakes. → Mitigation: the helper has direct behavior tests, and the full repository build/test command runs on every change.

## Migration Plan

No data migration or rollout step is required. Rebuild/reload the extension to pick up the command-boundary changes. Existing incorrectly written overrides, if any, are not automatically removed; users can reset the affected plugin override through the now-functional Reset Plugin command. Rollback is limited to reverting the extension command/helper changes.

## Open Questions

None.
