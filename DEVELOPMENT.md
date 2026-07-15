# Phasegate Developer Guide

Documentation for developing and maintaining phasegate itself. If you are **using** phasegate in your project, see [README.md](README.md).

---

## Development Setup

```bash
git clone https://github.com/junpei-9898/phasegate.git
cd phasegate
pnpm install
pnpm test
```

| Requirement | Version |
|---|---|
| Node.js | >= 18 |
| pnpm | 10.x |
| TypeScript | 5.x |

---

## Internal Architecture

Phasegate is built with **Clean Architecture + DDD**. Each feature is an independent **Unit** under `scripts/harness/`.

### Dependency Direction

```
domain → application → infrastructure / presentation (reverse is prohibited)
```

### Units

15 production Units exist, all with complete layer implementations.

| Unit | Responsibility | Registered in main.ts |
|---|---|---|
| `config-foundation` | phasegate.config.json parsing, schema validation, presets | Yes |
| `harness-error` | HarnessError definitions, ADR references, fix examples | Yes |
| `traceability-model` | @unit/@layer/@story metadata management | Yes |
| `phase-dependency-model` | Phase dependencies, Phase Gate, storyReflection | Yes |
| `adr-foundation` | ADR management | Yes |
| `biome-ast-engine` | Biome AST analysis engine (import graph, L1 rules) | Yes |
| `validator-system` | L0-L4 validator system | Yes |
| `nyquist-validation` | Requirements-test traceability (AC↔test bidirectional) | **No** (library) |
| `harness-api` | phasegate:* CLI command layer | Yes |
| `quick-mode` | Quick Mode determination and relaxation | Yes |
| `agent-integration` | Claude Code Hooks adapter (pre/post/stop) | **No** (via hooks) |
| `skill-quality` | TDD cycle, coverage, Cascade Update | Yes |
| `ci-governance` | CI/CD templates, repetition error monitoring | Yes |
| `regression-suite` | K1-K15 regression test suite | Yes |
| `phase2-extensions` | freshness / pointer / e2e-template (v2) | Yes |

> **agent-integration** is a library Unit called from Claude Code Hooks presentation layer (index.ts barrel export).
> **nyquist-validation** has full implementation with composition-root.ts but is not CLI-wired. Referenced internally by validator-system.

### Deprecated Units

| Unit | Removed in | Reason |
|---|---|---|
| `fuse-hooks-engine` | v0.10.0 | Simplified to hooks-only configuration (yaml dependency removed) |

### shared-kernel

Cross-unit value objects in `scripts/harness/shared-kernel/`:

| File | Purpose |
|---|---|
| `harness-api.ts` | harness-api shared types |
| `quick-mode.ts` | Quick Mode shared types |
| `validator-system.ts` | Validator shared types |

### HarnessError Format

All validators report errors using a unified `HarnessError` format.

```typescript
interface HarnessError {
  code: string;         // "L1-003", "L2-001", etc.
  severity: "error" | "warning";
  message: string;      // Human-readable description
  suggestion: string;   // Fix suggestion
  adr_ref?: string;     // Related ADR reference ("ADR-003", etc.)
  fix_example?: string; // Fix code example (for AI agent self-correction)
}
```

---

## ADR List

All ADRs are in `docs/ADR/`. All have **Accepted** status.

| # | Title | Summary |
|---|---|---|
| ADR-001 | Four-Layer Defense Model (L1-L4) | Editor-time AST validation via Biome for 8 structural rules |
| ADR-002 | Pre-commit Validators (L2) | Phase gate, metadata, and test quality enforcement |
| ADR-003 | CI Validators (L3) | Security, performance, coverage, and Nyquist validation |
| ADR-004 | Scheduled Validators (L4) | Weekly drift detection, consistency checking, dead code detection |
| ADR-005 | Hexagonal Architecture | Ports & Adapters pattern across all units |
| ADR-006 | Agent Independence | Validators depend only on filesystem artifacts (agent-agnostic) |
| ADR-007 | Config Single Source of Truth | phasegate.config.json owns all quality settings |
| ADR-008 | Quick Mode | Conditional harness relaxation for bugfixes/docs/tests |
| ADR-009 | DDD Tactical Patterns | Value Objects, Entities, Aggregates, Domain Services, Ports |
| ADR-010 | HarnessError fix_example | All errors include fix_example + adr_ref for AI self-correction |
| ADR-011 | archgate Pattern | Architecture rules as executable Biome AST rules |
| ADR-012 | 2-Phase Execution | Human approval for Phase 1 (planning); Phase 2 auto-runs |
| ADR-013 | Story Reflection Gate | Inception-to-product document reflection validation |

---

## CLI Commands

### User-Facing Commands

<!-- @work-item-id WI-150 -->

See [README.md](README.md#cli-reference) for the short onboarding list and [docs/guide/cli-reference.md](docs/guide/cli-reference.md) for the full catalog. When documenting commands, distinguish binary subcommands (`npx phasegate phasegate:status`) from npm scripts (`pnpm phasegate:status`). A `phasegate:*` name is not automatically an npm script; it is only a script when `package.json` defines it.

### Developer Commands

These commands are for phasegate's own development and quality assurance.

#### Regression Tests

| Command | Description |
|---|---|
| `regression:run-k-requirements` | K1-K15 non-negotiable requirements regression (16 tests) |
| `regression:run-gng-gate` | Go/No-Go Gate 3 conditions (GNG-4, GNG-5, GNG-8) |
| `regression:run-agent-guard` | Agent independence guard (3 tests) |
| `regression:run-k14-k15` | K14/K15 (Phase Dependency / Plan docs) regression |
| `regression:configure-ci-gate` | Configure CI gate (`--suites <ids>` `--threshold <n>`) |
| `regression:analyze-migration` | Analyze v0 test migration (`--dry-run`) |
| `regression:migrate-v0-tests` | Execute v0 test migration (`--confirm`) |

#### Hooks Engine

| Command | Description |
|---|---|
| `hooks:config validate` | Compatibility validator for legacy `.harness-hooks.yml`; new setup uses `install`, `doctor`, `reconcile`, `lint`, and `validate` |
| `hooks:gate-check --story <id>` | Completion gate check |

#### Phase 2 Extensions

| Command | Description | Options |
|---|---|---|
| `p2:check-freshness` | Design doc freshness check | `--pattern <glob>` `--dry-run` `--format text\|json` |
| `p2:validate-pointers` | Document file pointer validation | `--include-urls` `--format text\|json` |
| `p2:generate-e2e-template` | E2E test template generation | `--phase <phase>` `--output <path>` |

#### Skill Quality

| Command | Description | Options |
|---|---|---|
| `skill:execute-tdd-cycle` | Execute TDD cycle | `--unit` `--story` `--desc` `--phase RED\|GREEN\|REFACTOR` `--passed` |
| `skill:check-coverage` | Test coverage verification | `--story <storyId>` `--json` |
| `skill:collect-lessons` | Collect agent lessons | `--story <storyId>` `--sources <paths>` `--write-artifact` |
| `skill:apply-cascade-update` | Apply cascade update | `--story <storyId>` `--dry-run` |
| `skill:validate-structure` | Validate skill structure | `--file <path>` `--json` |

The plan-checker workflow is exposed through the skill-quality command family. Use the implemented `skill:*` names as canonical public names; `harness:skill-quality:plan-checker` is not a package script and should not be documented as one unless a future package script is added. @work-item-id WI-149

#### CI/CD

| Command | Description | Options |
|---|---|---|
| `ci:generate-template` | Generate CI template | `--preset <id>` `--type aidlc-gate\|consistency-check\|pre-commit` `--render` `--json` |
| `ci:migrate-agents-md` | Migrate AGENTS.md | — |
| `ci:check-repetition` | Repetition error detection | `--code <errorCode>` `--reset` `--json` |
| `baseline` | Create retrofit baseline snapshot at `.phasegate/baseline.json` (ISSUE-007 Wave 1, Phase A-2 grandfather). Captures sha1 of currently-tracked files so they are exempted from `phase-gate` until they are structurally modified. | `--dry-run` `--force` `--paths <glob,glob,...>` `--json` |

#### Quick Mode

| Command | Description | Options |
|---|---|---|
| `check-change-category` | Classify changed file paths into Quick Mode categories (`api` / `domain` / `feature` / `bugfix` / `test` / `config` / `docs`) and report whether Full Mode is required by `quickMode.fullModeRequiredWhen` (ISSUE-006 Story A). | `--paths <csv>` `--format human\|json` `--fail-on-full-required` |

#### Skill Management

| Command | Description |
|---|---|
| `skills list` | List available skills |
| `skills info <name>` | Show skill details |

`install`, `doctor`, `uninstall`, and `reconcile` are the current setup lifecycle commands. They operate on managed targets recorded in `.phasegate/manifest.json`; see `docs/guide/setup-artifacts.md` for the managed target / generated artifact / runtime state / legacy artifact split. @work-item-id WI-154

---

## Hook System Details

### Architecture

Uses Claude Code hooks to run validation before and after tool calls.

```
Claude Code
  ├─ PreToolUse (Bash)       → deny-check.sh → pre-tool-use-hook.ts
  ├─ PreToolUse (Write|Edit) → pre-tool-use-hook.ts
  ├─ PostToolUse (Write|Edit) → format-settings-hook.sh
  │                            → format-typescript-hook.sh
  │                            → analyze-errors-hook.sh
  │                            → post-tool-use-hook.ts
  └─ Stop                    → stop-hook.ts
```

### Pre-Tool-Use Flow

1. Receives JSON via stdin before tool invocation: `tool_name`, `tool_input`
2. **For Bash**: `BashWriteTargetExtractor` detects write targets (redirects, tee, sed -i, cp, mv) and "spoofs" as Write for phase-gate checking
3. **HandlePreToolUseUseCase** checks, in order:
   - Protected file violations
   - **Baseline grandfather** — if `baseline.enabled` and the target path appears in `.phasegate/baseline.json` with an unchanged sha1, the phase-gate check is skipped (ISSUE-007 Wave 2 / Phase A-2)
   - Phase gate violations
   - **Full Mode required detection** — `quickMode.fullModeRequiredWhen` is evaluated for the in-flight change set; when triggered, escalates Quick Mode → Full and blocks (ISSUE-006 Story B / v0.64.0)
   - storyReflection status
4. **Block decision**: exit code 2 with reason (PHASE_GATE / PROTECTED_FILE / STORY_REFLECTION_FAILURE / FULL_MODE_REQUIRED)

### Retrofit Baseline (`.phasegate/baseline.json`)

When phasegate is introduced into an existing repository, every legacy file would otherwise trip `phase-gate` on first edit. The `baseline` command snapshots the current state so those files are grandfathered in until they are structurally modified.

```jsonc
{
  "version": "1.0",
  "createdAt": "2026-04-21T20:56:26.843Z",
  "algorithm": "sha1",
  "files": [
    { "path": "scripts/harness/foo/domain/bar.ts", "sha1": "a35d1d68..." }
  ]
}
```

- Hash mismatch (the file changed since the snapshot) re-arms `phase-gate` for that file.
- New files (not in the snapshot) are subject to `phase-gate` from the start.
- Toggle the entire mechanism via `baseline.enabled` in `phasegate.config.json`; relocate the snapshot via `baseline.path`.

### Shell Script Hooks

Optional hooks in `.claude/scripts/`:

| Script | Trigger | Behavior |
|---|---|---|
| `deny-check.sh` | PreToolUse (Bash) | Blocks dangerous commands (git reset --hard, rm -rf, etc.) |
| `format-settings-hook.sh` | PostToolUse (Write\|Edit) | Auto-formats JSON when settings.json is edited |
| `format-typescript-hook.sh` | PostToolUse (Write\|Edit) | Auto-formats TypeScript files on edit |
| `analyze-errors-hook.sh` | PostToolUse (Write\|Edit) | Detects tsc/lint errors and type assertions |

### hook-config.json

Configuration for `format-typescript-hook.sh` and `analyze-errors-hook.sh`:

```json
{
  "targetDirs": ["scripts/harness"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

---

## Quick Mode Internals

### File Categorization (by risk, highest first)

| Category | Condition | Risk |
|---|---|---|
| `api` | `*port.ts` or `*adapter.ts` | Highest |
| `domain` | Files in `domain/` directory | High |
| `feature` | New files outside domain (CREATE) | Medium |
| `bugfix` | MODIFY / DELETE operations | Low |
| `test` | `__tests__/` or `.test.ts` / `.spec.ts` | Low |
| `config` | `.config.json` or `.config.ts` | Low |
| `docs` | `docs/` directory | Lowest |

### 3 Rejection Rules (blocks Quick Mode → full validation)

| Rule | Condition | Config flag (`quickMode.fullModeRequiredWhen.*`) |
|---|---|---|
| `MIXED_CHANGES` | Files outside `allowedCategories` | `mixedCategories` |
| `NEW_DOMAIN` | New files in `domain/` directory | `newDomainFile` |
| `API_CONTRACT` | Changes to `*port.ts` / `*adapter.ts` | `apiContractChange` |

ISSUE-006 Story A made these triggers config-driven; flipping a flag to `false` in `phasegate.config.json` disables that specific escalation. Story B then wired the same checks into the pre-tool-use hook so the escalation fires synchronously at write time, not just after-the-fact during validation.

Use `npx phasegate check-change-category --paths <csv> [--format json] [--fail-on-full-required]` to dry-run the classifier against an arbitrary file list (useful in CI gates that want to short-circuit a Quick Mode PR).

### Validator Relaxation (when approved)

| Layer | Quick Mode Behavior |
|---|---|
| L1 | Always maintained |
| L2 | Partially maintained per `maintainedLayers` |
| L3 | Security validator only |
| L4 | Fully skipped |

---

## Regression Tests (K1-K15)

Self-tests verifying phasegate's non-negotiable requirements.

```bash
npx phasegate regression:run-k-requirements    # 16 tests
npx phasegate regression:run-gng-gate           # 3 tests
npx phasegate regression:run-k14-k15            # 2 tests
npx phasegate regression:run-agent-guard        # 3 tests
```

### K1-K15 Requirements

| # | Requirement | Target Unit |
|---|---|---|
| K1 | 5-layer defense model (L0-L4) | validator-system |
| K2 | Phase Gate (design→implementation order) | phase-dependency-model |
| K3 | Biome AST analysis (import graph + cycle detection) | biome-ast-engine |
| K3.5 | @unit/@layer/@US-XXX metadata | traceability-model |
| K4 | Test quality rules (AAA / actual / no-domain-mock) | validator-system |
| K5 | DDD design skills | validator-system |
| K6 | 2-Phase Execution (AI safety mechanism) | harness-api |
| K7 | Document Split (inception/product separation) | harness-api |
| K8 | Cascade Updater | harness-api |
| K9 | Agent-Lesson System | ci-governance |
| K10 | Security/Performance detection | harness-api |
| K11 | Drift Detection (bidirectional) | validator-system |
| K12 | Consistency Checker | validator-system |
| K13 | phasegate.config.json (quality settings SSOT) | config-foundation |
| K14 | Phase Dependency Model (3-tier phase structure) | phase-dependency-model |
| K15 | Plan document generation required | harness-api |

---

## Test Infrastructure

### Test Execution

```bash
pnpm test
```

Internally runs two vitest configs sequentially:
1. `vitest.config.forks.ts` — for `process.chdir()` dependent tests (forks pool)
2. `vitest.config.ts` — main tests (threads pool, singleThread: true, timeout: 15000ms)

### Test Statistics (v0.33.0)

- Test files: 399
- Test cases: 2,997
- All PASSING

---

## Feature Flags Implementation Status

Toggle via `npx phasegate enable-feature <name>` / `disable-feature <name>`.

| Flag | Default | Runtime | Description |
|---|---|---|---|
| `agentLessonCollection` | `false` | **Config only** | Lesson collection (manual check required) |
| `cascadeUpdate` | `false` | **Connected** | storyReflection gate + product docs accumulation |
| `bundleSizeLimit` | `0` (disabled) | **Not implemented** | Bundle size limit (designed for CI, not wired) |
| `deadCodeGC` | `false` | **Not implemented** | Dead code GC scan (manual CLI only) |

---

## CI/CD

### GitHub Actions Workflow

`.github/workflows/ci.yml`:

| Job | Environment | Content |
|---|---|---|
| `test` | ubuntu-latest, Node 18/20/22 matrix | `pnpm test` |
| `pack` | ubuntu-latest, Node 22 | `pnpm pack` + package size < 5MB |

Triggers: `push` to main, `pull_request` to main

### CI Template Generation

```bash
npx phasegate ci:generate-template --type <type> [--preset <id>] [--render] [--json]
```

| `--type` | Trigger | Purpose |
|---|---|---|
| `aidlc-gate` | pull_request | PR quality gate |
| `consistency-check` | schedule | Periodic consistency check |
| `pre-commit` | pre-commit | Pre-commit validation |

### Repetition Error Monitoring

`ErrorRepetition` aggregate tracks occurrence counts per error code:
- Escalation at threshold (default: 3 occurrences)
- Persisted to `error-history.json`
- `ci:check-repetition --code <code>` to check, `--reset` to clear

---

## In-Development & Planned Features

### Configurable Phase Gate (Phase A: In Progress / Phase B: Planned)

**Planning doc**: `docs/inception/_shared/configurable_phase_gate_plan.md`

Phase A (v1.0 target):
- [x] Preset expansion (full / standard / minimal / custom)
- [x] storyReflection gate validation
- [x] `@unit` multi-unit support design
- [ ] Phase B implementation (custom gate DSL)

Phase B (v1.1 target):
- JSON-based `gates[]` array for user-defined phase dependencies
- DAG validation (cycle detection)

### Skill Packaging

**Planning doc**: `docs/inception/_shared/skill_separation_plan.md`

The shipped catalog currently contains 29 skills. `npx phasegate init --skills core|all` is the implemented public selector; `aidlc` is not accepted by the current CLI. When adding or retiring a skill, update `skills/*/SKILL.md`, `docs/guide/skills-overview.md`, README skill counts, and any setup guidance skill references in the same change. @work-item-id WI-154

Before release, run `npx phasegate validate --layer L4 --format human` or the equivalent package script path to catch scheduled documentation drift, including `L4-006 skill-catalog-drift`. Command/script drift and install target drift remain manual release checklist items until dedicated validators are added. @work-item-id WI-156

### Harness→Phasegate Rename (Planned, Breaking Change)

**Planning doc**: `docs/inception/_shared/harness_to_phasegate_rename_plan.md`

5-phase coordinated rename: 17 directories, 76 files, 1,500+ code refs, 3,000+ doc refs.

### OSS Public Release Strategy (Planned)

**Planning docs**: `docs/inception/_shared/oss_public_release_strategy.md`, `oss_release_tasklist.md`

---

## Known Issues

### ISSUE-003: 145 Remaining Lint Violations

**Filed**: 2026-04-06 | **Priority**: Low | **Impact**: No functional impact

| Rule | Count | Description |
|---|---|---|
| L1-003 (no-layer-violation) | 55 | Layer boundary crossing |
| L1-007 (no-ghost-file) | 43 | Unused files |
| L1-006 (no-code-duplication) | 31 | Code duplication |
| L1-004 (enforce-folder-structure) | 12 | @layer declaration mismatch |
| L1-005 (no-any-abuse) | 4 | Excessive `any` usage |

Verify: `npx phasegate lint --json`

### L0 / L4 Effectiveness

- **L0 (FUSE)**: Disabled — platform dependency (macOS/Linux native)
- **L4 (Scheduled)**: Manual only — auto-scheduling not implemented

### Nyquist Auto-Generation Pipeline

`requirement-test-matrix.json` auto-generation not implemented. Manual setup required.

---

## Directory Structure

```
phasegate/
├── bin/phasegate                    # CLI entry point (shell script)
├── scripts/harness/
│   ├── main.ts                      # CLI router (41+ commands)
│   ├── shared-kernel/               # Cross-unit value objects
│   ├── setup/                       # Skill deployer
│   ├── integrations/                # Pre-commit integration
│   ├── templates/                   # GitHub/Husky CI templates
│   ├── 15 unit directories/         # Each with domain/application/infrastructure/presentation
│   └── __tests__/                   # Centralized test suite
├── .claude/
│   ├── settings.json                # Claude Code hooks configuration
│   └── scripts/                     # Shell script hooks
├── skills/                          # 29 skills
├── templates/                       # Config templates
└── docs/
    ├── ADR/                         # 13 Architecture Decision Records
    ├── principles/                  # Development principles (immutable)
    ├── inception/                   # Design docs & planning
    │   ├── _shared/                 # Cross-cutting plans
    │   ├── _operation/              # Operations & deployment
    │   ├── issues/                  # Cross-cutting issues (ISSUE-001~003)
    │   └── {UnitName}/             # Per-unit planning
    └── product/                     # Finalized design docs
```

---

## Versioning and Release

Semantic Versioning (MAJOR.MINOR.PATCH).

```bash
# 1. Update version in package.json (and add an entry to CHANGELOG.md)
# 2. Commit and tag
git add package.json CHANGELOG.md
git commit -m "fix: vX.Y.Z — description"
git tag vX.Y.Z
git push origin main --tags

# 3. Verify npm auth (if not logged in: npm login --auth-type=web)
npm whoami

# 4. Dry-run to inspect the tarball
npm publish --dry-run

# 5. Publish
npm publish --auth-type=web
```

#### Troubleshooting npm publish authentication

`npm publish` behavior depends on your account's 2FA mode:

| 2FA mode | publish behavior | workaround |
|---|---|---|
| Disabled | Proceeds directly | `npm publish` |
| TOTP (authenticator app) | `EOTP` error → OTP required | `npm publish --otp=<6-digit>` |
| Email OTP (Enhanced Login Verification) | `EOTP` error → code sent by email | Check inbox, then `--otp=<6-digit>` |
| Security key / Passkey (FIDO/WebAuthn) | `EOTP` error (the `--otp` flag is TOTP-only, so it cannot be used) | **`npm publish --auth-type=web`** — opens a browser, authenticate with the key, publish completes |

**Rule of thumb for security-key accounts:** always use `--auth-type=web`. The `--otp` flag is TOTP-only and will be rejected.

**CI/automation:** generate a **Granular Access Token** from https://www.npmjs.com/settings/<username>/tokens (scope: target package, permissions: Read and write, Bypass 2FA: enabled), then inject it via `.npmrc` as `//registry.npmjs.org/:_authToken=<TOKEN>` or the `NPM_TOKEN` env var.

#### Cross-check before publishing

Local `package.json` can drift from the npm registry (e.g. v0.32.0 was the published latest while local was v0.38.0). Before `npm publish`, cross-check all three:

```bash
npm view phasegate version     # registry latest
git tag --list | tail -5       # local tags
cat package.json | grep version # local version
```

---

## Roadmap

| Version | Content | Status |
|---|---|---|
| **v0.33.0** (current) | README overhaul, DEVELOPMENT docs | Released |
| **v1.0.0** | Configurable Phase Gate Phase A, preset system | In Progress |
| **v1.1.0** | Phase B (custom gate DSL), Skill Separation | Planned |
| **v1.2.0+** | Harness→Phasegate rename (breaking change) | Planned |
| **v2.0.0** | L0 FUSE integration, L4 auto-scheduling, OSS release | Long-term |

---

*See also: [README.md](README.md) (user guide) / [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) (Japanese) / [README.ja.md](README.ja.md) (Japanese user guide)*
