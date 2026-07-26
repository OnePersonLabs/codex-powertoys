## 1. Shared group-label implementation

- [x] 1.1 Update `apps/vscode/src/resource-groups.ts` so `resourceGroupLabel` returns plain `Plugins`, `MCPs`, `Skills`, and `Agents` names without leading emoji.
- [x] 1.2 Remove `RESOURCE_GROUP_ICONS` if repository-wide search confirms it has no remaining consumers; otherwise leave the export intact but unused by group-label composition.

## 2. Regression coverage

- [x] 2.1 Update `apps/vscode/test/resource-groups.test.ts` to assert exact plain labels for all four group kinds.
- [x] 2.2 Add or update source-contract assertions as needed to verify item-row status/type glyphs remain present and group visibility/order behavior is unchanged.

## 3. Verification

- [x] 3.1 Run the focused VS Code resource-group tests and the relevant package test suite.
- [x] 3.2 Run the TypeScript/build validation used by the repository and confirm no emoji-bearing group labels remain in applicable panel output.
