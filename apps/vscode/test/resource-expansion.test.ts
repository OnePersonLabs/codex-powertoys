import test from "node:test";
import assert from "node:assert/strict";
import {
  ResourceExpansionState,
  type ExpansionNode,
} from "../src/resource-expansion.js";

const node = (id: string, skillRelated = false): ExpansionNode => ({
  id,
  skillRelated,
});

test("default expansion expands containers and collapses skills", () => {
  const state = new ResourceExpansionState();
  assert.equal(state.register(node("group")), true);
  assert.equal(state.register(node("skill", true)), false);
  assert.equal(state.register(node("entry", true)), false);
  assert.equal(state.toolbarAction(), "expandAll");
});

test("collapse action collapses every known node", () => {
  const state = new ResourceExpansionState();
  state.register(node("group"));
  state.register(node("skill", true));
  state.setPotentialSkillCount(1);

  assert.equal(state.toolbarAction(), "expandAll");
  state.apply("collapseAll");
  assert.equal(state.isExpanded(node("group")), false);
  assert.equal(state.isExpanded(node("skill", true)), false);
  assert.equal(state.toolbarAction(), "expandNonSkills");
});

test("expand from fully collapsed leaves skill nodes collapsed", () => {
  const state = new ResourceExpansionState();
  state.register(node("group"));
  state.register(node("skill", true));
  state.apply("collapseAll");

  state.applyToolbarAction();
  assert.equal(state.isExpanded(node("group")), true);
  assert.equal(state.isExpanded(node("skill", true)), false);
  assert.equal(state.toolbarAction(), "expandAll");
});

test("expand from a partially collapsed tree preserves skill state", () => {
  const state = new ResourceExpansionState();
  state.register(node("group"));
  state.register(node("plugin"));
  state.register(node("skill", true));
  state.setPotentialSkillCount(1);
  state.setNodeExpanded(node("plugin"), false);
  state.setNodeExpanded(node("skill", true), true);

  assert.equal(state.toolbarAction(), "expandNonSkills");
  state.applyToolbarAction();
  assert.equal(state.isExpanded(node("group")), true);
  assert.equal(state.isExpanded(node("plugin")), true);
  assert.equal(state.isExpanded(node("skill", true)), true);
  assert.equal(state.toolbarAction(), "collapseAll");
});

test("expand all is offered when only skills remain collapsed", () => {
  const state = new ResourceExpansionState();
  state.register(node("group"));
  state.register(node("skill", true));
  state.setPotentialSkillCount(1);

  state.setNodeExpanded(node("group"), true);
  assert.equal(state.toolbarAction(), "expandAll");
  state.applyToolbarAction();
  assert.equal(state.isExpanded(node("skill", true)), true);
  assert.equal(state.toolbarAction(), "collapseAll");
});

test("reset restores the initial expansion policy after refresh", () => {
  const state = new ResourceExpansionState();
  state.register(node("group"));
  state.register(node("skill", true));
  state.apply("expandAll");

  state.reset();
  assert.equal(state.register(node("group")), true);
  assert.equal(state.register(node("skill", true)), false);
  assert.equal(state.toolbarAction(), "expandAll");
});

test("rematerializing excludes filtered-out nodes from toolbar state", () => {
  const state = new ResourceExpansionState();
  state.register(node("hidden-group"));
  state.setNodeExpanded(node("hidden-group"), false);
  state.resetMaterializedNodes();
  state.setPotentialSkillCount(0);

  assert.equal(state.toolbarAction(), "collapseAll");
});
