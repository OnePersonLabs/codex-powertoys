import test from "node:test";
import assert from "node:assert/strict";
import type { McpRecord, McpTool, SkillRecord } from "@codex-powertoys/core";
import {
  mcpToolTooltip,
  mcpTooltip,
  rootTooltip,
  skillTooltip,
} from "../src/resource-tooltip.js";

const mcp: McpRecord = {
  id: "global:mcp",
  name: "demo",
  scope: "global",
  sourceKind: "config",
  configPath: "/home/user/.codex/config.toml",
  config: { description: "Demo MCP" },
  enabled: true,
  pluginEnabled: true,
  effective: "active",
  sourceRange: {
    path: "/home/user/.codex/config.toml",
    startLine: 4,
    endLine: 4,
  },
  diagnostics: [],
};

test("MCP and tool tooltips use labelled fields and descriptions", () => {
  assert.equal(
    mcpTooltip(mcp),
    [
      "MCP: demo",
      "Path: /home/user/.codex/config.toml",
      "Line: 5",
      "Status: active",
      "Description: Demo MCP",
    ].join("\n"),
  );
  const tool: McpTool = {
    name: "search",
    description: "Search documents",
    permissionGlyph: "✅",
  };
  assert.equal(
    mcpToolTooltip(tool, mcp),
    [
      "Tool: search",
      "Description: Search documents",
      "MCP: demo",
      "Path: /home/user/.codex/config.toml",
    ].join("\n"),
  );
});

test("skill and root tooltips preserve metadata order and full roots", () => {
  const skill = {
    id: "skill",
    name: "demo-skill",
    description: "Skill description",
    skillPath: "/workspace/.agents/skills/demo/SKILL.md",
    skillDirectory: "/workspace/.agents/skills/demo",
    scope: "workspace",
    sourceKind: "workspace",
    content: "",
    supportingEntries: [],
    state: {
      global: "default",
      workspace: "default",
      pluginEnabled: true,
      effective: "active",
      glyph: "✅",
    },
    diagnostics: [],
    metadata: {
      displayName: "Demo Skill",
      shortDescription: "Short summary",
      defaultPrompt: "Use the demo skill",
    },
  } satisfies SkillRecord;
  assert.equal(
    skillTooltip(skill, "/workspace"),
    [
      "Skill: demo-skill",
      "Description: Skill description",
      "Display Name: Demo Skill",
      "Short Description: Short summary",
      "Default Prompt: Use the demo skill",
      "Path: ./.agents/skills/demo/SKILL.md",
      "Status: active",
    ].join("\n"),
  );
  assert.equal(rootTooltip("/home/user/.codex"), "Path: /home/user/.codex");
});
