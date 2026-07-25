import { join } from "node:path";
import type { AgentRecord, Scope } from "@codex-powertoys/core";

export type AgentTreeChild =
  | {
      kind: "directory";
      name: string;
      path: string;
      relativePath: string;
    }
  | {
      kind: "file";
      agent: AgentRecord;
    };

export type AgentTreeExpansion = "expanded" | "collapsed" | "none";

export function normalizeAgentRelativePath(value: string): string {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
}

export function agentTreeChildren(
  agents: readonly AgentRecord[],
  scope: Scope,
  scopeRoot: string | undefined,
  parentRelativePath = "",
): AgentTreeChild[] {
  if (!scopeRoot) return [];
  const parent = normalizeAgentRelativePath(parentRelativePath);
  const prefix = parent ? `${parent}/` : "";
  const directories = new Set<string>();
  const files: AgentRecord[] = [];

  for (const agent of agents) {
    if (agent.scope !== scope) continue;
    const relativePath = normalizeAgentRelativePath(agent.relativePath);
    if (!relativePath.startsWith(prefix)) continue;
    const remainder = relativePath.slice(prefix.length);
    if (!remainder) continue;
    const separator = remainder.indexOf("/");
    if (separator >= 0) {
      directories.add(remainder.slice(0, separator));
    } else {
      files.push(agent);
    }
  }

  const directoryChildren: AgentTreeChild[] = [...directories]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const relativePath = parent ? `${parent}/${name}` : name;
      return {
        kind: "directory" as const,
        name,
        path: join(scopeRoot, ...relativePath.split("/")),
        relativePath,
      };
    });
  const fileChildren: AgentTreeChild[] = files
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .map((agent) => ({ kind: "file" as const, agent }));

  return [...directoryChildren, ...fileChildren];
}

export function agentTreeExpansion(
  kind: "root" | "agentDir" | "leaf",
): AgentTreeExpansion {
  if (kind === "root") return "expanded";
  if (kind === "agentDir") return "collapsed";
  return "none";
}
