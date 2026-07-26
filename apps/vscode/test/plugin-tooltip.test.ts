import test from "node:test";
import assert from "node:assert/strict";
import { pluginTooltip } from "../src/plugin-tooltip.js";

const plugin = {
  name: "Acme Tools",
  root: "/workspace/.codex/plugins/acme-tools",
  scope: "workspace" as const,
  version: "1.2.3",
  enabled: true,
};

test("plugin tooltip identifies the plugin and uses a workspace-relative path", () => {
  assert.equal(
    pluginTooltip(plugin, "/workspace"),
    "Plugin: Acme Tools\nPath: ./.codex/plugins/acme-tools\nVersion: 1.2.3\nStatus: enabled",
  );
});

test("plugin tooltip keeps global plugin paths canonical", () => {
  assert.equal(
    pluginTooltip(
      { ...plugin, scope: "global", root: "/home/user/.codex/plugins/acme-tools" },
      "/workspace",
    ),
    "Plugin: Acme Tools\nPath: /home/user/.codex/plugins/acme-tools\nVersion: 1.2.3\nStatus: enabled",
  );
});

test("plugin tooltip does not relativize a workspace plugin outside the active workspace", () => {
  assert.equal(
    pluginTooltip(
      { ...plugin, root: "/other-project/.codex/plugins/acme-tools" },
      "/workspace",
    ),
    "Plugin: Acme Tools\nPath: /other-project/.codex/plugins/acme-tools\nVersion: 1.2.3\nStatus: enabled",
  );
});
