---
traceability:
  initial_creation: true
---

# Coverage Report: installation

> **Unit ID**: installation
> **対応 WI**: WI-143 / WI-145 / WI-146 / WI-147 / WI-148
> **作成日**: 2026-05-11
> **参照**: `domain_model.md`, `logical_design.md`, `unit_test_design.md`, `it_test_design.md`

## 1. WI-145 Coverage Summary

@work-item-id WI-145

| 観点 | 評価 | 備考 |
|---|---|---|
| 受け入れ基準 | PASS | WI-145 の manifest / doctor AC を全件テストへ割当済み |
| Domain invariant | PASS | Hash, Manifest, Entry, Finding, Report, RepairTable を正常・異常で検証 |
| Application branch | PASS | 9 HeuristicCheck の pass / missing / custom / malformed 系分岐を設計 |
| Infrastructure | PASS | manifest atomic write, file inspector, crypto hash を temp fs で検証 |
| CLI / scenario | PASS | doctor human/json/report-out/strict と install/uninstall/reconcile dry-run lifecycle report を検証 |
| Fixture finalization | WARN | 4 fixture の正確な file tree は実装時に builder で固定 |

## 2. WI-145 Acceptance Mapping

@work-item-id WI-145

| Requirement | Tests |
|---|---|
| `.phasegate/manifest.json` schema round-trip | `UT-INS-145-DM-001`〜`UT-INS-145-DM-007`, `IT-INS-145-INF-002` |
| manifest load/save behavior | `IT-INS-145-INF-001`〜`IT-INS-145-INF-005` |
| atomic write | `IT-INS-145-INF-004` |
| init/update-skills manifest conversion | `IT-WI145-WRP-001`〜`IT-WI145-WRP-004` |
| doctor 9 checks | `UT-INS-145-HC-001`〜`UT-INS-145-HC-009` |
| inert-install non-zero | `IT-INS-145-CLI-002`, `SC-WI145-001` |
| full-install zero | `IT-INS-145-CLI-001`, `SC-WI145-002` |
| JSON output schema | `UT-INS-145-UC-006`, `IT-INS-145-CLI-005` |
| repair hint / suggested skill | `UT-INS-145-HC-*`, formatter unit tests |
| `repairMode` 3 values and strict handling | `UT-INS-145-UC-003/004`, `IT-INS-145-CLI-006` |
| Clean Architecture metadata | L1/L2 validation |

## 2.1 WI-143 Doctor Coverage Addendum

@work-item-id WI-143

| Requirement | Tests |
|---|---|
| `phasegate doctor` detects WI count 0 + ad-hoc plan >= 1 with non-zero exit | `WiWorkflowDriftCheck` unit test, CLI smoke |
| `relaxedGates: ["phase-gate"]` + plans-without-WIs is reported as a red flag | `WiWorkflowDriftCheck` unit test |
| doctor suppresses no-op migration repair for ad-hoc plan drift | `WiWorkflowDriftCheck` unit test asserts `repairMode: manual` and `repairHint: null`; doctor integration test runs migration apply and reruns doctor to prove the old command would not clear the finding. <!-- @work-item-id WI-187 --> |

## 3. Coverage Gates Before Implementation

@work-item-id WI-145

- Every source file under `scripts/harness/installation/` must include `// @unit installation` and `// @layer <layer>`.
- Every WI-145 test file must include `@work-item-id WI-145`.
- Unit tests must avoid real filesystem access except `NodeCryptoHashAdapter`.
- Integration tests must isolate filesystem effects in temp project roots.
- Human formatter tests must avoid brittle full snapshots.

## WI-165: Coverage Refresh For WI-145..148 / WI-169

@work-item-id WI-165

The install / doctor / uninstall / reconcile lifecycle is implementation-owned by the installation Unit. Any remaining `futureInstallationStrategyPorts` wording in logical design is an extension point, not a runtime stub. Coverage expectations:

| Lifecycle command | Current status |
|---|---|
| `doctor` | Implemented and covered by silent-failure, report-out, strict, and suggested-skill cases. |
| `install` | Implemented as managed target merge/apply behavior with dry-run/apply lifecycle tests. |
| `uninstall` | Implemented as reverse lifecycle behavior with manifest/archive expectations. |
| `reconcile` | Implemented as refresh/idempotency lifecycle and `update-skills` compatibility path. |

<!-- @work-item-id WI-172, WI-173, WI-174 -->
## WI-172..174 P3 Coverage

| Requirement | Evidence |
|---|---|
| Agent context files are lifecycle managed targets | `InstallHandler` integration covers `AGENTS.md` / `CLAUDE.md` manifest entries and user content preservation. |
| Uninstall removes only markdown managed section | `RunUninstallUseCase` unit covers `reverseManagedMarkdown`. |
| AGENTS lesson pointers do not replace setup instructions | `AgentsMdFileAdapter` integration covers dedicated lesson pointer section preservation. |
| Agent setup planner has dry-run/apply contract | CLI smoke and product design require `setup:agent --dry-run --json` and `--apply` to expose plan and install result. |
| Config change planner has intent mapping | CLI smoke and guide recipes cover `config:plan --intent <intent> --json`. |

<!-- @work-item-id WI-179 -->
## WI-179 Scoped-Out Repair Guidance Coverage

| Requirement | Evidence |
|---|---|
| Scoped-out findings suppress repair guidance | Doctor integration tests assert `repairHint: null` and `suggestedSkill: null` for `scopedOutFindings[]`. |
| Full-scope findings retain repair guidance | Doctor integration tests run the same fixture with default scope and assert Codex findings keep mechanical repair hints. |
| Human output is not misleading | Doctor integration tests assert the scoped-out summary describes items as informational and not repair targets. |

<!-- @work-item-id WI-180 -->
## WI-180 Scoped-Out Effective Repair Contract Coverage

| Requirement | Evidence |
|---|---|
| Scoped-out repair mode is not mistaken for current-scope repair | Doctor integration tests assert `repairModeApplicability: "only-if-agent-selected"` and `currentScopeRepairTarget: false`. |
| Applicable findings remain current-scope repair targets | Doctor integration tests assert `currentScopeRepairTarget: true` and applicable repair fields for full-scope findings. |
| Human output names scoped-out checks | Doctor integration tests assert the summary includes the check ID list and not-repair-target wording. |
