import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discoverAgents,
  discoverMcps,
  discoverPlugins,
  discoverSkills,
  deleteResource,
  loadMcpTools,
  renameAgent,
  renameMcpAcrossScopes,
  renameSkill,
  resourceStatusGlyph,
  setMcpState,
  setPluginEnabled,
  setSkillEnabled,
  transferResources,
} from "../src/index.js";
import type { McpRecord, McpTransport } from "../src/index.js";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "codex-powertoys-"));
  const home = join(root, "home");
  const codex = join(home, ".codex");
  const workspace = join(root, "workspace");
  await mkdir(join(home, ".agents", "skills", "alpha", "agents"), {
    recursive: true,
  });
  await mkdir(join(workspace, ".agents", "skills", "alpha"), {
    recursive: true,
  });
  await mkdir(
    join(
      codex,
      "plugins",
      "cache",
      "source",
      "plugin",
      "1.0.3",
      ".codex-plugin",
    ),
    { recursive: true },
  );
  await mkdir(
    join(
      codex,
      "plugins",
      "cache",
      "source",
      "plugin",
      "1.0.3",
      "skills",
      "alpha",
    ),
    { recursive: true },
  );
  await mkdir(
    join(codex, "plugins", "cache", "remote-source", "remote-plugin"),
    { recursive: true },
  );
  await mkdir(join(workspace, ".codex"), { recursive: true });
  await writeFile(
    join(home, ".agents", "skills", "alpha", "SKILL.md"),
    "---\nname: alpha\ndescription: Global\n---\nGlobal skill\n",
  );
  await writeFile(
    join(home, ".agents", "skills", "alpha", "agents", "openai.yaml"),
    "interface:\n  display_name: Alpha\n  short_description: Alpha skill\n",
  );
  await writeFile(
    join(workspace, ".agents", "skills", "alpha", "SKILL.md"),
    "---\nname: alpha\n---\nWorkspace skill\n",
  );
  const pluginRoot = join(
    codex,
    "plugins",
    "cache",
    "source",
    "plugin",
    "1.0.3",
  );
  const pluginSkill = join(pluginRoot, "skills", "alpha", "SKILL.md");
  await writeFile(pluginSkill, "---\nname: alpha\n---\nPlugin skill\n");
  await writeFile(
    join(pluginRoot, ".codex-plugin", "plugin.json"),
    JSON.stringify({
      name: "plugin",
      version: "1.0.3",
      skills: "./skills",
      mcpServers: "./plugin-mcp.json",
    }),
  );
  await writeFile(
    join(pluginRoot, "plugin-mcp.json"),
    JSON.stringify({
      mcpServers: {
        pluginServer: { command: "echo", args: ["plugin"], cwd: "." },
      },
    }),
  );
  await writeFile(
    join(
      codex,
      "plugins",
      "cache",
      "remote-source",
      "remote-plugin",
      ".codex-remote-plugin-install.json",
    ),
    JSON.stringify({ schema_version: 1, remote_plugin_id: "remote-id" }),
  );
  await writeFile(
    join(codex, "config.toml"),
    `[plugins."plugin@source"]\nenabled = false\n\n[mcp_servers.test]\ncommand = "echo"\nargs = ["hello"]\n\n[mcp_servers.test.env]\nTOKEN = "secret"\n`,
  );
  await writeFile(join(workspace, ".codex", "config.toml"), "");
  return { root, home, codex, workspace };
}

test("discovers skills, metadata, and duplicate shadowing", async () => {
  const values = await fixture();
  const result = await discoverSkills({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const alpha = result.skills.filter((skill) => skill.name === "alpha");
  assert.equal(alpha.length, 3);
  assert.equal(
    alpha.some((skill) => skill.state.effective === "active"),
    true,
  );
  assert.equal(
    alpha.some((skill) => skill.metadata?.displayName === "Alpha"),
    true,
  );
  assert.equal(
    alpha.some((skill) => skill.state.effective === "unavailable"),
    true,
  );
});

test("malformed optional metadata remains visible with a diagnostic", async () => {
  const values = await fixture();
  const directory = join(values.home, ".agents", "skills", "broken", "agents");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(values.home, ".agents", "skills", "broken", "SKILL.md"),
    "Broken skill\n",
  );
  await writeFile(join(directory, "openai.yaml"), "interface: [\n");
  const result = await discoverSkills({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const broken = result.skills.find((skill) => skill.name === "broken");
  assert.ok(broken);
  assert.ok(
    broken.diagnostics.some(
      (diagnostic) => diagnostic.code === "SKILL_METADATA_INVALID",
    ),
  );
});

test("skill disable and reset preserve unrelated config", async () => {
  const values = await fixture();
  const global = join(values.codex, "config.toml");
  await setSkillEnabled(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    join(values.home, ".agents", "skills", "alpha", "SKILL.md"),
    "global",
    false,
  );
  let text = await readFile(global, "utf8");
  assert.match(text, /enabled = false/);
  assert.match(text, /mcp_servers\.test/);
  await setSkillEnabled(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    join(values.home, ".agents", "skills", "alpha", "SKILL.md"),
    "global",
    undefined,
  );
  text = await readFile(global, "utf8");
  assert.doesNotMatch(text, /skills\.config/);
  assert.match(text, /mcp_servers\.test/);
});

test("workspace skill enablement persists explicit true over a global disablement", async () => {
  const values = await fixture();
  const skillPath = join(values.home, ".agents", "skills", "beta", "SKILL.md");
  await mkdir(join(values.home, ".agents", "skills", "beta"), {
    recursive: true,
  });
  await writeFile(skillPath, "---\nname: beta\n---\nBeta skill\n");
  const options = {
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  };
  await setSkillEnabled(options, skillPath, "global", false);
  await setSkillEnabled(options, skillPath, "workspace", true);
  assert.match(
    await readFile(join(values.workspace, ".codex", "config.toml"), "utf8"),
    /enabled = true/,
  );
  const beta = (await discoverSkills(options)).skills.find(
    (skill) => skill.skillPath === skillPath,
  )!;
  assert.equal(beta.state.global, "disabled");
  assert.equal(beta.state.workspace, "enabled");
  assert.equal(beta.state.effective, "active");
  assert.equal(beta.state.glyph, "✅");
});

test("discovers MCP nested config and mutates only enabled", async () => {
  const values = await fixture();
  const result = await discoverMcps({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const testMcp = result.mcps.find((item) => item.name === "test");
  assert.equal(testMcp?.name, "test");
  assert.deepEqual(testMcp?.config.args, ["hello"]);
  assert.deepEqual(testMcp?.config.env, { TOKEN: "secret" });
  await setMcpState(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    "global",
    "test",
    false,
  );
  const text = await readFile(join(values.codex, "config.toml"), "utf8");
  assert.match(text, /enabled = false/);
  assert.match(text, /command = "echo"/);
  assert.match(text, /TOKEN = "secret"/);
});

test("discovers plugins and disables their skills and MCPs", async () => {
  const values = await fixture();
  const plugins = await discoverPlugins({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const plugin = plugins.plugins.find((item) => item.name === "plugin");
  assert.ok(plugin);
  assert.equal(plugin.enabled, false);
  assert.equal(plugin.skillPaths.length, 1);
  assert.deepEqual(plugin.mcpNames, ["pluginServer"]);
  const mcps = await discoverMcps({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  assert.equal(
    mcps.mcps.find((item) => item.name === "pluginServer")?.effective,
    "unavailable",
  );
  const skills = await discoverSkills({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  assert.equal(
    skills.skills.find((item) => item.sourceKind === "plugin")?.state.effective,
    "unavailable",
  );
  await setPluginEnabled(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    plugin,
    true,
    "global",
  );
  assert.match(
    await readFile(join(values.codex, "config.toml"), "utf8"),
    /enabled = true/,
  );
  await setPluginEnabled(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    plugin,
    undefined,
    "global",
  );
  assert.doesNotMatch(
    await readFile(join(values.codex, "config.toml"), "utf8"),
    /plugins\.\"plugin@source\"/,
  );
});

test("disabled global MCP config overrides a same-name plugin MCP", async () => {
  const values = await fixture();
  const globalConfig = join(values.codex, "config.toml");
  const existing = await readFile(globalConfig, "utf8");
  await writeFile(
    globalConfig,
    `${existing.replace('[plugins."plugin@source"]\nenabled = false', '[plugins."plugin@source"]\nenabled = true')}\n\n[mcp_servers.pluginServer]\ncommand = "echo"\nenabled = false\n`,
  );
  const result = await discoverMcps({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const records = result.mcps.filter(
    (record) => record.name === "pluginServer",
  );
  const config = records.find((record) => record.sourceKind === "config");
  const plugin = records.find((record) => record.sourceKind === "plugin");
  assert.equal(config?.effective, "disabled");
  assert.equal(plugin?.effective, "shadowed");
  assert.equal(plugin?.shadowedBy, config?.id);
});

test("workspace MCP config outranks global config even when disabled", async () => {
  const values = await fixture();
  const globalConfig = join(values.codex, "config.toml");
  const workspaceConfig = join(values.workspace, ".codex", "config.toml");
  await writeFile(
    globalConfig,
    `${await readFile(globalConfig, "utf8")}\n[mcp_servers.scopeWinner]\ncommand = "echo"\nenabled = true\n`,
  );
  await writeFile(
    workspaceConfig,
    `[mcp_servers.scopeWinner]\ncommand = "echo"\nenabled = false\n`,
  );
  const records = (
    await discoverMcps({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).mcps.filter((record) => record.name === "scopeWinner");
  const global = records.find((record) => record.scope === "global");
  const workspace = records.find((record) => record.scope === "workspace");
  assert.equal(workspace?.effective, "disabled");
  assert.equal(global?.effective, "shadowed");
  assert.equal(global?.shadowedBy, workspace?.id);
  assert.equal(
    resourceStatusGlyph(workspace!.effective, workspace!.shadowedByEnabled),
    "❌",
  );
  assert.equal(
    resourceStatusGlyph(global!.effective, global!.shadowedByEnabled),
    "✖️",
  );
});

test("workspace MCP enablement supersedes a global disablement", async () => {
  const values = await fixture();
  await writeFile(
    join(values.codex, "config.toml"),
    `${await readFile(join(values.codex, "config.toml"), "utf8")}\n[mcp_servers.scopeWinner]\ncommand = "global"\nenabled = false\n`,
  );
  await writeFile(
    join(values.workspace, ".codex", "config.toml"),
    `[mcp_servers.scopeWinner]\ncommand = "workspace"\nenabled = true\n`,
  );
  const records = (
    await discoverMcps({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).mcps.filter((record) => record.name === "scopeWinner");
  const global = records.find((record) => record.scope === "global");
  const workspace = records.find((record) => record.scope === "workspace");
  assert.equal(workspace?.effective, "active");
  assert.equal(global?.effective, "shadowed");
  assert.equal(global?.shadowedByEnabled, true);
  assert.equal(
    resourceStatusGlyph(workspace!.effective, workspace!.shadowedByEnabled),
    "✅",
  );
  assert.equal(
    resourceStatusGlyph(global!.effective, global!.shadowedByEnabled),
    "☑️",
  );
});

test("skill precedence distinguishes shadowed enabled and disabled winners", async () => {
  const values = await fixture();
  const globalSkill = join(
    values.home,
    ".agents",
    "skills",
    "alpha",
    "SKILL.md",
  );
  const workspaceSkill = join(
    values.workspace,
    ".agents",
    "skills",
    "alpha",
    "SKILL.md",
  );
  await writeFile(
    join(values.codex, "config.toml"),
    `${await readFile(join(values.codex, "config.toml"), "utf8")}\n[[skills.config]]\npath = ${JSON.stringify(globalSkill)}\nenabled = false\n`,
  );
  let result = await discoverSkills({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  let alpha = result.skills.filter((skill) => skill.name === "alpha");
  let global = alpha.find((skill) => skill.skillPath === globalSkill)!;
  let workspace = alpha.find((skill) => skill.skillPath === workspaceSkill)!;
  assert.equal(workspace.state.effective, "active");
  assert.equal(global.state.effective, "shadowed");
  assert.equal(global.state.shadowedByEnabled, true);
  assert.equal(
    resourceStatusGlyph(global.state.effective, global.state.shadowedByEnabled),
    "☑️",
  );

  await writeFile(
    join(values.workspace, ".codex", "config.toml"),
    `[[skills.config]]\npath = ${JSON.stringify(workspaceSkill)}\nenabled = false\n`,
  );
  result = await discoverSkills({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  alpha = result.skills.filter((skill) => skill.name === "alpha");
  global = alpha.find((skill) => skill.skillPath === globalSkill)!;
  workspace = alpha.find((skill) => skill.skillPath === workspaceSkill)!;
  assert.equal(workspace.state.effective, "disabled");
  assert.equal(global.state.effective, "shadowed");
  assert.equal(global.state.shadowedByEnabled, false);
  assert.equal(
    resourceStatusGlyph(global.state.effective, global.state.shadowedByEnabled),
    "✖️",
  );
});

test("workspace plugin precedence ignores global disablement and reports disabled shadowing", async () => {
  const values = await fixture();
  const workspacePlugin = join(
    values.workspace,
    ".codex",
    "plugins",
    "plugin",
    "2.0.0",
  );
  await mkdir(join(workspacePlugin, ".codex-plugin"), { recursive: true });
  await writeFile(
    join(workspacePlugin, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "plugin", version: "2.0.0" }),
  );
  let plugins = (
    await discoverPlugins({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).plugins.filter((plugin) => plugin.name === "plugin");
  let global = plugins.find((plugin) => plugin.scope === "global")!;
  let workspace = plugins.find((plugin) => plugin.scope === "workspace")!;
  assert.equal(workspace.effective, "active");
  assert.equal(global.effective, "shadowed");
  assert.equal(global.shadowedByEnabled, true);
  assert.equal(
    resourceStatusGlyph(global.effective, global.shadowedByEnabled),
    "☑️",
  );

  await writeFile(
    join(values.workspace, ".codex", "config.toml"),
    `[plugins."plugin@plugin"]\nenabled = false\n`,
  );
  plugins = (
    await discoverPlugins({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).plugins.filter((plugin) => plugin.name === "plugin");
  global = plugins.find((plugin) => plugin.scope === "global")!;
  workspace = plugins.find((plugin) => plugin.scope === "workspace")!;
  assert.equal(workspace.effective, "disabled");
  assert.equal(global.effective, "shadowed");
  assert.equal(global.shadowedByEnabled, false);
  assert.equal(
    resourceStatusGlyph(global.effective, global.shadowedByEnabled),
    "✖️",
  );
});

test("workspace plugin MCP outranks a global config MCP", async () => {
  const values = await fixture();
  const workspacePlugin = join(
    values.workspace,
    ".codex",
    "plugins",
    "workspace-mcp",
    "1.0.3",
  );
  await mkdir(join(workspacePlugin, ".codex-plugin"), { recursive: true });
  await writeFile(
    join(workspacePlugin, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "workspace-mcp", mcpServers: "./mcp.json" }),
  );
  await writeFile(
    join(workspacePlugin, "mcp.json"),
    JSON.stringify({ mcpServers: { crossScope: { command: "echo" } } }),
  );
  await writeFile(
    join(values.codex, "config.toml"),
    `${await readFile(join(values.codex, "config.toml"), "utf8")}\n[mcp_servers.crossScope]\ncommand = "global"\n`,
  );
  const records = (
    await discoverMcps({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).mcps.filter((record) => record.name === "crossScope");
  const global = records.find((record) => record.scope === "global");
  const workspace = records.find((record) => record.scope === "workspace");
  assert.equal(workspace?.effective, "active");
  assert.equal(global?.effective, "shadowed");
  assert.equal(global?.shadowedBy, workspace?.id);
});

test("disabled workspace plugin contributions block lower-precedence resources", async () => {
  const values = await fixture();
  const pluginRoot = join(
    values.workspace,
    ".codex",
    "plugins",
    "workspace-blocker",
    "1.0.3",
  );
  await mkdir(join(pluginRoot, ".codex-plugin"), { recursive: true });
  await mkdir(join(pluginRoot, "skills", "blocked-skill"), { recursive: true });
  await writeFile(
    join(pluginRoot, ".codex-plugin", "plugin.json"),
    JSON.stringify({
      name: "workspace-blocker",
      mcpServers: "./mcp.json",
      skills: "./skills",
    }),
  );
  await writeFile(
    join(pluginRoot, "mcp.json"),
    JSON.stringify({ mcpServers: { blocked: { command: "echo" } } }),
  );
  await writeFile(
    join(pluginRoot, "skills", "blocked-skill", "SKILL.md"),
    "---\nname: blocked-skill\n---\nWorkspace plugin skill\n",
  );
  await mkdir(join(values.home, ".agents", "skills", "blocked-skill"), {
    recursive: true,
  });
  await writeFile(
    join(values.home, ".agents", "skills", "blocked-skill", "SKILL.md"),
    "---\nname: blocked-skill\n---\nGlobal skill\n",
  );
  await writeFile(
    join(values.codex, "config.toml"),
    `${await readFile(join(values.codex, "config.toml"), "utf8")}\n[mcp_servers.blocked]\ncommand = "global"\n`,
  );
  await writeFile(
    join(values.workspace, ".codex", "config.toml"),
    `[plugins."workspace-blocker@workspace-blocker"]\nenabled = false\n`,
  );

  const mcps = (
    await discoverMcps({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).mcps.filter((record) => record.name === "blocked");
  const globalMcp = mcps.find((record) => record.scope === "global")!;
  const workspaceMcp = mcps.find((record) => record.scope === "workspace")!;
  assert.equal(workspaceMcp.effective, "unavailable");
  assert.equal(globalMcp.effective, "shadowed");
  assert.equal(globalMcp.shadowedByEnabled, false);
  assert.equal(
    resourceStatusGlyph(globalMcp.effective, globalMcp.shadowedByEnabled),
    "✖️",
  );

  const skills = (
    await discoverSkills({
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    })
  ).skills.filter((record) => record.name === "blocked-skill");
  const globalSkill = skills.find((record) => record.scope === "global")!;
  const workspaceSkill = skills.find((record) => record.scope === "workspace")!;
  assert.equal(workspaceSkill.state.effective, "unavailable");
  assert.equal(globalSkill.state.effective, "shadowed");
  assert.equal(globalSkill.state.shadowedByEnabled, false);
  assert.equal(
    resourceStatusGlyph(
      globalSkill.state.effective,
      globalSkill.state.shadowedByEnabled,
    ),
    "✖️",
  );
});

test("requires a Codex plugin manifest and preserves declared MCP paths", async () => {
  const values = await fixture();
  const result = await discoverPlugins({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  assert.equal(
    result.plugins.find((item) => item.name === "remote-plugin"),
    undefined,
  );
  assert.equal(
    result.plugins
      .find((item) => item.name === "plugin")
      ?.mcpPath?.endsWith("plugin-mcp.json"),
    true,
  );
});

test("deduplicates plugins by Codex manifest and marks superseded records", async () => {
  const values = await fixture();
  await writeFile(
    join(values.codex, "config.toml"),
    '[plugins."plugin@source"]\nenabled = true\n',
  );
  const workspacePlugin = join(
    values.workspace,
    ".codex",
    "plugins",
    "plugin",
    "2.0.0",
  );
  await mkdir(join(workspacePlugin, ".codex-plugin"), { recursive: true });
  await writeFile(
    join(workspacePlugin, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "plugin", version: "2.0.0" }),
  );
  await mkdir(
    join(
      values.codex,
      "plugins",
      "cache",
      "source",
      "claude-only",
      ".claude-plugin",
    ),
    { recursive: true },
  );
  await writeFile(
    join(
      values.codex,
      "plugins",
      "cache",
      "source",
      "claude-only",
      ".claude-plugin",
      "plugin.json",
    ),
    "{}",
  );
  const result = await discoverPlugins({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const plugins = result.plugins.filter((item) => item.name === "plugin");
  assert.equal(plugins.length, 2);
  assert.equal(plugins.filter((item) => item.effective === "active").length, 1);
  assert.equal(
    plugins.filter((item) => item.effective === "shadowed").length,
    1,
  );
  assert.ok(
    plugins.every((item) =>
      item.manifestPath?.endsWith(".codex-plugin/plugin.json"),
    ),
  );
  const overlapping = await discoverPlugins({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.home,
  });
  assert.equal(
    overlapping.plugins.filter((item) => item.name === "plugin").length,
    1,
  );
});

test("applies workspace-over-global plugin MCP policy overlays without changing transport config", async () => {
  const values = await fixture();
  await writeFile(
    join(values.codex, "config.toml"),
    `${await readFile(join(values.codex, "config.toml"), "utf8")}\n[plugins."plugin@source".mcp_servers.pluginServer]\nenabled_tools = ["safe"]\ndefault_tools_approval_mode = "auto"\n\n[plugins."plugin@source".mcp_servers.pluginServer.tools.special]\napproval_mode = "prompt"\n`,
  );
  await writeFile(
    join(values.workspace, ".codex", "config.toml"),
    `[plugins."plugin@source".mcp_servers.pluginServer]\ndisabled_tools = ["safe"]\n`,
  );
  const result = await discoverMcps({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  const pluginMcp = result.mcps.find(
    (record) => record.name === "pluginServer",
  );
  assert.deepEqual(pluginMcp?.toolPolicy?.enabledTools, ["safe"]);
  assert.deepEqual(pluginMcp?.toolPolicy?.disabledTools, ["safe"]);
  assert.equal(pluginMcp?.toolPolicy?.tools?.special?.approvalMode, "prompt");
  assert.equal(pluginMcp?.config.command, "echo");
});

test("discovers recursive agents and performs source-aware renames", async () => {
  const values = await fixture();
  const nested = join(values.codex, "agents", "team", "reviewer.toml");
  await mkdir(join(values.codex, "agents", "team"), { recursive: true });
  await writeFile(nested, 'name = "reviewer"\nmodel = "gpt"\n');
  const agents = await discoverAgents({
    homeDir: values.home,
    codexHome: values.codex,
    workspaceRoot: values.workspace,
  });
  assert.equal(agents.agents[0]?.relativePath, "team/reviewer.toml");
  await renameAgent(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    nested,
    "reviewer-new",
  );
  assert.equal(
    (
      await discoverAgents({
        homeDir: values.home,
        codexHome: values.codex,
        workspaceRoot: values.workspace,
      })
    ).agents[0]?.name,
    "reviewer-new",
  );
  const skillDirectory = join(values.home, ".agents", "skills", "alpha");
  await renameSkill(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    skillDirectory,
    "alpha-renamed",
  );
  assert.match(
    await readFile(
      join(values.home, ".agents", "skills", "alpha-renamed", "SKILL.md"),
      "utf8",
    ),
    /name: alpha-renamed/,
  );
});

test("handles transfer conflicts, MCP renames, and protected roots", async () => {
  const values = await fixture();
  const source = join(values.home, ".agents", "skills", "alpha");
  const identity = {
    kind: "skill" as const,
    id: "alpha",
    name: "alpha",
    scope: "global" as const,
    path: source,
    relativePath: "alpha",
    sourceKind: "user" as const,
  };
  const skipped = await transferResources(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    {
      resources: [identity],
      operation: "copy",
      targetScope: "workspace",
      conflictMode: "skip",
    },
  );
  assert.equal(skipped.items[0]?.skipped, true);
  const replaced = await transferResources(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    {
      resources: [identity],
      operation: "copy",
      targetScope: "workspace",
      conflictMode: "replace",
    },
  );
  assert.equal(replaced.items[0]?.changed, true);
  await renameMcpAcrossScopes(
    {
      homeDir: values.home,
      codexHome: values.codex,
      workspaceRoot: values.workspace,
    },
    "test",
    "renamed",
  );
  assert.match(
    await readFile(join(values.codex, "config.toml"), "utf8"),
    /mcp_servers\.renamed/,
  );
  await assert.rejects(
    deleteResource(
      {
        homeDir: values.home,
        codexHome: values.codex,
        workspaceRoot: values.workspace,
      },
      {
        kind: "skill",
        id: "root",
        name: "root",
        scope: "global",
        path: join(values.home, ".agents", "skills"),
        sourceKind: "user",
      },
    ),
  );
});

function mcpRecord(config: Record<string, unknown>): McpRecord {
  return {
    id: "test:mcp",
    name: "test",
    scope: "global",
    sourceKind: "config",
    configPath: "test.toml",
    config,
    enabled: true,
    pluginEnabled: true,
    effective: "active",
    sourceRange: { path: "test.toml", startLine: 0, endLine: 0 },
    diagnostics: [],
  };
}

test("derives MCP tool permission glyphs from deny/allow lists and approval overrides", async () => {
  const transport: McpTransport = {
    async request(method) {
      if (method === "tools/list")
        return {
          tools: [
            { name: "allowed" },
            { name: "denied" },
            { name: "missing" },
            { name: "prompted" },
          ],
        };
      return undefined;
    },
    async close() {},
  };
  const result = await loadMcpTools(
    mcpRecord({
      enabled_tools: ["allowed", "denied", "prompted"],
      disabled_tools: ["denied"],
      default_tools_approval_mode: "auto",
      tools: { prompted: { approval_mode: "prompt" } },
    }),
    { transport },
  );
  assert.deepEqual(
    result.tools.map((tool) => [tool.name, tool.permissionGlyph]),
    [
      ["allowed", "✅"],
      ["denied", "❌"],
      ["missing", "❌"],
      ["prompted", "✋"],
    ],
  );
});

test("does not wait for JSON-RPC notifications and reports JSON-RPC errors", async () => {
  const methods: string[] = [];
  const transport: McpTransport = {
    request(method) {
      methods.push(method);
      if (method === "notifications/initialized")
        return new Promise<never>(() => {});
      if (method === "initialize") return Promise.resolve({});
      return Promise.reject(new Error("server rejected tools/list"));
    },
    async close() {},
  };
  const result = await Promise.race([
    loadMcpTools(mcpRecord({}), { transport }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("notification hung")), 250),
    ),
  ]);
  assert.deepEqual(methods, [
    "initialize",
    "notifications/initialized",
    "tools/list",
  ]);
  assert.equal(result.tools.length, 0);
  assert.match(result.diagnostics[0]?.message ?? "", /server rejected/);
});

test("serializes HTTP initialization notification before tools/list and closes cleanly", async () => {
  const methods: string[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      const message = JSON.parse(body) as { id?: number; method: string };
      methods.push(message.method);
      response.setHeader("content-type", "application/json");
      const result =
        message.method === "tools/list"
          ? { tools: [{ name: "url-tool" }] }
          : {};
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          ...(message.id === undefined ? {} : { id: message.id }),
          result,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    const result = await loadMcpTools(
      mcpRecord({ url: `http://127.0.0.1:${address.port}` }),
      { timeoutMs: 500 },
    );
    assert.equal(result.tools[0]?.name, "url-tool");
    assert.deepEqual(methods, [
      "initialize",
      "notifications/initialized",
      "tools/list",
    ]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("applies the probe timeout to injected transports that never answer", async () => {
  const transport: McpTransport = {
    request: async () => new Promise<never>(() => {}),
    close: async () => {},
  };
  const result = await loadMcpTools(mcpRecord({}), {
    transport,
    timeoutMs: 20,
  });
  assert.match(result.diagnostics[0]?.message ?? "", /timed out/);
});

test("terminates owned stdio MCP children after a successful probe", async () => {
  const pidPath = join(
    tmpdir(),
    `codex-mcp-pid-${Date.now()}-${Math.random()}.txt`,
  );
  const script = [
    "const fs=require('node:fs');",
    `fs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));`,
    "process.stdin.on('data', d => { for (const line of d.toString().split(/\\n/)) { if (!line.trim()) continue; const m=JSON.parse(line); if (m.id) process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result:m.method==='tools/list'?{tools:[{name:'ok'}]}:{}})+'\\n'); } });",
  ].join(" ");
  const result = await loadMcpTools(
    mcpRecord({ command: process.execPath, args: ["-e", script] }),
    { timeoutMs: 1000 },
  );
  assert.equal(result.tools[0]?.name, "ok");
  const pid = Number(await readFile(pidPath, "utf8"));
  await assert.rejects(async () => process.kill(pid, 0));
});

test("reports an early stdio child exit instead of hanging the probe", async () => {
  const result = await loadMcpTools(
    mcpRecord({ command: process.execPath, args: ["-e", "process.exit(7)"] }),
    { timeoutMs: 200 },
  );
  assert.equal(result.tools.length, 0);
  assert.match(
    result.diagnostics[0]?.message ?? "",
    /exited|closed|unavailable/,
  );
});
