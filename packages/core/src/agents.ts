import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { resolveRoots } from "./paths.js";
import type { AgentRecord, Diagnostic, DiscoveryOptions, RootSet } from "./types.js";

async function files(root: string): Promise<Array<{ path: string; relativePath: string }>> {
  const result: Array<{ path: string; relativePath: string }> = [];
  const visit = async (directory: string): Promise<void> => { let entries; try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; } for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) { const path = join(directory, entry.name); if (entry.isDirectory()) await visit(path); else if (entry.name.endsWith(".toml")) result.push({ path, relativePath: relative(root, path) }); } };
  await visit(root); return result;
}

export async function discoverAgents(options: DiscoveryOptions = {}): Promise<{ roots: RootSet; agents: AgentRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const agents: AgentRecord[] = []; const diagnostics: Diagnostic[] = [];
  const sources: Array<["global" | "workspace", string]> = [["global", join(roots.codexHome, "agents")]]; if (roots.workspaceRoot) sources.push(["workspace", join(roots.workspaceRoot, ".codex", "agents")]);
  for (const [scope, root] of sources) for (const item of await files(root)) { try { const content = await readFile(item.path, "utf8"); const declared = content.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1]; agents.push({ id: resolve(item.path), name: declared ?? basename(item.path, ".toml"), path: resolve(item.path), scope, rootPath: resolve(root), relativePath: item.relativePath, sourceKind: scope === "workspace" ? "workspace" : "system", content, readOnly: false, diagnostics: [] }); } catch (error) { diagnostics.push({ code: "AGENT_READ_FAILED", message: error instanceof Error ? error.message : String(error), path: item.path, severity: "error" }); } }
  return { roots, agents: agents.sort((a, b) => a.name.localeCompare(b.name)), diagnostics };
}
