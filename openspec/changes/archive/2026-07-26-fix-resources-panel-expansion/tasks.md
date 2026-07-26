## 1. Expansion state model

- [x] 1.1 Replace the ambiguous `ExpansionMode` and potential nested-count logic with explicit root/skill metadata, a collapsed or expanded-non-skill materialization policy, and stable per-node state.
- [x] 1.2 Implement two-state toolbar derivation and toolbar application so roots are always expanded, collapse affects every non-root node, and expand excludes skill nodes and supporting descendants.

## 2. Resources provider integration

- [x] 2.1 Register Resources roots and skill-related nodes with the new metadata and initialize only Global/Workspace as expanded; remove obsolete potential-count updates.
- [x] 2.2 Ensure programmatic toolbar commands and native TreeView expand/collapse events refresh the provider and synchronize the Resources toolbar context.

## 3. Regression coverage and verification

- [x] 3.1 Replace outdated expansion-state unit tests with initial, root, mixed, repeated-toggle, rematerialization, and skill-descendant scenarios.
- [x] 3.2 Update source-wiring assertions as needed, run the focused VS Code tests and full package checks, then run `pnpm run build-package-install`.
