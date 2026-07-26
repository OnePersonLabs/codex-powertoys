import { spawn } from "node:child_process";
import { addMcp, deleteMcp, mergeMcpToolPolicy, parseMcpPolicyOverlays, parseMcpSections, parseMcpToolPolicy, readConfig, setMcpEnabled, updateMcp } from "./toml.js";
import { resolveRoots } from "./paths.js";
import { discoverPlugins, pluginMcpRecords } from "./plugins.js";
import type { DiscoveryOptions, Diagnostic, McpPermissionGlyph, McpRecord, McpTool, McpToolOptions, McpToolPolicy, McpToolResult, McpTransport, RootSet, Scope } from "./types.js";

export async function discoverMcps(options: DiscoveryOptions = {}): Promise<{ roots: RootSet; mcps: McpRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const pluginCatalog = await discoverPlugins(options); const mcps: McpRecord[] = []; const diagnostics: Diagnostic[] = [...pluginCatalog.diagnostics];
  const policyOverlays = [] as ReturnType<typeof parseMcpPolicyOverlays>;
  for (const [scope, path] of [["global", roots.globalConfigPath], ["workspace", roots.workspaceConfigPath]] as const) {
    if (!path) continue;
    try { const text = await readConfig(path); mcps.push(...parseMcpSections(text, path, scope)); policyOverlays.push(...parseMcpPolicyOverlays(text, path, scope)); } catch (error) { diagnostics.push({ code: "MCP_CONFIG_INVALID", message: error instanceof Error ? error.message : String(error), path, severity: "error" }); }
  }
  for (const plugin of pluginCatalog.plugins) {
    const result = await pluginMcpRecords(plugin); mcps.push(...result.mcps); diagnostics.push(...result.diagnostics);
    for (const record of result.mcps) {
      const keys = [plugin.configKey, `${plugin.name}@${plugin.source ?? ""}`.replace(/@$/, ""), plugin.name, plugin.id].filter((value): value is string => Boolean(value));
      const overlays = policyOverlays.filter((overlay) => keys.includes(overlay.pluginKey) && overlay.server === record.name).sort((a, b) => (a.scope === "global" ? -1 : 1));
      let effective = record.toolPolicy;
      for (const overlay of overlays) effective = mergeMcpToolPolicy(effective, overlay.policy);
      record.toolPolicy = effective; record.effectiveToolPolicy = effective;
    }
  }
  const precedence = (record: McpRecord) => record.scope === "workspace" ? 0 : record.sourceKind === "config" ? 1 : 2; const grouped = new Map<string, McpRecord[]>(); for (const record of mcps) (grouped.get(record.name) ?? (grouped.set(record.name, []), grouped.get(record.name)!)).push(record);
  for (const group of grouped.values()) {
    const candidates = group.filter((record) => record.pluginEnabled && record.enabled && record.plugin?.effective !== "shadowed").sort((a, b) => precedence(a) - precedence(b) || a.id.localeCompare(b.id)); const winner = candidates[0];
    for (const record of group) { record.pluginEnabled = record.plugin?.enabled ?? true; record.disabledByPlugin = !record.pluginEnabled; if (!record.pluginEnabled) record.effective = "unavailable"; else if (record.plugin?.effective === "shadowed") { record.effective = "shadowed"; record.shadowedBy = record.plugin.shadowedBy; } else if (!record.enabled) record.effective = "disabled"; else if (winner && winner !== record) { record.effective = "shadowed"; record.shadowedBy = winner.id; } else record.effective = "active"; }
  }
  return { roots, mcps: mcps.sort((a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope) || a.sourceKind.localeCompare(b.sourceKind)), diagnostics };
}

export async function setMcpState(options: DiscoveryOptions, scope: Scope, name: string, enabled: boolean) {
  const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace");
  const records = parseMcpSections(await readConfig(path), path, scope); if (!records.some((record) => record.name === name)) throw new Error(`MCP not found: ${name}`);
  return setMcpEnabled(path, name, enabled);
}

export async function addMcpDefinition(options: DiscoveryOptions, scope: Scope, name: string, config: Record<string, unknown>) { const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace"); return addMcp(path, name, config); }
export async function updateMcpDefinition(options: DiscoveryOptions, scope: Scope, name: string, patch: Record<string, unknown>) { const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace"); return updateMcp(path, name, patch); }
export async function deleteMcpDefinition(options: DiscoveryOptions, scope: Scope, name: string) { const roots = await resolveRoots(options); const path = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!path) throw new Error("Workspace scope requires an open workspace"); return deleteMcp(path, name); }

interface PendingRequest { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; }

class JsonLineTransport implements McpTransport {
  private pending = new Map<number, PendingRequest>(); private nextId = 1; private closed = false; private exitPromise: Promise<void>;
  constructor(private readonly child: ReturnType<typeof spawn>, private readonly timeoutMs: number) {
    this.exitPromise = new Promise((resolve) => child.once("exit", () => resolve()));
    let buffer = "";
    const fail = (error: Error) => { for (const [id, request] of this.pending) { clearTimeout(request.timer); request.reject(error); this.pending.delete(id); } };
    child.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString(); let index: number;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1); if (!line) continue;
        let value: { id?: number; result?: unknown; error?: unknown };
        try { value = JSON.parse(line) as typeof value; } catch { if (line.startsWith("{")) fail(new Error("MCP returned malformed JSON")); continue; }
        if (typeof value.id !== "number") continue;
        const request = this.pending.get(value.id); if (!request) continue;
        clearTimeout(request.timer); this.pending.delete(value.id);
        if (value.error !== undefined) request.reject(new Error(`MCP JSON-RPC error: ${formatRpcError(value.error)}`));
        else if (Object.prototype.hasOwnProperty.call(value, "result")) request.resolve(value.result);
        else request.reject(new Error("MCP JSON-RPC response has neither result nor error"));
      }
    });
    child.once("error", (error) => fail(error instanceof Error ? error : new Error(String(error))));
    child.once("exit", (code, signal) => { this.closed = true; if (this.pending.size) fail(new Error(`MCP process exited${code === null ? ` with ${signal ?? "unknown signal"}` : ` with code ${code}`}`)); });
  }
  request(method: string, params?: unknown): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error("MCP transport is closed"));
    const notification = method.startsWith("notifications/");
    const id = notification ? undefined : this.nextId++;
    const message = JSON.stringify({ jsonrpc: "2.0", ...(id === undefined ? {} : { id }), method, params }) + "\n";
    if (!this.child.stdin) return Promise.reject(new Error("MCP stdio input is unavailable"));
    if (notification) { try { this.child.stdin.write(message); } catch (error) { return Promise.reject(error); } return Promise.resolve(undefined); }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id!); reject(new Error(`MCP request timed out: ${method}`)); }, this.timeoutMs);
      this.pending.set(id!, { resolve, reject, timer });
      try { this.child.stdin!.write(message); } catch (error) { clearTimeout(timer); this.pending.delete(id!); reject(error); }
    });
  }
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const [id, request] of this.pending) { clearTimeout(request.timer); request.reject(new Error("MCP transport closed")); this.pending.delete(id); }
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    try { this.child.kill(); } catch { return; }
    await Promise.race([this.exitPromise, new Promise<void>((resolve) => setTimeout(resolve, Math.min(this.timeoutMs, 250))) ]);
    if (this.child.exitCode === null && this.child.signalCode === null) {
      try { this.child.kill("SIGKILL"); } catch {}
      await Promise.race([this.exitPromise, new Promise<void>((resolve) => setTimeout(resolve, 250))]);
    }
  }
}

function formatRpcError(error: unknown): string { return typeof error === "string" ? error : error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : JSON.stringify(error); }

async function requestWithTimeout(transport: McpTransport, method: string, params: unknown, timeoutMs: number): Promise<unknown> {
  const request = transport.request(method, params);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`MCP request timed out: ${method}`)), timeoutMs); })]);
  } finally { if (timer) clearTimeout(timer); void request.catch(() => undefined); }
}

async function defaultTransport(record: McpRecord, timeoutMs: number): Promise<{ transport: McpTransport; kind: "stdio" | "url" }> {
  const command = typeof record.config.command === "string" ? record.config.command : undefined;
  if (command) {
    const args = Array.isArray(record.config.args) ? record.config.args.map(String) : []; const child = spawn(command, args, { cwd: record.workingDirectory, env: { ...process.env, ...(typeof record.config.env === "object" ? record.config.env as Record<string, string> : {}) }, stdio: ["pipe", "pipe", "pipe"] });
    return { transport: new JsonLineTransport(child, timeoutMs), kind: "stdio" };
  }
  const url = typeof record.config.url === "string" ? record.config.url : undefined; if (!url) throw new Error("MCP has neither command nor url");
  let nextId = 1;
  let closed = false;
  let serial = Promise.resolve();
  const controllers = new Set<AbortController>();
  const transport: McpTransport = {
    request: (method, params) => {
      const operation = serial.then(async () => {
        if (closed) throw new Error("MCP transport is closed");
        const notification = method.startsWith("notifications/");
        const body = {
          jsonrpc: "2.0",
          ...(notification ? {} : { id: nextId++ }),
          method,
          params,
        };
        const controller = new AbortController();
        controllers.add(controller);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(record.config.headers as Record<string, string> | undefined),
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`MCP HTTP ${response.status}`);
          if (notification) {
            await response.body?.cancel();
            return undefined;
          }
          const json = await response.json() as { result?: unknown; error?: unknown };
          if (json.error !== undefined)
            throw new Error(`MCP JSON-RPC error: ${formatRpcError(json.error)}`);
          if (!Object.prototype.hasOwnProperty.call(json, "result"))
            throw new Error("MCP JSON-RPC response has neither result nor error");
          return json.result;
        } finally {
          clearTimeout(timer);
          controllers.delete(controller);
        }
      });
      serial = operation.then(() => undefined, () => undefined);
      return operation;
    },
    close: async () => {
      closed = true;
      for (const controller of controllers) controller.abort();
      await serial;
    },
  };
  return { transport, kind: "url" };
}

export async function loadMcpTools(record: McpRecord, options: McpToolOptions = {}): Promise<McpToolResult> {
  const timeoutMs = options.timeoutMs ?? 10_000; let transport = options.transport; let kind: "stdio" | "url" = "stdio"; const diagnostics: Diagnostic[] = [];
  try {
    if (!transport) ({ transport, kind } = await defaultTransport(record, timeoutMs));
    await requestWithTimeout(transport, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "codex-powertoys", version: "0.1.0" } }, timeoutMs);
    void Promise.resolve(transport.request("notifications/initialized")).catch(() => undefined);
    const result = await requestWithTimeout(transport, "tools/list", undefined, timeoutMs) as { tools?: McpTool[] } | undefined;
    const policy = record.effectiveToolPolicy ?? record.toolPolicy ?? parseMcpToolPolicy(record.config);
    const tools = Array.isArray(result?.tools) ? result.tools.filter((tool): tool is McpTool => Boolean(tool) && typeof tool === "object" && typeof tool.name === "string").map((tool) => ({ ...tool, permissionGlyph: deriveMcpToolPermissionGlyph(tool.name, policy) })) : [];
    return { tools, diagnostics, transport: kind };
  } catch (error) {
    diagnostics.push({ code: "MCP_TOOLS_UNAVAILABLE", message: error instanceof Error ? error.message : String(error), path: record.configPath, line: record.sourceRange.startLine, severity: "error" }); return { tools: [], diagnostics, transport: kind };
  } finally { if (!options.transport && transport) await transport.close().catch((error) => diagnostics.push({ code: "MCP_TRANSPORT_CLOSE_FAILED", message: error instanceof Error ? error.message : String(error), path: record.configPath, severity: "warning" })); }
}

export function deriveMcpToolPermissionGlyph(toolName: string, policy?: McpToolPolicy): McpPermissionGlyph {
  if (policy?.disabledTools?.includes(toolName)) return "❌";
  if (policy?.enabledTools?.length && !policy.enabledTools.includes(toolName)) return "❌";
  const mode = policy?.tools?.[toolName]?.approvalMode ?? policy?.defaultApprovalMode;
  return mode === "auto" ? "✅" : "✋";
}
