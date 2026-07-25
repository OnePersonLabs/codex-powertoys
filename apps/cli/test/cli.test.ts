import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const run = promisify(execFile);
const cli = resolve(dirname(new URL(import.meta.url).pathname), "../dist/index.js");
test("roots command emits JSON", async () => {
  const result = await run(process.execPath, [cli, "roots", "--json"]); const parsed = JSON.parse(result.stdout) as { codexHome: string }; assert.ok(parsed.codexHome);
});

test("status and MCP show return stable JSON with source locations", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "codex-inspector-cli-")); const home = resolve(root, "home"); const codex = resolve(home, ".codex"); const workspace = resolve(root, "workspace");
  await mkdir(codex, { recursive: true }); await mkdir(workspace, { recursive: true });
  await writeFile(resolve(codex, "config.toml"), "[mcp_servers.demo]\ncommand = \"echo\"\n");
  const args = ["--codex-home", codex, "--workspace", workspace];
  const status = await run(process.execPath, [cli, "status", ...args, "--json"]); const parsedStatus = JSON.parse(status.stdout) as { mcps: { count: number } }; assert.equal(parsedStatus.mcps.count, 1);
  const shown = await run(process.execPath, [cli, "mcp", "show", "demo", ...args, "--json"]); const parsedShow = JSON.parse(shown.stdout) as { sourceRange: { startLine: number } }; assert.equal(parsedShow.sourceRange.startLine, 0);
});

test("MCP mutation reports a non-zero error for an unknown server", async () => {
  await assert.rejects(run(process.execPath, [cli, "mcp", "set", "missing", "--scope", "global", "--enable", "--json"]), (error: unknown) => {
    const value = error as { code?: number; stderr?: string }; return value.code === 1 && /MCP not found/.test(value.stderr ?? "");
  });
});
