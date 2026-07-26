import test from "node:test";
import assert from "node:assert/strict";
import {
  ResourceExpansionState,
  type ExpansionNode,
} from "../src/resource-expansion.js";

const node = (
  id: string,
  options: Pick<ExpansionNode, "root" | "skillRelated" | "initiallyExpanded"> = {},
): ExpansionNode => ({ id, ...options });

test("Resources start with only Global and Workspace expanded", () => {
  const state = new ResourceExpansionState();
  assert.equal(state.register(node("global", { root: true, initiallyExpanded: true })), true);
  assert.equal(state.register(node("workspace", { root: true, initiallyExpanded: true })), true);
  assert.equal(state.register(node("group", { initiallyExpanded: false })), false);
  assert.equal(state.register(node("skill", { skillRelated: true, initiallyExpanded: false })), false);
  assert.equal(state.toolbarAction(), "expandNonSkills");
});

test("Expand opens non-skill nodes and keeps skill descendants collapsed", () => {
  const state = new ResourceExpansionState();
  state.register(node("global", { root: true, initiallyExpanded: true }));
  state.register(node("workspace", { root: true, initiallyExpanded: true }));
  state.register(node("plugin", { initiallyExpanded: false }));
  state.register(node("mcp", { initiallyExpanded: false }));
  state.register(node("skill", { skillRelated: true, initiallyExpanded: false }));
  state.register(node("skill-entry", { skillRelated: true, initiallyExpanded: false }));

  state.applyToolbarAction();

  assert.equal(state.isExpanded(node("global", { root: true })), true);
  assert.equal(state.isExpanded(node("workspace", { root: true })), true);
  assert.equal(state.isExpanded(node("plugin")), true);
  assert.equal(state.isExpanded(node("mcp")), true);
  assert.equal(state.isExpanded(node("skill", { skillRelated: true })), false);
  assert.equal(state.isExpanded(node("skill-entry", { skillRelated: true })), false);
  assert.equal(state.toolbarAction(), "collapseAll");
});

test("Collapse closes every non-root node and re-expands roots", () => {
  const state = new ResourceExpansionState();
  const global = node("global", { root: true, initiallyExpanded: true });
  const workspace = node("workspace", { root: true, initiallyExpanded: true });
  const plugin = node("plugin", { initiallyExpanded: false });
  const skill = node("skill", { skillRelated: true, initiallyExpanded: false });
  state.register(global);
  state.register(workspace);
  state.register(plugin);
  state.register(skill);
  state.apply("expandNonSkills");
  state.setNodeExpanded(skill, true);

  assert.equal(state.toolbarAction(), "collapseAll");
  state.applyToolbarAction();

  assert.equal(state.isExpanded(global), true);
  assert.equal(state.isExpanded(workspace), true);
  assert.equal(state.isExpanded(plugin), false);
  assert.equal(state.isExpanded(skill), false);
  assert.equal(state.toolbarAction(), "expandNonSkills");
});

test("Collapsing a root does not switch the toolbar to Collapse", () => {
  const state = new ResourceExpansionState();
  const global = node("global", { root: true, initiallyExpanded: true });
  const workspace = node("workspace", { root: true, initiallyExpanded: true });
  state.register(global);
  state.register(workspace);
  state.setNodeExpanded(global, false);

  assert.equal(state.toolbarAction(), "expandNonSkills");
  state.applyToolbarAction();
  assert.equal(state.isExpanded(global), true);
  assert.equal(state.isExpanded(workspace), true);
});

test("Repeated toolbar actions normalize a manually expanded plugin skill", () => {
  const state = new ResourceExpansionState();
  const global = node("global", { root: true, initiallyExpanded: true });
  const plugin = node("plugin", { initiallyExpanded: false });
  const skill = node("plugin-skill", { skillRelated: true, initiallyExpanded: false });
  state.register(global);
  state.register(plugin);
  state.register(skill);
  state.setNodeExpanded(plugin, true);
  state.setNodeExpanded(skill, true);
  state.setNodeExpanded(plugin, false);

  assert.equal(state.toolbarAction(), "collapseAll");
  state.applyToolbarAction();
  assert.equal(state.isExpanded(global), true);
  assert.equal(state.isExpanded(plugin), false);
  assert.equal(state.isExpanded(skill), false);
  assert.equal(state.toolbarAction(), "expandNonSkills");

  state.applyToolbarAction();
  assert.equal(state.isExpanded(global), true);
  assert.equal(state.isExpanded(plugin), true);
  assert.equal(state.isExpanded(skill), false);
  assert.equal(state.toolbarAction(), "collapseAll");
});

test("Materialized nodes follow the latest toolbar policy", () => {
  const state = new ResourceExpansionState();
  state.register(node("global", { root: true, initiallyExpanded: true }));
  state.register(node("plugin", { initiallyExpanded: false }));
  state.register(node("skill", { skillRelated: true, initiallyExpanded: false }));
  state.applyToolbarAction();
  state.resetMaterializedNodes();

  assert.equal(state.register(node("plugin-2", { initiallyExpanded: false })), true);
  assert.equal(state.register(node("skill-2", { skillRelated: true })), false);
});

test("Dedicated-pane legacy defaults remain available", () => {
  const state = new ResourceExpansionState();
  assert.equal(state.register({ id: "group", nestedResource: false }), true);
  assert.equal(state.register({ id: "plugin", nestedResource: true }), false);
});
