import type { EffectiveResourceState, ResourceStatusGlyph } from "./types.js";

/**
 * Convert a discovered resource's effective state into its display glyph.
 *
 * A shadowed record inherits the enabled/disabled outcome of the winner for
 * its name. Missing winner metadata is treated as enabled for compatibility
 * with callers that construct records outside discovery.
 */
export function resourceStatusGlyph(
  effective: EffectiveResourceState,
  shadowedByEnabled = true,
): ResourceStatusGlyph {
  if (effective === "active") return "✅";
  if (effective === "shadowed") return shadowedByEnabled ? "☑️" : "✖️";
  return "❌";
}
