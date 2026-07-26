## 1. Core MCP probe and permission model

- [x] 1.1 Harden the core MCP JSON-RPC transports so notifications, errors, timeouts, child exit, and cleanup are handled without hanging.
- [x] 1.2 Extend MCP/tool types and discovery to carry effective tool-policy overlays, including plugin `config.toml` MCP policy.
- [x] 1.3 Implement deterministic permission-state derivation for allow/deny lists and approval modes, with unit coverage.
- [x] 1.4 Add core lifecycle tests proving successful and failed probes always close/kill owned transports and continue safely.

## 2. Background queue and shared provider state

- [x] 2.1 Implement an extension-owned sequential MCP tool cache/queue with success and failure entries, deduplication by effective MCP name, and forced re-query semantics.
- [x] 2.2 Seed the queue at activation/refresh and after MCP enablement; connect cache updates to both Resources and MCP providers without blocking discovery.
- [x] 2.3 Share MCP tool node construction, permission glyphs, tool descriptions, and collapsed expansion state across both providers.
- [x] 2.4 Ensure disabled, unavailable, shadowed, and duplicate superseded MCPs are never passively queued.

## 3. Tree presentation and tooltip behavior

- [x] 3.1 Treat MCP nodes and tools as nested-resource nodes in the Resources expansion state machine and preserve toolbar semantics.
- [x] 3.2 Change skill iconography to `💪`, simplify Resources root labels, and add full root-path tooltips.
- [x] 3.3 Add field-labelled MCP, plugin, skill, and tool tooltip builders with descriptions and skill `openai.yml` fields.
- [x] 3.4 Update MCP and tool context-menu/selection/Info behavior for feature parity in both panes.

## 4. Verification and OpenSpec delivery

- [x] 4.1 Add focused provider, queue, expansion, tooltip, and manifest regression tests plus documentation updates.
- [x] 4.2 Run the complete test/build/OpenSpec validation suite, mark tasks complete, sync delta specs, and archive the change.
- [x] 4.3 Commit and push the implementation, then run `pnpm run build-package-install`.
