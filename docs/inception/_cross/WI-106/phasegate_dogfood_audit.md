# WI-106 PhaseGate dogfood audit

@work-item-id WI-106
@unit traceability-model
@unit validator-system
@unit ci-governance

## Scope

WI ID duplicate remediation後に、PhaseGate自身をPhaseGateで検証し、追加起票すべき「あるべき姿との乖離」を洗い出した。

本調査ではコード修正は行わず、実行結果と設計/README/CLI contractの差分を起票候補として整理する。

## Commands executed

| Command | Result | Observation |
| --- | --- | --- |
| `pnpm exec tsx scripts/harness/main.ts p2:validate-pointers --format json` | PASS | 105 documents / 201 pointers / broken 0 |
| `pnpm exec tsx scripts/harness/main.ts p2:check-freshness --format json --dry-run` | PASS | 105 documents all OK |
| `pnpm exec tsx scripts/harness/main.ts migrate work-items --dry-run` | PASS | candidates 0 / warnings 0 |
| `pnpm exec tsx scripts/harness/main.ts validate --layer L2 --format json` | PASS | Output is human format, not JSON |
| `pnpm exec tsx scripts/harness/main.ts validate --layer L3 --format json` | PASS | Output is human format, not JSON |
| `pnpm exec tsx scripts/harness/main.ts validate --layer L4 --format json` | PASS | L4 drift warnings are emitted, but aggregate result is PASS |
| `pnpm exec tsx scripts/harness/main.ts validate --layer L4 --fail-on-warning --format human` | FAIL | Same L4 warnings become failing aggregate |
| `pnpm exec tsx scripts/harness/main.ts validate --layer all --fail-on-warning --format human` | PASS | L4 is not included because the layer is disabled by default |
| `pnpm exec tsx scripts/harness/main.ts phasegate:detect-drift --json` | FAIL | Drift detector returns 1,975 drift items as failure |
| `pnpm exec tsx scripts/harness/main.ts phasegate:ci-check --json` | PASS | Only L3 validators are executed |
| `pnpm exec tsx scripts/harness/main.ts phasegate:lint --json` | FAIL | `no-layer-violation` in harness integration/config-foundation import |
| `pnpm exec tsx scripts/harness/main.ts phasegate:complete-check --json` | FAIL | Same `no-layer-violation` fails complete check |
| `pnpm exec tsx scripts/harness/main.ts phasegate:status --json` | PASS | L2 reports `unknown`, L4 reports disabled, despite recent direct runs |
| `pnpm exec tsx scripts/harness/main.ts validate --layer L1 --format human` | FAIL | L1 run includes validator id `L2-013` and reports missing CLI E2E tests |
| `pnpm exec tsx scripts/harness/main.ts validate --layer all --format human` | PASS | Executes L2/L3 only; disabled L4 is skipped |

## Current WI-106 coverage

WI-106 should remain focused on the original issue:

- `docs/inception/**/WI-XXX/description.md` の frontmatter `id` はグローバル一意である。
- directory id と frontmatter id は一致する。
- `_cross/WI-XXX` と `{unit}/WI-XXX` は同じ番号を共有しない。
- `migrate work-items` は既存 `_cross` / Unit WI を横断して次番号を採番する。
- validator / pre-commit / CI で重複を機械検出する。

The items below are related dogfood findings, but should be separate WIs because they affect different PhaseGate surfaces.

## Recommended additional WI candidates

| Proposed | Title | Severity | Affects | Rationale / evidence |
| --- | --- | --- | --- | --- |
| WI-107 | CI/L4 execution semantics must be unified | high | validator-system, ci-governance | `validate --layer L4` emits warnings and passes by default, `validate --layer L4 --fail-on-warning` fails, `phasegate:detect-drift --json` fails on the same drift set, and `validate --layer all --fail-on-warning` passes because disabled L4 is skipped. The contract must define when L4 is advisory, when it is gating, and how `all` behaves. |
| WI-108 | `phasegate:ci-check` must match its documented L2-L4 contract | high | ci-governance, validator-system | README and `docs/guide/cli-reference.md` describe CI full check as L2-L4, but `phasegate:ci-check --json` executed only L3 validators. Either implementation must run the promised layers, or docs/command naming must narrow the contract. |
| WI-109 | PhaseGate self-lint architecture violation must be resolved | high | biome-ast-engine, config-foundation, harness-api, ci-governance | `phasegate:lint --json` and `phasegate:complete-check --json` currently fail on `no-layer-violation`: `scripts/harness/integrations/pre-commit.ts -> scripts/harness/config-foundation/infrastructure/repositories/file-system-config-repository.ts`. PhaseGate should not fail its own complete check in the repository baseline. |
| WI-110 | L1/L2 validator ownership and execution boundary must be corrected | normal | validator-system | `validate --layer L1` executes validator id `L2-013`, while `validate --layer L2` does not execute it. This makes layer responsibility and failure routing unclear. `L2-013` should either live in L2 execution or be renumbered/reclassified as L1. |
| WI-111 | CLI command E2E coverage validator needs reliable command-to-test mapping | normal | validator-system | The L1 run reports many commands with no E2E test, including commands that appear in existing CLI E2E suites. The validator should distinguish true missing coverage from alias/fixture/matching limitations, otherwise it cannot be used as a gating signal. |
| WI-112 | `phasegate:status` must report trustworthy, non-stale state | normal | harness-api, validator-system | `phasegate:status --json` reports L2 as `unknown` and L4 as disabled after direct validator runs. It also reports pass while `phasegate:lint` and `phasegate:complete-check` fail. Status should clearly separate configuration state, last artifact state, and live validation state. |
| WI-113 | CLI output format contract should reject or support JSON consistently | normal | harness-api, validator-system | `validate --layer L2 --format json` / L3 / L4 accepted `json` but emitted human output. Current help lists `human|agent|ci`; invalid format should fail with a clear error, or JSON should be implemented for `validate`. |
| WI-114 | L4 drift detector output must become actionable at repository scale | normal | traceability-model, validator-system | `phasegate:detect-drift --json` produced 1,975 drift items. Many are broad code export/design heading mismatches. A baseline, severity threshold, pointer strategy, or report compaction is needed before L4 drift can be used operationally. |
| WI-115 | `legacy_id` ambiguity should be unit-scoped or validated | normal | traceability-model, validator-system | The duplicate WI remediation showed multiple historical `legacy_id` values reused across Units. `legacy_id` is a migration alias, but lookup and reporting should either scope by Unit or detect ambiguity so product annotations cannot resolve to the wrong WI. |
| WI-116 | README roadmap must be reconciled with implemented L4-004/L4-005 validators | low | documentation, validator-system | README still says WI-033 will promote doc-freshness / pointer-validation to L4, while `list-errors --layer L4` and product docs show `L4-004` / `L4-005` already registered. Public roadmap should not describe completed functionality as missing. |

## Suggested prioritization

1. WI-106 should be implemented first because it prevents reintroducing duplicate WI IDs.
2. WI-107, WI-108, and WI-109 should be grouped as the next dogfood stabilization batch because they decide whether PhaseGate can trust its own CI/complete-check result.
3. WI-110 and WI-111 should follow as validator-boundary cleanup.
4. WI-112 to WI-116 can be handled as UX/documentation/actionability improvements unless they block CI policy.

## Recommended execution order

The next WIs should be started in dependency order, not just by severity. The main decision criterion is whether PhaseGate can trust its own gate result in this repository.

| Rank | WI | Priority | Start timing | Reason |
| --- | --- | --- | --- | --- |
| 1 | WI-109 | P0 / release-blocking | Start first | `phasegate:lint` and `phasegate:complete-check` currently fail on PhaseGate itself. Until this is fixed, every later dogfood run is noisy and cannot be used as a clean release gate. This is also independent of the L4 policy decision, so it can be resolved immediately. |
| 2 | WI-107 | P0 / contract-blocking | Start after or in parallel with WI-109 design | L4 warning/failure semantics and `--fail-on-warning` behavior define the contract that WI-108, WI-112, and WI-114 must follow. Decide whether disabled L4 is skipped, advisory, or included by explicit opt-in before changing downstream commands. |
| 3 | WI-108 | P0 / CI-contract | Start after WI-107 contract is accepted | `phasegate:ci-check` is publicly documented as L2-L4 but currently executes only L3. The fix must follow WI-107's layer matrix so CI does not accidentally become stricter or weaker than the documented policy. |
| 4 | WI-113 | P1 / CLI-contract | Start with WI-107/WI-108 implementation batch | `validate --format json` accepting an unsupported format and emitting human output is a narrow but user-visible CLI contract bug. It should be fixed while touching validation command parsing/output semantics. |
| 5 | WI-110 | P1 / validator-boundary | Start after command contract work | `L2-013` running under L1 makes layer responsibility unclear. Fix this before improving CLI E2E coverage, because WI-111 depends on knowing which layer owns that validator. |
| 6 | WI-111 | P1 / signal-quality | Start after WI-110 | CLI E2E coverage cannot become gating while it reports likely false positives. Once the validator's layer ownership is corrected, improve command-to-test matching and separate real gaps from matching limitations. |
| 7 | WI-112 | P2 / operational-UX | Start after WI-107 and WI-108 | `phasegate:status` should reflect the final layer policy and CI command behavior. If implemented earlier, it risks encoding the current inconsistent semantics. |
| 8 | WI-114 | P2 / L4-actionability | Start after WI-107 | Drift output compaction and baselining need the L4 advisory/gating decision from WI-107. Otherwise the report may optimize for the wrong operational use case. |
| 9 | WI-115 | P2 / migration-integrity | Start when touching traceability-model next | `legacy_id` ambiguity is real but less urgent than broken command contracts. It should be handled before relying on legacy annotations for more automation or migration reporting. |
| 10 | WI-116 | P3 / docs-correction | Opportunistic docs-only fix | Public roadmap mismatch is low-risk and can be corrected anytime. Do it earlier only if preparing a documentation or npm release before the P0/P1 implementation batch lands. |

### Batch recommendation

- **Batch A: restore trustworthy self-gating** — WI-109, WI-107, WI-108, WI-113. This batch should produce one coherent command/layer contract and a green `phasegate:complete-check` baseline for the repository.
- **Batch B: clean validator boundaries** — WI-110, WI-111. This batch turns L1/L2 validator output into a credible gating signal.
- **Batch C: improve operations and migration safety** — WI-112, WI-114, WI-115. These make status, drift reports, and legacy lookup safe enough for routine use.
- **Batch D: public docs polish** — WI-116. Keep this separate unless a release requires the README roadmap correction immediately.

### Do not start first

- Do not start with WI-112: status cannot be made trustworthy until the layer and CI execution semantics are settled.
- Do not start with WI-114: 1,975 drift items are painful, but the correct actionability model depends on whether L4 is advisory or gating.
- Do not start with WI-111 before WI-110: coverage mapping depends on the validator belonging to the correct layer.

## Acceptance sketch for next WIs

- CI and validation commands have one documented layer matrix, and implementation matches it.
- A command that exits PASS must not hide a failing command in the same advertised scope.
- Disabled scheduled layers are clearly labeled as skipped/advisory, not silently omitted from "all" if "all" is documented as L2-L4.
- Invalid CLI options fail fast with an actionable message.
- Drift reports are compact enough that a maintainer can identify the next concrete fix without scanning thousands of raw items.
- Migration identifiers are unique in their declared lookup scope, or ambiguity is surfaced as a validation error.

## Batch A-D implementation/dogfood follow-up

> 2026-05-09 follow-up: WI-107〜WI-116 were implemented as the requested stabilization batches. The npm registry publish step is still blocked by OTP, so the current package-level evidence is local tarball dogfooding rather than registry dogfooding.

### Local repository verification

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm exec tsx scripts/harness/main.ts phasegate:lint --json` | PASS | `{"status":"pass","errors":[]...}` after WI-107〜WI-116 implementation |
| `pnpm exec tsx scripts/harness/main.ts phasegate:complete-check --json` | PASS | `{"status":"pass","errors":[]...}` after WI-111 consumer-project fix |
| `pnpm exec tsx scripts/harness/main.ts phasegate:ci-check --json` | PASS | L2-001/L2-002/L2-003/L2-013 + L3 + skipped L4 all reported, `allPassed=true` |
| `pnpm exec tsx scripts/harness/main.ts validate --layer all --fail-on-warning --format human` | PASS | L2/L3 pass, disabled L4 validators explicitly SKIP |
| `pnpm exec vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts` | PASS | 40 tests passed |
| `git diff --check` | PASS | no whitespace errors |

### Tarball dogfood verification

Tarball: `/private/tmp/phasegate-dogfood/phasegate-0.141.0.tgz` built from local `phasegate@0.141.0`.

| Command in `/private/tmp/phasegate-dogfood-project2` | Result | Evidence |
| --- | --- | --- |
| `npm --cache /private/tmp/phasegate-npm-cache install /private/tmp/phasegate-dogfood/phasegate-0.141.0.tgz --ignore-scripts` | PASS | installed package version `0.141.0` |
| `TMPDIR=/private/tmp/phasegate-dogfood-tmp ./node_modules/.bin/phasegate init --name dogfood2 --agent codex --yes` | PASS | generated `phasegate.config.json`, skills, Codex hooks, design docs |
| `TMPDIR=/private/tmp/phasegate-dogfood-tmp ./node_modules/.bin/phasegate validate --layer L2 --format human` | PASS | L2-001/L2-002/L2-003/L2-013 pass |
| `TMPDIR=/private/tmp/phasegate-dogfood-tmp ./node_modules/.bin/phasegate validate --layer all --fail-on-warning --format human` | PASS | L2/L3 pass, disabled L4 skipped |
| `TMPDIR=/private/tmp/phasegate-dogfood-tmp ./node_modules/.bin/phasegate phasegate:status --json` | PASS | status separates `configurationState`, `cachedArtifactState`, `liveValidationState`; L2 live pass, L4 skipped |
| `TMPDIR=/private/tmp/phasegate-dogfood-tmp ./node_modules/.bin/phasegate phasegate:detect-drift --json` | PASS | compact drift schema includes `rawDriftCount`, `sampleLimit`, `truncated`, `categorySummaries`, `actionPlan` |

Dogfood-discovered fix: an initialized consumer project has no PhaseGate internal CLI E2E suite, so L2-013 must not fail every consumer L2 run. WI-111 now treats an absent CLI E2E suite as `limitation`, while still failing true missing command coverage when a CLI E2E suite exists.

### Remaining release blocker

`npm view phasegate version` still reports `0.140.0`; local `package.json` is `0.141.0`. `npm publish` previously reached the registry and failed with `EOTP`. Completion requires an npm OTP and a successful registry publish, followed by registry-package dogfooding.
