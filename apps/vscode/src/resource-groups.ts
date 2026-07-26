export type ResourceGroupKind = "plugins" | "mcps" | "skills";

export type ResourceGroupPresence = Record<ResourceGroupKind, boolean>;

export function visibleGroupKinds(
  presence: ResourceGroupPresence,
): ResourceGroupKind[] {
  return (["plugins", "mcps", "skills"] as ResourceGroupKind[]).filter(
    (kind) => presence[kind],
  );
}
