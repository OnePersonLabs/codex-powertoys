import type { ChildProcess } from "node:child_process";

export type Scope = "global" | "workspace";
export type SourceKind = "workspace" | "user" | "plugin" | "system" | "config" | "unknown";

export interface Diagnostic {
  code: string;
  message: string;
  path?: string;
  line?: number;
  severity: "info" | "warning" | "error";
}

export interface SourceRange {
  path: string;
  startLine: number;
  endLine: number;
  startOffset?: number;
  endOffset?: number;
}

export interface PluginInfo {
  id?: string;
  name: string;
  version?: string;
  root: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface SupportingEntry {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: SupportingEntry[];
}

export interface SkillMetadata {
  name?: string;
  description?: string;
  displayName?: string;
  shortDescription?: string;
  defaultPrompt?: string;
  policy?: Record<string, unknown>;
}

export interface SkillState {
  global: "default" | "enabled" | "disabled";
  workspace: "default" | "enabled" | "disabled";
  pluginEnabled: boolean;
  effective: "active" | "disabled" | "shadowed" | "unavailable";
  shadowedBy?: string;
  glyph: "✅" | "☑️" | "❌" | "✖️";
}

export interface SkillRecord {
  id: string;
  name: string;
  description?: string;
  skillPath: string;
  skillDirectory: string;
  scope: Scope;
  sourceKind: SourceKind;
  plugin?: PluginInfo;
  metadata?: SkillMetadata;
  content: string;
  supportingEntries: SupportingEntry[];
  state: SkillState;
  diagnostics: Diagnostic[];
}

export interface AgentRecord {
  id: string;
  name: string;
  path: string;
  scope: Scope;
  content: string;
  diagnostics: Diagnostic[];
}

export interface RootSet {
  hostLabel: string;
  workspaceRoot?: string;
  codexHome: string;
  globalConfigPath: string;
  workspaceConfigPath?: string;
  skillRoots: Array<{ path: string; scope: Scope; sourceKind: SourceKind }>;
  pluginRoots: string[];
  diagnostics: Diagnostic[];
}

export interface DiscoveryOptions {
  workspaceRoot?: string;
  codexHome?: string;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ConfigOverride {
  path: string;
  enabled?: boolean;
  scope: Scope;
  range: SourceRange;
}

export interface McpRecord {
  id: string;
  name: string;
  scope: Scope;
  configPath: string;
  config: Record<string, unknown>;
  enabled: boolean;
  explicitEnabled?: boolean;
  sourceRange: SourceRange;
  diagnostics: Diagnostic[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpToolResult {
  tools: McpTool[];
  diagnostics: Diagnostic[];
  transport: "stdio" | "url";
}

export interface McpTransport {
  request(method: string, params?: unknown): Promise<unknown>;
  close(): Promise<void>;
}

export interface McpToolOptions {
  timeoutMs?: number;
  transport?: McpTransport;
}

export interface ConfigMutationResult {
  path: string;
  changed: boolean;
}

export type FileReader = (path: string) => Promise<string>;
