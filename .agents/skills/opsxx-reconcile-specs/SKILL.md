---
name: "opsxx-reconcile-specs"
description: "Reverse-engineer current codebase state back into OpenSpec artifacts — proactive spec reconciliation when implementation has drifted from specs. Use this skill when the user asks to reconcile implementation drift back into OpenSpec specs."
---

Reverse-engineer the current implementation state back into an OpenSpec change with delta specs. Use when implementation has drifted from specs through rapid iteration, emergency fixes, or scope expansion.

The output is a standard OpenSpec change. From there, use $opsx-verify, $opsx-sync, $opsx-apply, or $opsx-archive as normal.

**Input**: Optionally specify a capability name (e.g., $opsxx-reconcile-specs recognition-engine).

- If a **capability name** is given: reconcile that main spec against its package's implementation
- If **nothing** is given: scan all main specs for divergences and report

**Steps**

1. **Gather context (single pass -- no re-reads)**

   Launch Explore agents (up to 3 in parallel) to gather spec and implementation in one pass:
   - Agent 1: Read the main spec(s) in scope, extract all requirements and scenarios
   - Agent 2: Read the package's source files (exports, public API, core logic)
   - Agent 3 (if needed): Read related specs that the change touches (e.g. dev-harness, director-goals)

   If no capability name is provided, run `openspec list --specs --json` first to determine scope.

   **After agents return, assess gaps before any further reads.** List what the agents covered vs what's missing. Read ONLY the gaps -- do NOT re-read files agents already summarized. Agent summaries that include requirement names, scenario details, method signatures, and code structure ARE the information.

4. **Classify divergences**

   | Type | Description | Example |
   |------|-------------|---------|
   | **NEW** | Capability in code, not in spec | New method on PracticeExperience not in its capability spec |
   | **DRIFT** | Spec says X, code does Y | Spec says 16ms budget, code uses 32ms timeout |
   | **GAP** | Spec requires X, code doesn't have it | Scenario defined but no corresponding code path |
   | **STALE** | Spec references removed code | Requirement for a deleted API |

5. **Present findings and confirm**

   Show the divergence report grouped by capability. For each divergence, show the proposed resolution. **Wait for user confirmation before creating the change.**

   ```
   ## Reverse Spec Reconciliation: <scope>

   ### <capability-name> (package: <package>)

   **NEW** (in code, not in spec):
   - <description> → will become ADDED requirement

   **DRIFT** (spec ≠ code):
   - <requirement name>: <what changed> → will become MODIFIED requirement

   **GAP** (in spec, not in code):
   - <requirement name>: <what's missing> → needs discussion (unimplemented? structured differently?)

   **STALE** (spec references removed code):
   - <requirement name> → will become REMOVED requirement (confirm?)
   ```

   GAPs require explicit user decision: keep (implementation needed), remove (product no longer needs it), or skip (investigate later).

6. **Create the OpenSpec change**

   After the user confirms:

   ```bash
   openspec new change "reverse-sync-<capability>"
   ```

   Then write artifacts into the created change directory:

   Write `proposal.md` — summary of what drifted and why the change exists.

   Write `design.md` — brief, since this is reconciliation not new design. Note which divergences are being addressed.

   Write delta specs under `specs/<capability>/spec.md` using ADDED/MODIFIED/REMOVED/RENAMED sections for each confirmed divergence.

   Write `tasks.md` — only if there are GAPs the user wants to fix (code that needs to be written). If purely spec-side reconciliation, tasks can be empty or omitted.

7. **Hand off to normal workflow**

   Report:
   ```
   Change created: reverse-sync-<capability>

   Next steps:
   - opsx-verify reverse-sync-<capability>  — check coherence
   - opsx-sync reverse-sync-<capability>    — apply delta specs to main specs
   - opsx-apply reverse-sync-<capability>   — if there are implementation tasks
   - opsx-archive reverse-sync-<capability> — when done
   ```

**Guardrails**

- **Spec behavior, not implementation.** Requirements describe what the system does from the outside. Internal data structures, algorithms, and code patterns belong in design docs, not specs.
- **Preserve rationale.** When a spec says SHALL and the code does something different, the spec may be aspirational (the goal) rather than stale (forgotten). Ask before downgrading.
- **Human review for GAPs.** Never silently remove a requirement because code doesn't obviously implement it. The code may satisfy it through a different mechanism.
- **Preserve normative language.** Don't weaken SHALL to SHOULD or drop scenarios during reconciliation. If the requirement is truly no longer needed, use REMOVED explicitly.
- **No false precision.** If you can't determine whether code satisfies a requirement, say so. "Unable to verify" is better than a false positive.

---

## OpenSpec Conventions Reference

### Normative Language

| Keyword | Meaning | When to Use |
|---------|---------|-------------|
| **SHALL** | Mandatory. Non-negotiable. | Core behavior that defines the capability |
| **SHOULD** | Recommended. Deviation requires justification. | Best practices, performance targets |
| **MAY** | Optional. Implementation choice. | Extension points, optional features |

### Requirement & Scenario Structure

```markdown
### Requirement: <Name>

<Description using normative language.>

#### Scenario: <Scenario Name>
- **GIVEN** <precondition>
- **WHEN** <action or event>
- **THEN** <expected outcome>
- **AND** <additional outcome>
```

### Delta Spec Format

Delta specs live at `openspec/changes/<change>/specs/<capability>/spec.md`:

```markdown
## ADDED Requirements

### Requirement: New Feature
The system SHALL do X.

#### Scenario: Basic case
- **GIVEN** precondition
- **WHEN** action
- **THEN** result

## MODIFIED Requirements

### Requirement: Existing Feature
#### Scenario: New scenario to add
- **GIVEN** precondition
- **WHEN** action
- **THEN** result

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

- ADDED: Full requirement with description and scenarios
- MODIFIED: Only what changed. Existing scenarios not mentioned are preserved.
- REMOVED: Just the requirement name.
- RENAMED: FROM/TO format.

### CLI Quick Reference

```bash
openspec list --specs --json          # List all specs
openspec show <capability> --json     # Show a specific spec
openspec list --json                  # List all changes
openspec status --change "<name>" --json  # Show change status
```

---

## Divergence Patterns

### NEW: Code exists, spec doesn't

Draft an ADDED requirement. Spec *what* the code does (behavior), not *how* (implementation).

**Good**: "The engine SHALL associate each hypothesis with a motor signature describing the physical gesture"
**Bad**: "The engine SHALL maintain a Map<string, MotorSignature> keyed by hypothesis ID, populated in processNoteOn()"

### DRIFT: Spec says X, code does Y

**Key question**: "Does the product actually need what the spec says, or has the need changed?"

Code correct → MODIFIED requirement. Spec correct → GAP (implementation needs fixing). **Warning**: this is where spec-downgrading happens. Don't change the spec just because the code is easier.

### GAP: Spec exists, code doesn't

Search thoroughly — the code may satisfy the requirement indirectly. If truly missing, flag for user decision. **Never silently remove.**

### STALE: Spec references removed code

Check git history for when/why. Moved → update spec. Deliberately removed → REMOVED. Accidentally removed → flag as regression.

### Anti-Patterns

- **Specifying implementation details**: Data structures and algorithms belong in design docs, not specs.
- **Weakening normative language**: SHALL → SHOULD because implementation is hard = spec-downgrading.
- **Removing scenarios because code doesn't match**: The code may be wrong. Investigate first.
- **Over-specifying from code**: Not every function deserves a requirement. Only user-visible or system-critical behavior.
