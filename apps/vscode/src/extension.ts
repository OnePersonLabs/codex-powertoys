import * as vscode from "vscode";
import { discoverAgents, discoverMcps, discoverSkills, loadMcpTools, setMcpState, setSkillEnabled, type AgentRecord, type McpRecord, type SkillRecord, type SupportingEntry } from "@codex-powertoys/core";

type Node = { kind: "group" | "skill" | "entry" | "mcp"; label: string; skill?: SkillRecord; mcp?: McpRecord; entry?: SupportingEntry; scope?: "global" | "workspace" };

class SkillsProvider implements vscode.TreeDataProvider<Node> {
  readonly emitter = new vscode.EventEmitter<Node | undefined>(); readonly onDidChangeTreeData = this.emitter.event;
  mode: "tree" | "flat" = "tree"; showSupporting = true; filter = ""; skills: SkillRecord[] = [];
  constructor(private readonly context: vscode.ExtensionContext) {}
  async refresh(): Promise<void> { this.skills = (await discoverSkills({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath })).skills.filter((skill) => !this.filter || `${skill.name} ${skill.skillPath}`.toLowerCase().includes(this.filter.toLowerCase())); this.emitter.fire(undefined); }
  getTreeItem(node: Node): vscode.TreeItem { const item = new vscode.TreeItem(node.label, node.kind === "group" || node.kind === "skill" || node.kind === "entry" && node.entry?.kind === "directory" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None); item.contextValue = node.kind === "skill" ? "codexSkill" : node.kind; if (node.skill) { item.tooltip = `${node.skill.skillPath}\n${node.skill.description ?? ""}\n${node.skill.state.effective}`; item.command = { command: "codexInspector.openSkill", title: "Open Skill", arguments: [node.skill] }; } else if (node.entry?.kind === "file") item.command = { command: "codexInspector.openFile", title: "Open File", arguments: [node.entry.path] }; return item; }
  getChildren(node?: Node): Node[] { if (!node) { if (this.mode === "flat") return this.skills.map((skill) => this.skillNode(skill)); const groups = new Map<string, SkillRecord[]>(); for (const skill of this.skills) (groups.get(skill.sourceKind) ?? (groups.set(skill.sourceKind, []), groups.get(skill.sourceKind)!)).push(skill); return [...groups.entries()].map(([label, skills]) => ({ kind: "group", label: `${label} (${skills.length})`, entry: { name: label, path: label, kind: "directory", children: skills.map((skill) => ({ name: skill.name, path: skill.skillPath, kind: "file" })) } })); }
    if (node.kind === "group") return this.skills.filter((skill) => skill.sourceKind === node.label.split(" ")[0]).map((skill) => this.skillNode(skill));
    if (node.kind === "skill" && node.skill && this.showSupporting) return node.skill.supportingEntries.map((entry) => ({ kind: "entry", label: entry.name, entry }));
    if (node.kind === "entry" && node.entry?.children && this.showSupporting) return node.entry.children.map((entry) => ({ kind: "entry", label: entry.name, entry })); return [];
  }
  private skillNode(skill: SkillRecord): Node { return { kind: "skill", label: `${skill.state.glyph} ${skill.name}  [${skill.sourceKind}]`, skill }; }
}

class McpProvider implements vscode.TreeDataProvider<Node> {
  private readonly emitter = new vscode.EventEmitter<Node | undefined>(); readonly onDidChangeTreeData = this.emitter.event; mcps: McpRecord[] = [];
  async refresh(): Promise<void> { this.mcps = (await discoverMcps({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath })).mcps; this.emitter.fire(undefined); }
  getTreeItem(node: Node): vscode.TreeItem { const item = new vscode.TreeItem(node.label, node.kind === "group" ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None); item.contextValue = node.kind === "mcp" ? "codexMcp" : node.kind; if (node.mcp) { item.tooltip = `${node.mcp.configPath}:${node.mcp.sourceRange.startLine + 1}\n${node.mcp.enabled ? "enabled" : "disabled"}`; item.command = { command: "codexInspector.showMcp", title: "Show MCP", arguments: [node.mcp] }; } return item; }
  getChildren(node?: Node): Node[] { if (!node) return [{ kind: "group", label: "Global", scope: "global" }, { kind: "group", label: "Workspace", scope: "workspace" }]; if (node.kind === "group") return this.mcps.filter((mcp) => mcp.scope === node.scope).map((mcp) => ({ kind: "mcp", label: `${mcp.enabled ? "✅" : "❌"} ${mcp.name}`, mcp })); return []; }
}

class AgentsProvider implements vscode.TreeDataProvider<Node> {
  private readonly emitter = new vscode.EventEmitter<Node | undefined>(); readonly onDidChangeTreeData = this.emitter.event; agents: AgentRecord[] = [];
  async refresh(): Promise<void> { this.agents = (await discoverAgents({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath })).agents; this.emitter.fire(undefined); }
  getTreeItem(node: Node): vscode.TreeItem { const item = new vscode.TreeItem(node.label); item.contextValue = "codexAgent"; if (node.entry?.path) item.command = { command: "codexInspector.openFile", title: "Open Agent", arguments: [node.entry.path] }; return item; }
  getChildren(): Node[] { return this.agents.map((agent) => ({ kind: "entry", label: `${agent.scope === "global" ? "🌐" : "📁"} ${agent.name}`, entry: { name: agent.name, path: agent.path, kind: "file" } })); }
}

class InfoView implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView; private selected?: SkillRecord | McpRecord; private tools: Array<{ name: string; description?: string }> = []; private expandAll = false;
  constructor(private readonly context: vscode.ExtensionContext) {}
  resolveWebviewView(view: vscode.WebviewView): void { this.view = view; view.webview.options = { enableScripts: false }; this.render(); }
  show(value: SkillRecord | McpRecord): void { this.selected = value; this.tools = []; this.render(); }
  setTools(tools: Array<{ name: string; description?: string }>): void { this.tools = tools; this.render(); }
  toggleExpandAll(): void { this.expandAll = !this.expandAll; this.render(); }
  private render(): void { if (!this.view) return; const value = this.selected; const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); if (!value) { this.view.webview.html = "<h3>Select a skill or MCP</h3>"; return; } if ("skillPath" in value) { this.view.webview.html = `<h2>${escape(value.name)}</h2><p>${escape(value.skillPath)}</p><pre style="white-space:pre-wrap">${escape(value.content)}</pre><h3>Metadata</h3><pre>${escape(JSON.stringify(value.metadata ?? {}, null, 2))}</pre>`; return; } const toolHtml = this.tools.map((tool) => `<details ${this.expandAll ? "open" : ""}><summary>${escape(tool.name)}</summary><p>${escape(tool.description ?? "No description")}</p></details>`).join(""); this.view.webview.html = `<h2>${escape(value.name)}</h2><p>${escape(value.configPath)}:${value.sourceRange.startLine + 1}</p><pre style="white-space:pre-wrap">${escape(JSON.stringify(value.config, null, 2))}</pre><h3>Tools</h3>${toolHtml || "<p>Tools not loaded. Use Load/Refresh.</p>"}`; }
}

export function activate(context: vscode.ExtensionContext): void {
  const skills = new SkillsProvider(context); const agents = new AgentsProvider(); const mcps = new McpProvider(); const info = new InfoView(context);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("codexInspector.skills", skills), vscode.window.registerTreeDataProvider("codexInspector.agents", agents), vscode.window.registerTreeDataProvider("codexInspector.mcps", mcps), vscode.window.registerWebviewViewProvider("codexInspector.info", info));
  const command = (name: string, handler: (...args: any[]) => unknown) => context.subscriptions.push(vscode.commands.registerCommand(name, handler));
  const refresh = async () => { await Promise.all([skills.refresh(), agents.refresh(), mcps.refresh()]); };
  command("codexInspector.refreshAgents", () => agents.refresh());
  command("codexInspector.refresh", refresh); command("codexInspector.openSkill", async (skill: SkillRecord) => { const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(skill.skillPath)); await vscode.window.showTextDocument(doc); info.show(skill); }); command("codexInspector.openFile", async (path: string) => { const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path)); await vscode.window.showTextDocument(doc); }); command("codexInspector.showMcp", async (mcp: McpRecord) => { const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(mcp.configPath)); const editor = await vscode.window.showTextDocument(doc); const line = Math.min(mcp.sourceRange.startLine, Math.max(0, doc.lineCount - 1)); editor.selection = new vscode.Selection(line, 0, line, 0); editor.revealRange(new vscode.Range(line, 0, line, 0)); info.show(mcp); });
  command("codexInspector.skills.toggleMode", async () => { skills.mode = skills.mode === "tree" ? "flat" : "tree"; await skills.refresh(); }); command("codexInspector.skills.toggleSupporting", async () => { skills.showSupporting = !skills.showSupporting; skills.emitter.fire(undefined); }); command("codexInspector.skills.filter", async () => { skills.filter = await vscode.window.showInputBox({ prompt: "Filter skills", value: skills.filter }) ?? ""; await skills.refresh(); });
  const skillAction = (scope: "global" | "workspace", enabled: boolean) => async (skill: SkillRecord) => { await setSkillEnabled({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, skill.skillPath, scope, enabled); await skills.refresh(); };
  for (const [name, scope, enabled] of [["enableGlobal", "global", true], ["disableGlobal", "global", false], ["resetGlobal", "global", true], ["enableLocal", "workspace", true], ["disableLocal", "workspace", false], ["resetLocal", "workspace", true]] as const) command(`codexInspector.skills.${name}`, skillAction(scope, enabled));
  command("codexInspector.mcp.add", async () => { const name = await vscode.window.showInputBox({ prompt: "MCP name" }); const raw = await vscode.window.showInputBox({ prompt: "MCP config as JSON" }); if (!name || !raw) return; const { addMcpDefinition } = await import("@codex-powertoys/core"); await addMcpDefinition({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, "workspace", name, JSON.parse(raw)); await mcps.refresh(); });
  command("codexInspector.mcp.edit", async (mcp: McpRecord) => { const raw = await vscode.window.showInputBox({ prompt: "MCP patch as JSON", value: JSON.stringify(mcp.config) }); if (!raw) return; const { updateMcpDefinition } = await import("@codex-powertoys/core"); await updateMcpDefinition({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, mcp.scope, mcp.name, JSON.parse(raw)); await mcps.refresh(); });
  command("codexInspector.mcp.delete", async (mcp: McpRecord) => { if (await vscode.window.showWarningMessage(`Delete MCP ${mcp.name}?`, { modal: true }, "Delete") !== "Delete") return; const { deleteMcpDefinition } = await import("@codex-powertoys/core"); await deleteMcpDefinition({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, mcp.scope, mcp.name); await mcps.refresh(); });
  command("codexInspector.mcp.loadTools", async (mcp: McpRecord) => { const result = await loadMcpTools(mcp); info.show(mcp); info.setTools(result.tools); if (result.diagnostics.length) vscode.window.showWarningMessage(result.diagnostics[0]!.message); });
  command("codexInspector.info.toggleExpand", () => info.toggleExpandAll());
  for (const [name, scope, enabled] of [["enableGlobal", "global", true], ["disableGlobal", "global", false], ["enableLocal", "workspace", true], ["disableLocal", "workspace", false]] as const) command(`codexInspector.mcp.${name}`, async (mcp: McpRecord) => { await setMcpState({ workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, scope, mcp.name, enabled); await mcps.refresh(); });
  command("codexInspector.startSkillCreator", async () => { const prompt = "$skill-creator "; await vscode.env.clipboard.writeText(prompt); const available = await vscode.commands.getCommands(true); const candidate = available.find((name) => /codex|chat/i.test(name) && /new|quick|open/i.test(name)); if (candidate) try { await vscode.commands.executeCommand(candidate); } catch { /* fallback remains valid */ } vscode.window.showInformationMessage("Skill creator prompt copied. Paste it into a new Codex chat."); });
  void refresh();
}

export function deactivate(): void {}
