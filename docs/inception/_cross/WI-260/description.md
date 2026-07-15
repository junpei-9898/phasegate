---
id: WI-260
type: fix
severity: medium
status: drafted
affects: [harness-api]
---

# WI-260: phasegate:ci-check が warning-only の validator failure で exit 1 になる（ADR-017 集約規則の未適用）

<!-- @work-item-id WI-260 -->

> 起票日: 2026-07-15
> 経緯: WI-258 で追加された L2-016（coverage attestation gate）は、常設の ungated-legacy warning 6 件を「severity=warning のみの `ValidationResult.fail`」として報告する（L4-007 advisory と同一の確立イディオム）。ADR-017 の集約規則では warning のみの fail は `failOnWarning=false`（既定）なら overall PASS になる。`validate --layer L2` 経路は `AggregateValidationResultsUseCase` で ADR-017 を正しく適用し PASS / exit 0 を返すが、`phasegate:ci-check` 経路は harness-api の `CiCheckResult.fromResults` が `allPassed = every(r => r.passed || r.skipped)` で severity を一切見ずに集約するため、warning-only failure でも `allPassed=false` → exit 1 を返す。これは ADR-017 集約セマンティクスの未適用バグである。

## 症状

- `npx tsx scripts/harness/main.ts validate --layer L2` → **PASS / exit 0**（ADR-017 集約が正しく適用されている）
- `npx tsx scripts/harness/main.ts phasegate:ci-check --json` → **exit 1**（severity 非考慮の集約が warning-only failure を fail 扱い）
- `scripts/harness/__tests__/e2e/cli-harness.test.ts` の「phasegate:ci-check --json は L2-L4 の実行またはskipを返す」（exitCode 0 期待）が fail。

## 根本原因

`scripts/harness/harness-api/domain/value-objects/ci-check-result.ts`:

- `fromResults` / `create` の集約が `every(r => r.passed || r.skipped)` で `allPassed` を算出しており、error severity と warning severity を区別していない。
- `command-dispatch-service.ts` の `phasegate:ci-check` case は `result.allPassed` を exit code に直結（true→0 / false→1）。

`validate` 経路（`AggregateValidationResultsUseCase`, ADR-017 準拠）と同じ severity-aware 集約を ci-check 経路が持っていないための挙動乖離。

## 受け入れ基準

- **AC-1**: warning-only の validator failure（`passed=false` かつ全 error が `severity=warning`）のみを含む ci-check 結果で `allPassed=true` / exit 0 になること。warning finding は JSON 出力に残ること。
- **AC-2**: `--fail-on-warning` 相当の opt-in。ci-check には現状 `--fail-on-warning` CLI flag が存在せず、config `validate.failOnWarning` も harness-api 経路には threading されていない。本 WI では ADR-017 の集約セマンティクスを `CiCheckResult` に導入する際、`failOnWarning` パラメータを受け取れる形にし、既定は `false`（`validate` の既定と整合）とする。ci-check 自体の opt-in 経路（flag/config threading）は **現状維持**とし、既定挙動（warning-only は PASS）の整合のみを本 WI のスコープとする。将来 opt-in が必要になれば `failOnWarning=true` を渡すだけで従来挙動（warning も fail）に切り替わる余地を残す。
- **AC-3**: error severity を含む failure（`hasNonWarningError`）、および防御的ケース（`passed=false` かつ `errors=[]`）は従来どおり `allPassed=false` / exit 1 のままであること。
- **AC-4**: 失敗していた e2e 4 テストが green。
  - `cli-harness.test.ts`「phasegate:ci-check --json は L2-L4 の実行またはskipを返す」
  - `l0-validator-e2e.test.ts` T-042-01 / T-042-02 / T-042-03（validator レジストリ固定列挙が L2-016 / L3-006 追加で破れているテストメンテ。L3-005 追加時 WI-227 に前例あり）

## ADR-017 との整合

ADR-017 §Decision の集約セマンティクスをそのまま `CiCheckResult` に適用する:

```
hasNonWarningError = errors.some(e => e.severity !== 'warning')
hasWarnings        = errors.some(e => e.severity === 'warning')
isEmptyFail        = !passed && errors.length === 0
hasFail = !passed && (isEmptyFail || hasNonWarningError || (failOnWarning && hasWarnings))
```

`AggregateValidationResultsUseCase` と同一の判定式。ci-check は harness-api unit の domain VO のため usecase を直接 import せず（レイヤー越境回避）、同じ判定ロジックを `CiCheckResult` domain VO 内に持たせて挙動を一致させる。

## スコープ外

- ci-check への `--fail-on-warning` CLI flag 追加 / config `validate.failOnWarning` の harness-api threading（AC-2 参照。現状維持）。
- `validate` 経路の集約（既に ADR-017 準拠。変更不要）。
- error catalog の severity 変更。

## 検証

- targeted テスト green（`ci-check-result.test.ts` の severity-aware 集約 RED→GREEN / `command-dispatch-service.test.ts` の exit code 回帰 / e2e 4 テスト）。
- `npx tsx scripts/harness/main.ts phasegate:ci-check --json; echo EXIT=$?` が EXIT=0 かつ L2-016 warning が JSON に残ること。
- `npx phasegate lint` 0 violations。
- story-reflection corpus 回帰 green。
