## 1. OpenSpec and model contracts

- [x] 1.1 Add and validate the unified-tree, resource-pane, and MCP precedence delta requirements.
- [x] 1.2 Document the provider visibility state, typed group labels, collapsed plugin defaults, and two-phase MCP precedence design.

## 2. Core discovery

- [x] 2.1 Update MCP candidate selection so disabled config records can win precedence and plugin records are marked shadowed with `shadowedBy`.
- [x] 2.2 Add regression coverage for matching config/plugin MCP names, disabled winners, scope precedence, and probe eligibility.

## 3. VS Code resource panes

- [x] 3.1 Add typed glyphs to all applicable group labels and omit empty plugin/scope groups using the visible filtered set.
- [x] 3.2 Add independent show/hide-superseded state and toolbar commands for Resources, Plugins, MCPs, and Skills, excluding Agents.
- [x] 3.3 Make Resources plugin nodes collapsed by default while preserving existing group/root and dedicated-pane expansion behavior.
- [x] 3.4 Correct status glyph selection so shadowed records render ✖️ and disabled winners render ❌ consistently.

## 4. Verification

- [x] 4.1 Update/add unit and source-contract tests for group visibility, toggles, expansion defaults, and glyphs.
- [ ] 4.2 Run package tests, TypeScript build, `pnpm run build-package-install`, then review the final diff and git state.
