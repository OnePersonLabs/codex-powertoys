import type { PluginRecord } from "@codex-powertoys/core";
import { tooltipPath } from "./resource-path.js";

export type PluginTooltipRecord = Pick<
  PluginRecord,
  "name" | "root" | "scope" | "version" | "enabled" | "effective" | "metadata"
>;

export function pluginTooltip(
  plugin: PluginTooltipRecord,
  workspaceRoot?: string,
): string {
  const lines = [
    `Plugin: ${plugin.name}`,
    `Path: ${tooltipPath(plugin.root, plugin.scope, workspaceRoot)}`,
  ];
  if (plugin.version) lines.push(`Version: ${plugin.version}`);
  lines.push(`Status: ${plugin.effective ?? (plugin.enabled ? "active" : "disabled")}`);
  const description =
    plugin.metadata && typeof plugin.metadata.description === "string"
      ? plugin.metadata.description
      : undefined;
  if (description) lines.push(`Description: ${description}`);
  return lines.join("\n");
}
