import type { McpRecord, McpTool, SkillRecord } from "@codex-powertoys/core";
import { tooltipPath } from "./resource-path.js";

function field(name: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return `${name}: ${String(value)}`;
}

function descriptionFromConfig(record: McpRecord): string | undefined {
  return typeof record.config.description === "string"
    ? record.config.description
    : undefined;
}

export function mcpTooltip(
  mcp: McpRecord,
  workspaceRoot?: string,
): string {
  return [
    field("MCP", mcp.name),
    field("Path", tooltipPath(mcp.configPath, mcp.scope, workspaceRoot)),
    field("Line", mcp.sourceRange.startLine + 1),
    field("Status", mcp.effective),
    field("Description", descriptionFromConfig(mcp)),
    field("Plugin", mcp.plugin?.name),
    field(
      "Diagnostic",
      mcp.diagnostics.find((diagnostic) => diagnostic.code === "MCP_TOOLS_UNAVAILABLE")?.message,
    ),
  ].filter((value): value is string => Boolean(value)).join("\n");
}

export function mcpToolTooltip(
  tool: McpTool,
  mcp: McpRecord,
  workspaceRoot?: string,
): string {
  return [
    field("Tool", tool.name),
    field("Description", tool.description ?? "No description"),
    field("MCP", mcp.name),
    field("Path", tooltipPath(mcp.configPath, mcp.scope, workspaceRoot)),
  ].filter((value): value is string => Boolean(value)).join("\n");
}

export function skillTooltip(
  skill: SkillRecord,
  workspaceRoot?: string,
): string {
  return [
    field("Skill", skill.name),
    field("Description", skill.description),
    field("Display Name", skill.metadata?.displayName),
    field("Short Description", skill.metadata?.shortDescription),
    field("Default Prompt", skill.metadata?.defaultPrompt),
    field("Path", tooltipPath(skill.skillPath, skill.scope, workspaceRoot)),
    field("Status", skill.state.effective),
  ].filter((value): value is string => Boolean(value)).join("\n");
}

export function rootTooltip(path: string | undefined): string {
  return field("Path", path ?? "(no workspace)") ?? "Path: (no workspace)";
}
