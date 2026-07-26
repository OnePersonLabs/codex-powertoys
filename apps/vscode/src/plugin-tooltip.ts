import type { PluginRecord } from "@codex-powertoys/core";
import { tooltipPath } from "./resource-path.js";

export type PluginTooltipRecord = Pick<
  PluginRecord,
  "name" | "root" | "scope" | "version" | "enabled"
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
  lines.push(`Status: ${plugin.enabled ? "enabled" : "disabled"}`);
  return lines.join("\n");
}
