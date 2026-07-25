import { spawn } from "node:child_process";
import { addMcp, deleteMcp, parseMcpSections, readConfig, setMcpEnabled, updateMcp } from "./toml.js";
import { resolveRoots } from "./paths.js";
import type { DiscoveryOptions, Diagnostic, McpRecord, McpTool, McpToolOptions, McpToolResult, McpTransport, RootSet, Scope } from "./types.js";

export async function discoverMcps(options: DiscoveryOptions = {}): Promise<{ roots: RootSet; mcps: McpRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const mcps: McpRecord[] = []; const diagnostics: Diagnostic[] = [];
  for (const [scope, path] of [["global", roots.globalConfigPath], ["workspace", roots.workspaceConfigPath]] as const) {
    if (!path) continue;
    try { mcps.push(...parseMcpSections(await readConfig(path), path, scope)); } catch (error) { diagnostics.push({ code: "MCP_CONFIG_INVALID", message: error instanceof Error ? error.message : String(error), path, severity: "error" }); }
  }
  return { roots, mcps: mcps.sort((a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope)), diagnostics };
}

export async function setMcpState(options: DiscoveryOptions, scope: Scope, name: string, enabled: boolean) {
  const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace");
  const records = parseMcpSections(await readConfig(path), path, scope); if (!records.some((record) => record.name === name)) throw new Error(`MCP not found: ${name}`);
  return setMcpEnabled(path, name, enabled);
}

export async function addMcpDefinition(options: DiscoveryOptions, scope: Scope, name: string, config: Record<string, unknown>) { const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace"); return addMcp(path, name, config); }
export async function updateMcpDefinition(options: DiscoveryOptions, scope: Scope, name: string, patch: Record<string, unknown>) { const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace"); return updateMcp(path, name, patch); }
export async function deleteMcpDefinition(options: DiscoveryOptions, scope: Scope, name: string) { const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace"); return deleteMcp(path, name); }

class JsonLineTransport implements McpTransport {
  private pending = new Map<number, (value: unknown) => void>(); private nextId = 1;
  constructor(private readonly child: ReturnType<typeof spawn>, private readonly timeoutMs: number) {
    let buffer = ""; child.stdout?.on("data", (chunk: Buffer) => { buffer += chunk.toString(); let index; while ((index = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1); if (!line) continue; try { const value = JSON.parse(line) as { id?: number; result?: unknown }; if (typeof value.id === "number") this.pending.get(value.id)?.(value.result); } catch { /* non-JSON server output is ignored */ } } });
  }
  request(method: string, params?: unknown): Promise<unknown> { const id = this.nextId++; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`MCP request timed out: ${method}`)); }, this.timeoutMs); this.pending.set(id, (value) => { clearTimeout(timer); this.pending.delete(id); resolve(value); }); if (!this.child.stdin) { reject(new Error("MCP stdio input is unavailable")); return; } this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`); }); }
  async close(): Promise<void> { this.child.kill(); }
}

async function defaultTransport(record: McpRecord, timeoutMs: number): Promise<{ transport: McpTransport; kind: "stdio" | "url" }> {
  const command = typeof record.config.command === "string" ? record.config.command : undefined;
  if (command) {
    const args = Array.isArray(record.config.args) ? record.config.args.map(String) : []; const child = spawn(command, args, { env: { ...process.env, ...(typeof record.config.env === "object" ? record.config.env as Record<string, string> : {}) }, stdio: ["pipe", "pipe", "pipe"] });
    return { transport: new JsonLineTransport(child, timeoutMs), kind: "stdio" };
  }
  const url = typeof record.config.url === "string" ? record.config.url : undefined; if (!url) throw new Error("MCP has neither command nor url");
  let response: Response | undefined;
  const transport: McpTransport = { request: async (method, params) => { response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(record.config.headers as Record<string, string> | undefined) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }); if (!response.ok) throw new Error(`MCP HTTP ${response.status}`); const json = await response.json() as { result?: unknown }; return json.result; }, close: async () => {} };
  return { transport, kind: "url" };
}

export async function loadMcpTools(record: McpRecord, options: McpToolOptions = {}): Promise<McpToolResult> {
  const timeoutMs = options.timeoutMs ?? 10_000; let transport = options.transport; let kind: "stdio" | "url" = "stdio"; const diagnostics: Diagnostic[] = [];
  try { if (!transport) ({ transport, kind } = await defaultTransport(record, timeoutMs)); await transport.request("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "codex-powertoys", version: "0.1.0" } }); await transport.request("notifications/initialized"); const result = await transport.request("tools/list") as { tools?: McpTool[] } | undefined; return { tools: result?.tools ?? [], diagnostics, transport: kind }; } catch (error) { diagnostics.push({ code: "MCP_TOOLS_UNAVAILABLE", message: error instanceof Error ? error.message : String(error), path: record.configPath, line: record.sourceRange.startLine, severity: "error" }); return { tools: [], diagnostics, transport: kind }; } finally { if (!options.transport && transport) await transport.close().catch(() => undefined); }
}
