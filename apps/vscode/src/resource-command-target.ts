/**
 * Context-menu commands receive the tree provider element, while commands
 * invoked from a row can receive the underlying resource directly. Normalize
 * both forms at the command boundary.
 */
export function unwrapCommandTarget<T>(value: unknown, key: string): T | undefined {
  if (value === undefined || value === null || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  return key in candidate ? candidate[key] as T | undefined : value as T;
}
