import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverMcps, discoverSkills, setMcpState, setSkillEnabled } from "../src/index.js";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "codex-inspector-")); const home = join(root, "home"); const codex = join(home, ".codex"); const workspace = join(root, "workspace");
  await mkdir(join(home, ".agents", "skills", "alpha", "agents"), { recursive: true }); await mkdir(join(workspace, ".agents", "skills", "alpha"), { recursive: true }); await mkdir(join(codex, "plugins", "cache", "source", "plugin", "1.0.0", ".codex-plugin"), { recursive: true }); await mkdir(join(codex, "plugins", "cache", "source", "plugin", "1.0.0", "skills", "alpha"), { recursive: true }); await mkdir(join(workspace, ".codex"), { recursive: true });
  await writeFile(join(home, ".agents", "skills", "alpha", "SKILL.md"), "---\nname: alpha\ndescription: Global\n---\nGlobal skill\n"); await writeFile(join(home, ".agents", "skills", "alpha", "agents", "openai.yaml"), "interface:\n  display_name: Alpha\n  short_description: Alpha skill\n"); await writeFile(join(workspace, ".agents", "skills", "alpha", "SKILL.md"), "---\nname: alpha\n---\nWorkspace skill\n"); const pluginSkill = join(codex, "plugins", "cache", "source", "plugin", "1.0.0", "skills", "alpha", "SKILL.md"); await writeFile(pluginSkill, "---\nname: alpha\n---\nPlugin skill\n"); await writeFile(join(codex, "config.toml"), `[plugins."plugin@source"]\nenabled = false\n\n[mcp_servers.test]\ncommand = "echo"\nargs = ["hello"]\n\n[mcp_servers.test.env]\nTOKEN = "secret"\n`); await writeFile(join(workspace, ".codex", "config.toml"), "");
  return { root, home, codex, workspace };
}

test("discovers skills, metadata, and duplicate shadowing", async () => {
  const values = await fixture(); const result = await discoverSkills({ homeDir: values.home, codexHome: values.codex, workspaceRoot: values.workspace }); const alpha = result.skills.filter((skill) => skill.name === "alpha"); assert.equal(alpha.length, 3); assert.equal(alpha.some((skill) => skill.state.effective === "active"), true); assert.equal(alpha.some((skill) => skill.metadata?.displayName === "Alpha"), true); assert.equal(alpha.some((skill) => skill.state.effective === "unavailable"), true);
});

test("malformed optional metadata remains visible with a diagnostic", async () => {
  const values = await fixture(); const directory = join(values.home, ".agents", "skills", "broken", "agents"); await mkdir(directory, { recursive: true }); await writeFile(join(values.home, ".agents", "skills", "broken", "SKILL.md"), "Broken skill\n"); await writeFile(join(directory, "openai.yaml"), "interface: [\n");
  const result = await discoverSkills({ homeDir: values.home, codexHome: values.codex, workspaceRoot: values.workspace }); const broken = result.skills.find((skill) => skill.name === "broken"); assert.ok(broken); assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.code === "SKILL_METADATA_INVALID"));
});

test("skill disable and reset preserve unrelated config", async () => {
  const values = await fixture(); const global = join(values.codex, "config.toml"); await setSkillEnabled({ homeDir: values.home, codexHome: values.codex, workspaceRoot: values.workspace }, join(values.home, ".agents", "skills", "alpha", "SKILL.md"), "global", false); let text = await readFile(global, "utf8"); assert.match(text, /enabled = false/); assert.match(text, /mcp_servers\.test/); await setSkillEnabled({ homeDir: values.home, codexHome: values.codex, workspaceRoot: values.workspace }, join(values.home, ".agents", "skills", "alpha", "SKILL.md"), "global", true); text = await readFile(global, "utf8"); assert.doesNotMatch(text, /skills\.config/); assert.match(text, /mcp_servers\.test/);
});

test("discovers MCP nested config and mutates only enabled", async () => {
  const values = await fixture(); const result = await discoverMcps({ homeDir: values.home, codexHome: values.codex, workspaceRoot: values.workspace }); assert.equal(result.mcps[0]?.name, "test"); assert.deepEqual(result.mcps[0]?.config.args, ["hello"]); assert.deepEqual(result.mcps[0]?.config.env, { TOKEN: "secret" }); await setMcpState({ homeDir: values.home, codexHome: values.codex, workspaceRoot: values.workspace }, "global", "test", false); const text = await readFile(join(values.codex, "config.toml"), "utf8"); assert.match(text, /enabled = false/); assert.match(text, /command = "echo"/); assert.match(text, /TOKEN = "secret"/);
});
