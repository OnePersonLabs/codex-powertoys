export type ExpansionNode = {
  id: string;
  nestedResource?: boolean;
  /** @deprecated Use nestedResource. Kept for existing callers. */
  skillRelated?: boolean;
};

export type ExpansionAction =
  | "collapseAll"
  | "expandNonSkills"
  | "expandAll";

type ExpansionMode = "default" | ExpansionAction | "manual";

export class ResourceExpansionState {
  private readonly nodes = new Map<string, ExpansionNode>();
  private readonly states = new Map<string, boolean>();
  private potentialNestedCount = 0;
  private mode: ExpansionMode = "default";

  register(node: ExpansionNode): boolean {
    this.nodes.set(node.id, node);
    if (!this.states.has(node.id))
      this.states.set(node.id, this.defaultExpanded(node));
    return this.states.get(node.id)!;
  }

  setPotentialNestedCount(count: number): void {
    this.potentialNestedCount = Math.max(0, count);
  }

  setPotentialSkillCount(count: number): void {
    this.setPotentialNestedCount(count);
  }

  setNodeExpanded(node: ExpansionNode, expanded: boolean): void {
    this.register(node);
    this.states.set(node.id, expanded);
    this.mode = "manual";
  }

  isExpanded(node: ExpansionNode): boolean {
    return this.register(node);
  }

  toolbarAction(): ExpansionAction {
    const nodes = [...this.nodes.values()];
    const nonNested = nodes.filter((node) => !this.isNestedResource(node));
    const nested = nodes.filter((node) => this.isNestedResource(node));
    const allNonNestedExpanded = nonNested.every((node) => this.isExpanded(node));
    const allNestedExpanded =
      this.potentialNestedCount <= nested.length &&
      nested.every((node) => this.isExpanded(node));
    if (!allNonNestedExpanded) return "expandNonSkills";
    if (this.potentialNestedCount > 0 || nested.length > 0) {
      if (!allNestedExpanded) return "expandAll";
    }
    return "collapseAll";
  }

  applyToolbarAction(): void {
    this.apply(this.toolbarAction());
  }

  apply(action: ExpansionAction): void {
    this.mode = action;
    for (const node of this.nodes.values()) {
      if (action === "collapseAll") this.states.set(node.id, false);
      else if (action === "expandNonSkills") {
        if (!this.isNestedResource(node)) this.states.set(node.id, true);
      } else this.states.set(node.id, true);
    }
  }

  reset(): void {
    this.nodes.clear();
    this.states.clear();
    this.mode = "default";
  }

  resetMaterializedNodes(): void {
    this.nodes.clear();
  }

  private defaultExpanded(node: ExpansionNode): boolean {
    if (this.mode === "collapseAll") return false;
    if (this.mode === "expandAll") return true;
    if (this.mode === "expandNonSkills") return !this.isNestedResource(node);
    return !this.isNestedResource(node);
  }

  private isNestedResource(node: ExpansionNode): boolean {
    return node.nestedResource ?? node.skillRelated ?? false;
  }
}
