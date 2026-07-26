export type ExpansionNode = {
  id: string;
  /** True for the Global and Workspace scope roots. */
  root?: boolean;
  /** True for a skill row or any supporting entry beneath a skill. */
  skillRelated?: boolean;
  /** True for an MCP row or any supporting entry beneath an MCP. */
  mcpRelated?: boolean;
  /** Legacy category used by dedicated panes for their initial defaults. */
  nestedResource?: boolean;
  /** Optional first-materialization override for providers with a custom policy. */
  initiallyExpanded?: boolean;
};

export type ExpansionAction = "collapseAll" | "expandNonSkills";
type ExpansionPolicy = "collapsed" | "expandedNonSkills";

export class ResourceExpansionState {
  private readonly nodes = new Map<string, ExpansionNode>();
  private readonly states = new Map<string, boolean>();
  private policy: ExpansionPolicy = "collapsed";

  register(node: ExpansionNode): boolean {
    this.nodes.set(node.id, node);
    if (!this.states.has(node.id)) this.states.set(node.id, this.initialExpanded(node));
    return this.states.get(node.id)!;
  }

  setNodeExpanded(node: ExpansionNode, expanded: boolean): void {
    this.register(node);
    this.states.set(node.id, expanded);
  }

  isExpanded(node: ExpansionNode): boolean {
    return this.register(node);
  }

  toolbarAction(): ExpansionAction {
    for (const [id, node] of this.nodes) {
      if (!node.root && this.states.get(id) === true) return "collapseAll";
    }
    return "expandNonSkills";
  }

  applyToolbarAction(): void {
    this.apply(this.toolbarAction());
  }

  apply(action: ExpansionAction): void {
    this.policy = action === "collapseAll" ? "collapsed" : "expandedNonSkills";
    for (const [id, node] of this.nodes) {
      if (node.root) this.states.set(id, true);
      else this.states.set(
        id,
        action === "expandNonSkills" && !this.isBulkExcluded(node),
      );
    }
  }

  reset(): void {
    this.nodes.clear();
    this.states.clear();
    this.policy = "collapsed";
  }

  resetMaterializedNodes(): void {
    this.nodes.clear();
  }

  private initialExpanded(node: ExpansionNode): boolean {
    if (this.policy === "expandedNonSkills")
      return node.root === true || !this.isBulkExcluded(node);
    if (node.initiallyExpanded !== undefined) return node.initiallyExpanded;
    if (node.root) return true;
    return !node.nestedResource;
  }

  private isBulkExcluded(node: ExpansionNode): boolean {
    return node.skillRelated === true || node.mcpRelated === true;
  }
}
