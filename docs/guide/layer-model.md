# 5-Layer Defense Model (L0-L4)

Phasegate enforces quality through 5 layers that run at different points in the development lifecycle. Each layer catches a distinct class of defect, and together they form a defense-in-depth strategy that prevents design drift, code smells, security issues, and stale artifacts from reaching production.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  L0  HOOKS ENGINE    — Agent hook configuration validation  │
│  L1  EDITOR TIME     — Biome AST rules (real-time)          │
│  L2  PRE-COMMIT      — Validators (before commit)           │
│  L3  CI/CD           — Validators (before merge)            │
│  L4  SCHEDULED       — Validators (weekly)                  │
└─────────────────────────────────────────────────────────────┘
         ▲ fastest feedback              slowest feedback ▼
```

Layers are additive: L1 rules still apply when L3 runs. The earlier a defect is caught, the cheaper it is to fix. L0 and L1 give sub-second feedback; L4 catches slow-moving drift that only matters over days or weeks.

---

## L0: Agent Runtime Hooks + Git Hooks

L0 is the **earliest defense layer** — it intercepts file writes and commits *before* they happen, so violations never land in the working tree or the history. There are two sub-systems:

### L0-A: AI agent runtime hooks (`agent-integration` unit)

Registered via `.claude/settings.json` (Claude Code) and `.codex/hooks.json` (Codex). Every hook is implemented in `scripts/harness/agent-integration/presentation/*-hook.ts` and ships with the npm package.

| Hook | Matcher / Trigger | Responsibility |
|------|-------------------|----------------|
| **pre-tool-use-hook** | `Write` / `Edit` / `Bash` | Blocks writes that violate phase gate, write-protected paths, Bash-based bypass (`tee`, `sed -i`, `cp`, heredoc, etc.), or miss `@work-item-id` reflection. Returns exit 2 with a structured guide message that the agent can act on. |
| **post-tool-use-hook** | `Write` / `Edit` | Runs auto-lint / auto-format / error analysis on the file that was just modified (`format-settings-hook.sh`, `format-typescript-hook.sh`, `analyze-errors-hook.sh`). |
| **stop-hook** | Agent `Stop` | Activates `ReentryGuard` to prevent infinite hook loops, then runs `phasegate:complete-check` (L2–L4 aggregate) as a final gate. |
| **session-start-hook** | `startup` / `resume` | Loads session context for Codex (project status summary, recent changes). |
| **user-prompt-submit-hook** | `UserPromptSubmit` | Refreshes status so the next prompt sees the current harness state. |

Command-line entry points exist for debugging / CI use:

```bash
npx phasegate hook pre-tool-use < payload.json
npx phasegate hook post-tool-use < payload.json
npx phasegate hook stop < payload.json
```

### L0-B: Husky git hooks

Deployed by `phasegate init --with-husky` into `.husky/`.

| Hook file | Invokes | Responsibility |
|-----------|---------|----------------|
| **.husky/pre-commit** | `npx phasegate pre-commit` | Runs L2 validators (phase-gate / metadata / story-reflection / test-quality) on staged files. Fails the commit on violation. |
| **.husky/commit-msg** | `npx phasegate commit-msg $1` | Enforces the `Work-Item: WI-XXX` trailer when WI directories or their contents are staged. Ensures every commit is traceable to a work item. |

### About `validate --layer L0`

```bash
npx phasegate validate --layer L0
```

`validate --layer L0` is kept as a compatibility alias that prints guidance and exits successfully. Runtime L0 enforcement happens via the agent-runtime hooks and Husky git hooks above. `list-errors --layer L0` returns no validator definitions.

---

## L1: Editor Time — Biome AST Rules

L1 rules run in real-time as code is written. They are implemented as Biome AST rules and provide immediate feedback in the editor.

### Structural Rules

| Rule | Description |
|------|-------------|
| **require-unit-comment** | Every source file must have a `// @unit <unit-name>` annotation |
| **require-layer-comment** | Every source file must have a `// @layer <layer-name>` annotation |
| **no-layer-violation** | Import direction must follow `domain -> application -> infrastructure/presentation`. Reverse dependencies are rejected. |
| **enforce-folder-structure** | Files must reside in the correct layer directory matching their `@layer` annotation |
| **no-ghost-file** | No orphaned files outside the unit structure |

### Code Quality Rules

| Rule | Description |
|------|-------------|
| **no-any-abuse** | Restricts TypeScript `any` usage to prevent type-safety erosion |
| **no-comment-flood** | Prevents excessive comments that obscure code intent |
| **no-code-duplication** | Detects duplicated code blocks that should be extracted |

### Test Quality Rules (L1)

| Rule | Description |
|------|-------------|
| **it-test-mock-detection** | Detects improper mock usage in integration tests |
| **stub-comment-detection** | Flags stub comments left in test files (e.g., `// TODO: implement`) |

**Command:**

```bash
npx phasegate lint
```

---

## L2: Pre-commit Validators

L2 validators run before every commit. They enforce process discipline and test quality standards.

| Validator | Description |
|-----------|-------------|
| **phase-gate** | Enforces design-before-implementation order. Code changes to `scripts/harness/` are blocked unless the corresponding design documents exist in `docs/product/construction/`. |
| **metadata** | Verifies completeness of source file annotations: `@unit`, `@layer`, `@US-XXX`, and `@story` |
| **test-quality** | Enforces test authoring standards: AAA pattern (Arrange/Act/Assert), `actual` variable naming, single-act-per-test, and no mocking in domain layer tests |

**Command:**

```bash
npx phasegate validate --layer L2
```

---

## L3: CI/CD Validators

L3 validators run in the CI/CD pipeline before a merge is permitted. They cover security, performance, coverage, and traceability.

| Validator | Description |
|-----------|-------------|
| **security** | Scans for hardcoded secrets, SQL injection patterns, and other security anti-patterns |
| **performance** | Detects `await`-in-loop, N+1 query patterns, and bundle size regressions |
| **coverage** | Enforces test coverage thresholds. Standard preset requires 90%; strict preset requires 95%. |
| **nyquist** | Bidirectional requirements-test traceability. Validates that every requirement in `requirement-test-matrix.json` has corresponding tests and vice versa. |

**Command:**

```bash
npx phasegate validate --layer L3
```

---

## L4: Scheduled Validators

L4 validators are designed to run on a weekly schedule and detect slow-moving drift that accumulates over time.

> **Status**: L4 is **disabled by default** (`layers.L4.enabled: false` in `phasegate.config.json`). Projects opt in by flipping the flag and scheduling the command via CI cron (see `ci:generate-template --type consistency-check`). Implementation-wise the validators listed below are functional; the default-off state is a conservative rollout choice, not a missing feature.

| Validator | ID | Description |
|-----------|-----|-------------|
| **drift-detect** | L4-001 | Bidirectional design-code drift detection. Compares design documents against the actual codebase to find divergence in either direction. |
| **consistency-check** | L4-002 | Cross-document layer consistency. Ensures that references between design documents, ADRs, and code remain coherent. |
| **dead-code** | L4-003 | Detects unused exports and unreachable code that should be removed. |
| **doc-freshness** | L4-004 | Checks design document freshness against the configured threshold. Also available through the `p2:check-freshness` compatibility command. |
| **pointer-validation** | L4-005 | Resolves and validates design document pointers. Also available through the `p2:validate-pointers` compatibility command. |

<!-- @work-item-id WI-116 -->
`doc-freshness` and `pointer-validation` are registered as L4-004/L4-005. The standalone `p2:check-freshness` and `p2:validate-pointers` commands remain as compatibility entry points; WI-033's remaining scope is operational rollout, not validator registration.

### Drift-detect design pointers

L4-001 normally matches design headings to code exports by name. When a heading intentionally maps to a differently named implementation file, add a pointer directly under the heading:

```markdown
## UserProfile
<!-- pointers: scripts/harness/user/domain/user-profile.ts -->
```

For multiple files:

```markdown
## UserProfile
<pointers>
  - scripts/harness/user/domain/user-profile.ts
  - scripts/harness/user/domain/user-profile-types.ts
</pointers>
```

Pointers are optional and backward compatible. If any listed path matches the file defining a code export, drift-detect treats that design heading and export as corresponding even when their names differ.

**Command:**

```bash
npx phasegate validate --layer L4
```

---

## HarnessError Format

Every validation failure produces a structured `HarnessError` object. The `suggestion` and `fix_example` fields enable AI agents to self-correct without human intervention.

```typescript
interface HarnessError {
  code: string;         // "L1-003", "L2-001", etc.
  severity: "error" | "warning";
  message: string;
  suggestion: string;
  adr_ref?: string;     // "ADR-003"
  fix_example?: string; // Code fix for AI self-correction
}
```

Error codes follow the pattern `L{layer}-{number}`:

- `L0-xxx` — Hooks Engine errors
- `L1-xxx` — Biome AST rule violations
- `L2-xxx` — Pre-commit validator failures
- `L3-xxx` — CI/CD validator failures
- `L4-xxx` — Scheduled validator findings

---

## Severity Policy (ADR-017 / WI-094, v0.131.0+)

Each error catalog entry declares a `defaultSeverity` of `error` or `warning`. As of v0.131.0, the aggregator (`aggregate-validation-results-usecase.ts`) honors this declaration when computing `overallPassed` and exit code:

- A validator returning **only `severity: warning` errors** is treated as **overall PASS** (exit 0) by default. The result is labeled `[WARN]` in `human` formatter so the warning is still visible.
- A validator returning at least one **`severity: error`** counts as **overall FAIL** (exit 1). Mixed warning + error fails are also FAIL because of the error.
- A validator returning `passed=false` with no errors is treated as FAIL (defensive — severity cannot be assessed).

**Validators with `defaultSeverity: warning`** (advisory by design — fail does not stop CI by default):
- L4-001 drift-detect
- L4-002 consistency-check
- L4-003 dead-code

**Opt-in to strict mode** via `phasegate.config.json` `validate.failOnWarning: true` or CLI `--fail-on-warning` (CLI > config). The `strict` preset defaults to `failOnWarning: true` to match the precedent set by the `ci-governance` preset adapter.

For L4 specifically, `validate --layer L4` is an explicit operator request and runs L4 validators even when `layers.L4.enabled` is false. `validate --layer all` and `phasegate:ci-check` honor disabled L4 as skipped results, so skipped L4 validators are visible in the report but do not become failures under `--fail-on-warning`. @work-item-id WI-107

History: prior to v0.131.0, the aggregator's `failOnWarning` flag was effectively dead code (`hasFail = !result.passed || ...` masked it), so every warning-only fail produced exit 1 regardless of severity declaration. See ADR-017 for the rationale.

---

## Presets and Layer Activation

Presets control which layers are active. Choose based on project maturity and team discipline.

| Preset     | L0 hooks | L1  | L2  | L3  | L4  |
|------------|-----|-----|-----|-----|-----|
| `minimal`  | installed separately | on  | on  | off | off |
| `standard` | installed separately | on  | on  | on  | off |
| `strict`   | installed separately | on  | on  | on  | on  |

- **minimal** — Suitable for early prototyping. Editor-time rules and pre-commit checks only.
- **standard** — Recommended for active development. Adds CI/CD validators for security, performance, coverage, and traceability.
- **strict** — Full defense. Enables scheduled drift detection (L4). Runtime L0 hooks are configured through the agent and Husky hook files, not through validator presets.

Presets are configured in `phasegate.config.json`, the single source of truth for all quality settings.
