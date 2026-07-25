import { access, readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parsePluginOverrides, readConfig, setPluginOverride } from "./toml.js";
import { resolveRoots } from "./paths.js";
import type { Diagnostic, DiscoveryOptions, McpRecord, PluginInfo, PluginRecord, Scope, SourceRange } from "./types.js";

interface PluginRootCandidate { path: string; scope: Scope; source: string; manifestPath?: string; remoteInstallPath?: string; }

const exists = async (path: string): Promise<boolean> => { try { await access(path); return true; } catch { return false; } };

async function walkPluginRoots(root: string, scope: Scope): Promise<PluginRootCandidate[]> {
  if (!(await exists(root))) return [];
  const result: PluginRootCandidate[] = [];
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8) return;
    let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    const manifestPath = entries.some((entry) => entry.isDirectory() && entry.name === ".codex-plugin") ? join(dir, ".codex-plugin", "plugin.json") : undefined;
    const remoteInstallPath = entries.some((entry) => entry.isFile() && entry.name === ".codex-remote-plugin-install.json") ? join(dir, ".codex-remote-plugin-install.json") : undefined;
    if (manifestPath || remoteInstallPath) {
      const rel = relative(root, dir); const source = rel.split(/[\\/]/)[0] || basename(root); result.push({ path: resolve(dir), scope, source, manifestPath, remoteInstallPath });
    }
    for (const entry of entries) if (entry.isDirectory() && !entry.name.startsWith(".")) await visit(join(dir, entry.name), depth + 1);
  };
  await visit(root, 0); return result;
}

async function readJson(path: string | undefined): Promise<{ value?: Record<string, unknown>; diagnostic?: Diagnostic }> {
  if (!path || !(await exists(path))) return {};
  try { return { value: JSON.parse(await readFile(path, "utf8")) as Record<string, unknown> }; } catch (error) { return { diagnostic: { code: "PLUGIN_METADATA_INVALID", message: error instanceof Error ? error.message : String(error), path, severity: "warning" } }; }
}

async function skillFiles(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const result: string[] = []; const visit = async (dir: string): Promise<void> => { let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; } for (const entry of entries) { const path = join(dir, entry.name); if (entry.isDirectory()) await visit(path); else if (entry.name === "SKILL.md") result.push(resolve(path)); } }; await visit(root); return result;
}

function stringValue(value: unknown): string | undefined { return typeof value === "string" ? value : undefined; }

function pluginKeyCandidates(name: string, source: string): string[] { return [`${name}@${source}`, name]; }

function matchingOverride(overrides: ReturnType<typeof parsePluginOverrides>, name: string, source: string) {
  const candidates = pluginKeyCandidates(name, source); return candidates.map((key) => overrides.find((override) => override.key === key)).find(Boolean);
}

export async function discoverPlugins(options: DiscoveryOptions = {}): Promise<{ plugins: PluginRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const candidates = [...await walkPluginRoots(join(roots.codexHome, "plugins"), "global"), ...(roots.workspaceRoot ? await walkPluginRoots(join(roots.workspaceRoot, ".codex", "plugins"), "workspace") : [])];
  const globalText = await readConfig(roots.globalConfigPath); const workspaceText = roots.workspaceConfigPath ? await readConfig(roots.workspaceConfigPath) : "";
  const globalOverrides = parsePluginOverrides(globalText, roots.globalConfigPath, "global"); const workspaceOverrides = roots.workspaceConfigPath ? parsePluginOverrides(workspaceText, roots.workspaceConfigPath, "workspace") : [];
  const plugins: PluginRecord[] = []; const diagnostics: Diagnostic[] = [];
  for (const candidate of candidates) {
    const manifestResult = await readJson(candidate.manifestPath); const remoteResult = await readJson(candidate.remoteInstallPath); const metadata = manifestResult.value ?? {};
    if (manifestResult.diagnostic) diagnostics.push(manifestResult.diagnostic); if (remoteResult.diagnostic) diagnostics.push(remoteResult.diagnostic);
    const name = stringValue(metadata.name) ?? basename(candidate.path); const version = stringValue(metadata.version); const id = stringValue(metadata.id) ?? stringValue(remoteResult.value?.remote_plugin_id) ?? `${candidate.scope}:${candidate.path}`;
    const keyOverride = matchingOverride(candidate.scope === "workspace" ? workspaceOverrides : [...workspaceOverrides, ...globalOverrides], name, candidate.source) ?? matchingOverride(globalOverrides, name, candidate.source);
    const effectiveOverride = candidate.scope === "workspace" ? matchingOverride(workspaceOverrides, name, candidate.source) ?? matchingOverride(globalOverrides, name, candidate.source) : matchingOverride(globalOverrides, name, candidate.source);
    const configPath = effectiveOverride?.configPath; const configKey = effectiveOverride?.key; const enabled = effectiveOverride?.enabled !== false;
    const declaredSkills = stringValue(metadata.skills); const skillsRoot = declaredSkills ? resolve(candidate.path, declaredSkills) : join(candidate.path, "skills"); const skillPaths = await skillFiles(skillsRoot);
    const mcpPath = join(candidate.path, ".mcp.json"); const mcpResult = await readJson(mcpPath); if (mcpResult.diagnostic) diagnostics.push(mcpResult.diagnostic); const mcpServers = mcpResult.value?.mcpServers; const mcpNames = mcpServers && typeof mcpServers === "object" ? Object.keys(mcpServers as Record<string, unknown>) : [];
    const info: PluginInfo = { id, name, version, root: candidate.path, scope: candidate.scope, source: candidate.source, enabled, configPath, configKey, manifestPath: candidate.manifestPath, mcpPath: (await exists(mcpPath)) ? mcpPath : undefined, readOnly: true, metadata };
    plugins.push({ ...info, id, diagnostics: [], sourceRange: effectiveOverride?.range, skillPaths, mcpNames });
    void keyOverride;
  }
  return { plugins: plugins.sort((a, b) => a.name.localeCompare(b.name) || a.root.localeCompare(b.root)), diagnostics };
}

export async function setPluginEnabled(options: DiscoveryOptions, plugin: PluginRecord, enabled: boolean | undefined, scope: Scope = plugin.scope ?? "global") {
  const roots = await resolveRoots(options); const configPath = scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; if (!configPath) throw new Error("Workspace scope requires an open workspace"); const key = plugin.configKey ?? `${plugin.name}@${plugin.source ?? ""}`.replace(/@$/, ""); return setPluginOverride(configPath, key, enabled);
}

export async function pluginMcpRecords(plugin: PluginRecord, configPath = plugin.mcpPath): Promise<{ mcps: McpRecord[]; diagnostics: Diagnostic[] }> {
  if (!configPath || !(await exists(configPath))) return { mcps: [], diagnostics: [] };
  const result = await readJson(configPath); if (result.diagnostic) return { mcps: [], diagnostics: [result.diagnostic] }; const values = result.value?.mcpServers; if (!values || typeof values !== "object") return { mcps: [], diagnostics: [] };
  const mcps: McpRecord[] = []; const diagnostics: Diagnostic[] = [];
  for (const [name, raw] of Object.entries(values as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) { diagnostics.push({ code: "PLUGIN_MCP_INVALID", message: `MCP definition ${name} is not an object`, path: configPath, severity: "warning" }); continue; }
    const config = { ...(raw as Record<string, unknown>) }; if (config.type === "http" && !config.url && typeof config.url === "string") config.url = config.url;
    const text = await readFile(configPath, "utf8"); const line = text.split(/\r?\n/).findIndex((item) => new RegExp(`^[\\s\\t]*[\"']?${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\"?\\s*:`).test(item)); const startLine = line < 0 ? 0 : line;
    mcps.push({ id: `${plugin.id}:mcp:${name}`, name, scope: plugin.scope ?? "global", sourceKind: "plugin", plugin, configPath, config, enabled: plugin.enabled, pluginEnabled: plugin.enabled, effective: plugin.enabled ? "active" : "unavailable", disabledByPlugin: !plugin.enabled, workingDirectory: resolve(plugin.root, typeof config.cwd === "string" ? config.cwd : "."), readOnly: true, sourceRange: { path: configPath, startLine, endLine: startLine }, diagnostics: [] });
  }
  return { mcps, diagnostics };
}
