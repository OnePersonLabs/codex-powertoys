import test from "node:test";
import assert from "node:assert/strict";
import type { PluginRecord } from "@codex-powertoys/core";
import { unwrapCommandTarget } from "../src/resource-command-target.js";

function plugin(): PluginRecord {
  return {
    id: "plugin-id",
    name: "expo",
    root: "/tmp/expo",
    scope: "global",
    source: "registry",
    enabled: true,
    effective: "active",
    glyph: "✅",
    diagnostics: [],
    skillPaths: [],
    mcpNames: ["expo-mcp"],
  };
}

test("unwraps resource targets passed by tree context menus", () => {
  const value = plugin();

  assert.equal(
    unwrapCommandTarget<PluginRecord>({ kind: "plugin", plugin: value }, "plugin"),
    value,
  );
  assert.equal(unwrapCommandTarget<PluginRecord>(value, "plugin"), value);
  assert.equal(unwrapCommandTarget<PluginRecord>(undefined, "plugin"), undefined);
});
