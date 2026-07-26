import * as vscode from "vscode";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { agentTreeChildren } from "./agent-tree.js";
import { pluginTooltip } from "./plugin-tooltip.js";
import {
  ResourceExpansionState,
  type ExpansionAction,
  type ExpansionNode,
} from "./resource-expansion.js";
import { McpToolCache, type McpToolCacheEntry } from "./mcp-tool-cache.js";
import { resourceGroupLabel, visibleGroupKinds } from "./resource-groups.js";
import { tooltipPath } from "./resource-path.js";
import {
  mcpToolTooltip,
  mcpTooltip,
  rootTooltip,
  skillTooltip,
} from "./resource-tooltip.js";
import {
  discoverAgents,
  discoverMcps,
  discoverPlugins,
  discoverSkills,
  deleteResource,
  renameAgent,
  renameMcpAcrossScopes,
  renameSkill,
  setMcpState,
  setPluginEnabled,
  setSkillEnabled,
  transferResources,
  type AgentRecord,
  type McpRecord,
  type McpTool,
  type PluginRecord,
  type ResourceIdentity,
  type RootSet,
  type SkillRecord,
  type SupportingEntry,
} from "@codex-powertoys/core";

const RESOURCE_MIME = "application/vnd.codex-powertoys.resource";
type Scope = "global" | "workspace";
type GroupKind = "plugins" | "mcps" | "skills" | "agents";
type NodeKind =
  | "root"
  | "group"
  | "skill"
  | "entry"
  | "mcp"
  | "mcpTool"
  | "plugin"
  | "agent"
  | "agentDir";
type Node = {
  kind: NodeKind;
  label: string;
  scope?: Scope;
  targetPath?: string;
  relativePath?: string;
  skill?: SkillRecord;
  mcp?: McpRecord;
  plugin?: PluginRecord;
  tool?: McpTool;
  toolParent?: McpRecord;
  agent?: AgentRecord;
  entry?: SupportingEntry;
  groupKind?: GroupKind;
  parentPlugin?: PluginRecord;
  underSkill?: boolean;
  underMcp?: boolean;
  parent?: Node;
};

type ClipboardState = {
  operation: "copy" | "move";
  resources: ResourceIdentity[];
};

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
function coreOptions() {
  return { workspaceRoot: workspaceRoot() };
}
function pluginManifestPath(plugin: PluginRecord): string {
  return plugin.manifestPath ?? join(plugin.root, ".codex-plugin", "plugin.json");
}
function scopeLabel(scope: Scope): string {
  return scope === "global" ? "Global" : "Workspace";
}
const TYPE_ICONS = { plugin: "🔌", mcp: "🧰", tool: "🔨", skill: "💪", agent: "🤖" } as const;
const TOOL_PERMISSION_GLYPHS = ["✅", "❌", "✋"] as const;
type ToolPermissionGlyph = (typeof TOOL_PERMISSION_GLYPHS)[number];

function statusGlyph(value: SkillRecord | McpRecord | PluginRecord): string {
  const effective = "state" in value
    ? value.state.effective
    : value.effective;
  if (effective === "active") return "✅";
  if (effective === "shadowed") return "✖️";
  if (value.scope === "workspace" && "enabled" in value && value.enabled === false) return "✖️";
  if ("state" in value && value.state.workspace === "disabled" && value.state.global !== "disabled") return "✖️";
  return "❌";
}

function typedLabel(
  type: keyof typeof TYPE_ICONS,
  name: string,
  value?: SkillRecord | McpRecord | PluginRecord,
): string {
  return `${value ? `${statusGlyph(value)} ` : ""}${TYPE_ICONS[type]} ${name}`;
}

function skillResource(skill: SkillRecord): ResourceIdentity {
  return {
    kind: "skill",
    id: skill.id,
    name: skill.name,
    scope: skill.scope,
    path: skill.skillDirectory,
    relativePath: skill.relativePath,
    sourceKind: skill.sourceKind,
    readOnly: Boolean(skill.plugin),
    plugin: skill.plugin,
  };
}
function mcpResource(mcp: McpRecord): ResourceIdentity {
  return {
    kind: "mcp",
    id: mcp.id,
    name: mcp.name,
    scope: mcp.scope,
    path: mcp.configPath,
    sourceKind: mcp.sourceKind,
    readOnly: Boolean(mcp.readOnly),
    plugin: mcp.plugin,
  };
}
function agentResource(agent: AgentRecord): ResourceIdentity {
  return {
    kind: "agent",
    id: agent.id,
    name: agent.name,
    scope: agent.scope,
    path: agent.path,
    relativePath: agent.relativePath,
    sourceKind: agent.sourceKind,
    readOnly: Boolean(agent.readOnly),
  };
}
function nodeResource(node: Node): ResourceIdentity | undefined {
  if (node.skill) return skillResource(node.skill);
  if (node.mcp) return mcpResource(node.mcp);
  if (node.agent) return agentResource(node.agent);
  if (node.kind === "agentDir" && node.targetPath && node.scope)
    return {
      kind: "agent",
      id: `${node.scope}:${node.targetPath}`,
      name: basename(node.targetPath),
      scope: node.scope,
      path: node.targetPath,
      relativePath: node.relativePath ?? basename(node.targetPath),
      sourceKind: node.scope === "workspace" ? "workspace" : "system",
    };
  return undefined;
}

function nodeTarget(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (node.targetPath) return node.targetPath;
  if (node.entry?.kind === "directory") return node.entry.path;
  return undefined;
}

function nodePath(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (node.skill) return node.skill.skillPath;
  if (node.mcp) return node.mcp.configPath;
  if (node.plugin) return node.plugin.root;
  if (node.agent) return node.agent.path;
  if (node.toolParent) return node.toolParent.configPath;
  if (node.entry) return node.entry.path;
  return node.targetPath;
}

function nodeKey(node: Node): string {
  const toolKey = node.tool
    ? `${node.toolParent?.id ?? node.toolParent?.name ?? "mcp"}:${node.tool.name}`
    : undefined;
  return `${node.kind}:${node.plugin?.id ?? node.skill?.id ?? node.mcp?.id ?? toolKey ?? node.agent?.id ?? node.targetPath ?? node.entry?.path ?? node.label}`;
}

function nodeIsNestedResource(node: Node): boolean {
  return (
    node.kind === "plugin" ||
    node.kind === "skill" ||
    node.kind === "mcp" ||
    node.kind === "mcpTool" ||
    Boolean(node.underSkill) ||
    Boolean(node.underMcp)
  );
}

function resourcesExpansionNode(node: Node): ExpansionNode {
  const root = node.kind === "root";
  return {
    id: nodeKey(node),
    root,
    skillRelated: node.kind === "skill" || Boolean(node.underSkill),
    initiallyExpanded: root,
  };
}

function toolPermissionGlyph(tool: McpTool): ToolPermissionGlyph {
  const glyph = (tool as McpTool & { permissionGlyph?: string }).permissionGlyph;
  return TOOL_PERMISSION_GLYPHS.includes(glyph as ToolPermissionGlyph)
    ? (glyph as ToolPermissionGlyph)
    : "✋";
}

function mcpToolNode(tool: McpTool, mcp: McpRecord): Node {
  return {
    kind: "mcpTool",
    label: `${toolPermissionGlyph(tool)} ${TYPE_ICONS.tool} ${tool.name}`,
    scope: mcp.scope,
    tool,
    toolParent: mcp,
    underMcp: true,
  };
}

function nodeIsExpandable(
  node: Node,
  showSupporting: boolean,
  allowSkillChildren: boolean,
): boolean {
  return (
    node.kind === "root" ||
    node.kind === "group" ||
    node.kind === "plugin" ||
    node.kind === "mcp" ||
    (node.kind === "skill" &&
      showSupporting &&
      allowSkillChildren &&
      node.skill!.supportingEntries.length > 0) ||
    (node.kind === "entry" && node.entry?.kind === "directory") ||
    node.kind === "agentDir"
  );
}

function nodeContextValue(node: Node): string {
  if (node.kind === "plugin") return "codexPlugin";
  if (node.skill?.plugin) return "codexPluginSkill";
  if (node.mcp?.plugin) return "codexPluginMcp";
  if (node.kind === "mcpTool") return "codexMcpTool";
  if (node.kind === "skill") return "codexSkill";
  if (node.kind === "mcp") return "codexMcp";
  if (node.kind === "agent") return "codexAgent";
  if (node.kind === "agentDir") return "codexAgentDir";
  if (node.kind === "root") return "codexRoot";
  if (node.kind === "group") return "codexResourceGroup";
  return node.kind;
}

function groupLabel(kind: GroupKind): string {
  return resourceGroupLabel(kind);
}

function createTreeItem(
  node: Node,
  expanded: boolean,
  showSupporting: boolean,
  allowSkillChildren: boolean,
): vscode.TreeItem {
  const collapsible = nodeIsExpandable(node, showSupporting, allowSkillChildren);
  const item = new vscode.TreeItem(
    node.label,
    collapsible
      ? expanded
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None,
  );
  item.id = nodeKey(node);
  item.contextValue = nodeContextValue(node);
  const path = nodePath(node);
  if (node.kind === "root") item.tooltip = rootTooltip(path);
  else if (path)
    item.tooltip = `Path: ${tooltipPath(path, node.scope, workspaceRoot())}`;
  if (node.skill) {
    item.tooltip = skillTooltip(node.skill, workspaceRoot());
    item.command = {
      command: "codexPowerToys.openSkill",
      title: "Open Skill",
      arguments: [node.skill],
    };
  }
  if (node.mcp) {
    item.tooltip = mcpTooltip(node.mcp, workspaceRoot());
    item.command = {
      command: "codexPowerToys.showMcp",
      title: "Show MCP",
      arguments: [node.mcp],
    };
  }
  if (node.plugin) {
    item.tooltip = pluginTooltip(node.plugin, workspaceRoot());
    item.command = {
      command: "codexPowerToys.plugin.openManifest",
      title: "Open Plugin Manifest",
      arguments: [node.plugin],
    };
  }
  if (node.tool && node.toolParent) {
    item.tooltip = mcpToolTooltip(node.tool, node.toolParent, workspaceRoot());
    item.command = {
      command: "codexPowerToys.showMcpTool",
      title: "Show MCP Tool",
      arguments: [node.tool, node.toolParent],
    };
  }
  if (node.agent) {
    const homeRelative = relative(homedir(), node.agent.path);
    const displayPath = node.agent.scope === "global"
      ? !isAbsolute(homeRelative) && !homeRelative.startsWith("..")
        ? `~/${homeRelative.split(sep).join("/")}`
        : node.agent.path
      : workspaceRoot()
        ? relative(workspaceRoot()!, node.agent.path).split(sep).join("/")
        : node.agent.relativePath.split(sep).join("/");
    item.tooltip = `Path: ${displayPath}\n${node.agent.content}`;
    item.command = {
      command: "codexPowerToys.openFile",
      title: "Open Agent",
      arguments: [node.agent.path],
    };
  }
  if (node.entry?.kind === "file")
    item.command = {
      command: "codexPowerToys.openFile",
      title: "Open File",
      arguments: [node.entry.path],
    };
  return item;
}

function skillNode(skill: SkillRecord): Node {
  return {
    kind: "skill",
    label: typedLabel("skill", skill.name, skill),
    scope: skill.scope,
    targetPath: skill.skillDirectory,
    skill,
  };
}

function mcpNode(mcp: McpRecord): Node {
  return {
    kind: "mcp",
    label: typedLabel("mcp", mcp.name, mcp),
    scope: mcp.scope,
    targetPath: mcp.configPath,
    mcp,
  };
}

function pluginNode(plugin: PluginRecord): Node {
  return {
    kind: "plugin",
    label: typedLabel("plugin", plugin.name, plugin),
    scope: plugin.scope,
    targetPath: plugin.root,
    plugin,
  };
}

function agentNode(agent: AgentRecord): Node {
  return {
    kind: "agent",
    label: `${TYPE_ICONS.agent} ${agent.name}`,
    scope: agent.scope,
    targetPath: agent.path,
    agent,
  };
}

class ResourcesProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  skills: SkillRecord[] = [];
  mcps: McpRecord[] = [];
  plugins: PluginRecord[] = [];
  agents: AgentRecord[] = [];
  roots?: RootSet;
  showSupporting = true;
  showSuperseded = true;
  filter = "";
  private readonly expansion = new ResourceExpansionState();
  private readonly tools = new Map<string, McpTool[]>();

  async refresh(): Promise<void> {
    const [skills, plugins, mcps, agents] = await Promise.all([
      discoverSkills(coreOptions()),
      discoverPlugins(coreOptions()),
      discoverMcps(coreOptions()),
      discoverAgents(coreOptions()),
    ]);
    this.roots = skills.roots;
    this.skills = skills.skills;
    this.plugins = plugins.plugins;
    this.mcps = mcps.mcps;
    this.agents = agents.agents;
    this.expansion.reset();
    this.tools.clear();
    this.emitter.fire(undefined);
  }

  setFilter(value: string): void {
    this.filter = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }

  setShowSupporting(value: boolean): void {
    this.showSupporting = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }

  setShowSuperseded(value: boolean): void {
    this.showSuperseded = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }

  setNodeExpanded(node: Node, expanded: boolean): void {
    if (!nodeIsExpandable(node, this.showSupporting, true)) return;
    this.expansion.setNodeExpanded(resourcesExpansionNode(node), expanded);
  }

  applyExpansion(action: ExpansionAction, refresh = true): void {
    this.expansion.apply(action);
    if (refresh) this.emitter.fire(undefined);
  }

  shouldShowCollapse(): boolean {
    return this.expansion.toolbarAction() === "collapseAll";
  }

  setTools(mcp: McpRecord, tools: McpTool[]): void {
    this.tools.set(mcp.id, tools);
    this.emitter.fire(undefined);
  }
  syncCachedTools(cache: McpToolCache): void {
    for (const mcp of this.mcps) this.tools.set(mcp.id, cache.toolsFor(mcp));
    this.emitter.fire(undefined);
  }

  getTreeItem(node: Node): vscode.TreeItem {
    const expanded = nodeIsExpandable(node, this.showSupporting, true)
      ? this.expansion.register(resourcesExpansionNode(node))
      : true;
    return createTreeItem(node, expanded, this.showSupporting, true);
  }

  getParent(node: Node): Node | undefined {
    return node.parent;
  }

  expansionTargets(): Node[] {
    const targets: Node[] = [];
    const visit = (node: Node): void => {
      if (!nodeIsExpandable(node, this.showSupporting, true)) return;
      if (node.kind === "skill" || node.underSkill) return;
      targets.push(node);
      for (const child of this.getChildren(node)) visit(child);
    };
    for (const root of this.getChildren()) visit(root);
    return targets;
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      return [
        {
          kind: "root",
          label: "Global",
          scope: "global",
          targetPath: homedir(),
        },
        {
          kind: "root",
          label: "Workspace",
          scope: "workspace",
          targetPath: this.roots?.workspaceRoot,
        },
      ];
    }
    if (node.kind === "root") return this.withParent(this.scopeGroups(node.scope!), node);
    if (node.kind === "group") return this.withParent(this.groupChildren(node), node);
    if (node.kind === "plugin" && node.plugin)
      return this.withParent(this.pluginGroups(node.plugin), node);
    if (node.kind === "mcp" && node.mcp)
      return this.withParent(
        (this.tools.get(node.mcp.id) ?? []).map((tool) => mcpToolNode(tool, node.mcp!)),
        node,
      );
    if (node.kind === "skill" && node.skill && this.showSupporting)
      return this.withParent(
        node.skill.supportingEntries.map((entry): Node => ({
          kind: "entry",
          label: entry.name,
          scope: node.scope,
          entry,
          underSkill: true,
        })),
        node,
      );
    if (node.kind === "entry" && node.entry?.children && this.showSupporting)
      return this.withParent(
        node.entry.children.map((entry): Node => ({
          kind: "entry",
          label: entry.name,
          scope: node.scope,
          entry,
          underSkill: node.underSkill,
        })),
        node,
      );
    if (node.kind === "agentDir" && node.scope && node.targetPath) {
      const root = node.scope === "global" ? join(this.roots?.codexHome ?? homedir(), "agents") : this.roots?.workspaceRoot ? join(this.roots.workspaceRoot, ".codex", "agents") : undefined;
      return this.withParent(
        agentTreeChildren(this.filteredAgents(node.scope), node.scope, root, node.relativePath).map((child): Node =>
          child.kind === "directory"
            ? { kind: "agentDir", label: child.name, scope: node.scope, targetPath: child.path, relativePath: child.relativePath }
            : agentNode(child.agent),
        ),
        node,
      );
    }
    return [];
  }

  private withParent(nodes: Node[], parent: Node): Node[] {
    return nodes.map((node) => ({ ...node, parent }));
  }

  private matches(name: string, path: string): boolean {
    return !this.filter || `${name} ${path}`.toLowerCase().includes(this.filter.toLowerCase());
  }

  private filteredSkills(scope?: Scope, plugin?: PluginRecord): SkillRecord[] {
    return this.skills.filter(
      (skill) =>
        (this.showSuperseded || skill.state.effective !== "shadowed") &&
        (!scope || skill.scope === scope) &&
        (!plugin ? !skill.plugin : skill.plugin?.id === plugin.id) &&
        this.matches(skill.name, skill.skillPath),
    );
  }

  private filteredMcps(scope?: Scope, plugin?: PluginRecord): McpRecord[] {
    return this.mcps.filter(
      (mcp) =>
        (this.showSuperseded || mcp.effective !== "shadowed") &&
        (!scope || mcp.scope === scope) &&
        (!plugin ? !mcp.plugin : mcp.plugin?.id === plugin.id) &&
        this.matches(mcp.name, mcp.configPath),
    );
  }

  private filteredAgents(scope: Scope): AgentRecord[] {
    return this.agents.filter((agent) => agent.scope === scope && this.matches(agent.name, agent.path));
  }

  private filteredPlugins(scope: Scope): PluginRecord[] {
    return this.plugins.filter((plugin) => {
      if (plugin.scope !== scope || (!this.showSuperseded && plugin.effective === "shadowed")) return false;
      if (this.matches(plugin.name, plugin.root)) return true;
      return (
        this.filteredSkills(scope, plugin).length > 0 ||
        this.filteredMcps(scope, plugin).length > 0
      );
    });
  }

  private groupPath(scope: Scope, kind: GroupKind, plugin?: PluginRecord): string | undefined {
    if (kind === "agents") return scope === "global"
      ? join(this.roots?.codexHome ?? homedir(), "agents")
      : this.roots?.workspaceRoot ? join(this.roots.workspaceRoot, ".codex", "agents") : undefined;
    if (plugin) {
      if (kind === "skills") return join(plugin.root, "skills");
      if (kind === "mcps") return plugin.mcpPath ?? join(plugin.root, ".mcp.json");
      return plugin.root;
    }
    if (kind === "plugins")
      return scope === "global"
        ? join(this.roots?.codexHome ?? homedir(), "plugins")
        : this.roots?.workspaceRoot
          ? join(this.roots.workspaceRoot, ".codex", "plugins")
          : undefined;
    if (kind === "mcps")
      return scope === "global"
        ? this.roots?.globalConfigPath
        : this.roots?.workspaceConfigPath;
    return this.roots?.skillRoots.find((root) => root.scope === scope)?.path;
  }

  private groupNode(
    scope: Scope,
    kind: GroupKind,
    plugin?: PluginRecord,
  ): Node {
    return {
      kind: "group",
      label: groupLabel(kind),
      scope,
      targetPath: this.groupPath(scope, kind, plugin),
      groupKind: kind,
      parentPlugin: plugin,
    };
  }

  private scopeGroups(scope: Scope): Node[] {
    const groups = visibleGroupKinds({
      plugins: this.filteredPlugins(scope).length > 0,
      mcps: this.filteredMcps(scope).length > 0,
      skills: this.filteredSkills(scope).length > 0,
    }).map((kind) => this.groupNode(scope, kind));
    if (this.filteredAgents(scope).length > 0) groups.push(this.groupNode(scope, "agents"));
    return groups;
  }

  private groupChildren(node: Node): Node[] {
    if (node.parentPlugin) {
      if (node.groupKind === "skills")
        return this.filteredSkills(node.scope, node.parentPlugin).map(skillNode);
      if (node.groupKind === "mcps")
        return this.filteredMcps(node.scope, node.parentPlugin).map(mcpNode);
      return [];
    }
    if (node.groupKind === "plugins")
      return this.filteredPlugins(node.scope!).map(pluginNode);
    if (node.groupKind === "skills")
      return this.filteredSkills(node.scope).map(skillNode);
    if (node.groupKind === "agents") {
      const scope = node.scope!;
      const root = scope === "global" ? join(this.roots?.codexHome ?? homedir(), "agents") : this.roots?.workspaceRoot ? join(this.roots.workspaceRoot, ".codex", "agents") : undefined;
      return agentTreeChildren(this.filteredAgents(scope), scope, root).map((child): Node =>
        child.kind === "directory"
          ? { kind: "agentDir", label: child.name, scope, targetPath: child.path, relativePath: child.relativePath }
          : agentNode(child.agent),
      );
    }
    return this.filteredMcps(node.scope).map(mcpNode);
  }

  private pluginGroups(plugin: PluginRecord): Node[] {
    const scope = plugin.scope ?? "global";
    return visibleGroupKinds({
      plugins: false,
      mcps: this.filteredMcps(scope, plugin).length > 0,
      skills: this.filteredSkills(scope, plugin).length > 0,
    }).map((kind) => this.groupNode(scope, kind, plugin));
  }
}

class FlatSkillsProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  skills: SkillRecord[] = [];
  showSuperseded = true;
  filter = "";
  private readonly expansion = new ResourceExpansionState();
  async refresh(): Promise<void> {
    this.skills = (await discoverSkills(coreOptions())).skills;
    this.expansion.reset();
    this.emitter.fire(undefined);
  }
  setFilter(value: string): void {
    this.filter = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }
  setShowSuperseded(value: boolean): void {
    this.showSuperseded = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }
  setNodeExpanded(node: Node, expanded: boolean): void {
    if (!nodeIsExpandable(node, true, true)) return;
    this.expansion.setNodeExpanded({ id: nodeKey(node), nestedResource: true }, expanded);
  }
  getTreeItem(node: Node): vscode.TreeItem {
    const expanded = nodeIsExpandable(node, true, true)
      ? this.expansion.register({ id: nodeKey(node), nestedResource: true })
      : true;
    return createTreeItem(node, expanded, true, true);
  }
  getChildren(node?: Node): Node[] {
    if (node?.kind === "skill" && node.skill)
      return node.skill.supportingEntries.map((entry): Node => ({
        kind: "entry",
        label: entry.name,
        scope: node.scope,
        entry,
        underSkill: true,
      }));
    if (node?.kind === "entry" && node.entry?.children)
      return node.entry.children.map((entry): Node => ({
        kind: "entry",
        label: entry.name,
        scope: node.scope,
        entry,
        underSkill: node.underSkill,
      }));
    if (node) return [];
    const filter = this.filter.toLowerCase();
    return this.skills
      .filter((skill) =>
        (this.showSuperseded || skill.state.effective !== "shadowed") &&
        (!filter || `${skill.name} ${skill.skillPath}`.toLowerCase().includes(filter)),
      )
      .map(skillNode);
  }
}

class FlatPluginsProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  plugins: PluginRecord[] = [];
  skills: SkillRecord[] = [];
  mcps: McpRecord[] = [];
  showSuperseded = true;
  filter = "";
  private readonly expansion = new ResourceExpansionState();
  private readonly tools = new Map<string, McpTool[]>();

  async refresh(): Promise<void> {
    const [plugins, skills, mcps] = await Promise.all([
      discoverPlugins(coreOptions()),
      discoverSkills(coreOptions()),
      discoverMcps(coreOptions()),
    ]);
    this.plugins = plugins.plugins;
    this.skills = skills.skills;
    this.mcps = mcps.mcps;
    this.expansion.reset();
    this.tools.clear();
    this.emitter.fire(undefined);
  }

  setTools(mcp: McpRecord, tools: McpTool[]): void {
    this.tools.set(mcp.id, tools);
    this.emitter.fire(undefined);
  }

  syncCachedTools(cache: McpToolCache): void {
    for (const mcp of this.mcps) this.tools.set(mcp.id, cache.toolsFor(mcp));
    this.emitter.fire(undefined);
  }

  setFilter(value: string): void {
    this.filter = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }
  setShowSuperseded(value: boolean): void {
    this.showSuperseded = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }

  setNodeExpanded(node: Node, expanded: boolean): void {
    if (!nodeIsExpandable(node, true, true)) return;
    this.expansion.setNodeExpanded({ id: nodeKey(node), nestedResource: node.kind === "plugin" || node.kind === "skill" }, expanded);
  }

  getTreeItem(node: Node): vscode.TreeItem {
    const expandable = nodeIsExpandable(node, true, true);
    const expanded = expandable
      ? this.expansion.register({ id: nodeKey(node), nestedResource: node.kind === "plugin" || node.kind === "skill" })
      : true;
    return createTreeItem(node, expanded, true, true);
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      const filter = this.filter.toLowerCase();
      return this.plugins
        .filter((plugin) =>
          (this.showSuperseded || plugin.effective !== "shadowed") &&
          (!filter || `${plugin.name} ${plugin.root}`.toLowerCase().includes(filter) ||
            this.skills.some((skill) =>
              skill.plugin?.id === plugin.id &&
              (this.showSuperseded || skill.state.effective !== "shadowed") &&
              `${skill.name} ${skill.skillPath}`.toLowerCase().includes(filter),
            ) ||
            this.mcps.some((mcp) =>
              mcp.plugin?.id === plugin.id &&
              (this.showSuperseded || mcp.effective !== "shadowed") &&
              `${mcp.name} ${mcp.configPath}`.toLowerCase().includes(filter),
            )),
        )
        .sort((a, b) => a.name.localeCompare(b.name) || a.root.localeCompare(b.root))
        .map(pluginNode);
    }
    if (node.kind === "plugin" && node.plugin) {
      const plugin = node.plugin;
      const filter = this.filter.toLowerCase();
      const skills = this.skills.filter((skill) =>
        skill.plugin?.id === plugin.id &&
        (this.showSuperseded || skill.state.effective !== "shadowed") &&
        (!filter || `${skill.name} ${skill.skillPath}`.toLowerCase().includes(filter)),
      );
      const mcps = this.mcps.filter((mcp) =>
        mcp.plugin?.id === plugin.id &&
        (this.showSuperseded || mcp.effective !== "shadowed") &&
        (!filter || `${mcp.name} ${mcp.configPath}`.toLowerCase().includes(filter)),
      );
      const scope = plugin.scope ?? "global";
      return visibleGroupKinds({ plugins: false, skills: skills.length > 0, mcps: mcps.length > 0 })
        .map((kind) => ({
          kind: "group" as const,
          label: groupLabel(kind),
          scope,
          targetPath: kind === "skills" ? join(plugin.root, "skills") : plugin.mcpPath ?? join(plugin.root, ".mcp.json"),
          groupKind: kind,
          parentPlugin: plugin,
        }));
    }
    if (node.kind === "group" && node.parentPlugin) {
      const filter = this.filter.toLowerCase();
      if (node.groupKind === "skills") return this.skills.filter((skill) => skill.plugin?.id === node.parentPlugin!.id && (this.showSuperseded || skill.state.effective !== "shadowed") && (!filter || `${skill.name} ${skill.skillPath}`.toLowerCase().includes(filter))).map(skillNode);
      if (node.groupKind === "mcps") return this.mcps.filter((mcp) => mcp.plugin?.id === node.parentPlugin!.id && (this.showSuperseded || mcp.effective !== "shadowed") && (!filter || `${mcp.name} ${mcp.configPath}`.toLowerCase().includes(filter))).map(mcpNode);
    }
    if (node.kind === "mcp" && node.mcp)
      return (this.tools.get(node.mcp.id) ?? []).map((tool) => mcpToolNode(tool, node.mcp!));
    if (node.kind === "skill" && node.skill)
      return node.skill.supportingEntries.map((entry): Node => ({ kind: "entry", label: entry.name, scope: node.scope, entry, underSkill: true }));
    if (node.kind === "entry" && node.entry?.children)
      return node.entry.children.map((entry): Node => ({ kind: "entry", label: entry.name, scope: node.scope, entry, underSkill: node.underSkill }));
    return [];
  }
}

class FlatMcpProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  mcps: McpRecord[] = [];
  showSuperseded = true;
  filter = "";
  private readonly expansion = new ResourceExpansionState();
  private readonly tools = new Map<string, McpTool[]>();
  async refresh(): Promise<void> {
    this.mcps = (await discoverMcps(coreOptions())).mcps;
    this.expansion.reset();
    this.tools.clear();
    this.emitter.fire(undefined);
  }
  setFilter(value: string): void {
    this.filter = value;
    this.emitter.fire(undefined);
  }
  setShowSuperseded(value: boolean): void {
    this.showSuperseded = value;
    this.expansion.resetMaterializedNodes();
    this.emitter.fire(undefined);
  }
  setTools(mcp: McpRecord, tools: McpTool[]): void {
    this.tools.set(mcp.id, tools);
    this.emitter.fire(undefined);
  }
  syncCachedTools(cache: McpToolCache): void {
    for (const mcp of this.mcps) this.tools.set(mcp.id, cache.toolsFor(mcp));
    this.emitter.fire(undefined);
  }
  setNodeExpanded(node: Node, expanded: boolean): void {
    if (!nodeIsExpandable(node, false, false)) return;
    this.expansion.setNodeExpanded(
      { id: nodeKey(node), nestedResource: nodeIsNestedResource(node) },
      expanded,
    );
  }
  getTreeItem(node: Node): vscode.TreeItem {
    const expanded = nodeIsExpandable(node, false, false)
      ? this.expansion.register({
          id: nodeKey(node),
          nestedResource: nodeIsNestedResource(node),
        })
      : true;
    return createTreeItem(node, expanded, false, false);
  }
  getChildren(node?: Node): Node[] {
    if (!node) {
      const filter = this.filter.toLowerCase();
      return this.mcps
        .filter((mcp) =>
          (this.showSuperseded || mcp.effective !== "shadowed") &&
          (!filter || `${mcp.name} ${mcp.configPath}`.toLowerCase().includes(filter)),
        )
        .map(mcpNode);
    }
    if (node.kind === "mcp" && node.mcp)
      return (this.tools.get(node.mcp.id) ?? []).map((tool) =>
        mcpToolNode(tool, node.mcp!),
      );
    return [];
  }
}

class AgentsProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  agents: AgentRecord[] = [];
  globalRoot = "";
  workspaceRoot?: string;
  async refresh(): Promise<void> {
    const result = await discoverAgents(coreOptions());
    this.agents = result.agents;
    this.globalRoot = join(result.roots.codexHome, "agents");
    this.workspaceRoot = result.roots.workspaceRoot
      ? join(result.roots.workspaceRoot, ".codex", "agents")
      : undefined;
    this.emitter.fire(undefined);
  }
  getTreeItem(node: Node): vscode.TreeItem {
    return createTreeItem(node, false, false, false);
  }
  getChildren(node?: Node): Node[] {
    if (node) return [];
    return [...this.agents]
      .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))
      .map(agentNode);
  }
}

class InfoView implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private selected?: SkillRecord | McpRecord | PluginRecord;
  private selectedTool?: { tool: McpTool; mcp: McpRecord };
  private tools: Array<{ name: string; description?: string }> = [];
  private expandAll = false;
  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: false };
    this.render();
  }
  show(value: SkillRecord | McpRecord | PluginRecord): void {
    this.selected = value;
    this.selectedTool = undefined;
    this.tools = [];
    this.render();
  }
  showTool(tool: McpTool, mcp: McpRecord): void {
    this.selected = undefined;
    this.selectedTool = { tool, mcp };
    this.tools = [];
    this.render();
  }
  setTools(tools: Array<{ name: string; description?: string }>): void {
    this.tools = tools;
    this.render();
  }
  setToolsFor(mcp: McpRecord, tools: McpTool[]): void {
    if (this.selected?.id !== mcp.id) return;
    this.setTools(tools);
  }
  toggleExpandAll(): void {
    this.expandAll = !this.expandAll;
    this.render();
  }
  private render(): void {
    if (!this.view) return;
    if (this.selectedTool) {
      const { tool, mcp } = this.selectedTool;
      const escape = (text: string) =>
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      this.view.webview.html = `<h2>${escape(tool.name)}</h2><p>${escape(mcp.configPath)}</p><p>${escape(tool.description ?? "No description")}</p><pre>${escape(JSON.stringify(tool.inputSchema ?? {}, null, 2))}</pre>`;
      return;
    }
    const value = this.selected;
    const escape = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!value) {
      this.view.webview.html = "<h3>Select a skill, plugin, or MCP</h3>";
      return;
    }
    if ("skillPath" in value) {
      this.view.webview.html = `<h2>${escape(value.name)}</h2><p>${escape(value.skillPath)}</p><pre style="white-space:pre-wrap">${escape(value.content)}</pre><h3>Metadata</h3><pre>${escape(JSON.stringify(value.metadata ?? {}, null, 2))}</pre>`;
      return;
    }
    if ("root" in value && "skillPaths" in value) {
      this.view.webview.html = `<h2>${escape(value.name)}</h2><p>${escape(value.root)}</p><pre style="white-space:pre-wrap">${escape(JSON.stringify(value.metadata ?? {}, null, 2))}</pre><p>Status: ${value.enabled ? "enabled" : "disabled"}</p>`;
      return;
    }
    const toolHtml = this.tools
      .map(
        (tool) =>
          `<details ${this.expandAll ? "open" : ""}><summary>${escape(tool.name)}</summary><p>${escape(tool.description ?? "No description")}</p></details>`,
      )
      .join("");
    this.view.webview.html = `<h2>${escape(value.name)}</h2><p>${escape(value.configPath)}:${value.sourceRange.startLine + 1}</p><pre style="white-space:pre-wrap">${escape(JSON.stringify(value.config, null, 2))}</pre><h3>Tools</h3>${toolHtml || "<p>Tools not loaded. Use Load MCP Tools.</p>"}`;
  }
}

class ResourceDragController implements vscode.TreeDragAndDropController<Node> {
  readonly dropMimeTypes = [RESOURCE_MIME];
  readonly dragMimeTypes = [RESOURCE_MIME];
  constructor(
    private readonly onDrop: (
      target: Node | undefined,
      resources: ResourceIdentity[],
    ) => Promise<void>,
  ) {}
  handleDrag(source: readonly Node[], dataTransfer: vscode.DataTransfer): void {
    const resources = source
      .map(nodeResource)
      .filter(
        (resource): resource is ResourceIdentity =>
          resource !== undefined && !resource.readOnly,
      );
    if (resources.length)
      dataTransfer.set(
        RESOURCE_MIME,
        new vscode.DataTransferItem(JSON.stringify(resources)),
      );
  }
  async handleDrop(
    target: Node | undefined,
    dataTransfer: vscode.DataTransfer,
  ): Promise<void> {
    const item = dataTransfer.get(RESOURCE_MIME);
    if (!item) return;
    const raw = await item.asString();
    try {
      await this.onDrop(target, JSON.parse(raw) as ResourceIdentity[]);
    } catch (error) {
      vscode.window.showErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

async function confirmMove(
  resources: ResourceIdentity[],
  target: string,
): Promise<boolean> {
  const names = resources.map((resource) => resource.name).join(", ");
  return (
    (await vscode.window.showInformationMessage(
      `Are you sure you want to move '${names}' into '${target}'?`,
      { modal: true },
      "Move",
      "Cancel",
    )) === "Move"
  );
}
async function confirmDelete(resources: ResourceIdentity[]): Promise<boolean> {
  const names = resources.map((resource) => resource.name).join(", ");
  return (
    (await vscode.window.showWarningMessage(
      `Are you sure you want to permanently delete '${names}'?`,
      { modal: true },
      "Delete",
      "Cancel",
    )) === "Delete"
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const resources = new ResourcesProvider();
  const plugins = new FlatPluginsProvider();
  const skills = new FlatSkillsProvider();
  const mcps = new FlatMcpProvider();
  const info = new InfoView();
  let mcpToolCache: McpToolCache;
  mcpToolCache = new McpToolCache((entry: McpToolCacheEntry) => {
    const records = [
      ...resources.mcps.filter(
        (mcp) => mcp.name === entry.name && mcp.id === entry.recordId,
      ),
      ...mcps.mcps.filter(
        (mcp) => mcp.name === entry.name && mcp.id === entry.recordId,
      ),
    ];
    for (const mcp of records) {
      if (mcp.effective !== "active" || !mcp.enabled || !mcp.pluginEnabled)
        continue;
      if (mcpToolCache.get(mcp)?.generation !== entry.generation) continue;
      mcp.diagnostics = [
        ...mcp.diagnostics.filter(
          (diagnostic) => diagnostic.code !== "MCP_TOOLS_UNAVAILABLE",
        ),
        ...entry.diagnostics,
      ];
      resources.setTools(mcp, entry.tools);
      plugins.setTools(mcp, entry.tools);
      mcps.setTools(mcp, entry.tools);
      info.setToolsFor(mcp, entry.tools);
    }
  });
  const agents = new AgentsProvider();
  let clipboard: ClipboardState | undefined;
  let lastTarget: Node | undefined;
  let activeSelection: readonly Node[] = [];
  const resourceView = vscode.window.createTreeView("codexPowerToys.resources", {
      treeDataProvider: resources,
      showCollapseAll: false,
      canSelectMany: true,
      dragAndDropController: new ResourceDragController((target, resources) =>
        handleDrop(target, resources),
      ),
    });
  const pluginView = vscode.window.createTreeView("codexPowerToys.plugins", {
    treeDataProvider: plugins,
    canSelectMany: true,
    dragAndDropController: new ResourceDragController((target, resources) =>
      handleDrop(target, resources),
    ),
  });
  const skillView = vscode.window.createTreeView("codexPowerToys.skills", {
    treeDataProvider: skills,
    canSelectMany: true,
    dragAndDropController: new ResourceDragController((target, resources) =>
      handleDrop(target, resources),
    ),
  });
  const mcpView = vscode.window.createTreeView("codexPowerToys.mcps", {
    treeDataProvider: mcps,
    canSelectMany: true,
    dragAndDropController: new ResourceDragController((target, resources) =>
      handleDrop(target, resources),
    ),
  });
  const agentView = vscode.window.createTreeView("codexPowerToys.agents", {
      treeDataProvider: agents,
      showCollapseAll: false,
      canSelectMany: true,
      dragAndDropController: new ResourceDragController((target, resources) =>
        handleDrop(target, resources),
      ),
    });
  context.subscriptions.push(
    resourceView,
    pluginView,
    skillView,
    mcpView,
    agentView,
    vscode.window.registerWebviewViewProvider("codexPowerToys.info", info),
  );
  const command = (name: string, handler: (...args: any[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(name, handler));
  const refresh = async () => {
    await Promise.all([resources.refresh(), plugins.refresh(), skills.refresh(), mcps.refresh(), agents.refresh()]);
  };
  const selectedResources = (first?: Node, selected?: readonly Node[]) =>
    [
      ...(selected?.length
        ? selected
        : activeSelection.length
          ? activeSelection
          : first
            ? [first]
            : []),
    ]
      .map(nodeResource)
      .filter((resource): resource is ResourceIdentity => Boolean(resource));
  const setExpansionContext = async (view: "resources", expanded: boolean) => {
    await vscode.commands.executeCommand(
      "setContext",
      `codexPowerToys.${view}TreeExpanded`,
      expanded,
    );
  };
  const syncExpansionContexts = async (): Promise<void> => {
    await Promise.all([
      setExpansionContext("resources", resources.shouldShowCollapse()),
    ]);
  };
  const syncResourceStateContext = async (): Promise<void> => {
    const selected = activeSelection[0] ?? lastTarget;
    let scope = selected?.scope;
    let enabled: boolean | undefined;
    if (selected?.plugin) {
      const current = resources.plugins.find((plugin) => plugin.id === selected.plugin!.id);
      scope = current?.scope ?? scope;
      enabled = current?.enabled;
    } else if (selected?.skill) {
      const current = skills.skills.find((skill) => skill.id === selected.skill!.id);
      scope = current?.scope ?? scope;
      enabled = current ? current.state.effective === "active" : undefined;
    } else if (selected?.mcp) {
      const current = mcps.mcps.find((mcp) => mcp.id === selected.mcp!.id);
      scope = current?.scope ?? scope;
      enabled = current ? current.effective === "active" : undefined;
    }
    await Promise.all([
      vscode.commands.executeCommand("setContext", "resourceScope", scope),
      vscode.commands.executeCommand("setContext", "resourceEnabled", enabled === true),
      vscode.commands.executeCommand("setContext", "resourceDisabled", enabled === false),
    ]);
  };
  const refreshAll = async (forceMcpNames: ReadonlySet<string> = new Set()) => {
    await refresh();
    resources.syncCachedTools(mcpToolCache);
    plugins.syncCachedTools(mcpToolCache);
    mcps.syncCachedTools(mcpToolCache);
    mcpToolCache.enqueueEnabled(resources.mcps, forceMcpNames);
    await Promise.all([syncExpansionContexts(), syncResourceStateContext()]);
  };
  const inputBoxes = new Map<string, vscode.InputBox>();
  const filterCommand = (key: string, provider: { filter: string; setFilter(value: string): void }) => {
    const contextKey = `codexPowerToys.${key === "MCPs" ? "mcps" : key.toLowerCase()}FilterActive`;
    const existing = inputBoxes.get(key);
    if (existing) {
      existing.show();
      return;
    }
    const input = vscode.window.createInputBox();
    input.title = `Filter ${key}`;
    input.prompt = "Type to filter by name or full path";
    input.value = provider.filter;
    input.onDidChangeValue((value) => {
      provider.setFilter(value);
      void vscode.commands.executeCommand("setContext", contextKey, Boolean(value));
      if (key === "Resources") void syncExpansionContexts();
    });
    input.onDidHide(() => {
      input.dispose();
      inputBoxes.delete(key);
    });
    inputBoxes.set(key, input);
    context.subscriptions.push(input);
    input.show();
  };
  const clearFilter = (key: string, provider: { filter: string; setFilter(value: string): void }) => {
    const contextKey = `codexPowerToys.${key === "MCPs" ? "mcps" : key.toLowerCase()}FilterActive`;
    provider.setFilter("");
    void vscode.commands.executeCommand("setContext", contextKey, false);
    if (key === "Resources") void syncExpansionContexts();
    const input = inputBoxes.get(key);
    if (input) input.value = "";
  };
  async function runTransfer(
    resources: ResourceIdentity[],
    operation: "copy" | "move",
    target: Node | undefined,
  ): Promise<void> {
    if (!resources.length) return;
    const targetPath = nodeTarget(target);
    const targetScope = target?.scope ?? resources[0]!.scope;
    if (
      operation === "move" &&
      !(await confirmMove(resources, targetPath ?? scopeLabel(targetScope)))
    )
      return;
    const first = await transferResources(coreOptions(), {
      resources,
      operation,
      targetScope,
      targetPath,
      conflictMode: "decide-each",
    });
    const conflicts = first.items.filter((item) =>
      item.error?.message.includes("conflict decision"),
    );
    if (conflicts.length) {
      const choice = await vscode.window.showQuickPick(
        ["Skip all", "Replace all", "Decide each", "Cancel"],
        { placeHolder: "Resolve resource conflicts" },
      );
      if (!choice || choice === "Cancel") return;
      if (choice === "Decide each") {
        for (const item of conflicts) {
          const selected = await vscode.window.showQuickPick(
            ["Skip", "Replace", "Cancel"],
            { placeHolder: `Conflict: ${item.resource.name}` },
          );
          if (!selected || selected === "Cancel") continue;
          await transferResources(coreOptions(), {
            resources: [item.resource],
            operation,
            targetScope,
            targetPath,
            conflictMode: selected === "Replace" ? "replace" : "skip",
          });
        }
      } else
        await transferResources(coreOptions(), {
          resources: conflicts.map((item) => item.resource),
          operation,
          targetScope,
          targetPath,
          conflictMode: choice === "Replace all" ? "replace" : "skip",
        });
    }
    await refreshAll();
  }
  async function handleDrop(
    target: Node | undefined,
    resources: ResourceIdentity[],
  ): Promise<void> {
    await runTransfer(resources, "move", target);
  }
  command("codexPowerToys.refresh", refreshAll);
  command("codexPowerToys.refreshAgents", refreshAll);
  command("codexPowerToys.openSkill", async (skill: SkillRecord) => {
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(skill.skillPath),
    );
    await vscode.window.showTextDocument(document);
    info.show(skill);
  });
  command("codexPowerToys.openFile", async (path: string) => {
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path),
    );
    await vscode.window.showTextDocument(document);
  });
  command("codexPowerToys.openDirectory", async (path: string) => {
    await vscode.commands.executeCommand(
      "revealInExplorer",
      vscode.Uri.file(path),
    );
  });
  command("codexPowerToys.showMcp", async (mcp: McpRecord) => {
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(mcp.configPath),
    );
    const editor = await vscode.window.showTextDocument(document);
    const line = Math.min(
      mcp.sourceRange.startLine,
      Math.max(0, document.lineCount - 1),
    );
    editor.selection = new vscode.Selection(line, 0, line, 0);
    editor.revealRange(new vscode.Range(line, 0, line, 0));
    info.show(mcp);
  });
  command("codexPowerToys.showPlugin", (plugin: PluginRecord) =>
    info.show(plugin),
  );
  command("codexPowerToys.skills.toggleSupporting", async () => {
    resources.setShowSupporting(!resources.showSupporting);
    await setExpansionContext("resources", resources.shouldShowCollapse());
  });
  command("codexPowerToys.resources.filter", () => filterCommand("Resources", resources));
  command("codexPowerToys.resources.clearFilter", () => clearFilter("Resources", resources));
  command("codexPowerToys.skills.filter", () => filterCommand("Skills", skills));
  command("codexPowerToys.skills.clearFilter", () => clearFilter("Skills", skills));
  command("codexPowerToys.plugins.filter", () => filterCommand("Plugins", plugins));
  command("codexPowerToys.plugins.clearFilter", () => clearFilter("Plugins", plugins));
  command("codexPowerToys.mcp.filter", () => filterCommand("MCPs", mcps));
  command("codexPowerToys.mcp.clearFilter", () => clearFilter("MCPs", mcps));
  command("codexPowerToys.resources.toggleSuperseded", () => {
    resources.setShowSuperseded(!resources.showSuperseded);
    void syncExpansionContexts();
  });
  command("codexPowerToys.plugins.toggleSuperseded", () => {
    plugins.setShowSuperseded(!plugins.showSuperseded);
  });
  command("codexPowerToys.skills.toggleSuperseded", () => {
    skills.setShowSuperseded(!skills.showSuperseded);
  });
  command("codexPowerToys.mcp.toggleSuperseded", () => {
    mcps.setShowSuperseded(!mcps.showSuperseded);
  });
  command("codexPowerToys.resources.collapseAll", async () => {
    resources.applyExpansion("collapseAll", false);
    await vscode.commands.executeCommand(
      "workbench.actions.treeView.codexPowerToys.resources.collapseAll",
    );
    for (const root of resources.getChildren()) {
      await resourceView.reveal(root, { expand: true, select: false, focus: false });
    }
    await setExpansionContext("resources", resources.shouldShowCollapse());
  });
  command("codexPowerToys.resources.expandAll", async () => {
    resources.applyExpansion("expandNonSkills", false);
    for (const node of resources.expansionTargets()) {
      await resourceView.reveal(node, { expand: true, select: false, focus: false });
    }
    await setExpansionContext("resources", resources.shouldShowCollapse());
  });
  const skillAction =
    (scope: Scope, enabled: boolean) => async (skill: SkillRecord) => {
      await setSkillEnabled(coreOptions(), skill.skillPath, scope, enabled);
      await refreshAll();
    };
  for (const [name, scope, enabled] of [
    ["enableGlobal", "global", true],
    ["disableGlobal", "global", false],
    ["resetGlobal", "global", true],
    ["enableLocal", "workspace", true],
    ["disableLocal", "workspace", false],
    ["resetLocal", "workspace", true],
  ] as const)
    command(`codexPowerToys.skill.${name}`, skillAction(scope, enabled));
  command("codexPowerToys.mcp.add", async () => {
    const name = await vscode.window.showInputBox({ prompt: "MCP name" });
    const raw = await vscode.window.showInputBox({
      prompt: "MCP config as JSON",
    });
    if (!name || !raw) return;
    const { addMcpDefinition } = await import("@codex-powertoys/core");
    await addMcpDefinition(coreOptions(), "workspace", name, JSON.parse(raw));
    await refreshAll();
  });
  command("codexPowerToys.mcp.edit", async (mcp: McpRecord) => {
    if (mcp.readOnly)
      return vscode.window.showWarningMessage(
        "Plugin-owned MCPs are read-only; copy it to a managed config first.",
      );
    const raw = await vscode.window.showInputBox({
      prompt: "MCP patch as JSON",
      value: JSON.stringify(mcp.config),
    });
    if (!raw) return;
    const { updateMcpDefinition } = await import("@codex-powertoys/core");
    await updateMcpDefinition(
      coreOptions(),
      mcp.scope,
      mcp.name,
      JSON.parse(raw),
    );
    await refreshAll(new Set([mcp.name]));
  });
  command("codexPowerToys.mcp.delete", async (mcp: McpRecord) => {
    if (mcp.readOnly)
      return vscode.window.showWarningMessage(
        "Plugin-owned MCPs are read-only.",
      );
    if (!(await confirmDelete([mcpResource(mcp)]))) return;
    const { deleteMcpDefinition } = await import("@codex-powertoys/core");
    await deleteMcpDefinition(coreOptions(), mcp.scope, mcp.name);
    await refreshAll();
  });
  command("codexPowerToys.mcp.loadTools", async (mcp: McpRecord) => {
    info.show(mcp);
    if (!mcpToolCache.enqueue(mcp, true))
      vscode.window.showWarningMessage(
        "Only effective enabled MCPs can be queried for tools.",
      );
  });
  command("codexPowerToys.showMcpTool", (tool: McpTool, mcp: McpRecord) =>
    info.showTool(tool, mcp),
  );
  command("codexPowerToys.info.toggleExpand", () => info.toggleExpandAll());
  for (const [name, scope, enabled] of [
    ["enableGlobal", "global", true],
    ["disableGlobal", "global", false],
    ["enableLocal", "workspace", true],
    ["disableLocal", "workspace", false],
  ] as const)
    command(`codexPowerToys.mcp.${name}`, async (mcp: McpRecord) => {
      if (mcp.readOnly) return;
      await setMcpState(coreOptions(), scope, mcp.name, enabled);
      await refreshAll(enabled ? new Set([mcp.name]) : new Set());
    });
  command("codexPowerToys.plugin.enable", async (plugin: PluginRecord) => {
    await setPluginEnabled(coreOptions(), plugin, true, plugin.scope);
    await refreshAll(new Set(plugin.mcpNames));
  });
  command("codexPowerToys.plugin.disable", async (plugin: PluginRecord) => {
    await setPluginEnabled(coreOptions(), plugin, false, plugin.scope);
    await refreshAll();
  });
  command("codexPowerToys.plugin.reset", async (plugin: PluginRecord) => {
    await setPluginEnabled(coreOptions(), plugin, undefined, plugin.scope);
    await refreshAll();
  });
  command("codexPowerToys.plugin.openManifest", async (plugin: PluginRecord) => {
    const manifestPath = pluginManifestPath(plugin);
    try {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(manifestPath),
      );
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Unable to open plugin manifest '${manifestPath}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });
  command("codexPowerToys.plugin.openDirectory", (plugin: PluginRecord) =>
    vscode.commands.executeCommand(
      "revealInExplorer",
      vscode.Uri.file(plugin.root),
    ),
  );
  command(
    "codexPowerToys.resource.cut",
    (first?: Node, selected?: readonly Node[]) => {
      const resources = selectedResources(first, selected).filter(
        (resource) => !resource.readOnly,
      );
      clipboard = { operation: "move", resources };
      if (resources.length < (selected?.length ?? (first ? 1 : 0)))
        vscode.window.showWarningMessage(
          "Plugin-owned resources cannot be cut; they can be copied.",
        );
    },
  );
  command(
    "codexPowerToys.resource.copy",
    (first?: Node, selected?: readonly Node[]) => {
      const resources = selectedResources(first, selected);
      clipboard = { operation: "copy", resources };
    },
  );
  const copyPaths = async (
    relativePath: boolean,
    first?: Node,
    selected?: readonly Node[],
  ): Promise<void> => {
    const nodes = selected?.length ? selected : first ? [first] : [];
    const paths = nodes.map(nodePath).filter((path): path is string => Boolean(path));
    if (!paths.length) return;
    const root = workspaceRoot();
    const values = relativePath && root
      ? paths.map((path) => relative(root, path).split(sep).join("/") || ".")
      : paths;
    await vscode.env.clipboard.writeText(values.join("\n"));
  };
  command("codexPowerToys.resource.copyFullPath", (first?: Node, selected?: readonly Node[]) =>
    copyPaths(false, first, selected),
  );
  command("codexPowerToys.resource.copyRelativePath", (first?: Node, selected?: readonly Node[]) =>
    copyPaths(true, first, selected),
  );
  command("codexPowerToys.resource.paste", async (target?: Node) => {
    if (!clipboard) return;
    const operation = clipboard.operation;
    await runTransfer(clipboard.resources, operation, target ?? lastTarget);
    if (operation === "move") clipboard = undefined;
  });
  command("codexPowerToys.resource.rename", async (first?: Node) => {
    const resource = first ? nodeResource(first) : undefined;
    if (!resource || resource.readOnly)
      return vscode.window.showWarningMessage(
        "This resource cannot be renamed.",
      );
    const name = await vscode.window.showInputBox({
      prompt: `Rename ${resource.name}`,
      value: resource.name,
      validateInput: (value) =>
        value.trim() ? undefined : "A name is required",
    });
    if (!name || name === resource.name) return;
    if (resource.kind === "skill")
      await renameSkill(coreOptions(), resource.path, name);
    else if (resource.kind === "agent")
      await renameAgent(coreOptions(), resource.path, name);
    else
      await renameMcpAcrossScopes(
        coreOptions(),
        resource.name,
        name,
        resource.path,
      );
    await refreshAll();
  });
  command(
    "codexPowerToys.resource.delete",
    async (first?: Node, selected?: readonly Node[]) => {
      const resources = selectedResources(first, selected).filter(
        (resource) => !resource.readOnly,
      );
      if (!resources.length)
        return vscode.window.showWarningMessage(
          "Plugin-owned resources cannot be deleted.",
        );
      if (!(await confirmDelete(resources))) return;
      for (const resource of resources)
        await deleteResource(coreOptions(), resource);
      await refreshAll();
    },
  );
  command("codexPowerToys.startSkillCreator", async () => {
    const prompt = "$skill-creator ";
    await vscode.env.clipboard.writeText(prompt);
    const available = await vscode.commands.getCommands(true);
    const candidate = available.find(
      (name) => /codex|chat/i.test(name) && /new|quick|open/i.test(name),
    );
    if (candidate)
      try {
        await vscode.commands.executeCommand(candidate);
      } catch {
        /* clipboard fallback remains valid */
      }
    vscode.window.showInformationMessage(
      "Skill creator prompt copied. Paste it into a new Codex chat.",
    );
  });
  for (const view of [resourceView, pluginView, skillView, mcpView, agentView])
    view.onDidChangeSelection((event) => {
      activeSelection = event.selection;
      lastTarget = event.selection[0];
      const selected = event.selection[0];
      void syncResourceStateContext();
      if (selected?.skill) info.show(selected.skill);
      else if (selected?.mcp) info.show(selected.mcp);
      else if (selected?.plugin) info.show(selected.plugin);
      else if (selected?.tool && selected.toolParent)
        info.showTool(selected.tool, selected.toolParent);
    });
  context.subscriptions.push(
    resourceView.onDidExpandElement((event) => {
      resources.setNodeExpanded(event.element, true);
      void setExpansionContext("resources", resources.shouldShowCollapse());
    }),
    resourceView.onDidCollapseElement((event) => {
      resources.setNodeExpanded(event.element, false);
      void setExpansionContext("resources", resources.shouldShowCollapse());
    }),
    mcpView.onDidExpandElement((event) => {
      mcps.setNodeExpanded(event.element, true);
    }),
    mcpView.onDidCollapseElement((event) => {
      mcps.setNodeExpanded(event.element, false);
    }),
    pluginView.onDidExpandElement((event) => plugins.setNodeExpanded(event.element, true)),
    pluginView.onDidCollapseElement((event) => plugins.setNodeExpanded(event.element, false)),
    skillView.onDidExpandElement((event) => skills.setNodeExpanded(event.element, true)),
    skillView.onDidCollapseElement((event) => skills.setNodeExpanded(event.element, false)),
  );
  void syncExpansionContexts();
  void refreshAll();
}

export function deactivate(): void {}
