import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import YAML from "yaml";
import { parseSkillOverrides, readConfig } from "./toml.js";
import { resolveRoots } from "./paths.js";
import { discoverPlugins } from "./plugins.js";
import type { Diagnostic, DiscoveryOptions, PluginInfo, PluginRecord, RootSet, SkillMetadata, SkillRecord, SkillState, SupportingEntry } from "./types.js";

async function fileExists(path: string): Promise<boolean> { try { await stat(path); return true; } catch { return false; } }

function frontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/); if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) { const item = line.match(/^([A-Za-z0-9_-]+):\s*["']?(.+?)["']?\s*$/); if (item?.[1] && item[2]) result[item[1]] = item[2]; }
  return result;
}

async function metadataFor(skillDirectory: string, diagnostics: Diagnostic[]): Promise<SkillMetadata | undefined> {
  const path = join(skillDirectory, "agents", "openai.yaml"); if (!(await fileExists(path))) return undefined;
  try {
    const parsed = YAML.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const iface = (parsed.interface ?? {}) as Record<string, unknown>;
    return { name: typeof iface.name === "string" ? iface.name : undefined, displayName: typeof iface.display_name === "string" ? iface.display_name : undefined, shortDescription: typeof iface.short_description === "string" ? iface.short_description : undefined, defaultPrompt: typeof iface.default_prompt === "string" ? iface.default_prompt : undefined, policy: typeof parsed.policy === "object" && parsed.policy ? parsed.policy as Record<string, unknown> : undefined };
  } catch (error) { diagnostics.push({ code: "SKILL_METADATA_INVALID", message: error instanceof Error ? error.message : String(error), path, severity: "warning" }); return undefined; }
}

async function tree(path: string, root: string): Promise<SupportingEntry[]> {
  let entries; try { entries = await readdir(path, { withFileTypes: true }); } catch { return []; }
  const result: SupportingEntry[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const childPath = join(path, entry.name); const item: SupportingEntry = { name: entry.name, path: childPath, kind: entry.isDirectory() ? "directory" : "file" };
    if (entry.isDirectory()) item.children = await tree(childPath, root); result.push(item);
  }
  return result;
}

function pluginForPath(path: string, plugins: PluginRecord[]): PluginInfo | undefined { return plugins.filter((plugin) => path === plugin.root || path.startsWith(`${plugin.root}${sep}`)).sort((a, b) => b.root.length - a.root.length)[0]; }

function pluginEnabledFromConfig(text: string, pluginName: string): boolean {
  const escaped = pluginName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const lines = text.split(/\r?\n/); const start = lines.findIndex((line) => new RegExp(`^\\[plugins\\.["']${escaped}(?:@[^"']+)?["']\\]\\s*$`).test(line.trim()));
  if (start < 0) return true; for (let index = start + 1; index < lines.length && !/^\s*\[/.test(lines[index]!); index++) { const enabled = lines[index]!.match(/^\s*enabled\s*=\s*(true|false)\s*$/); if (enabled) return enabled[1] !== "false"; } return true;
}

async function discoverFiles(root: string): Promise<string[]> {
  const result: string[] = []; if (!(await fileExists(root))) return result;
  const visit = async (dir: string): Promise<void> => {
    let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) { const path = join(dir, entry.name); if (entry.isDirectory()) await visit(path); else if (entry.name === "SKILL.md") result.push(path); }
  }; await visit(root); return result;
}

function scopeConfigPath(roots: RootSet, scope: "global" | "workspace"): string | undefined { return scope === "global" ? roots.globalConfigPath : roots.workspaceConfigPath; }

export async function discoverSkills(options: DiscoveryOptions = {}): Promise<{ roots: RootSet; skills: SkillRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const pluginCatalog = await discoverPlugins(options); const diagnostics: Diagnostic[] = [...roots.diagnostics, ...pluginCatalog.diagnostics]; const records: SkillRecord[] = [];
  const [globalText, workspaceText] = await Promise.all([readConfig(roots.globalConfigPath), roots.workspaceConfigPath ? readConfig(roots.workspaceConfigPath) : Promise.resolve("")]);
  const globalOverrides = parseSkillOverrides(globalText, roots.globalConfigPath, "global"); const workspaceOverrides = roots.workspaceConfigPath ? parseSkillOverrides(workspaceText, roots.workspaceConfigPath, "workspace") : [];
  for (const root of roots.skillRoots) {
    for (const skillPath of await discoverFiles(root.path)) {
      const itemDiagnostics: Diagnostic[] = []; const content = await readFile(skillPath, "utf8"); const front = frontmatter(content); const plugin = root.sourceKind === "plugin" ? pluginForPath(skillPath, pluginCatalog.plugins) : undefined;
      const metadata = await metadataFor(dirname(skillPath), itemDiagnostics); const name = metadata?.name ?? front.name ?? basename(dirname(skillPath));
      records.push({ id: resolve(skillPath), name, description: metadata?.shortDescription ?? front.description, skillPath: resolve(skillPath), skillDirectory: dirname(skillPath), scope: root.scope, sourceKind: root.sourceKind, plugin, metadata, content, supportingEntries: await tree(dirname(skillPath), dirname(skillPath)), state: { global: "default", workspace: "default", pluginEnabled: plugin?.enabled ?? true, effective: "active", glyph: "✅" }, diagnostics: itemDiagnostics });
    }
  }
  const referenced = [...globalOverrides, ...workspaceOverrides].map((override) => override.path).filter((path) => !records.some((record) => record.skillPath === resolve(path)));
  for (const path of referenced) if (await fileExists(path)) {
    const content = await readFile(path, "utf8"); const front = frontmatter(content); const itemDiagnostics: Diagnostic[] = []; const metadata = await metadataFor(dirname(path), itemDiagnostics); const name = metadata?.name ?? front.name ?? basename(dirname(path));
    records.push({ id: resolve(path), name, description: metadata?.shortDescription ?? front.description, skillPath: resolve(path), skillDirectory: dirname(path), scope: roots.workspaceRoot && resolve(path).startsWith(roots.workspaceRoot) ? "workspace" : "global", sourceKind: "config", plugin: pluginForPath(path, pluginCatalog.plugins), metadata, content, supportingEntries: await tree(dirname(path), dirname(path)), state: { global: "default", workspace: "default", pluginEnabled: pluginForPath(path, pluginCatalog.plugins)?.enabled ?? true, effective: "active", glyph: "✅" }, diagnostics: itemDiagnostics });
  }
  const precedence = (record: SkillRecord) => record.scope === "workspace" ? 0 : record.sourceKind === "user" ? 1 : record.sourceKind === "config" ? 2 : 3;
  for (const record of records) {
    const global = globalOverrides.find((override) => resolve(override.path) === record.skillPath); const local = workspaceOverrides.find((override) => resolve(override.path) === record.skillPath);
    record.state.global = global?.enabled === false ? "disabled" : global ? "enabled" : "default"; record.state.workspace = local?.enabled === false ? "disabled" : local ? "enabled" : "default";
    record.state.pluginEnabled = record.plugin?.enabled ?? true; record.state.disabledByPlugin = record.plugin !== undefined && !record.state.pluginEnabled;
  }
  const byName = new Map<string, SkillRecord[]>(); for (const record of records) (byName.get(record.name) ?? (byName.set(record.name, []), byName.get(record.name)!)).push(record);
  for (const group of byName.values()) {
    const candidates = group.filter((record) => record.state.global !== "disabled" && record.state.workspace !== "disabled" && record.state.pluginEnabled).sort((a, b) => precedence(a) - precedence(b) || a.skillPath.localeCompare(b.skillPath));
    const winner = candidates[0];
    for (const record of group) {
      if (!record.state.pluginEnabled) record.state.effective = "unavailable";
      else if (record.state.global === "disabled" || record.state.workspace === "disabled") record.state.effective = "disabled";
      else if (winner && winner !== record) { record.state.effective = "shadowed"; record.state.shadowedBy = winner.skillPath; }
      else record.state.effective = "active";
      record.state.glyph = record.state.effective === "active" ? "✅" : record.state.effective === "shadowed" ? "☑️" : record.state.workspace === "disabled" && record.state.global !== "disabled" ? "✖️" : "❌";
    }
  }
  return { roots, skills: records.sort((a, b) => a.name.localeCompare(b.name) || a.skillPath.localeCompare(b.skillPath)), diagnostics };
}

export async function setSkillEnabled(options: DiscoveryOptions, skillPath: string, scope: "global" | "workspace", enabled: boolean) {
  const roots = await resolveRoots(options); const path = scopeConfigPath(roots, scope); if (!path) throw new Error("Workspace scope requires an open workspace");
  const { setSkillOverride } = await import("./toml.js"); return setSkillOverride(path, skillPath, enabled);
}
