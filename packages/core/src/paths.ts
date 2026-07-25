import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { access, readdir, readFile } from "node:fs/promises";
import type { DiscoveryOptions, RootSet, Scope, SourceKind } from "./types.js";

const existing = async (path: string) => {
  try { await access(path); return true; } catch { return false; }
};

async function findSkillRoots(root: string): Promise<string[]> {
  const result: string[] = [];
  if (!(await existing(root))) return result;
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some((entry) => entry.isDirectory() && entry.name === "skills")) {
      result.push(join(dir, "skills"));
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) await visit(join(dir, entry.name), depth + 1);
    }
  };
  await visit(root, 0);
  return result;
}

async function configReferencedSkillPaths(configPath: string): Promise<string[]> {
  try {
    const text = await readFile(configPath, "utf8");
    return [...text.matchAll(/^\s*path\s*=\s*["']([^"']+)["']\s*$/gm)].map((match) => match[1]).filter(Boolean) as string[];
  } catch { return []; }
}

export async function resolveRoots(options: DiscoveryOptions = {}): Promise<RootSet> {
  const environment = options.env ?? process.env;
  const home = resolve(options.homeDir ?? environment.HOME ?? homedir());
  const codexHome = resolve(options.codexHome ?? environment.CODEX_HOME ?? join(home, ".codex"));
  const workspaceRoot = options.workspaceRoot ? resolve(options.workspaceRoot) : undefined;
  const globalConfigPath = join(codexHome, "config.toml");
  const workspaceConfigPath = workspaceRoot ? join(workspaceRoot, ".codex", "config.toml") : undefined;
  const skillRoots: RootSet["skillRoots"] = [];
  const add = (path: string, scope: Scope, sourceKind: SourceKind) => {
    const normalized = resolve(path);
    if (!skillRoots.some((root) => root.path === normalized)) skillRoots.push({ path: normalized, scope, sourceKind });
  };
  if (workspaceRoot) {
    add(join(workspaceRoot, ".agents", "skills"), "workspace", "workspace");
    add(join(workspaceRoot, ".codex", "skills"), "workspace", "workspace");
  }
  add(join(home, ".agents", "skills"), "global", "user");
  add(join(codexHome, "skills"), "global", "system");
  for (const path of await findSkillRoots(join(codexHome, "plugins"))) add(path, "global", "plugin");
  if (workspaceRoot) for (const path of await findSkillRoots(join(workspaceRoot, ".codex", "plugins"))) add(path, "workspace", "plugin");
  for (const path of [...await configReferencedSkillPaths(globalConfigPath), ...(workspaceConfigPath ? await configReferencedSkillPaths(workspaceConfigPath) : [])]) {
    add(path, workspaceRoot && resolve(path).startsWith(workspaceRoot) ? "workspace" : "global", "config");
  }
  const pluginRoots = await findPluginRoots(join(codexHome, "plugins"));
  return {
    hostLabel: environment.VSCODE_REMOTE_NAME ? `remote:${environment.VSCODE_REMOTE_NAME}` : "local",
    workspaceRoot,
    codexHome,
    globalConfigPath,
    workspaceConfigPath,
    skillRoots,
    pluginRoots,
    diagnostics: []
  };
}

export const discoverRoots = resolveRoots;

async function findPluginRoots(root: string): Promise<string[]> {
  const result: string[] = [];
  if (!(await existing(root))) return result;
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > 4) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some((entry) => entry.isDirectory() && entry.name === ".codex-plugin")) result.push(dir);
    for (const entry of entries) if (entry.isDirectory() && !entry.name.startsWith(".")) await visit(join(dir, entry.name), depth + 1);
  };
  await visit(root, 0);
  return result;
}
