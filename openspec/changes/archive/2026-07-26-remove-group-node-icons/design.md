## Context

The VS Code extension centralizes Resources scope/plugin group labels in `apps/vscode/src/resource-groups.ts`; the same helper is consumed by the Resources tree in `extension.ts`. The helper currently prepends stable emoji to group names, while resource item labels independently render status and type glyphs. This change is presentation-only and must not alter group filtering, expansion, or item labels.

## Goals / Non-Goals

**Goals:**

- Make every group node label exactly `Plugins`, `MCPs`, `Skills`, or `Agents`.
- Apply the convention consistently wherever the shared group-label helper is used.
- Keep item-row status/type glyphs, group visibility, ordering, tooltips, commands, and expansion behavior unchanged.

**Non-Goals:**

- Do not remove icons from plugin, MCP, skill, agent, or loaded-tool resource rows.
- Do not change discovery models, filtering, superseded visibility, or panel contributions.
- Do not add a replacement icon, persisted setting, or migration.

## Decisions

1. **Remove the icon mapping from label composition.** Change `resourceGroupLabel` to return the existing human-readable name only. The `RESOURCE_GROUP_ICONS` constant should be removed if it has no remaining consumers, avoiding a stale source of truth.
2. **Keep the shared helper as the single presentation boundary.** Update the helper rather than editing individual tree providers, so Resources and any current/future panel using it remain consistent.
3. **Assert exact plain labels.** Update resource-group tests to cover all four kinds and verify no leading whitespace or emoji. Existing visibility tests remain unchanged.
4. **Treat item glyphs as a separate contract.** Do not modify typed item-label helpers or their tests; this keeps useful status/type distinctions on actionable rows.

## Risks / Trade-offs

- [Risk] A future caller may rely on `RESOURCE_GROUP_ICONS` directly → Mitigation: search all consumers before removal; retain the export only if another caller exists, but keep `resourceGroupLabel` icon-free.
- [Risk] Snapshot/source-contract tests may encode emoji-bearing labels → Mitigation: update only assertions that describe group labels and run the VS Code test suite.

## Migration Plan

No runtime migration is required. The change takes effect on the next extension build/reload; rollback is a one-line label-helper revert if needed.

## Open Questions

None.
