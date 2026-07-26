import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parseMcpToolPolicy, parsePluginOverrides, readConfig, setPluginOverride } from "./toml.js";
import { resolveRoots } from "./paths.js";
import { resourceStatusGlyph } from "./status-glyph.js";
import type { Diagnostic, DiscoveryOptions, McpRecord, PluginInfo, PluginRecord, Scope, SourceRange } from "./types.js";

interface PluginRootCandidate { path: string; scope: Scope; source: string; manifestPath: string; }

const exists = async (path: string): Promise<boolean> => { try { await access(path); return true; } catch { return false; } };

async function walkPluginRoots(root: string, scope: Scope): Promise<PluginRootCandidate[]> {
  if (!(await exists(root))) return [];
  const result: PluginRootCandidate[] = [];
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8) return;
    let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    const manifestPath = entries.some((entry) => entry.isDirectory() && entry.name === ".codex-plugin") ? join(dir, ".codex-plugin", "plugin.json") : undefined;
    if (manifestPath && await exists(manifestPath)) {
      const rel = relative(root, dir).split(/[\\/]/).filter(Boolean); const source = (rel[0] === "cache" ? rel[1] : rel[0]) || basename(root); result.push({ path: resolve(dir), scope, source, manifestPath });
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
function stringValues(value: unknown): string[] { return typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

function pluginKeyCandidates(name: string, source: string): string[] { return [`${name}@${source}`, name]; }

function matchingOverride(overrides: ReturnType<typeof parsePluginOverrides>, name: string, source: string) {
  const candidates = pluginKeyCandidates(name, source); return candidates.map((key) => overrides.find((override) => override.key === key)).find(Boolean);
}

export async function discoverPlugins(options: DiscoveryOptions = {}): Promise<{ plugins: PluginRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const candidates = [...await walkPluginRoots(join(roots.codexHome, "plugins"), "global"), ...(roots.workspaceRoot ? await walkPluginRoots(join(roots.workspaceRoot, ".codex", "plugins"), "workspace") : [])];
  const seenManifestPaths = new Set<string>();
  const globalText = await readConfig(roots.globalConfigPath); const workspaceText = roots.workspaceConfigPath ? await readConfig(roots.workspaceConfigPath) : "";
  const globalOverrides = parsePluginOverrides(globalText, roots.globalConfigPath, "global"); const workspaceOverrides = roots.workspaceConfigPath ? parsePluginOverrides(workspaceText, roots.workspaceConfigPath, "workspace") : [];
  const plugins: PluginRecord[] = []; const diagnostics: Diagnostic[] = [];
  for (const candidate of candidates) {
    const canonicalManifestPath = await realpath(candidate.manifestPath).catch(() => resolve(candidate.manifestPath));
    if (seenManifestPaths.has(canonicalManifestPath)) continue;
    seenManifestPaths.add(canonicalManifestPath);
    const manifestResult = await readJson(candidate.manifestPath); const metadata = manifestResult.value ?? {}; const pluginDiagnostics: Diagnostic[] = [];
    if (manifestResult.diagnostic) { diagnostics.push(manifestResult.diagnostic); pluginDiagnostics.push(manifestResult.diagnostic); }
    const fallbackName = basename(dirname(candidate.path)); const name = stringValue(metadata.name) ?? fallbackName; const version = stringValue(metadata.version) ?? basename(candidate.path); const id = canonicalManifestPath;
    const effectiveOverride = candidate.scope === "workspace"
      ? matchingOverride(workspaceOverrides, name, candidate.source)
      : matchingOverride(globalOverrides, name, candidate.source);
    const configPath = effectiveOverride?.configPath; const configKey = effectiveOverride?.key; const enabled = effectiveOverride?.enabled !== false;
    const declaredSkills = stringValues(metadata.skills); const skillRoots = declaredSkills.length ? declaredSkills.map((value) => resolve(candidate.path, value)) : [join(candidate.path, "skills")]; const skillPaths: string[] = []; for (const skillsRoot of skillRoots) { if (declaredSkills.length && !(await exists(skillsRoot))) pluginDiagnostics.push({ code: "PLUGIN_SKILLS_MISSING", message: `Declared plugin skills directory is missing: ${skillsRoot}`, path: skillsRoot, severity: "warning" }); skillPaths.push(...await skillFiles(skillsRoot)); }
    const declaredMcp = stringValue(metadata.mcpServers); const mcpCandidate = declaredMcp ? resolve(candidate.path, declaredMcp) : join(candidate.path, ".mcp.json"); const mcpPath = (await exists(mcpCandidate)) ? mcpCandidate : undefined; if (declaredMcp && !mcpPath) pluginDiagnostics.push({ code: "PLUGIN_MCP_MISSING", message: `Declared plugin MCP file is missing: ${mcpCandidate}`, path: mcpCandidate, severity: "warning" }); const mcpResult = await readJson(mcpPath); if (mcpResult.diagnostic) { diagnostics.push(mcpResult.diagnostic); pluginDiagnostics.push(mcpResult.diagnostic); } const mcpServers = mcpResult.value?.mcpServers; const mcpNames = mcpServers && typeof mcpServers === "object" ? Object.keys(mcpServers as Record<string, unknown>) : [];
    const info: PluginInfo = { id, name, version, root: candidate.path, scope: candidate.scope, source: candidate.source, enabled, configPath, configKey, manifestPath: candidate.manifestPath, mcpPath, readOnly: true, metadata };
    plugins.push({ ...info, id, effective: enabled ? "active" : "disabled", glyph: resourceStatusGlyph(enabled ? "active" : "disabled"), diagnostics: pluginDiagnostics, sourceRange: effectiveOverride?.range, skillPaths, mcpNames });
  }
  const byName = new Map<string, PluginRecord[]>();
  for (const plugin of plugins) (byName.get(plugin.name) ?? (byName.set(plugin.name, []), byName.get(plugin.name)!)).push(plugin);
  for (const group of byName.values()) {
    const winner = group.sort((a, b) => (a.scope === "workspace" ? 0 : 1) - (b.scope === "workspace" ? 0 : 1) || a.root.localeCompare(b.root))[0];
    for (const plugin of group) {
      if (winner && winner !== plugin) { plugin.effective = "shadowed"; plugin.shadowedBy = winner.id; plugin.shadowedByEnabled = winner.enabled; }
      else if (!plugin.enabled) plugin.effective = "disabled";
      else plugin.effective = "active";
      plugin.glyph = resourceStatusGlyph(plugin.effective, plugin.shadowedByEnabled);
    }
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
    const config = { ...(raw as Record<string, unknown>) };
    const text = await readFile(configPath, "utf8"); const line = text.split(/\r?\n/).findIndex((item) => new RegExp(`^[\\s\\t]*[\"']?${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\"?\\s*:`).test(item)); const startLine = line < 0 ? 0 : line;
    const toolPolicy = parseMcpToolPolicy(config);
    const pluginAvailable = plugin.enabled;
    mcps.push({ id: `${plugin.id}:mcp:${name}`, name, scope: plugin.scope ?? "global", sourceKind: "plugin", plugin, configPath, config, enabled: pluginAvailable, pluginEnabled: pluginAvailable, effective: pluginAvailable ? "active" : "unavailable", disabledByPlugin: !pluginAvailable, workingDirectory: resolve(plugin.root, typeof config.cwd === "string" ? config.cwd : "."), readOnly: true, sourceRange: { path: configPath, startLine, endLine: startLine }, diagnostics: [], toolPolicy, effectiveToolPolicy: toolPolicy });
  }
  return { mcps, diagnostics };
}
