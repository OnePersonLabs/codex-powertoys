import test from "node:test";
import assert from "node:assert/strict";
import { resourceGroupLabel, visibleGroupKinds } from "../src/resource-groups.js";

test("scope groups keep Plugins but omit empty MCP and Skills groups", () => {
  assert.deepEqual(
    visibleGroupKinds({ plugins: true, mcps: false, skills: false }),
    ["plugins"],
  );
});

test("scope groups preserve the declared order for non-empty groups", () => {
  assert.deepEqual(
    visibleGroupKinds({ plugins: true, mcps: true, skills: true }),
    ["plugins", "mcps", "skills"],
  );
});

test("plugin child groups omit only empty resource groups", () => {
  assert.deepEqual(
    visibleGroupKinds({ plugins: false, mcps: true, skills: false }),
    ["mcps"],
  );
});

test("resource group labels use plain type names", () => {
  assert.equal(resourceGroupLabel("plugins"), "Plugins");
  assert.equal(resourceGroupLabel("mcps"), "MCPs");
  assert.equal(resourceGroupLabel("skills"), "Skills");
  assert.equal(resourceGroupLabel("agents"), "Agents");
});

test("group visibility can omit every empty group", () => {
  assert.deepEqual(
    visibleGroupKinds({ plugins: false, mcps: false, skills: false }),
    [],
  );
});
