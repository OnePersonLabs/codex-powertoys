## Why

The inspector currently presents overlapping and inconsistent views of agents, plugins, skills, and MCPs. Agents are duplicated between scoped resources and the dedicated panel, plugin discovery can surface versionless wrapper directories as duplicate plugins, and status glyph precedence is only applied to skills. This change makes every specialized panel predictable while preserving the rich filesystem-backed resource details users already rely on.

## What Changes

- Add Global and Workspace Agents groups to Resources, preserving recursive agent subdirectories and showing agent-file content on hover.
- Flatten the Agents panel into one alphabetical list, with concise scoped roots represented only in Resources and scope-aware path/content tooltips for each agent.
- Identify plugins only by discovered `.codex-plugin/plugin.json` manifests, excluding `.claude-plugin` manifests and wrapper directories that do not contain a manifest.
- Apply effective/shadowed/disabled/unavailable glyph precedence consistently to plugins, MCPs, skills, and plugin-owned records in Resources and dedicated panels.
- Add a dedicated collapsed-by-default Plugins panel with resource-equivalent expansion, tooltips, and context-menu behavior.
- Make the Skills panel expandable with resource-equivalent children, collapsed-by-default skill items, and matching tooltip/context-menu behavior.
- Order native panels as Resources, Plugins, MCPs, Skills, and Agents.

## Capabilities

### New Capabilities

### Modified Capabilities

- `unified-resource-tree`: add scoped Agents and consistent manifest-backed plugin discovery/status rendering.
- `resource-pane-interactions`: define Plugins and enhanced Skills/Agents dedicated panels, ordering, flattening, expansion, hover, and context-menu behavior.
- `agent-tree-navigation`: support recursive scoped resource rendering while flattening the dedicated Agents panel.

## Impact

The VS Code extension tree providers, panel registration/ordering, resource grouping and discovery in `packages/core`, plugin manifest scanning, shared status glyph logic, tooltip/context-menu helpers, and their unit tests are affected. No external API or persisted data format changes are expected.
