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
      commands: Array<{
        command: string;
        title?: string;
        icon?: string;
        enablement?: string;
      }>;
    };
  };
  const source = await readFile(
    join(extensionRoot, "src", "extension.ts"),
    "utf8",
  );
  assert.equal(manifest.icon, "resources/codex-powertoys-icon.png");
  await access(join(extensionRoot, manifest.icon));
  const views = manifest.contributes.views.codexPowerToys.map(
    (view) => view.id,
  );
  assert.deepEqual(views, [
    "codexPowerToys.resources",
    "codexPowerToys.plugins",
    "codexPowerToys.mcps",
    "codexPowerToys.skills",
    "codexPowerToys.agents",
    "codexPowerToys.info",
  ]);
  const toolbarCommands = manifest.contributes.commands.filter((command) =>
    [
      "codexPowerToys.refresh",
      "codexPowerToys.skills.toggleSupporting",
      "codexPowerToys.skills.filter",
      "codexPowerToys.resources.filter",
      "codexPowerToys.mcp.filter",
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
  for (const command of [
    "codexPowerToys.resource.copyFullPath",
    "codexPowerToys.resource.copyRelativePath",
    "codexPowerToys.resources.collapseAll",
    "codexPowerToys.resources.expandAll",
  ])
    assert.ok(manifest.contributes.commands.some((item) => item.command === command));
  for (const command of [
    "codexPowerToys.resources.toggleSuperseded",
    "codexPowerToys.plugins.toggleSuperseded",
    "codexPowerToys.skills.toggleSuperseded",
    "codexPowerToys.mcp.toggleSuperseded",
  ])
    assert.ok(manifest.contributes.commands.some((item) => item.command === command));
  assert.equal(manifest.contributes.commands.some((item) => item.command === "codexPowerToys.agents.collapseAll"), false);
  assert.match(source, /canSelectMany:\s*true/);
  assert.match(source, /createTreeView\("codexPowerToys.resources"/);
  assert.match(source, /createTreeView\("codexPowerToys.skills"/);
  assert.match(source, /createTreeView\("codexPowerToys.plugins"/);
  assert.match(source, /createTreeView\("codexPowerToys.mcps"/);
  assert.doesNotMatch(source, /TreeItemCheckboxState|checkboxState/);
  assert.match(source, /🔌/);
  assert.match(source, /🤖/);
  assert.match(source, /🧰/);
  assert.match(source, /🔨/);
  assert.match(source, /💪/);
  assert.match(source, /visibleGroupKinds\(/);
  assert.match(source, /resourceGroupLabel\(/);
  assert.match(source, /showSuperseded/);
  assert.match(source, /effective === "shadowed"\) return "✖️"/);
  assert.match(source, /setExpansionContext/);
  assert.match(source, /copyRelativePath/);
  assert.match(source, /new ResourceDragController/);
  assert.doesNotMatch(source, /codexPowerToys\.agents\.toggleSuperseded/);
  const command = (name: string) =>
    manifest.contributes.commands.find((item) => item.command === name);
  assert.equal(command("codexPowerToys.plugin.enable")?.enablement, "!resourceEnabled");
  assert.equal(command("codexPowerToys.plugin.disable")?.enablement, "resourceEnabled");
  assert.equal(command("codexPowerToys.mcp.enableGlobal")?.enablement, "!resourceEnabled");
  assert.equal(command("codexPowerToys.mcp.disableGlobal")?.enablement, "resourceEnabled");
  assert.equal(command("codexPowerToys.skill.enableGlobal")?.enablement, "!resourceEnabled");
  assert.equal(command("codexPowerToys.skill.disableGlobal")?.enablement, "resourceEnabled");
});
