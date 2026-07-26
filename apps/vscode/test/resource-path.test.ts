import test from "node:test";
import assert from "node:assert/strict";
import { tooltipPath } from "../src/resource-path.js";

test("workspace tooltip paths are relative to the active workspace", () => {
  assert.equal(
    tooltipPath("/workspace/.codex/plugins/example/plugin.json", "workspace", "/workspace"),
    "./.codex/plugins/example/plugin.json",
  );
});

test("global tooltip paths stay canonical", () => {
  assert.equal(
    tooltipPath("/home/user/.codex/skills/example/SKILL.md", "global", "/workspace"),
    "/home/user/.codex/skills/example/SKILL.md",
  );
});

test("workspace paths outside the active workspace stay canonical", () => {
  assert.equal(
    tooltipPath("/other-project/.codex/skills/example/SKILL.md", "workspace", "/workspace"),
    "/other-project/.codex/skills/example/SKILL.md",
  );
});
