export type ResourceGroupKind = "plugins" | "mcps" | "skills";
export type ResourceGroupLabelKind = ResourceGroupKind | "agents";

export type ResourceGroupPresence = Record<ResourceGroupKind, boolean>;

export function resourceGroupLabel(kind: ResourceGroupLabelKind): string {
  return kind === "plugins"
    ? "Plugins"
    : kind === "mcps"
      ? "MCPs"
      : kind === "skills"
        ? "Skills"
        : "Agents";
}

export function visibleGroupKinds(
  presence: ResourceGroupPresence,
): ResourceGroupKind[] {
  return (["plugins", "mcps", "skills"] as ResourceGroupKind[]).filter(
    (kind) => presence[kind],
  );
}
