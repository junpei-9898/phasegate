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
| CLI / scenario | PASS | doctor human/json/report-out/strict と command stub を検証 |
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
| doctor output includes copy-paste migration command | `repairHint: phasegate migrate work-items --apply` unit assertion |

## 3. Coverage Gates Before Implementation

@work-item-id WI-145

- Every source file under `scripts/harness/installation/` must include `// @unit installation` and `// @layer <layer>`.
- Every WI-145 test file must include `@work-item-id WI-145`.
- Unit tests must avoid real filesystem access except `NodeCryptoHashAdapter`.
- Integration tests must isolate filesystem effects in temp project roots.
- Human formatter tests must avoid brittle full snapshots.
