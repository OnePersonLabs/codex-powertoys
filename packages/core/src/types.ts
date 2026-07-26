export type Scope = "global" | "workspace";
export type SourceKind = "workspace" | "user" | "plugin" | "system" | "config" | "unknown";
export type ResourceKind = "skill" | "mcp" | "agent";
export type EffectiveResourceState = "active" | "disabled" | "shadowed" | "unavailable";
export type ConflictMode = "skip" | "replace" | "decide-each";
export type TransferOperation = "copy" | "move";

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
  scope?: Scope;
  source?: string;
  enabled: boolean;
  configPath?: string;
  configKey?: string;
  manifestPath?: string;
  mcpPath?: string;
  readOnly?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PluginRecord extends PluginInfo {
  id: string;
  diagnostics: Diagnostic[];
  sourceRange?: SourceRange;
  skillPaths: string[];
  mcpNames: string[];
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
  effective: EffectiveResourceState;
  shadowedBy?: string;
  disabledByPlugin?: boolean;
  glyph: "✅" | "☑️" | "❌" | "✖️";
}

export interface SkillRecord {
  id: string;
  name: string;
  description?: string;
  skillPath: string;
  skillDirectory: string;
  rootPath?: string;
  relativePath?: string;
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
  rootPath: string;
  relativePath: string;
  sourceKind: SourceKind;
  readOnly?: boolean;
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

export interface PluginOverride {
  key: string;
  name: string;
  source?: string;
  enabled?: boolean;
  scope: Scope;
  configPath: string;
  range: SourceRange;
}

export interface McpRecord {
  id: string;
  name: string;
  scope: Scope;
  sourceKind: SourceKind;
  plugin?: PluginInfo;
  configPath: string;
  config: Record<string, unknown>;
  enabled: boolean;
  pluginEnabled: boolean;
  effective: EffectiveResourceState;
  shadowedBy?: string;
  disabledByPlugin?: boolean;
  workingDirectory?: string;
  readOnly?: boolean;
  explicitEnabled?: boolean;
  sourceRange: SourceRange;
  diagnostics: Diagnostic[];
  /** Effective policy used to annotate tools for display. */
  toolPolicy?: McpToolPolicy;
  /** Alias retained for callers that distinguish raw and merged policy. */
  effectiveToolPolicy?: McpToolPolicy;
}

export type McpPermissionGlyph = "✅" | "❌" | "✋";

export interface McpToolPolicy {
  enabledTools?: string[];
  disabledTools?: string[];
  defaultApprovalMode?: string;
  tools?: Record<string, { approvalMode?: string }>;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  permissionGlyph?: McpPermissionGlyph;
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
  diagnostics?: Diagnostic[];
}

export interface ResourceIdentity {
  kind: ResourceKind;
  id: string;
  name: string;
  scope: Scope;
  path: string;
  relativePath?: string;
  sourceKind: SourceKind;
  readOnly?: boolean;
  plugin?: PluginInfo;
}

export interface TransferRequest {
  resources: ResourceIdentity[];
  operation: TransferOperation;
  targetScope: Scope;
  targetPath?: string;
  conflictMode: ConflictMode;
}

export interface TransferItemResult {
  resource: ResourceIdentity;
  changed: boolean;
  skipped?: boolean;
  destination?: string;
  error?: Diagnostic;
}

export interface TransferResult {
  items: TransferItemResult[];
  diagnostics: Diagnostic[];
}

export type FileReader = (path: string) => Promise<string>;
