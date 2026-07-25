import * as vscode from "vscode";
import { basename, dirname, join } from "node:path";
import {
  agentTreeChildren,
  agentTreeExpansion,
} from "./agent-tree.js";
import {
  discoverAgents,
  discoverMcps,
  discoverPlugins,
  discoverSkills,
  deleteResource,
  loadMcpTools,
  renameAgent,
  renameMcpAcrossScopes,
  renameSkill,
  setMcpState,
  setPluginEnabled,
  setSkillEnabled,
  transferResources,
  type AgentRecord,
  type McpRecord,
  type PluginRecord,
  type ResourceIdentity,
  type SkillRecord,
  type SupportingEntry,
} from "@codex-powertoys/core";

const RESOURCE_MIME = "application/vnd.codex-powertoys.resource";
type Scope = "global" | "workspace";
type NodeKind =
  | "root"
  | "group"
  | "skill"
  | "entry"
  | "mcp"
  | "plugin"
  | "agent"
  | "agentDir"
  | "toggle";
type Node = {
  kind: NodeKind;
  label: string;
  scope?: Scope;
  targetPath?: string;
  relativePath?: string;
  skill?: SkillRecord;
  mcp?: McpRecord;
  plugin?: PluginRecord;
  agent?: AgentRecord;
  entry?: SupportingEntry;
  toggleScope?: Scope;
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
function scopeLabel(scope: Scope): string {
  return scope === "global" ? "Global" : "Workspace";
}
function checkbox(checked: boolean): vscode.TreeItemCheckboxState {
  return checked
    ? vscode.TreeItemCheckboxState.Checked
    : vscode.TreeItemCheckboxState.Unchecked;
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

class SkillsProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  mode: "tree" | "flat" = "tree";
  showSupporting = true;
  filter = "";
  skills: SkillRecord[] = [];
  async refresh(): Promise<void> {
    const result = await discoverSkills(coreOptions());
    this.skills = result.skills.filter(
      (skill) =>
        !this.filter ||
        `${skill.name} ${skill.skillPath}`
          .toLowerCase()
          .includes(this.filter.toLowerCase()),
    );
    this.emitter.fire(undefined);
  }
  getTreeItem(node: Node): vscode.TreeItem {
    const collapsible =
      node.kind === "root" ||
      node.kind === "group" ||
      node.kind === "skill" ||
      (node.kind === "entry" && node.entry?.kind === "directory");
    const item = new vscode.TreeItem(
      node.label,
      collapsible
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    item.id = `${node.kind}:${node.skill?.id ?? node.mcp?.id ?? node.agent?.id ?? node.entry?.path ?? node.label}`;
    item.contextValue = node.skill?.plugin
      ? "codexPluginSkill"
      : node.kind === "skill"
        ? "codexSkill"
        : node.kind;
    if (node.skill) {
      item.tooltip = `${node.skill.skillPath}\n${node.skill.description ?? ""}\n${node.skill.state.effective}`;
      item.command = {
        command: "codexPowerToys.openSkill",
        title: "Open Skill",
        arguments: [node.skill],
      };
      item.checkboxState =
        node.skill.state.effective === "active"
          ? checkbox(true)
          : checkbox(false);
    }
    if (node.kind === "toggle" && node.skill)
      item.checkboxState = checkbox(
        node.toggleScope === "global"
          ? node.skill.state.global !== "disabled"
          : node.skill.state.workspace !== "disabled",
      );
    if (node.entry?.kind === "file")
      item.command = {
        command: "codexPowerToys.openFile",
        title: "Open File",
        arguments: [node.entry.path],
      };
    return item;
  }
  getChildren(node?: Node): Node[] {
    if (!node) {
      if (this.mode === "flat")
        return this.skills.map((skill) => this.skillNode(skill));
      const groups = new Map<string, SkillRecord[]>();
      for (const skill of this.skills)
        (
          groups.get(skill.sourceKind) ??
          (groups.set(skill.sourceKind, []), groups.get(skill.sourceKind)!)
        ).push(skill);
      return [...groups.entries()].map(([sourceKind, skills]) => ({
        kind: "group",
        label: `${sourceKind} (${skills.length})`,
        scope: skills[0]?.scope,
        targetPath: skills[0]?.rootPath,
        entry: {
          name: sourceKind,
          path: skills[0]?.rootPath ?? sourceKind,
          kind: "directory",
        },
      }));
    }
    if (node.kind === "group")
      return this.skills
        .filter((skill) => skill.sourceKind === node.label.split(" ")[0])
        .map((skill) => this.skillNode(skill));
    if (node.kind === "skill" && node.skill) {
      const toggles: Node[] = [
        {
          kind: "toggle",
          label: `Global: ${node.skill.state.global}`,
          scope: "global",
          toggleScope: "global",
          skill: node.skill,
        },
        {
          kind: "toggle",
          label: `Workspace: ${node.skill.state.workspace}`,
          scope: "workspace",
          toggleScope: "workspace",
          skill: node.skill,
        },
      ];
      return this.showSupporting
        ? [
            ...toggles,
            ...node.skill.supportingEntries.map(
              (entry): Node => ({ kind: "entry", label: entry.name, entry }),
            ),
          ]
        : toggles;
    }
    if (node.kind === "entry" && node.entry?.children && this.showSupporting)
      return node.entry.children.map((entry) => ({
        kind: "entry",
        label: entry.name,
        entry,
      }));
    return [];
  }
  private skillNode(skill: SkillRecord): Node {
    return {
      kind: "skill",
      label: `${skill.state.glyph} ${skill.name}  [${skill.sourceKind}]`,
      scope: skill.scope,
      targetPath: skill.skillDirectory,
      skill,
    };
  }
}

class McpProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  mcps: McpRecord[] = [];
  globalConfig = "";
  workspaceConfig?: string;
  async refresh(): Promise<void> {
    const result = await discoverMcps(coreOptions());
    this.mcps = result.mcps;
    this.globalConfig = result.roots.globalConfigPath;
    this.workspaceConfig = result.roots.workspaceConfigPath;
    this.emitter.fire(undefined);
  }
  getTreeItem(node: Node): vscode.TreeItem {
    const item = new vscode.TreeItem(
      node.label,
      node.kind === "group"
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );
    item.id = `${node.kind}:${node.mcp?.id ?? node.label}`;
    item.contextValue = node.mcp?.plugin
      ? "codexPluginMcp"
      : node.kind === "mcp"
        ? "codexMcp"
        : node.kind;
    if (node.mcp) {
      item.tooltip = `${node.mcp.configPath}:${node.mcp.sourceRange.startLine + 1}\n${node.mcp.effective}${node.mcp.plugin ? `\nPlugin: ${node.mcp.plugin.name}` : ""}`;
      item.command = {
        command: "codexPowerToys.showMcp",
        title: "Show MCP",
        arguments: [node.mcp],
      };
      item.checkboxState = checkbox(node.mcp.effective === "active");
    }
    return item;
  }
  getChildren(node?: Node): Node[] {
    if (!node)
      return [
        {
          kind: "group",
          label: "Global",
          scope: "global",
          targetPath: this.globalConfig,
        },
        {
          kind: "group",
          label: "Workspace",
          scope: "workspace",
          targetPath: this.workspaceConfig,
        },
      ];
    if (node.kind === "group")
      return this.mcps
        .filter((mcp) => mcp.scope === node.scope)
        .map((mcp) => ({
          kind: "mcp",
          label: `${mcp.effective === "active" ? "✅" : mcp.effective === "shadowed" ? "☑️" : "❌"} ${mcp.name}`,
          scope: mcp.scope,
          targetPath: mcp.configPath,
          mcp,
        }));
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
    const expansion = agentTreeExpansion(
      node.kind === "root"
        ? "root"
        : node.kind === "agentDir"
          ? "agentDir"
          : "leaf",
    );
    const item = new vscode.TreeItem(
      node.label,
      expansion === "expanded"
        ? vscode.TreeItemCollapsibleState.Expanded
        : expansion === "collapsed"
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
    );
    item.id = `${node.kind}:${node.agent?.id ?? node.targetPath ?? node.label}`;
    item.contextValue =
      node.kind === "agent"
        ? "codexAgent"
        : node.kind === "root"
          ? "codexRoot"
          : node.kind === "agentDir"
            ? "codexAgentDir"
            : node.kind;
    if (node.agent) {
      item.tooltip = `${node.agent.path}\n${node.agent.relativePath}`;
      item.command = {
        command: "codexPowerToys.openFile",
        title: "Open Agent",
        arguments: [node.agent.path],
      };
    }
    return item;
  }
  getChildren(node?: Node): Node[] {
    if (!node)
      return [
        {
          kind: "root",
          label: `Global — ${this.globalRoot || "~/.codex/agents"}`,
          scope: "global",
          targetPath: this.globalRoot,
        },
        {
          kind: "root",
          label: `Workspace — ${this.workspaceRoot || ".codex/agents"}`,
          scope: "workspace",
          targetPath: this.workspaceRoot,
        },
      ];
    const root =
      node.scope === "global" ? this.globalRoot : this.workspaceRoot;
    if (!root || !node.scope) return [];
    const children = agentTreeChildren(
      this.agents,
      node.scope,
      root,
      node.kind === "root" ? "" : node.relativePath,
    );
    return children.map((child): Node =>
      child.kind === "directory"
        ? {
            kind: "agentDir",
            label: child.name,
            scope: node.scope,
            targetPath: child.path,
            relativePath: child.relativePath,
            entry: {
              name: child.name,
              path: child.path,
              kind: "directory",
            },
          }
        : {
            kind: "agent",
            label: `📄 ${child.agent.name}`,
            scope: child.agent.scope,
            targetPath: child.agent.path,
            agent: child.agent,
          },
    );
  }
}

class PluginsProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  plugins: PluginRecord[] = [];
  skills: SkillRecord[] = [];
  mcps: McpRecord[] = [];
  async refresh(): Promise<void> {
    this.plugins = (await discoverPlugins(coreOptions())).plugins;
    this.skills = (await discoverSkills(coreOptions())).skills;
    this.mcps = (await discoverMcps(coreOptions())).mcps;
    this.emitter.fire(undefined);
  }
  getTreeItem(node: Node): vscode.TreeItem {
    const item = new vscode.TreeItem(
      node.label,
      node.kind === "root" || node.kind === "group" || node.kind === "plugin"
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );
    item.id = `${node.kind}:${node.plugin?.id ?? node.skill?.id ?? node.mcp?.id ?? node.label}`;
    item.contextValue =
      node.kind === "plugin"
        ? "codexPlugin"
        : node.skill?.plugin
          ? "codexPluginSkill"
          : node.mcp?.plugin
            ? "codexPluginMcp"
            : node.kind;
    if (node.plugin) {
      item.tooltip = `${node.plugin.root}\n${node.plugin.version ?? ""}\n${node.plugin.enabled ? "enabled" : "disabled"}`;
      item.command = {
        command: "codexPowerToys.showPlugin",
        title: "Show Plugin",
        arguments: [node.plugin],
      };
      item.checkboxState = checkbox(node.plugin.enabled);
    }
    if (node.skill) {
      item.tooltip = `${node.skill.skillPath}\nOwned by ${node.plugin?.name ?? node.skill.plugin?.name ?? "plugin"}`;
      item.command = {
        command: "codexPowerToys.openSkill",
        title: "Open Skill",
        arguments: [node.skill],
      };
    }
    if (node.mcp) {
      item.tooltip = `${node.mcp.configPath}\nOwned by ${node.mcp.plugin?.name ?? "plugin"}`;
      item.command = {
        command: "codexPowerToys.showMcp",
        title: "Show MCP",
        arguments: [node.mcp],
      };
    }
    return item;
  }
  getChildren(node?: Node): Node[] {
    if (!node)
      return [
        { kind: "root", label: "Global Plugins", scope: "global" },
        { kind: "root", label: "Workspace Plugins", scope: "workspace" },
      ];
    if (node.kind === "root")
      return this.plugins
        .filter((plugin) => plugin.scope === node.scope)
        .map(
          (plugin): Node => ({
            kind: "plugin",
            label: `${plugin.enabled ? "✅" : "❌"} ${plugin.name}${plugin.version ? `@${plugin.version}` : ""}`,
            scope: plugin.scope,
            plugin,
          }),
        );
    if (node.kind === "plugin" && node.plugin) {
      const skills = this.skills
        .filter((skill) => skill.plugin?.id === node.plugin?.id)
        .map(
          (skill): Node => ({
            kind: "skill",
            label: `${skill.state.glyph} ${skill.name}`,
            scope: skill.scope,
            skill,
          }),
        );
      const mcps = this.mcps
        .filter((mcp) => mcp.plugin?.id === node.plugin?.id)
        .map(
          (mcp): Node => ({
            kind: "mcp",
            label: `${mcp.effective === "active" ? "✅" : "❌"} ${mcp.name}`,
            scope: mcp.scope,
            mcp,
          }),
        );
      return [...skills, ...mcps];
    }
    return [];
  }
}

class InfoView implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private selected?: SkillRecord | McpRecord | PluginRecord;
  private tools: Array<{ name: string; description?: string }> = [];
  private expandAll = false;
  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: false };
    this.render();
  }
  show(value: SkillRecord | McpRecord | PluginRecord): void {
    this.selected = value;
    this.tools = [];
    this.render();
  }
  setTools(tools: Array<{ name: string; description?: string }>): void {
    this.tools = tools;
    this.render();
  }
  toggleExpandAll(): void {
    this.expandAll = !this.expandAll;
    this.render();
  }
  private render(): void {
    if (!this.view) return;
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
  const skills = new SkillsProvider();
  const agents = new AgentsProvider();
  const mcps = new McpProvider();
  const plugins = new PluginsProvider();
  const info = new InfoView();
  let clipboard: ClipboardState | undefined;
  let lastTarget: Node | undefined;
  let activeSelection: readonly Node[] = [];
  const views = [
    vscode.window.createTreeView("codexPowerToys.skills", {
      treeDataProvider: skills,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: new ResourceDragController((target, resources) =>
        handleDrop(target, resources),
      ),
    }),
    vscode.window.createTreeView("codexPowerToys.plugins", {
      treeDataProvider: plugins,
      showCollapseAll: true,
      canSelectMany: true,
    }),
    vscode.window.createTreeView("codexPowerToys.agents", {
      treeDataProvider: agents,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: new ResourceDragController((target, resources) =>
        handleDrop(target, resources),
      ),
    }),
    vscode.window.createTreeView("codexPowerToys.mcps", {
      treeDataProvider: mcps,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: new ResourceDragController((target, resources) =>
        handleDrop(target, resources),
      ),
    }),
  ];
  context.subscriptions.push(
    ...views,
    vscode.window.registerWebviewViewProvider("codexPowerToys.info", info),
  );
  const command = (name: string, handler: (...args: any[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(name, handler));
  const refresh = async () => {
    await Promise.all([
      skills.refresh(),
      agents.refresh(),
      mcps.refresh(),
      plugins.refresh(),
    ]);
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
  const refreshAll = async () => {
    await refresh();
  };
  const scopeTarget = (
    kind: ResourceIdentity["kind"],
    scope: Scope,
  ): string | undefined => {
    const root = workspaceRoot();
    if (kind === "skill")
      return scope === "workspace"
        ? root
          ? join(root, ".agents", "skills")
          : undefined
        : join(vscode.env.appRoot, "..", ".agents", "skills");
    if (kind === "agent")
      return scope === "workspace"
        ? root
          ? join(root, ".codex", "agents")
          : undefined
        : undefined;
    return undefined;
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
  command("codexPowerToys.refreshAgents", () => agents.refresh());
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
  command("codexPowerToys.skills.toggleMode", async () => {
    skills.mode = skills.mode === "tree" ? "flat" : "tree";
    await skills.refresh();
  });
  command("codexPowerToys.skills.toggleSupporting", async () => {
    skills.showSupporting = !skills.showSupporting;
    skills.emitter.fire(undefined);
  });
  command("codexPowerToys.skills.filter", async () => {
    skills.filter =
      (await vscode.window.showInputBox({
        prompt: "Filter skills",
        value: skills.filter,
      })) ?? "";
    await skills.refresh();
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
    command(`codexInspector.skills.${name}`, skillAction(scope, enabled));
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
    await refreshAll();
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
    const result = await loadMcpTools(mcp);
    info.show(mcp);
    info.setTools(result.tools);
    if (result.diagnostics.length)
      vscode.window.showWarningMessage(result.diagnostics[0]!.message);
  });
  command("codexPowerToys.info.toggleExpand", () => info.toggleExpandAll());
  for (const [name, scope, enabled] of [
    ["enableGlobal", "global", true],
    ["disableGlobal", "global", false],
    ["enableLocal", "workspace", true],
    ["disableLocal", "workspace", false],
  ] as const)
    command(`codexInspector.mcp.${name}`, async (mcp: McpRecord) => {
      if (mcp.readOnly) return;
      await setMcpState(coreOptions(), scope, mcp.name, enabled);
      await refreshAll();
    });
  command("codexPowerToys.plugin.enable", async (plugin: PluginRecord) => {
    await setPluginEnabled(coreOptions(), plugin, true, plugin.scope);
    await refreshAll();
  });
  command("codexPowerToys.plugin.disable", async (plugin: PluginRecord) => {
    await setPluginEnabled(coreOptions(), plugin, false, plugin.scope);
    await refreshAll();
  });
  command("codexPowerToys.plugin.reset", async (plugin: PluginRecord) => {
    await setPluginEnabled(coreOptions(), plugin, undefined, plugin.scope);
    await refreshAll();
  });
  command(
    "codexPowerToys.plugin.openManifest",
    async (plugin: PluginRecord) => {
      if (!plugin.manifestPath) return;
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(plugin.manifestPath),
      );
      await vscode.window.showTextDocument(document);
    },
  );
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
  for (const view of views)
    view.onDidChangeSelection((event) => {
      activeSelection = event.selection;
      lastTarget = event.selection[0];
      const selected = event.selection[0];
      void vscode.commands.executeCommand(
        "setContext",
        "resourceScope",
        selected?.scope,
      );
      if (selected?.skill) info.show(selected.skill);
      else if (selected?.mcp) info.show(selected.mcp);
      else if (selected?.plugin) info.show(selected.plugin);
    });
  views[0]!.onDidChangeCheckboxState(async (event) => {
    for (const [node, state] of event.items)
      if (node.kind === "toggle" && node.skill && node.toggleScope)
        await setSkillEnabled(
          coreOptions(),
          node.skill.skillPath,
          node.toggleScope,
          state === vscode.TreeItemCheckboxState.Checked,
        );
    await refreshAll();
  });
  views[2]!.onDidChangeCheckboxState(() => undefined);
  views[3]!.onDidChangeCheckboxState(async (event) => {
    for (const [node, state] of event.items)
      if (node.mcp && !node.mcp.readOnly)
        await setMcpState(
          coreOptions(),
          node.mcp.scope,
          node.mcp.name,
          state === vscode.TreeItemCheckboxState.Checked,
        );
    await refreshAll();
  });
  views[1]!.onDidChangeCheckboxState(async (event) => {
    for (const [node, state] of event.items)
      if (node.plugin)
        await setPluginEnabled(
          coreOptions(),
          node.plugin,
          state === vscode.TreeItemCheckboxState.Checked,
          node.plugin.scope,
        );
    await refreshAll();
  });
  void refreshAll();
}

export function deactivate(): void {}
