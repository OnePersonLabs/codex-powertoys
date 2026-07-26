## Context

The extension already shares one node/label model across the Resources, Plugins, Skills, and MCPs views, while core discovery returns records with scope, ownership, and effective state. The remaining gaps are presentation-level filtering and group labeling, plus MCP precedence: discovery currently chooses an enabled candidate before marking records effective, so a disabled config entry cannot supersede plugin definitions with the same name.

## Goals / Non-Goals

**Goals:**

- Make every visible type/group row identify its type with the stable emoji glyphs.
- Materialize only non-empty groups after filtering and after hiding superseded records.
- Keep plugin rows collapsed by default in Resources.
- Give Resources, Plugins, MCPs, and Skills independent show/hide-superseded toolbar state; Agents is unchanged.
- Resolve same-name MCP records by scope and source precedence before deriving effective glyphs and tool-queue eligibility.

**Non-Goals:**

- No persisted user preference or new configuration format for the toggle.
- No changes to agent discovery, agent-pane filtering, or MCP transport/tool protocol behavior.
- No removal of superseded records from discovery; they remain available when explicitly shown.

## Decisions

1. **Filter at each provider boundary.** Add a `showSuperseded` boolean to each resource-capable provider and filter records with `effective === "shadowed"` only when false. Group-presence calculations use the same filtered collections, preventing empty scope/plugin groups and preserving filter-aware ancestors. The toggle is a command per view with a single eye icon and a context key describing the current visibility.

2. **Use group-specific type labels.** Keep item labels in the shared `typedLabel` helper and add the same `TYPE_ICONS` mapping to logical group labels. Group labels have no status prefix; resource rows retain their status glyph followed by the type glyph.

3. **Classify plugins as nested resources for default expansion.** Resources registration passes `nestedResource: true` for plugin nodes, while group/root nodes remain expanded. Dedicated Plugins already uses its own expansion state and will explicitly register plugin rows as collapsed.

4. **Compute MCP precedence in two phases.** First group same-name records and select the winner by scope (workspace before global) and source (config before plugin) without excluding disabled config records. Then assign `active`, `disabled`, `unavailable`, or `shadowed` to every record. A disabled config winner is `disabled`/❌; all plugin definitions it overrides are `shadowed`/✖️ and are excluded from passive tool probing.

5. **Keep raw records and source paths intact.** Superseded rows retain their original IDs, config paths, plugin ownership, and read-only behavior so inspection and the explicit toggle remain truthful.

## Risks / Trade-offs

- [Risk] Hiding superseded rows may make a duplicate appear to disappear after refresh → Mitigation: the toolbar toggle is available in every applicable pane and its state is reset only by provider recreation, not ordinary refresh.
- [Risk] A disabled higher-precedence MCP could accidentally be probed → Mitigation: queue eligibility continues to require `effective === "active"`, `enabled`, and `pluginEnabled`.
- [Risk] Existing source-based tests may assume Plugins is always present → Mitigation: update group tests to cover empty plugin scopes and retain non-empty ordering assertions.
