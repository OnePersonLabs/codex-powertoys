import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

async function extensionSource(): Promise<string> {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  return readFile(join(root, "src", "extension.ts"), "utf8");
}

test("resource provider preserves scope and plugin source hierarchy", async () => {
  const source = await extensionSource();
  assert.match(source, /label: "Global"/);
  assert.match(source, /label: "Workspace"/);
  assert.match(source, /item\.tooltip = rootTooltip\(path\)/);
  assert.match(source, /visibleGroupKinds\(\{/);
  assert.match(source, /map\(\(kind\) => this\.groupNode\(scope, kind\)/);
  assert.match(source, /map\(\(kind\) => this\.groupNode\(scope, kind, plugin\)/);
  assert.match(source, /filteredPlugins\(node\.scope!/);
  assert.match(source, /plugins: this\.filteredPlugins\(scope\)\.length > 0/);
  assert.match(source, /label: groupLabel\(kind\)/);
});

test("plugin nodes identify the plugin and delegate scope-aware tooltip paths", async () => {
  const source = await extensionSource();
  assert.match(source, /label: typedLabel\("plugin", plugin\.name, plugin\)/);
  assert.match(source, /item\.tooltip = pluginTooltip\(node\.plugin, workspaceRoot\(\)\)/);
  assert.match(source, /command: "codexPowerToys\.plugin\.openManifest"/);
  assert.match(source, /function pluginManifestPath\(plugin: PluginRecord\)/);
  assert.match(source, /node\.kind === "plugin" \|\|/);
});

test("resource groups and expansion state preserve skill-specific behavior", async () => {
  const source = await extensionSource();
  assert.match(source, /visibleGroupKinds\(/);
  assert.match(source, /private readonly expansion = new ResourceExpansionState\(\)/);
  assert.match(source, /resourceView\.onDidExpandElement/);
  assert.match(source, /resourceView\.onDidCollapseElement/);
  assert.match(source, /underSkill: true/);
  assert.match(source, /tooltipPath\(path, node\.scope, workspaceRoot\(\)\)/);
  assert.match(source, /resources\.setShowSupporting\(/);
  assert.match(source, /resources\.setShowSuperseded\(/);
  assert.match(source, /plugins\.setShowSuperseded\(/);
  assert.match(source, /skills\.setShowSuperseded\(/);
  assert.match(source, /mcps\.setShowSuperseded\(/);
  assert.match(source, /if \(key === "Resources"\) void syncExpansionContexts\(\)/);
});

test("resource toolbar drives the native TreeView instead of only refreshing provider state", async () => {
  const source = await extensionSource();
  assert.match(source, /getParent\(node: Node\): Node \| undefined/);
  assert.match(source, /workbench\.actions\.treeView\.codexPowerToys\.resources\.collapseAll/);
  assert.match(source, /resourceView\.reveal\(/);
});

test("resource labels use status and type glyphs without native checkboxes", async () => {
  const source = await extensionSource();
  assert.match(source, /const TYPE_ICONS = \{ plugin: "🔌", mcp: "🧰", tool: "🔨", skill: "💪", agent: "🤖" \}/);
  assert.match(source, /return `\$\{value \? `\$\{statusGlyph\(value\)\} ` : ""\}\$\{TYPE_ICONS\[type\]\}/);
  assert.doesNotMatch(source, /TreeItemCheckboxState|checkboxState|onDidChangeCheckboxState/);
});

test("MCP tools are populated by the shared background cache", async () => {
  const source = await extensionSource();
  assert.match(source, /command\("codexPowerToys\.mcp\.loadTools"/);
  assert.match(source, /mcpToolCache\.enqueue\(mcp, true\)/);
  assert.match(source, /resources\.setTools\(mcp, entry\.tools\)/);
  assert.match(source, /mcps\.setTools\(mcp, entry\.tools\)/);
  assert.match(source, /new McpToolCache/);
  assert.match(source, /kind: "mcpTool"/);
  assert.match(source, /command: "codexPowerToys\.showMcpTool"/);
});

test("flat panes, filters, path actions, and expansion state are wired", async () => {
  const source = await extensionSource();
  assert.match(source, /class FlatSkillsProvider/);
  assert.match(source, /class FlatPluginsProvider/);
  assert.match(source, /class FlatMcpProvider/);
  assert.match(source, /this\.skills[\s\S]*\.map\(skillNode\)/);
  assert.match(source, /this\.mcps[\s\S]*\.map\(mcpNode\)/);
  assert.match(source, /onDidChangeValue/);
  assert.match(source, /resource\.copyFullPath/);
  assert.match(source, /resource\.copyRelativePath/);
  assert.match(source, /showCollapseAll: false/);
});
