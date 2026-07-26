import test from "node:test";
import assert from "node:assert/strict";
import type { McpRecord, McpToolResult } from "@codex-powertoys/core";
import { McpToolCache } from "../src/mcp-tool-cache.js";

function record(
  name: string,
  id: string,
  overrides: Partial<McpRecord> = {},
): McpRecord {
  return {
    id,
    name,
    scope: "global",
    sourceKind: "config",
    configPath: `/tmp/${name}.toml`,
    config: { command: "mcp-server" },
    enabled: true,
    pluginEnabled: true,
    effective: "active",
    sourceRange: {
      path: `/tmp/${name}.toml`,
      startLine: 0,
      endLine: 0,
    },
    diagnostics: [],
    ...overrides,
  };
}

const result = (name: string): McpToolResult => ({
  tools: [{ name }],
  diagnostics: [],
  transport: "stdio",
});

test("MCP tool cache probes effective winners sequentially", async () => {
  const calls: string[] = [];
  let active = 0;
  let maximum = 0;
  const cache = new McpToolCache(
    () => undefined,
    async (mcp) => {
      calls.push(mcp.id);
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return result(mcp.name);
    },
  );
  const workspace = record("same", "workspace", { scope: "workspace" });
  const global = record("same", "global");
  const disabled = record("disabled", "disabled", {
    enabled: false,
    effective: "disabled",
  });
  const second = record("second", "second");

  cache.enqueueEnabled([global, disabled, second, workspace]);
  await cache.waitForIdle();

  assert.deepEqual(calls, ["workspace", "second"]);
  assert.equal(maximum, 1);
  assert.deepEqual(cache.toolsFor(workspace), [{ name: "same" }]);
  assert.deepEqual(cache.toolsFor(second), [{ name: "second" }]);
  assert.deepEqual(cache.toolsFor(global), []);
});

test("failed MCP results are cached until an explicit re-query", async () => {
  let calls = 0;
  const cache = new McpToolCache(
    () => undefined,
    async () => {
      calls += 1;
      throw new Error("server unavailable");
    },
  );
  const mcp = record("failing", "failing");

  assert.equal(cache.enqueue(mcp), true);
  await cache.waitForIdle();
  assert.equal(cache.get(mcp)?.status, "failed");
  assert.equal(cache.get(mcp)?.diagnostics[0]?.code, "MCP_TOOLS_UNAVAILABLE");
  assert.equal(cache.enqueue(mcp), false);
  assert.equal(calls, 1);

  assert.equal(cache.enqueue(mcp, true), true);
  await cache.waitForIdle();
  assert.equal(calls, 2);
});

test("coalesces duplicate refreshes during a probe and re-queries changed policy", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls: string[] = [];
  const cache = new McpToolCache(
    () => undefined,
    async (mcp) => {
      calls.push(String(mcp.config.version ?? "initial"));
      await gate;
      return result(mcp.name);
    },
  );
  const initial = record("slow", "slow", { config: { version: "initial" } });
  const changed = record("slow", "slow", {
    config: { version: "changed" },
  });
  const newest = record("slow", "slow", {
    config: { version: "newest" },
  });

  assert.equal(cache.enqueue(initial), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cache.enqueue(initial), false);
  assert.equal(cache.enqueue(changed), true);
  assert.equal(cache.enqueue(newest), true);
  release();
  await cache.waitForIdle();

  assert.deepEqual(calls, ["initial", "newest"]);
});
