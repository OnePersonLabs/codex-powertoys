import test from "node:test";
import assert from "node:assert/strict";
import { resourceStatusGlyph } from "../src/index.js";

test("resource status glyphs cover the complete enabled/disabled matrix", () => {
  assert.deepEqual(
    [
      ["active", true],
      ["active", false],
      ["shadowed", true],
      ["shadowed", false],
      ["disabled", true],
      ["unavailable", true],
    ].map(([effective, shadowedByEnabled]) =>
      resourceStatusGlyph(
        effective as "active" | "disabled" | "shadowed" | "unavailable",
        shadowedByEnabled as boolean,
      ),
    ),
    ["✅", "✅", "☑️", "✖️", "❌", "❌"],
  );
});
