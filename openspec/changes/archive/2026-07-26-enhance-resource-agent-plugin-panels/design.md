## Context

The extension has one hierarchical Resources provider plus dedicated Skills, MCPs, and Agents providers. Discovery already returns scoped records and nested supporting files, but each provider duplicates rendering rules. Plugin discovery also sees both a package wrapper and its versioned manifest directory, while status glyph calculation differs between resource types. The requested behavior spans discovery, shared tree rendering, panel registration, and context-menu/tooltip contracts.

## Goals / Non-Goals

**Goals:**

- Use one manifest-backed plugin identity and one shared effective-state glyph function everywhere.
- Reuse the existing resource node model and interaction commands for Plugins, Skills, MCPs, and Agents.
- Keep Resources scoped and recursive while making specialized panels flat where requested.
- Preserve plugin read-only protections, MCP tool loading, filtering, copy-path actions, and workspace/global provenance.
- Make panel order and expansion defaults deterministic and covered by tests.

**Non-Goals:**

- Changing the on-disk plugin, skill, MCP, or agent formats.
- Adding new enablement persistence or changing precedence semantics beyond applying the existing effective-state model uniformly.
- Loading MCP tools synchronously or introducing a second discovery cache.

## Decisions

1. **Manifest path is the plugin identity.** `discoverPlugins` will emit one record per unique `.codex-plugin/plugin.json` file, deduplicated by canonical manifest path; `.claude-plugin/plugin.json` is ignored. Wrapper directories without that file are never emitted. This is preferable to deduplicating by display name because versioned packages can legitimately share a name while only the manifest establishes ownership.

2. **Centralize status glyph precedence.** Add a shared formatter that maps effective `active` to ✅, `shadowed` to ☑️, disabled workspace-over-global to ✖️, and all remaining inactive/unavailable states to ❌. Plugin, MCP, skill, and plugin-owned records call it from both Resources and dedicated providers. Tool permission glyphs remain a separate policy formatter.

3. **Reuse a generic resource tree renderer.** Dedicated plugin and skill rows wrap the same `ResourceRecord`/supporting-child model used by Resources. Their roots are flat and alphabetically sorted, but expandable resource rows delegate child enumeration to the same provider helpers, preserving tooltips and context values.

4. **Keep scope roots only in Resources.** Resources renders `Global` and `Workspace` roots with absolute-path tooltips. Agents Resources groups mirror recursive agent directories, while the Agents provider flattens all agent files across scopes into one alphabetical list and uses scope-aware relative-path/content tooltips.

5. **Register panels in manifest order.** `package.json` contributes views in the exact order Resources, Plugins, MCPs, Skills, Agents. Providers use collapsed-by-default item state for plugin and skill rows; Resources retains its existing per-node expansion state.

6. **Preserve command/context contracts.** Dedicated rows use the same `codexPlugin`, `codexSkill`, `codexMcp`, `codexAgent`, scope, enabled, and read-only context keys as Resources, so existing menus and guards continue to apply. Any new panel-specific commands are aliases to shared handlers rather than parallel mutations.

## Risks / Trade-offs

- [Risk] Existing tests may encode the old plugin wrapper path or panel order → update fixtures to assert manifest paths and explicit order.
- [Risk] Flattened Agents can contain same-named files from both scopes → sort by display name then canonical path and retain both records with distinct paths/tooltips.
- [Risk] Reusing expansion state across providers can leak stale node keys → key state by provider and canonical identity, and clear it on refresh.
- [Risk] A malformed manifest could hide a plugin silently → keep the existing structured discovery diagnostics and only deduplicate successfully resolved manifest files.

## Migration Plan

No data migration is required. Ship the discovery/rendering changes together, refresh all providers after activation, and retain existing configuration files. Rollback is a code rollback; on-disk resources are untouched.
