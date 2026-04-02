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

## L0: Hooks Engine

The Hooks Engine validates agent hook configuration and enforces completion gates before work can proceed.

| Rule | Description |
|------|-------------|
| **hook-config** | Validates `.harness-hooks.yml` configuration structure and semantics |
| **gate-check** | Verifies that all required completion gates have been satisfied |

**Command:**

```bash
npx harness validate --layer L0
```

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
npx harness lint
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
npx harness validate --layer L2
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
npx harness validate --layer L3
```

---

## L4: Scheduled Validators

L4 validators run on a weekly schedule. They detect slow-moving drift that accumulates over time.

| Validator | Description |
|-----------|-------------|
| **drift-detect** | Bidirectional design-code drift detection. Compares design documents against the actual codebase to find divergence in either direction. |
| **consistency-check** | Cross-document layer consistency. Ensures that references between design documents, ADRs, and code remain coherent. |
| **dead-code** | Detects unused exports and unreachable code that should be removed. |

**Command:**

```bash
npx harness validate --layer L4
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

## Presets and Layer Activation

Presets control which layers are active. Choose based on project maturity and team discipline.

| Preset     | L0  | L1  | L2  | L3  | L4  |
|------------|-----|-----|-----|-----|-----|
| `minimal`  | off | on  | on  | off | off |
| `standard` | off | on  | on  | on  | off |
| `strict`   | on  | on  | on  | on  | on  |

- **minimal** — Suitable for early prototyping. Editor-time rules and pre-commit checks only.
- **standard** — Recommended for active development. Adds CI/CD validators for security, performance, coverage, and traceability.
- **strict** — Full defense. Enables the Hooks Engine (L0) and scheduled drift detection (L4). Use for production-critical codebases.

Presets are configured in `phasegate.config.json`, the single source of truth for all quality settings.
