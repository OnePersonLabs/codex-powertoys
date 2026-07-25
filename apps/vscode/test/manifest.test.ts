import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

test("extension manifest registers inspector views and commands", async () => {
  const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(
    await readFile(join(extensionRoot, "package.json"), "utf8"),
  ) as {
    icon: string;
    contributes: {
      views: Record<string, Array<{ id: string }>>;
      commands: Array<{ command: string; title?: string; icon?: string }>;
    };
  };
  const source = await readFile(
    join(extensionRoot, "src", "extension.ts"),
    "utf8",
  );
  assert.equal(manifest.icon, "resources/codex-powertoys-icon.png");
  await access(join(extensionRoot, manifest.icon));
  const views = manifest.contributes.views.codexInspector.map(
    (view) => view.id,
  );
  assert.deepEqual(views, [
    "codexPowerToys.skills",
    "codexPowerToys.plugins",
    "codexPowerToys.agents",
    "codexPowerToys.mcps",
    "codexPowerToys.info",
  ]);
  const toolbarCommands = manifest.contributes.commands.filter((command) =>
    [
      "codexPowerToys.refresh",
      "codexPowerToys.skills.toggleMode",
      "codexPowerToys.skills.toggleSupporting",
      "codexPowerToys.skills.filter",
      "codexPowerToys.startSkillCreator",
      "codexPowerToys.mcp.add",
      "codexPowerToys.info.toggleExpand",
    ].includes(command.command),
  );
  assert.ok(
    toolbarCommands.every((command) => Boolean(command.icon && command.title)),
  );
  assert.ok(
    manifest.contributes.commands.some(
      (command) => command.command === "codexPowerToys.resource.paste",
    ),
  );
  assert.match(source, /canSelectMany:\s*true/);
  assert.match(source, /createTreeView\("codexPowerToys.plugins"/);
  assert.match(source, /new ResourceDragController/);
});
