## Context

The extension renders plugins, MCPs, and skills through one `typedLabel` helper, but each discovery layer currently collapses shadowed records into a single state and the renderer independently adds workspace-specific exceptions. That loses the distinction between an enabled record superseded by another enabled record and a record superseded by a disabled winner. Workspace overrides also need to participate in winner selection even when they disable the higher-precedence record.

## Goals / Non-Goals

**Goals:**

- Apply one deterministic status-glyph matrix to plugins, MCPs, and skills.
- Preserve the existing source/scope precedence and make disabled higher-precedence records remain winners.
- Record whether a shadowed record was superseded by an enabled winner so rendering can select `☑️` versus `✖️`.
- Honor workspace explicit enablement over a global disablement for the same skill/config path and keep workspace plugin enablement independent from a different global item.
- Cover the matrix and representative cross-scope cases with automated tests.

**Non-Goals:**

- Change MCP tool permission glyphs (`✅`, `❌`, `✋`).
- Change which records are hidden by the superseded toggle or alter resource tree grouping.
- Add a new persisted configuration format.

## Decisions

1. **Centralize the four-way mapping.** Add a small core status-glyph helper and use it from discovery and the VS Code renderer. The helper maps active → `✅`, disabled/unavailable → `❌`, shadowed-by-enabled → `☑️`, and shadowed-by-disabled/unavailable → `✖️`. This avoids three subtly different implementations; keeping the decision in the renderer alone was rejected because core records also expose glyphs and need the same contract.

2. **Keep `effective` compatible and add winner metadata.** Retain `active`, `disabled`, `shadowed`, and `unavailable` so queueing/filtering behavior is unchanged. Add optional `shadowedByEnabled` metadata to records/states. A shadowed record sets it from the selected winner's effective availability, allowing the renderer to classify the logical outcome without looking up sibling records.

3. **Select winners before applying enablement.** Sort same-name records by the existing scope/source precedence, including disabled records, then derive each record's effective state. This lets a disabled workspace config/plugin supersede a global definition and produce a shadowed-disabled glyph for the overridden record. Records owned by an already-shadowed duplicate plugin remain shadowed by that plugin winner.

4. **Scope plugin overrides to their own level.** A workspace plugin's enabled state is read from workspace plugin overrides only; a global override for a different global item must not disable the workspace contribution. Global plugins continue to read global overrides.

5. **Treat workspace skill enablement as an explicit override.** A skill is disabled when the workspace setting is disabled, or when the global setting is disabled and the workspace setting is not explicitly enabled. This directly models the global-disabled/workspace-enabled case without changing unrelated path-based overrides.

## Risks / Trade-offs

- [Risk] Existing consumers may construct shadowed records without winner metadata. → Keep metadata optional and default an unknown shadowed winner to enabled (`☑️`), preserving the prior enabled-shadowed interpretation while all discovery paths populate it.
- [Risk] Including disabled records in winner selection changes which duplicate is considered effective. → Add cross-scope tests for disabled workspace config/plugin winners and verify MCP probing still excludes every non-active record.
- [Risk] Core and VS Code can drift if one path bypasses the helper. → Export the helper from core and make the renderer delegate to it; tests exercise all four states directly.
