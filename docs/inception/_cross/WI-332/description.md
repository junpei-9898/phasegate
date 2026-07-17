---
id: WI-332
type: fix
source: exocortex-review P1 (github#38 恒久化)
severity: normal
status: implemented
---

# WI-332: 実効 severity 判定の単一ソース化と 3 経路横断 regression

## Context

github#38（complete-check だけ集約ロジックが異なり warning-only failure で exit 1）は WI-318 で
修正済みだが、「実効 severity 判定・集約・コマンド別 exit 方針」が全コマンドで共有されている
保証がなかった。残っていた乖離は 2 点:

1. **pre-commit** (`scripts/harness/integrations/pre-commit.ts` の `buildReport`) が手動集約
   （`overallPassed = failed === 0` の raw passed 判定）で、ADR-017 の実効判定を通していない
   → warning-only の L2 validator failure でも exit 1 / commit blocked（ADR-017 違反挙動）
2. **validate 経路** (`aggregate-validation-results-usecase.ts`) が `isEffectivelyPassed` 相当の
   ロジックを複製実装（DRY 違反 = 将来の乖離リスク）

## 変更内容

- **共有実装の新設**: `scripts/harness/validator-system/domain/services/effective-severity-policy.ts`
  に `isEffectivelyPassed()` を新設（ADR-017 Decision の集計セマンティクスの単一ソース）。
  置き場所は domain 層（domain は domain 以外に依存できないため、harness-api domain の
  `CiCheckResult` から参照可能な層は domain のみ）。unit は validator-system
  （harness-api → validator-system の unit 依存は既存前例あり。逆向きは
  「validator-system を harness-api が消費する」既存の依存方向に反するため不可）
- **複製実装の削除**: `harness-api/domain/value-objects/ci-check-result.ts` と
  `validator-system/application/use-cases/aggregate-validation-results-usecase.ts` の
  ローカル判定式を削除し、共有実装を参照（挙動不変のリファクタリング）
- **pre-commit の集約統一**: `buildReport()` と `classifyValidatorFailure()` を共有実装経由に変更。
  warning-only の validator failure は既定で effectively passed = exit 0（ADR-017 準拠）。
  `validate.failOnWarning` の config 配線は pre-commit 経路に存在しないため既定 `false` 固定
- **横断 regression**: `__tests__/integration/validator-system/severity-aggregation-consistency.test.ts`
  が同一 validator 結果セットを validate 集約・CiCheckResult (ci-check/complete-check)・
  pre-commit 集約の 3 経路に通し、実効判定の一致を assert
- **ADR-017 追記**: 共有実装の場所と全経路がそれを通る旨（既存決定は不変）

## 挙動差分（実測）

pre-commit のみ挙動が変わる（他 2 経路は挙動不変のリファクタリング）:

| シナリオ | 変更前 | 変更後 |
|---------|--------|--------|
| 全 pass | exit 0 | exit 0（不変） |
| warning-only failure | exit 1 / blocker あり | **exit 0 / blocker なし**（ADR-017 準拠） |
| error failure | exit 1 | exit 1（不変） |
| mixed (warning+error) | exit 1 | exit 1（不変） |
| errors=[] の防御的 failure | exit 1 | exit 1（不変） |

## Acceptance Criteria

- [x] `isEffectivelyPassed` の実装が repo 内に 1 箇所のみ存在する
- [x] validate / ci-check / complete-check / pre-commit の全集約経路が共有実装を経由する
- [x] pre-commit で warning-only failure が exit 0 になる（error 含みは exit 1 のまま）
- [x] 横断 regression テストが 3 経路の実効判定一致を assert し、独自判定への回帰で落ちる
- [x] status コマンドの「常に exit 0」契約は変更しない（対象外）
- [x] ADR-017 に共有実装の追記（既存決定は不変）

## 関連

- ADR-017 (warning-severity 集計セマンティクス) / ADR-021 (severity-contract: 格下げ禁止)
- WI-318 (github#38 修正: ci-check / complete-check の CiCheckResult.fromResults 共有化)
- WI-260 (ADR-017 の CiCheckResult への適用)
