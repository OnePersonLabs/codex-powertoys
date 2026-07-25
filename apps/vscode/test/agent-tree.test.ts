import test from "node:test";
import assert from "node:assert/strict";
import { basename, join } from "node:path";
import {
  agentTreeChildren,
  agentTreeExpansion,
} from "../src/agent-tree.js";
import type { AgentRecord, Scope } from "@codex-powertoys/core";

const globalRoot = "/global/.codex/agents";
const workspaceRoot = "/workspace/.codex/agents";

function agent(
  scope: Scope,
  rootPath: string,
  relativePath: string,
): AgentRecord {
  return {
    id: `${scope}:${relativePath}`,
    name: basename(relativePath, ".toml"),
    path: join(rootPath, ...relativePath.replaceAll("\\", "/").split("/")),
    scope,
    rootPath,
    relativePath,
    sourceKind: scope === "workspace" ? "workspace" : "system",
    content: "",
    diagnostics: [],
    readOnly: false,
  };
}

test("enumerates direct global children without repeating nested directories", () => {
  const records = [
    agent("global", globalRoot, "model-effort\\sol-high.toml"),
    agent("global", globalRoot, "model-effort/deep/reviewer.toml"),
    agent("global", globalRoot, "top-level.toml"),
    agent("workspace", workspaceRoot, "team/reviewer.toml"),
  ];

  const rootChildren = agentTreeChildren(records, "global", globalRoot);
  assert.deepEqual(
    rootChildren.map((child) =>
      child.kind === "directory" ? child.name : child.agent.relativePath,
    ),
    ["model-effort", "top-level.toml"],
  );
  const modelEffort = rootChildren[0];
  assert.equal(modelEffort?.kind, "directory");
  if (modelEffort?.kind !== "directory") return;
  assert.equal(modelEffort.path, join(globalRoot, "model-effort"));

  const nestedChildren = agentTreeChildren(
    records,
    "global",
    globalRoot,
    modelEffort.relativePath,
  );
  assert.deepEqual(
    nestedChildren.map((child) =>
      child.kind === "directory" ? child.name : child.agent.relativePath,
    ),
    ["deep", "model-effort\\sol-high.toml"],
  );
  assert.equal(
    nestedChildren.some(
      (child) => child.kind === "directory" && child.name === "model-effort",
    ),
    false,
  );
});

test("enumerates workspace descendants using the workspace scope", () => {
  const records = [
    agent("global", globalRoot, "team/global.toml"),
    agent("workspace", workspaceRoot, "team/reviewer.toml"),
  ];
  const children = agentTreeChildren(records, "workspace", workspaceRoot, "team");
  assert.equal(children.length, 1);
  assert.equal(children[0]?.kind, "file");
  assert.equal(
    children[0]?.kind === "file" ? children[0].agent.name : undefined,
    "reviewer",
  );
});

test("returns no children without a workspace root and keeps expansion finite", () => {
  const records = [agent("workspace", workspaceRoot, "team/reviewer.toml")];
  assert.deepEqual(agentTreeChildren(records, "workspace", undefined), []);
  assert.equal(agentTreeExpansion("root"), "expanded");
  assert.equal(agentTreeExpansion("agentDir"), "collapsed");
  assert.equal(agentTreeExpansion("leaf"), "none");
});
