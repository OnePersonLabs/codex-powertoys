export type ResourceGroupKind = "plugins" | "mcps" | "skills";
export type ResourceGroupLabelKind = ResourceGroupKind | "agents";

export type ResourceGroupPresence = Record<ResourceGroupKind, boolean>;

export const RESOURCE_GROUP_ICONS: Record<ResourceGroupLabelKind, string> = {
  plugins: "🔌",
  mcps: "🧰",
  skills: "💪",
  agents: "🤖",
};

export function resourceGroupLabel(kind: ResourceGroupLabelKind): string {
  const name = kind === "plugins"
    ? "Plugins"
    : kind === "mcps"
      ? "MCPs"
      : kind === "skills"
        ? "Skills"
        : "Agents";
  return `${RESOURCE_GROUP_ICONS[kind]} ${name}`;
}

export function visibleGroupKinds(
  presence: ResourceGroupPresence,
): ResourceGroupKind[] {
  return (["plugins", "mcps", "skills"] as ResourceGroupKind[]).filter(
    (kind) => presence[kind],
  );
}
