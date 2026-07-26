## 1. Command argument normalization

- [x] 1.1 Add a small VS Code command-boundary helper that accepts direct resource records and provider wrapper nodes, returning the underlying target for a requested resource key.
- [x] 1.2 Add focused tests covering wrapped plugin targets, direct plugin targets, and missing command arguments.

## 2. Context command integration

- [x] 2.1 Update skill enable/disable/reset handlers to normalize their tree command argument before calling core mutations.
- [x] 2.2 Update MCP edit/delete/tool-loading and enable/disable handlers to normalize their tree command argument while preserving read-only guards and explicit force-name behavior.
- [x] 2.3 Update plugin enable/disable/reset, manifest, and directory handlers to normalize their tree command argument before using plugin identity, scope, paths, or MCP names.

## 3. Refresh command safety

- [x] 3.1 Register Resources and Agents refresh commands through zero-argument adapters so view/menu arguments cannot be passed as the MCP force-name set.
- [x] 3.2 Preserve explicit internal `refreshAll(new Set(...))` calls for MCP edit and enable/plugin-enable re-query behavior.

## 4. Regression coverage and verification

- [x] 4.1 Extend VS Code source-contract tests to assert safe refresh registration and plugin-disable target normalization.
- [x] 4.2 Run the full repository build and test check and confirm all OpenSpec delta scenarios are represented by passing tests.
