## 1. Correct Agents tree traversal

- [x] 1.1 Extract or define a pure Agents child-enumeration helper that uses the original scope root and each directory node's normalized root-relative path.
- [x] 1.2 Integrate the helper into `AgentsProvider.getChildren()` so nested directories list only direct descendants and never recreate themselves or an ancestor.
- [x] 1.3 Preserve absolute `targetPath`, root-relative `relativePath`, and directory `entry.path` values for drag/drop and resource actions while correcting child generation.
- [x] 1.4 Keep Global and Workspace scope roots expanded by default and change nested agent directories to collapsed-by-default TreeItems.

## 2. Add regression coverage

- [x] 2.1 Add deterministic tests for nested global and workspace agent records, including direct files, deeper directories, and an assertion that no self/ancestor directory is emitted.
- [x] 2.2 Add coverage for the no-workspace case and the root-versus-directory expansion states.

## 3. Verify the extension change

- [x] 3.1 Run the focused Agents tree tests and the VS Code extension build.
- [x] 3.2 Run the existing core test suite to confirm recursive discovery and resource operations remain unchanged.
- [x] 3.3 Manually or smoke-test a workspace containing nested agent directories and confirm refresh completes and directory expansion shows finite children.
