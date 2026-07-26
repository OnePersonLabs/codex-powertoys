## Context

The core package already contains a small MCP JSON-RPC loader and both VS Code tree providers already hold tool maps, but loading is manual, failures are not retained, and tool nodes are rendered differently across panes. Codex MCP configuration supports server `enabled_tools`/`disabled_tools`, `default_tools_approval_mode`, and per-tool `tools.<tool>.approval_mode`; plugin-provided MCPs use the corresponding `plugins.<plugin>.mcp_servers.<server>` tables.

## Goals / Non-Goals

**Goals:**

- Make enabled MCP tools discoverable without blocking tree rendering.
- Guarantee no probe leaves a child process or transport alive.
- Share one tool result/permission model and one tree rendering path between Resources and MCPs.
- Make failures observable and non-retried until an explicit refresh/re-query request.
- Keep skill/MCP expansion policy predictable and preserve existing read-only/context-menu behavior.

**Non-Goals:**

- No persistent disk cache, tool invocation, or mutation of MCP configuration.
- No attempt to infer read-only behavior from an MCP tool's prose; only explicit Codex policy values affect the glyph.
- No change to the MCP protocol beyond the existing initialize/`tools/list` probe.

## Decisions

- **Use an extension-owned sequential queue and in-memory cache.** `McpToolCache` owns a FIFO queue, one worker promise, and records keyed by logical MCP name. Refresh enqueues only currently effective enabled MCPs without a cache entry; enablement and explicit Load MCP Tools enqueue forced re-queries. Duplicate names are reduced to the effective winner already selected by core discovery, with workspace managed records taking precedence over global managed records and plugin records as a final tie-breaker. A cached failure is a real cache entry, so passive refreshes do not repeatedly start a broken server.
- **Share immutable result metadata.** Cache entries contain `status: "ready" | "failed"`, tools, diagnostics, and a generation. Providers receive the same `McpTool` records and render children through a shared `mcpToolNode` helper. A failed result renders no authoritative partial children but remains available for an MCP tooltip/diagnostic and can be replaced by an explicit re-query.
- **Keep probing in core with strict ownership.** `loadMcpTools` owns transports it creates, sends notifications without waiting for a response, handles JSON-RPC errors, and always closes HTTP sessions or terminates stdio children in `finally`. Existing injected transports remain caller-owned for focused tests. The queue catches failures so one MCP cannot stop later queue entries.
- **Map permission state conservatively.** `disabled_tools` wins over `enabled_tools`; a tool absent from a non-empty allow list is denied. Otherwise `approval_mode = auto` is ✅, while `prompt`, `writes`, `approve`, missing, or unknown modes are ✋ because they can require user approval. Plugin/server overrides are merged by the effective MCP identity before rendering.
- **Use field-labelled tooltip builders.** Tooltips are assembled from non-empty `Field: value` lines. Tools begin with `Tool` and `Description`; MCPs add `Description` after existing source/status fields; plugins add `Description`; skills include `Description`, then `Display Name`, `Short Description`, and `Default Prompt` from `agents/openai.yml` when present. Root nodes are labelled only `Global`/`Workspace` and expose their full path through the same formatter.
- **Extend the existing expansion classifier.** `skillRelated` becomes `nestedResource` for individual skills, skill entries, individual MCPs, and MCP tools. Roots/groups/plugins remain expanded by default; MCP and skill internals remain collapsed. Toolbar actions use the same three-state logic while considering both kinds of nested resources.

## Risks / Trade-offs

- [A slow or misbehaving MCP can delay later probes] → Process one at a time with per-server timeout, continue after failure, and keep the UI responsive while the queue drains.
- [A server may emit non-JSON logs or malformed JSON-RPC responses] → Ignore unrelated stdout lines, surface structured diagnostics, reject error responses, and always run cleanup.
- [A config refresh changes MCP IDs or effective precedence] → Replace the active record map on refresh, enqueue only effective enabled winners, and key cache lookup by stable logical name with current record identity retained in the entry.
- [Permission defaults can be unknown to this extension] → Treat unknown and write-sensitive modes as approval-required rather than claiming unconditional permission.
- [Tool results arrive after a provider refresh] → Providers update both maps from the cache callback and fire tree-data events; stale entries are ignored when the current MCP identity no longer matches.

## Migration Plan

No migration is required. The in-memory cache starts empty on activation; refresh or enablement changes seed it. Reverting the extension restores manual tool loading and the previous labels without changing user configuration.

## Open Questions

- Streamable HTTP servers may require a future session-aware transport; this change preserves the current request/response probe and treats completed HTTP requests as disconnected during cleanup.
