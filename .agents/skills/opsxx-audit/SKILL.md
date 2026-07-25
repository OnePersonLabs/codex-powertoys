---
name: opsxx-audit
description: Audit current implementation against current OpenSpec specs for semantic drift, missing specs/requirements/scenarios, missing implementation, and orphaned specifications whose described behavior has been removed. Use when the user asks whether code still matches specs, asks for code/spec drift detection, asks what needs new OpenSpec coverage, or asks whether specs are stale.
---

# opsxx-audit

Run a read-only semantic audit between `openspec/specs/**/spec.md` and the current implementation. This skill reports evidence and recommended next routes; it does not edit code or specs unless the user separately asks for remediation.

## Existing OpenSpec Coverage

OpenSpec CLI validation is structural, not a semantic code/spec drift audit. Use:

```bash
openspec validate --specs --strict --no-interactive
openspec doctor --json
```

Report those results as structural context, then continue with the semantic audit below.

## Scope

If the user names a capability, package, file, or domain, audit only that scope. If no scope is named, audit all current main specs in batches by capability. Treat active change specs as out of scope unless the user asks to audit planned/in-flight behavior.

Start by running:

```bash
node .agents/skills/opsxx-audit/scripts/spec_inventory.mjs --markdown
```

Use `--capability <slug>` for a focused audit and `--json` when a machine-readable inventory helps.

## Audit Method

1. Build a spec claim inventory.
   - Extract every capability, requirement, scenario, frontmatter package/domain, and normative sentence.
   - Keep spec evidence as file and line references.

2. Map each capability to implementation surfaces.
   - Use frontmatter, requirement nouns, package names, exports, tests, workflows, docs, and `rg -l` searches.
   - Search before reading broad trees. Prefer `rg -l` to discover candidate files, then read the likely owners.
   - Include tests as evidence of intended behavior, but do not treat tests as implementation by themselves.
   - For process, governance, or workflow requirements, treat instructions, validators, hooks, generated CLI instruction output, CI workflows, and scripts as implementation surfaces.

3. Check spec to code.
   - Confirm whether each requirement and scenario has an implementation path.
   - Compare constants, state transitions, validation rules, side effects, data ownership, and user-visible behavior against the spec wording.
   - Mark missing implementation only after searching alternate owners and indirect implementations.

4. Check code to spec.
   - Inspect public APIs, exported behaviors, workflows, user-facing paths, validators, scripts, and tests in the mapped surfaces.
   - Identify behavior that is durable, user-visible, cross-boundary, security-sensitive, release-affecting, or otherwise normative but absent from specs.
   - Do not require specs for incidental private helpers unless they define externally observable or architecture-critical behavior.

5. Classify every finding.

   | Type | Meaning |
   | --- | --- |
   | `DRIFT` | A spec-covered behavior still exists, but code now does something materially different. |
   | `MISSING_IMPLEMENTATION` | A requirement or scenario appears normative, but no implementation path was found. |
   | `MISSING_SPEC` | Durable current behavior has no covering requirement. |
   | `MISSING_SCENARIO` | A requirement exists, but important current branches or edge cases lack scenarios. |
   | `ORPHANED_SPEC` | A spec requirement or scenario describes behavior whose implementation surface was removed or abandoned. |
   | `AMBIGUOUS` | Evidence is insufficient; list exactly what could not be proven. |

6. Apply the split rule for large behavior changes.
   - If a code change bends behavior too far to trace cleanly as `DRIFT`, report two findings instead:
     - `ORPHANED_SPEC` for the previously specified behavior that no longer has an implementation.
     - `MISSING_SPEC` for the new behavior that now exists without current specification coverage.

## Evidence Standard

Every non-ambiguous finding needs both sides of the comparison:

- Spec evidence: capability, requirement/scenario name, file, line, and relevant normative wording.
- Implementation evidence: file, line, symbol or workflow, and observed behavior.
- Generated-tool evidence: command, arguments, summarized output, and the owning repo surface if discoverable.
- Search evidence when absent: the targeted searches or surfaces checked.

Use `AMBIGUOUS` instead of overstating certainty when names changed, behavior moved behind adapters, runtime behavior depends on external services, or generated behavior cannot be traced to an owning file.

For requirements phrased as review obligations, policy, or process outcomes, do not require a runtime product code path. Audit the executable or procedural surfaces that could actually enforce or route that behavior, then report whether the requirement is enforced, instructed-only, undocumented, or absent.

## Report Format

Lead with findings, ordered by severity and confidence:

```markdown
## OpenSpec Audit: <scope>

### Findings

- [DRIFT] <capability> / <requirement>
  Spec: <file:line> says <short claim>.
  Code: <file:line> now does <short observed behavior>.
  Impact: <why it matters>.
  Recommendation: <update spec, fix code, add scenario, remove stale requirement, or investigate>.

### Coverage Gaps

- [MISSING_SPEC] ...
- [MISSING_SCENARIO] ...

### Orphans

- [ORPHANED_SPEC] ...

### Ambiguous

- [AMBIGUOUS] ...

### Checks Run

- <commands and targeted searches>
```

If no findings are found, say that clearly and list residual risk, especially any surfaces not audited.

## Remediation Routing

- Use `$opsxx-reconcile-specs` when the implementation is accepted and specs need updating.
- Use `$opsx-apply` when the spec is accepted and code needs fixing under an active change.
- Use `$opsx-propose` when missing spec coverage represents a new intended capability.
- Use `$opsxx-reverse` when uncommitted implementation already exists and needs to be bridged into OpenSpec history.

## Guardrails

- Do not downgrade specs just because current code is easier or already changed.
- Do not remove a requirement solely because a string search failed.
- Do not call a spec orphaned until likely implementation owners, tests, adapters, scripts, workflows, and docs in scope have been checked.
- Do not mutate code, specs, or change artifacts during an audit unless the user explicitly asks for fixes.
- Keep requirements behavioral. Data structures, algorithms, and helper-level details belong in design or implementation notes unless they are the observable contract.
