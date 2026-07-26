import { isAbsolute, relative, sep } from "node:path";

export type ResourceScope = "global" | "workspace";

export function tooltipPath(
  path: string,
  scope: ResourceScope | undefined,
  workspaceRoot?: string,
): string {
  if (scope !== "workspace" || !workspaceRoot) return path;
  const suffix = relative(workspaceRoot, path);
  const isInsideWorkspace =
    suffix === "" ||
    (suffix !== ".." &&
      !suffix.startsWith(`..${sep}`) &&
      !isAbsolute(suffix));
  if (!isInsideWorkspace) return path;
  const normalized = suffix.split(sep).join("/");
  return normalized ? `./${normalized}` : ".";
}
