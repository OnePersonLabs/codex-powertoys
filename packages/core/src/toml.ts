import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ConfigMutationResult, ConfigOverride, Diagnostic, McpRecord, Scope, SourceRange } from "./types.js";

export interface TomlSection {
  header: string;
  path: string[];
  startLine: number;
  endLine: number;
  values: Record<string, unknown>;
  raw: string[];
}

export function parseTomlValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean).map(parseTomlValue);
  }
  return trimmed;
}

export function parseSections(text: string): TomlSection[] {
  const lines = text.split(/\r?\n/);
  const sections: TomlSection[] = [];
  let current: TomlSection | undefined;
  const finish = (endLine: number) => { if (current) { current.endLine = endLine; sections.push(current); } };
  lines.forEach((line, index) => {
    const header = line.match(/^\s*(\[\[|\[)([^\]]+)(\]\]|\])\s*$/);
    if (header) {
      finish(index - 1);
      const isArray = header[1] === "[[";
      const value = (header[2] ?? "").trim();
      current = { header: line, path: value.split(".").map((part) => part.replace(/^['"]|['"]$/g, "")), startLine: index, endLine: lines.length - 1, values: { __array: isArray }, raw: [] };
      return;
    }
    if (!current) return;
    current.raw.push(line);
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (match?.[1] && match[2] !== undefined) current.values[match[1]] = parseTomlValue(match[2]);
  });
  finish(lines.length - 1);
  return sections;
}

export async function readConfig(path: string): Promise<string> {
  try { return await readFile(path, "utf8"); } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return "";
    throw error;
  }
}

async function writeConfig(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

export function parseSkillOverrides(text: string, path: string, scope: Scope): ConfigOverride[] {
  return parseSections(text).filter((section) => section.path.length === 2 && section.path[0] === "skills" && section.path[1] === "config" && section.values.path).map((section) => ({
    path: String(section.values.path), enabled: typeof section.values.enabled === "boolean" ? section.values.enabled : undefined,
    scope, range: { path, startLine: section.startLine, endLine: section.endLine }
  }));
}

export function parseMcpSections(text: string, configPath: string, scope: Scope): McpRecord[] {
  const sections = parseSections(text); const roots = sections.filter((section) => section.path[0] === "mcp_servers" && section.path.length === 2 && !Boolean(section.values.__array));
  return roots.map((section) => {
    const name = section.path[1] ?? ""; const config: Record<string, unknown> = Object.fromEntries(Object.entries(section.values).filter(([key]) => key !== "__array"));
    for (const nested of sections.filter((candidate) => candidate.path[0] === "mcp_servers" && candidate.path[1] === name && candidate.path.length > 2)) {
      let target = config; const parts = nested.path.slice(2); for (const part of parts) target = (target[part] ??= {}) as Record<string, unknown>; for (const [key, value] of Object.entries(nested.values)) if (key !== "__array") target[key] = value;
    }
    return { id: `${scope}:${configPath}:${name}`, name, scope, configPath, config, enabled: config.enabled !== false, explicitEnabled: typeof config.enabled === "boolean" ? config.enabled : undefined, sourceRange: { path: configPath, startLine: section.startLine, endLine: Math.max(section.endLine, ...sections.filter((candidate) => candidate.path[0] === "mcp_servers" && candidate.path[1] === name).map((candidate) => candidate.endLine)) }, diagnostics: [] };
  });
}

function linesOf(text: string): string[] { return text.split(/\r?\n/); }

export async function setSkillOverride(configPath: string, skillPath: string, enabled: boolean): Promise<ConfigMutationResult> {
  const original = await readConfig(configPath);
  const lines = linesOf(original);
  const sections = parseSections(original);
  const section = sections.find((candidate) => candidate.path.join(".") === "skills.config" && candidate.values.path === skillPath);
  if (enabled) {
    if (!section) return { path: configPath, changed: false };
    const next = lines.slice(section.startLine, section.endLine + 1).filter((line) => !/^\s*enabled\s*=/.test(line));
    const onlyPath = next.filter((line) => line.trim() && !line.trim().startsWith("#") && !/^\s*\[/.test(line)).length <= 1;
    const replacement = onlyPath ? [] : next;
    lines.splice(section.startLine, section.endLine - section.startLine + 1, ...replacement);
  } else if (section) {
    const block = lines.slice(section.startLine, section.endLine + 1);
    if (!block.some((line) => /^\s*enabled\s*=/.test(line))) block.splice(1, 0, "enabled = false");
    else for (let index = 0; index < block.length; index++) if (/^\s*enabled\s*=/.test(block[index]!)) block[index] = "enabled = false";
    lines.splice(section.startLine, section.endLine - section.startLine + 1, ...block);
  } else {
    const prefix = original && !original.endsWith("\n") ? "\n" : "";
    lines.push(`${prefix}[[skills.config]]`, `path = ${JSON.stringify(skillPath)}`, "enabled = false");
  }
  const nextText = lines.join("\n");
  if (nextText === original) return { path: configPath, changed: false };
  await writeConfig(configPath, nextText); return { path: configPath, changed: true };
}

function mcpHeader(name: string): RegExp { return new RegExp(`^\\[mcp_servers\\.(?:\\"${escapeRegExp(name)}\\"|${escapeRegExp(name)})\\]$`); }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function mcpSectionEnd(lines: string[], start: number, name: string): number {
  const nestedHeader = new RegExp(`^\\[mcp_servers\\.(?:\\"${escapeRegExp(name)}\\"|${escapeRegExp(name)})\\.`);
  for (let index = start + 1; index < lines.length; index++) {
    const trimmed = lines[index]!.trim();
    if (/^\s*\[/.test(trimmed) && !nestedHeader.test(trimmed)) return index - 1;
  }
  return lines.length - 1;
}

export async function setMcpEnabled(configPath: string, name: string, enabled: boolean): Promise<ConfigMutationResult> {
  const original = await readConfig(configPath); const lines = linesOf(original); const start = lines.findIndex((line) => mcpHeader(name).test(line.trim()));
  if (start < 0) return { path: configPath, changed: false };
  const end = mcpSectionEnd(lines, start, name);
  const block = lines.slice(start, end + 1); const index = block.findIndex((line) => /^\s*enabled\s*=/.test(line));
  if (enabled) { if (index >= 0) block.splice(index, 1); }
  else if (index >= 0) block[index] = "enabled = false"; else block.splice(1, 0, "enabled = false");
  lines.splice(start, end - start + 1, ...block); const nextText = lines.join("\n");
  if (nextText === original) return { path: configPath, changed: false }; await writeConfig(configPath, nextText); return { path: configPath, changed: true };
}

function quoteKey(key: string): string { return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key); }
function serializeTomlValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value); if (typeof value === "boolean" || typeof value === "number") return String(value); if (Array.isArray(value)) return `[${value.map(serializeTomlValue).join(", ")}]`; return JSON.stringify(value);
}
function serializeMcp(name: string, config: Record<string, unknown>): string {
  const lines: string[] = [];
  const writeTable = (path: string[], values: Record<string, unknown>) => {
    lines.push(`[${path.map(quoteKey).join(".")}]`);
    const nested: Array<[string, Record<string, unknown>]> = [];
    for (const [key, value] of Object.entries(values)) {
      if (value && typeof value === "object" && !Array.isArray(value)) nested.push([key, value as Record<string, unknown>]);
      else lines.push(`${quoteKey(key)} = ${serializeTomlValue(value)}`);
    }
    for (const [key, value] of nested) { lines.push(""); writeTable([...path, key], value); }
  };
  writeTable(["mcp_servers", name], config);
  return lines.join("\n");
}

export async function addMcp(configPath: string, name: string, config: Record<string, unknown>): Promise<ConfigMutationResult> {
  const original = await readConfig(configPath); if (parseMcpSections(original, configPath, "global").some((record) => record.name === name)) throw new Error(`MCP already exists: ${name}`);
  const separator = original && !original.endsWith("\n") ? "\n\n" : original ? "\n" : ""; await writeConfig(configPath, `${original}${separator}${serializeMcp(name, config)}\n`); return { path: configPath, changed: true };
}

export async function updateMcp(configPath: string, name: string, patch: Record<string, unknown>): Promise<ConfigMutationResult> {
  const original = await readConfig(configPath); const lines = linesOf(original); const start = lines.findIndex((line) => mcpHeader(name).test(line.trim())); if (start < 0) throw new Error(`MCP not found: ${name}`);
  const end = mcpSectionEnd(lines, start, name);
  const existing = parseMcpSections(lines.slice(start, end + 1).join("\n"), configPath, "global")[0]; const merged = { ...(existing?.config ?? {}), ...patch }; lines.splice(start, end - start + 1, ...serializeMcp(name, merged).split("\n")); const nextText = lines.join("\n"); await writeConfig(configPath, nextText); return { path: configPath, changed: nextText !== original };
}

export async function deleteMcp(configPath: string, name: string): Promise<ConfigMutationResult> {
  const original = await readConfig(configPath); const lines = linesOf(original); const start = lines.findIndex((line) => mcpHeader(name).test(line.trim())); if (start < 0) return { path: configPath, changed: false };
  const end = mcpSectionEnd(lines, start, name);
  lines.splice(start, end - start + 1); const nextText = lines.join("\n").replace(/\n{3,}/g, "\n\n"); await writeConfig(configPath, nextText); return { path: configPath, changed: true };
}

export function diagnosticsFromError(error: unknown, path?: string): Diagnostic { return { code: "CONFIG_ERROR", message: error instanceof Error ? error.message : String(error), path, severity: "error" }; }
