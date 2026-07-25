import { cp, mkdir, readFile, rename as renamePath, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { addMcp, deleteMcp, parseMcpSections, readConfig, renameMcp, updateSkillPathReferences } from "./toml.js";
import { resolveRoots } from "./paths.js";
import type { ConfigMutationResult, Diagnostic, DiscoveryOptions, McpRecord, ResourceIdentity, ResourceKind, Scope, TransferItemResult, TransferRequest, TransferResult } from "./types.js";

function within(path: string, root: string): boolean { const child = resolve(path); const parent = resolve(root); return child === parent || child.startsWith(`${parent}${sep}`); }
function invalid(message: string, path?: string): Diagnostic { return { code: "RESOURCE_OPERATION_REJECTED", message, path, severity: "error" }; }
async function exists(path: string): Promise<boolean> { try { await stat(path); return true; } catch { return false; } }
function scopeRoot(roots: Awaited<ReturnType<typeof resolveRoots>>, kind: ResourceKind, scope: Scope): string {
  if (kind === "skill") return scope === "workspace" ? join(roots.workspaceRoot ?? "", ".agents", "skills") : join(dirname(roots.codexHome), ".agents", "skills");
  if (kind === "agent") return scope === "workspace" ? join(roots.workspaceRoot ?? "", ".codex", "agents") : join(roots.codexHome, "agents");
  return scope === "workspace" ? roots.workspaceConfigPath ?? "" : roots.globalConfigPath;
}
function resourceSourcePath(resource: ResourceIdentity): string { return resolve(resource.path); }
function resourceDestination(resource: ResourceIdentity, targetRoot: string): string { return resolve(targetRoot, resource.relativePath ?? basename(resource.path)); }
function assertManagedTarget(target: string, root: string, kind: ResourceKind): void { if (!root || !within(target, root) || (kind === "mcp" && resolve(target) !== resolve(root))) throw new Error(`Target is outside the managed ${kind} scope: ${target}`); }

async function pluginMcpConfig(resource: ResourceIdentity): Promise<Record<string, unknown>> {
  const text = JSON.parse(await readFile(resource.path, "utf8")) as { mcpServers?: Record<string, unknown> }; const value = text.mcpServers?.[resource.name]; if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Plugin MCP not found: ${resource.name}`); return value as Record<string, unknown>;
}

async function managedMcpConfig(resource: ResourceIdentity): Promise<Record<string, unknown>> {
  if (resource.sourceKind === "plugin") return pluginMcpConfig(resource);
  const record = parseMcpSections(await readConfig(resource.path), resource.path, resource.scope).find((item) => item.name === resource.name); if (!record) throw new Error(`MCP not found: ${resource.name}`); return record.config;
}

async function transferFilesystem(resource: ResourceIdentity, targetRoot: string, operation: "copy" | "move", replace: boolean): Promise<TransferItemResult> {
  const source = resourceSourcePath(resource); const destination = resourceDestination(resource, targetRoot); if (resolve(source) === resolve(destination)) return { resource, changed: false, destination };
  if (await exists(destination)) { if (!replace) return { resource, changed: false, skipped: true, destination }; await rm(destination, { recursive: true, force: true }); }
  await mkdir(dirname(destination), { recursive: true });
  if (operation === "copy") await cp(source, destination, { recursive: true, force: false });
  else { try { await renamePath(source, destination); } catch { await cp(source, destination, { recursive: true, force: false }); await rm(source, { recursive: true, force: true }); } }
  return { resource, changed: true, destination };
}

async function transferMcp(resource: ResourceIdentity, targetConfigPath: string, operation: "copy" | "move", replace: boolean): Promise<TransferItemResult> {
  const config = await managedMcpConfig(resource); const targetRecords = parseMcpSections(await readConfig(targetConfigPath), targetConfigPath, "global"); const conflict = targetRecords.some((record) => record.name === resource.name);
  if (conflict && !replace) return { resource, changed: false, skipped: true, destination: targetConfigPath };
  if (conflict) await deleteMcp(targetConfigPath, resource.name); await addMcp(targetConfigPath, resource.name, config);
  if (operation === "move" && resource.sourceKind !== "plugin" && resolve(resource.path) !== resolve(targetConfigPath)) await deleteMcp(resource.path, resource.name);
  return { resource, changed: true, destination: targetConfigPath };
}

export async function transferResources(options: DiscoveryOptions, request: TransferRequest): Promise<TransferResult> {
  const roots = await resolveRoots(options); const results: TransferItemResult[] = []; const diagnostics: Diagnostic[] = [];
  for (const resource of request.resources) {
    try {
      if (resource.readOnly && request.operation === "move") throw new Error("Plugin-owned resources cannot be moved");
      const root = scopeRoot(roots, resource.kind, request.targetScope); const target = request.targetPath ? resolve(request.targetPath) : root; assertManagedTarget(target, root, resource.kind);
      const destination = resource.kind === "mcp" ? target : resourceDestination(resource, target); const samePath = resolve(resource.path) === resolve(destination); let conflict = false;
      if (!samePath) conflict = resource.kind === "mcp" ? parseMcpSections(await readConfig(target), target, request.targetScope).some((record) => record.name === resource.name) : await exists(destination);
      if (request.conflictMode === "decide-each" && conflict) { results.push({ resource, changed: false, error: invalid("A conflict decision is required before this item can be transferred") }); continue; }
      const replace = request.conflictMode === "replace";
      const result = resource.kind === "mcp" ? await transferMcp(resource, target, request.operation, replace) : await transferFilesystem(resource, target, request.operation, replace); results.push(result);
    } catch (error) { const diagnostic = invalid(error instanceof Error ? error.message : String(error), resource.path); diagnostics.push(diagnostic); results.push({ resource, changed: false, error: diagnostic }); }
  }
  return { items: results, diagnostics };
}

export async function deleteResource(options: DiscoveryOptions, resource: ResourceIdentity): Promise<ConfigMutationResult> {
  if (resource.readOnly) throw new Error("Plugin-owned resources cannot be deleted"); const roots = await resolveRoots(options); const root = scopeRoot(roots, resource.kind, resource.scope); const target = resource.kind === "mcp" ? resource.path : resource.path; if (!within(target, root) || resolve(target) === resolve(root)) throw new Error("Protected discovery roots cannot be deleted");
  if (resource.kind === "mcp") return deleteMcp(resource.path, resource.name); await rm(target, { recursive: true, force: false }); return { path: target, changed: true };
}

export async function renameSkill(options: DiscoveryOptions, skillDirectory: string, newName: string, pluginOwned = false): Promise<ConfigMutationResult> {
  if (pluginOwned) throw new Error("Plugin-owned skills cannot be renamed"); const roots = await resolveRoots(options); const source = resolve(skillDirectory); const allowedRoots = [join(dirname(roots.codexHome), ".agents", "skills"), join(roots.codexHome, "skills"), ...(roots.workspaceRoot ? [join(roots.workspaceRoot, ".agents", "skills"), join(roots.workspaceRoot, ".codex", "skills")] : [])]; const root = allowedRoots.find((candidate) => within(source, candidate)); if (!root || source === resolve(root)) throw new Error("Skill is outside a managed skill root"); const destination = join(dirname(source), newName); if (await exists(destination)) throw new Error(`Skill already exists: ${newName}`); const skillFile = join(source, "SKILL.md"); const content = await readFile(skillFile, "utf8"); const updated = /^([ \t]*name\s*:\s*).*$/m.test(content) ? content.replace(/^([ \t]*name\s*:\s*).*$/m, (_match, prefix: string) => `${prefix}${newName}`) : content; await renamePath(source, destination); if (updated !== content) await writeFile(join(destination, "SKILL.md"), updated, "utf8"); const oldPath = skillFile; const newPath = join(destination, "SKILL.md"); for (const configPath of [roots.globalConfigPath, roots.workspaceConfigPath].filter((value): value is string => Boolean(value))) await updateSkillPathReferences(configPath, oldPath, newPath); return { path: destination, changed: true };
}

export async function renameAgent(options: DiscoveryOptions, agentPath: string, newName: string, pluginOwned = false): Promise<ConfigMutationResult> {
  if (pluginOwned) throw new Error("Plugin-owned agents cannot be renamed"); const roots = await resolveRoots(options); const source = resolve(agentPath); const allowedRoots = [join(roots.codexHome, "agents"), ...(roots.workspaceRoot ? [join(roots.workspaceRoot, ".codex", "agents")] : [])]; const root = allowedRoots.find((candidate) => within(source, candidate)); if (!root || source === resolve(root)) throw new Error("Agent is outside a managed agent root"); const destination = join(dirname(source), `${newName}${extname(source) || ".toml"}`); if (await exists(destination)) throw new Error(`Agent already exists: ${newName}`); const content = await readFile(source, "utf8"); const namePattern = /^\s*name\s*=.*$/m; const updated = namePattern.test(content) ? content.replace(namePattern, `name = ${JSON.stringify(newName)}`) : `name = ${JSON.stringify(newName)}\n${content}`; await writeFile(source, updated, "utf8"); await renamePath(source, destination); return { path: destination, changed: true };
}

export async function renameMcpAcrossScopes(options: DiscoveryOptions, oldName: string, newName: string, sourcePath?: string): Promise<ConfigMutationResult[]> {
  const roots = await resolveRoots(options); const paths = [roots.globalConfigPath, roots.workspaceConfigPath].filter((value): value is string => Boolean(value)); if (sourcePath && !paths.includes(sourcePath)) paths.unshift(sourcePath); const results: ConfigMutationResult[] = [];
  for (const path of paths) if (parseMcpSections(await readConfig(path), path, "global").some((record) => record.name === oldName)) results.push(await renameMcp(path, oldName, newName));
  if (!results.length) throw new Error(`MCP not found: ${oldName}`); return results;
}
