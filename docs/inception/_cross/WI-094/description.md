---
id: WI-094
type: issue
severity: high
status: drafted
affects: [validator-system, config-foundation, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/4
reporter: nakataj-mti
related: [WI-091]
---

# WI-094: warning-severity validator の集計セマンティクス策定 (overall FAIL の判定が severity を考慮するように、後方互換 config flag + ADR)

> 起票日: 2026-05-08
> 起票経緯: WI-091 finding #2。`L4-001/002/003` は error catalog 上 `defaultSeverity: warning` だが、`aggregate-validation-results-usecase.ts:67` の `overallPassed = failedValidators === 0` が severity を見ないため、warning レベルの validation fail でも総合 FAIL + exit 1 になる。reporter (nakataj-mti) は plan-level workaround (validate FAIL を許容、L4-001 false positive と plan に明記) で凌いでいる。

## 背景・症状

`phasegate list-errors --layer L4 --format json`:
```json
{ "code": "L4-001", "title": "設計と実装の乖離が検出された",
  "category": "consistency", "defaultSeverity": "warning",
  "validatorId": "drift-detect" }
```

L4-001 の `defaultSeverity` は `warning` だが、`phasegate validate` 実行時:
- drift 検出 1 件で `[FAIL] L4-001`
- 総合判定 `FAIL ✗`
- exit code 非ゼロ (1)

reporter の運用回避策: 「validate FAIL を許容、L4-001 false positive と plan に明記」(plan-level の workaround で凌いでいる)。

## 根本原因 (grep 確認済)

`scripts/harness/validator-system/application/use-cases/aggregate-validation-results-usecase.ts:53-67`:
```typescript
if (error.severity === 'warning') {
  totalWarnings++;  // warning は集計するが…
} else {
  totalErrors++;
}
// (省略)
const overallPassed = failedValidators === 0;  // ← severity を見ていない
```

`failedValidators` は `result.passed === false` の数で増える。validator 内の error が warning だけでも、`ValidationResult.fail()` を呼んでいれば fail カウント。`overallPassed` は severity 非考慮で判定 → exit 1。

`scripts/harness/validator-system/presentation/handlers/report-validation-results-handler.ts:62`:
```typescript
const exitCode = report.overallPassed ? 0 : 1;
```

ここで warning-only の場合も exit 1 が返る。

## 解消したいこと

1. **warning-only の validator fail は overall PASS / exit 0 にする** (semantic は ADR で確定)
2. **既存 user CI 互換性を保つ後方互換戦略**: `validate.warningExitCode` config flag (e.g. `0` = warning は exit 0 / `1` = warning も exit 1) で opt-in, default は ADR で確定
3. **出力フォーマット**: warning は `[FAIL]` ではなく `[WARN]` で表示する選択肢も検討 (formatter 改修)

## 実装方針

### Phase 0: ADR 起票 (本 WI 完了の前提)

- ADR-XXX: 「warning-severity validator の集計セマンティクス」
- 議論ポイント:
  1. **default policy**: `warning は exit 0` を default にする (現行が bug 扱い)、または `warning も exit 1` を default に保つ (CI 互換性優先) のどちらにするか
  2. **config flag 名と値域**: `validate.warningExitCode: 0|1` か `validate.warningAsError: boolean` か別案
  3. **formatter での表示**: `[FAIL]` 維持 vs `[WARN]` 新設、agent / ci formatter での扱いも整理
  4. **既存 user の migration path**: changelog で `BREAKING` か `Changed` か、major bump 検討
- ADR 確定後、本 WI の Phase 1 以降の実装方針を反映

### Phase 1: 集計ロジック改修
- `aggregate-validation-results-usecase.ts:67` で `overallPassed` の判定に severity を反映
- 例: `overallPassed = failedValidators === 0 || (warningExitCode === 0 && allErrorsAreWarning)`
- `errorsByLayer` 集計も severity を考慮

### Phase 2: config flag 導入
- `phasegate.config.json` に `validate.warningExitCode` (or 別名) を追加 (schema v3 拡張)
- `config-foundation` で defaults と migration handling
- `validator-system` への threading は WI-091 finding #1 follow-up と同種の DI 経路 — WI-092 完了後に着手すると安全

### Phase 3: formatter 改修 (optional)
- `human-validation-result-formatter.ts` で warning を `[WARN]` 表示
- `agent-validation-result-formatter.ts` / `ci-validation-result-formatter.ts` も同様

### Phase 4: ドキュメント整備
- `docs/guide/layer-model.md` に severity policy セクション追加
- `docs/guide/configuration.md` に `validate.warningExitCode` の説明
- CHANGELOG に Phase 1 完了時の挙動変更を記載 (BREAKING 認定の場合は major bump 検討)

## カテゴリ判定
- 種別: 仕様変更 (集計セマンティクス + 新 config flag)
- API 契約変更: 集計結果の `overallPassed` 計算式が変わる、`exit code` の意味論変更
- 新ドメインモデル: 不要 (severity は error catalog に既存)
- レイヤー構造変更なし
- type: issue (ADR レベルの判断必要 → product reflection あり)、severity: high (reporter が plan-level workaround を続けている)
- **story-implementor 案件** (集計セマンティクス変更 + ADR 必須)

## 受け入れ基準
- [ ] ADR-XXX 起票・承認 (default policy / config flag 名 / 互換戦略を確定)
- [ ] `aggregate-validation-results-usecase.ts:67` の判定に severity が反映される
- [ ] `validate.warningExitCode` (または ADR で確定した名前) が config schema に追加される
- [ ] config flag のデフォルト値が ADR 通りになる
- [ ] `defaultSeverity: warning` の validator (L4-001/002/003) が fail しても overall PASS / exit 0 が選べる (config 次第)
- [ ] 既存 user 向け migration ガイドが CHANGELOG に記載される
- [ ] dogfood: drift 検出を発生させて exit code が config flag に従うことを確認
- [ ] `docs/guide/layer-model.md` / `docs/guide/configuration.md` 更新
- [ ] 既存 CI 想定の回帰テスト (warning-only / error-only / mixed の 3 ケースで exit code 確認)
- [ ] 全テストグリーン

## スコープ外
- error severity 自体のカタログ変更 (L4-XXX を warning から error に変える等) — 別 WI
- WI-091 finding #4 (paths threading / WI-093) / #5 advanced (pointers / WI-095) — 別 WI
- defense preset (`project.preset: minimal/standard/strict`) ごとの severity policy 切り替え — ADR で必要なら本 WI 内、不要なら別 WI

## 関連
- WI-091 description.md finding #2 セクション
- WI-092 description.md (`createValidatorSystemModule()` の DI sweep — 本 WI 着手前に完了させると config flag threading が安全)
- GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4)
- `scripts/harness/validator-system/application/use-cases/aggregate-validation-results-usecase.ts:53-67` (修正対象)
- `scripts/harness/validator-system/presentation/handlers/report-validation-results-handler.ts:62` (exit code 計算)
- `scripts/harness/validator-system/domain/value-objects/error-catalog.ts` (defaultSeverity 定義)

## 教訓フィードバック (memory 適用)
- `feedback_dogfood_before_release.md`: 集計セマンティクス変更は publish 前に複数 severity 組み合わせ (error only / warning only / mixed) で `validate` 実行して exit code を確認する。本 WI では特に既存 user CI への影響を回帰テストで担保。
