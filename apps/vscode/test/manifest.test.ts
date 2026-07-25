import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

test("extension manifest registers inspector views and commands", async () => {
  const manifest = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8")) as { contributes: { views: Record<string, Array<{ id: string }>>; commands: Array<{ command: string }> } };
  const views = manifest.contributes.views.codexInspector.map((view) => view.id); assert.deepEqual(views, ["codexInspector.skills", "codexInspector.agents", "codexInspector.mcps", "codexInspector.info"]); assert.ok(manifest.contributes.commands.some((command) => command.command === "codexInspector.startSkillCreator"));
});
