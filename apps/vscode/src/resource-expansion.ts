export type ExpansionNode = {
  id: string;
  skillRelated: boolean;
};

export type ExpansionAction =
  | "collapseAll"
  | "expandNonSkills"
  | "expandAll";

type ExpansionMode = "default" | ExpansionAction | "manual";

export class ResourceExpansionState {
  private readonly nodes = new Map<string, ExpansionNode>();
  private readonly states = new Map<string, boolean>();
  private potentialSkillCount = 0;
  private mode: ExpansionMode = "default";

  register(node: ExpansionNode): boolean {
    this.nodes.set(node.id, node);
    if (!this.states.has(node.id))
      this.states.set(node.id, this.defaultExpanded(node));
    return this.states.get(node.id)!;
  }

  setPotentialSkillCount(count: number): void {
    this.potentialSkillCount = Math.max(0, count);
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
    const nonSkills = nodes.filter((node) => !node.skillRelated);
    const skills = nodes.filter((node) => node.skillRelated);
    const allNonSkillsExpanded = nonSkills.every((node) => this.isExpanded(node));
    const allSkillsExpanded =
      this.potentialSkillCount <= skills.length &&
      skills.every((node) => this.isExpanded(node));
    if (!allNonSkillsExpanded) return "expandNonSkills";
    if (this.potentialSkillCount > 0 || skills.length > 0) {
      if (!allSkillsExpanded) return "expandAll";
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
        if (!node.skillRelated) this.states.set(node.id, true);
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
    if (this.mode === "expandNonSkills") return !node.skillRelated;
    return !node.skillRelated;
  }
}
