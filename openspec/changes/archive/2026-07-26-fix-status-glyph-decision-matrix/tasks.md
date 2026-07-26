## 1. Shared status model

- [x] 1.1 Add a shared core status-glyph helper for active, disabled/unavailable, shadowed-enabled, and shadowed-disabled outcomes.
- [x] 1.2 Extend resource state metadata so discovery records whether a shadowed item was superseded by an enabled winner.

## 2. Discovery precedence

- [x] 2.1 Update plugin discovery to let disabled higher-precedence workspace plugins win same-name groups and to keep workspace plugin enablement independent from global overrides.
- [x] 2.2 Update MCP discovery to select winners before enablement, propagate winner enablement metadata, and retain disabled/unavailable winners as effective blockers.
- [x] 2.3 Update skill discovery to honor workspace explicit enablement over global disablement, include disabled records in precedence selection, and propagate winner metadata.

## 3. VS Code rendering

- [x] 3.1 Make `statusGlyph` delegate to the shared matrix and remove the type-specific workspace-disabled exceptions.
- [x] 3.2 Update source-contract tests and any resource label expectations for the `☑️` enabled-shadowed and `✖️` disabled-shadowed cases.

## 4. Verification

- [x] 4.1 Add focused unit coverage for all four glyph outcomes and cross-scope/plugin cases across plugins, MCPs, and skills.
- [x] 4.2 Run core, CLI, and VS Code tests plus type/build checks.
