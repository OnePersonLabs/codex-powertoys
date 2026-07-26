## Why

Resource status labels currently treat every shadowed record as disabled (`✖️`), and the extension never emits the enabled-but-shadowed glyph (`☑️`). This obscures whether a superseded plugin, MCP, or skill is itself enabled and makes global/workspace override behavior difficult to understand.

## What Changes

- Define one status-glyph decision matrix for plugins, MCPs, and skills.
- Render `✅` only for the enabled record that wins same-name precedence.
- Render `☑️` for enabled records that lose precedence to another record.
- Render `❌` for records disabled by their own applicable configuration.
- Render `✖️` for disabled records that are also shadowed by a higher-precedence record.
- Preserve workspace-over-global precedence and workspace-plugin enablement semantics across all supported resource types.
- Add focused coverage for the complete enabled/disabled and active/shadowed combinations.

## Capabilities

### New Capabilities

### Modified Capabilities

- `unified-resource-tree`: Clarify effective status glyphs for enabled, disabled, and shadowed resource records across every resource type.

## Impact

- `apps/vscode/src/extension.ts` status label rendering.
- Core discovery state/glyph derivation in `packages/core/src/plugins.ts`, `packages/core/src/mcp.ts`, and `packages/core/src/skills.ts` as needed to preserve the distinction before rendering.
- Core and VS Code tests plus the unified resource-tree delta spec.
