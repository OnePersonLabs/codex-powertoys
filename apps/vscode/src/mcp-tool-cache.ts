import type {
  Diagnostic,
  McpRecord,
  McpTool,
  McpToolResult,
} from "@codex-powertoys/core";

export type McpToolCacheEntry = {
  name: string;
  recordId: string;
  fingerprint: string;
  status: "ready" | "failed";
  tools: McpTool[];
  diagnostics: Diagnostic[];
  generation: number;
};

type CacheListener = (entry: McpToolCacheEntry) => void;
type Loader = (record: McpRecord) => Promise<McpToolResult>;

async function defaultLoader(record: McpRecord): Promise<McpToolResult> {
  const { loadMcpTools } = await import("@codex-powertoys/core");
  return loadMcpTools(record);
}

function precedence(record: McpRecord): number {
  if (record.scope === "workspace" && !record.plugin) return 0;
  if (record.scope === "global" && !record.plugin) return 1;
  return 2;
}

function betterRecord(candidate: McpRecord, current: McpRecord): McpRecord {
  return precedence(candidate) < precedence(current) ||
    (precedence(candidate) === precedence(current) && candidate.id.localeCompare(current.id) < 0)
    ? candidate
    : current;
}

function stableValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
    .join(",")}}`;
}

function recordFingerprint(record: McpRecord): string {
  return stableValue({
    config: record.config,
    effective: record.effective,
    enabled: record.enabled,
    pluginEnabled: record.pluginEnabled,
    toolPolicy: record.effectiveToolPolicy ?? record.toolPolicy,
  });
}

function failureResult(record: McpRecord, error: unknown): McpToolResult {
  return {
    tools: [],
    transport: "stdio",
    diagnostics: [
      {
        code: "MCP_TOOLS_UNAVAILABLE",
        message: error instanceof Error ? error.message : String(error),
        path: record.configPath,
        line: record.sourceRange.startLine,
        severity: "error",
      },
    ],
  };
}

export class McpToolCache {
  private readonly cache = new Map<string, McpToolCacheEntry>();
  private readonly queue = new Map<string, McpRecord>();
  private readonly inFlight = new Map<string, { recordId: string; fingerprint: string }>();
  private readonly idleWaiters: Array<() => void> = [];
  private running = false;
  private generation = 0;

  constructor(
    private readonly onUpdate: CacheListener,
    loader?: Loader,
  ) {
    this.loader = loader ?? defaultLoader;
  }

  private readonly loader: Loader;

  get(record: McpRecord): McpToolCacheEntry | undefined {
    const entry = this.cache.get(record.name);
    return entry?.recordId === record.id && entry.fingerprint === recordFingerprint(record)
      ? entry
      : undefined;
  }

  hasCurrent(record: McpRecord): boolean {
    return this.get(record) !== undefined;
  }

  toolsFor(record: McpRecord): McpTool[] {
    return this.get(record)?.tools ?? [];
  }

  enqueue(record: McpRecord, force = false): boolean {
    if (
      record.effective !== "active" ||
      !record.enabled ||
      !record.pluginEnabled ||
      (!force && this.hasCurrent(record))
    )
      return false;
    const fingerprint = recordFingerprint(record);
    const active = this.inFlight.get(record.name);
    if (
      !force &&
      active?.recordId === record.id &&
      active.fingerprint === fingerprint
    )
      return false;
    const current = this.queue.get(record.name);
    this.queue.set(record.name, current ? betterRecord(record, current) : record);
    void this.drain();
    return true;
  }

  enqueueEnabled(records: McpRecord[], forceNames: ReadonlySet<string> = new Set()): void {
    const winners = new Map<string, McpRecord>();
    for (const record of records) {
      if (record.effective !== "active" || !record.enabled || !record.pluginEnabled) continue;
      const current = winners.get(record.name);
      winners.set(record.name, current ? betterRecord(record, current) : record);
    }
    for (const record of winners.values()) this.enqueue(record, forceNames.has(record.name));
  }

  clear(): void {
    this.cache.clear();
    this.queue.clear();
  }

  waitForIdle(): Promise<void> {
    if (!this.running && this.queue.size === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.size) {
        const next = this.queue.entries().next().value as [string, McpRecord] | undefined;
        if (!next) break;
        const [name, record] = next;
        this.queue.delete(name);
        const fingerprint = recordFingerprint(record);
        this.inFlight.set(name, { recordId: record.id, fingerprint });
        let result: McpToolResult;
        try {
          result = await this.loader(record);
        } catch (error) {
          result = failureResult(record, error);
        }
        const entry: McpToolCacheEntry = {
          name,
          recordId: record.id,
          fingerprint,
          status: result.diagnostics.length ? "failed" : "ready",
          tools: result.diagnostics.length ? [] : result.tools,
          diagnostics: result.diagnostics,
          generation: ++this.generation,
        };
        this.inFlight.delete(name);
        this.cache.set(name, entry);
        this.onUpdate(entry);
      }
    } finally {
      this.running = false;
      if (this.queue.size) void this.drain();
      else {
        for (const resolve of this.idleWaiters.splice(0)) resolve();
      }
    }
  }
}
