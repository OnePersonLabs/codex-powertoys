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
  assert.match(source, /label: "Global — ~\//);
  assert.match(source, /label: `Workspace —/);
  assert.match(source, /sourceNodeKind: "pluginRoot"/);
  assert.match(source, /sourceNodeKind: "pluginSkills"/);
  assert.match(source, /sourceNodeKind: "pluginMcp"/);
  assert.match(source, /sourcePath: plugin\.mcpPath/);
  assert.match(source, /skill\.plugin\?\.id === plugin\.id/);
});

test("resource labels use status and type glyphs without native checkboxes", async () => {
  const source = await extensionSource();
  assert.match(source, /const TYPE_ICONS = \{ plugin: "🔌", mcp: "🧰", tool: "🔨", skill: "🧠" \}/);
  assert.match(source, /return `\$\{value \? `\$\{statusGlyph\(value\)\} ` : ""\}\$\{TYPE_ICONS\[type\]\}/);
  assert.doesNotMatch(source, /TreeItemCheckboxState|checkboxState|onDidChangeCheckboxState/);
});

test("MCP tools are attached only by explicit loading", async () => {
  const source = await extensionSource();
  assert.match(source, /command\("codexPowerToys\.mcp\.loadTools"/);
  assert.match(source, /resources\.setTools\(mcp, result\.tools\)/);
  assert.match(source, /kind: "mcpTool"/);
  assert.match(source, /command: "codexPowerToys\.showMcpTool"/);
});
