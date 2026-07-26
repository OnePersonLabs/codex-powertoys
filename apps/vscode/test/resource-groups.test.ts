import test from "node:test";
import assert from "node:assert/strict";
import { visibleGroupKinds } from "../src/resource-groups.js";

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
