# L3-004 Traceability Ratchet — phasegate 自リポジトリの段階的準拠計画

> 対象: **phasegate の OWN リポジトリのみ**。製品デフォルト（standard/strict プリセット）は L3-004 を含む strict なままであり、本ドキュメントは他ユーザーの設定を一切弱めない。
> 作成日: 2026-07-04

---

## 1. 背景 — L3-004 とは

L3-004（AC 網羅ゲート / nyquist-validation `AcCoverageGatePolicy`）は、要求（Story → Acceptance Criteria）ごとに **最低 1 件のテスト参照**が `requirement-test-matrix.json` に登録されていることを機械的に検査する L3 CI バリデータである。

判定ロジック（正しく、維持すべきもの）:

1. `requirement-test-matrix.json` を schema validate する
2. 各 storyId が StoryCatalog（`docs/product/user_stories.md`）に登録されているか / 重複していないかを検査する
3. 各 AC に `testReferences` が 1 件以上あるか（未網羅 AC がないか）を検査する

これは **fail-closed**（マトリクス不在・パース不能・網羅不足はいずれも FAIL）である。かつては fail-open（例外時に PASS）だったが、AC 網羅ゲートを無効化する重大な品質防御の抜け穴だったため是正済み。

## 2. 現状の AC カバレッジ（phasegate 自リポジトリ）

| 指標 | 値 |
|------|-----|
| 総 AC 数 | **336** |
| テスト参照あり（linked） | **190**（約 57%） |
| テスト参照なし（未リンク） | **146**（約 43%） |
| テストが 1 件も紐づかない Story 数 | **24** |

phasegate 自身は L3-004 が要求する完全な `requirement-test-matrix.json` をまだ著述していないため、標準プリセットのまま自リポジトリの `phasegate:ci-check` を回すと L3-004 が構造的に FAIL する。これは「実装済みの防御」ではなく「まだ書いていないコンテンツ」に起因するブロックである。

## 3. 決定 — 自リポジトリのみ L3-004 をスコープ外にする（正直な設定）

- **製品デフォルトは strict のまま**: `config-foundation/infrastructure/presets/standard.json`・`strict.json` は L3-004 を引き続き有効化する（他ユーザーには従来どおり適用される）。
- **自リポジトリは per-repo scoping で L3-004 を明示的に除外する**: `phasegate.config.json` の `layers.L3.validators` に L3-004 を含めない明示リストを設定する。

```jsonc
// phasegate.config.json
"layers": {
  "L3": {
    "enabled": true,
    "validators": ["L3-001", "L3-002", "L3-003"]  // L3-004 を意図的に omit
  }
}
```

この設定は `toValidatorSystemConfig`（config-foundation → validator-system の mapper）を通じてそのまま反映され、`RunL3ValidatorsUseCase` は L3-004 を選択せず **skip** する。プリセットファイルには一切手を入れないため、他プロジェクトへの影響はない。

検証: `npx tsx scripts/harness/main.ts phasegate:ci-check --json` の `data.validatorResults` において L3-004 は `passed=true, skipped=true`（＝実行されず、FAIL しない）。

## 4. ラチェット計画 — 自リポジトリを L3-004 完全準拠へ引き上げる

「一度緩めたら戻さない」ラチェット（逆行禁止）で段階的に AC カバレッジを 100% に引き上げ、最終的に自リポジトリでも L3-004 を有効化する。

| フェーズ | ゲート内容 | 完了条件 |
|---------|-----------|---------|
| **R0（現在）** | L3-004 を自リポジトリのみ skip。マトリクス生成基盤（REAL registry + config パス）は稼働済み | 本ドキュメント作成 |
| **R1** | `phasegate:generate-matrix` で初期 `requirement-test-matrix.json` を生成しコミット。24 の無テスト Story を可視化 | マトリクスがリポジトリに存在 |
| **R2** | テストが 0 件の 24 Story にテストを追加し `testReferences` を紐付け（146 → 徐々に削減）。カバレッジ数値を本ドキュメントに追記して逆行を検知 | 未リンク AC が段階的な閾値（例: ≤100 → ≤50 → 0）を下回る |
| **R3** | 全 336 AC がテスト参照を持つ（190 → 336） | 未リンク AC = 0 |
| **R4** | `phasegate.config.json` の `layers.L3.validators` から除外を撤去（L3-004 を再有効化）。以降は L3-004 が自リポジトリでも fail-closed で常時発火 | ci-check で L3-004 が `skipped=false, passed=true` |

**逆行防止**: R4 到達後は L3-004 の per-repo 除外を復活させてはならない。R2 の各段階で未リンク AC 数を本表に追記し、増加していないことをレビューで確認する。

## 5. 関連する実装（このラチェットの前提となる修正）

L3-004 を「全ユーザーで genuinely functional」にするための修正が入っている（自リポジトリ除外とは独立）:

- **REAL story registry の配線**: `NyquistAcCoveragePolicyAdapter` が traceability-model の StoryCatalog から有効 storyId を取得するようになった（旧: 空スタブで常時 FAIL）。`phasegate:generate-matrix` CLI も同様に修正。
- **config 駆動の matrix パス**: config キー `layers.L3.requirementMatrixPath`（既定 `.harness/requirement-test-matrix.json`）を新設し、`ValidatorSystemExecutionAdapter → RunL3ValidatorsUseCase` に供給。マトリクス不在時は「設定されているが不在」という実行可能なメッセージで fail-closed し、兄弟バリデータの実行は継続する。

これらにより、正当かつ完全網羅のマトリクスを持つプロジェクトでは L3-004 が正しく PASS するようになった（R3 到達時に自リポジトリでも PASS 可能になる）。
