import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { resolveRoots } from "./paths.js";
import type { AgentRecord, Diagnostic, DiscoveryOptions, RootSet } from "./types.js";

async function files(root: string): Promise<string[]> { const result: string[] = []; try { for (const entry of await readdir(root, { withFileTypes: true })) if (entry.isFile() && entry.name.endsWith(".toml")) result.push(join(root, entry.name)); } catch { /* optional root */ } return result; }

export async function discoverAgents(options: DiscoveryOptions = {}): Promise<{ roots: RootSet; agents: AgentRecord[]; diagnostics: Diagnostic[] }> {
  const roots = await resolveRoots(options); const agents: AgentRecord[] = []; const diagnostics: Diagnostic[] = [];
  const sources: Array<["global" | "workspace", string]> = [["global", join(roots.codexHome, "agents")]]; if (roots.workspaceRoot) sources.push(["workspace", join(roots.workspaceRoot, ".codex", "agents")]);
  for (const [scope, root] of sources) for (const path of await files(root)) { try { const content = await readFile(path, "utf8"); const declared = content.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1]; agents.push({ id: resolve(path), name: declared ?? basename(path, ".toml"), path: resolve(path), scope, content, diagnostics: [] }); } catch (error) { diagnostics.push({ code: "AGENT_READ_FAILED", message: error instanceof Error ? error.message : String(error), path, severity: "error" }); } }
  return { roots, agents: agents.sort((a, b) => a.name.localeCompare(b.name)), diagnostics };
}
