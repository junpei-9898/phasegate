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

> 数値再計測: **2026-07-05**、`phasegate:generate-matrix` で新規生成した `requirement-test-matrix.json` を元に再測定した（partial = 0）。

| 指標 | 値 |
|------|-----|
| 総 AC 数 | **336** |
| テスト参照あり（linked） | **190**（約 57%） |
| テスト参照なし（未リンク） | **146**（約 43%） |
| テストが 1 件も紐づかない Story 数 | **33** |

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
| **R1** | `phasegate:generate-matrix` で初期 `requirement-test-matrix.json` を生成しコミット。33 の無テスト Story を可視化 | マトリクスがリポジトリに存在 |
| **R2** | テストが 0 件の 33 Story にテストを追加し `testReferences` を紐付け（146 → 徐々に削減）。カバレッジ数値を本ドキュメントに追記して逆行を検知 | 未リンク AC が段階的な閾値（例: ≤100 → ≤50 → 0）を下回る |
| **R3** | 全 336 AC がテスト参照を持つ（190 → 336） | 未リンク AC = 0 |
| **R4 ✅ 完了（2026-07-05）** | `phasegate.config.json` の `layers.L3.validators` に `L3-004` を追加し再有効化。併せて `layers.L3.requirementMatrixPath: ".harness/requirement-test-matrix.json"` を設定。以降は L3-004 が自リポジトリでも fail-closed で常時発火 | ci-check で L3-004 が `skipped=false, passed=true`（達成済み） |

**逆行防止**: R4 到達後は L3-004 の per-repo 除外を復活させてはならない。R2 の各段階で未リンク AC 数を本表に追記し、増加していないことをレビューで確認する。

### R4 完了記録（2026-07-05）

- **実施内容**: `phasegate.config.json` の `layers.L3.validators` を `["L3-001", "L3-002", "L3-003"]` → `["L3-001", "L3-002", "L3-003", "L3-004"]` に変更し、L3-004（AC 網羅ゲート）を自リポジトリでも再有効化した。マトリクスパスを明示するため `layers.L3.requirementMatrixPath: ".harness/requirement-test-matrix.json"` を追加した。
- **最終状態**: `phasegate:generate-matrix` で新規生成したマトリクスにおいて **336/336 AC が linked、未リンク AC = 0、無テスト Story = 0**。
- **CI 配線**: `.harness/requirement-test-matrix.json` は git-ignore された生成物であり L3-004 バリデータは READ のみ行う（再生成しない）ため、`.github/workflows/ci.yml` の phasegate 検査ステップの **直前** に `phasegate:generate-matrix` を実行するステップを追加した。これにより毎回の CI 実行で現行テストからマトリクスが再生成され、L3-004 が最新状態を fail-closed で検査する。
- **検証**: `npx tsx scripts/harness/main.ts phasegate:ci-check --json` の `data.validatorResults` において L3-004 が `passed=true, skipped=false`。未リンク AC が 0 のため AC 網羅率は 100%（`AcCoverageGatePolicy` は「全 AC に testReference が 1 件以上」を pass 条件とする二値判定）。

## 6. 既知の限界と残存する per-AC ギャップ（正直な記録）

R4 で「336/336 AC linked」に到達したが、これは **story-level（ファイル単位）** のリンクであり、個々の AC が個別に検証されていることを保証しない。本節はその限界を透明に記録する（このドキュメントは honesty record である）。

### (a) トレーサはファイル単位（story-level）である

`phasegate:generate-matrix` が用いるトレーサは、テストファイル先頭の `@story` アノテーション（最初にマッチした 1 件、ファイル全体 → 1 Story）を読む **ファイル単位**の仕組みである。したがって、ある Story に対してタグ付きテストファイルが 1 つでも存在すれば、その Story（およびその配下の全 AC）は「linked」としてカウントされる。

- **story-level linkage は、Story 配下の個々の AC が個別に検証されていることを保証しない。**
- AC 単位・意味論的（semantic）トレーサビリティ — 各 AC がどのテストケースで実際に検証されているかの厳密対応 — は **future work** である。

### (b) story-level では linked だが個別にコード検証されていない既知の per-AC ギャップ

以下は「Story 単位でリンク済み」だが「個々の AC がコードで個別に検証されていない」ことが判明している具体例である:

- **H05-02 AC-1 / AC-2 / AC-3**: テストは ADR ユースケースのロジックを in-memory な ADR で exercise するが、**実 `docs/ADR/` コーパスが存在し・conform し・status が妥当であること**を検証するテストが存在しない。ADR コーパス実体の検証は未カバー。
- **H06-03 AC-4**: `SeverityDowngradeViolationError` のメッセージに**要求されている ADR 参照が含まれていない** — これは story-level linkage の限界ではなく **genuine な source ギャップ**であり、フォローアップ候補（メッセージ生成箇所に ADR 参照を追加する修正が必要）。
- **H07 / H09 の複数 AC**: 兄弟テストファイル（sibling test files）でカバーされているが、それらのファイルは（ファイル単位タグの制約上）当該 Story の `@story` タグを担持できないため、マトリクス上は別 Story または別ファイル経由で linked として現れる。AC 単位の厳密対応は取れていない。

### (c) skill / markdown 系 AC のカバー方式

- **H10-04 / HF2-03 AC-3**（skill 定義・markdown 成果物系の AC）は、artifact-conformance テスト（required directive の内容をアサートするテスト）でカバーされている。これはコードパスの実行ではなく成果物（skill / markdown）の内容適合を検証する方式であり、AC の意図（必須ディレクティブが記載されていること）は担保されるが、実行時挙動の検証ではない点に留意する。

**総括**: R4 の「336/336 linked」は L3-004（AC 網羅ゲート）の pass 条件を満たす真の到達点だが、それは「各 Story に少なくとも 1 件のタグ付きテストが存在する」ことを意味し、「各 AC が個別・意味論的に検証されている」ことは意味しない。上記 (b) の per-AC ギャップ（特に H06-03 AC-4 の source ギャップ）は今後の個別対応対象として明示的に残す。

## 5. 関連する実装（このラチェットの前提となる修正）

L3-004 を「全ユーザーで genuinely functional」にするための修正が入っている（自リポジトリ除外とは独立）:

- **REAL story registry の配線**: `NyquistAcCoveragePolicyAdapter` が traceability-model の StoryCatalog から有効 storyId を取得するようになった（旧: 空スタブで常時 FAIL）。`phasegate:generate-matrix` CLI も同様に修正。
- **config 駆動の matrix パス**: config キー `layers.L3.requirementMatrixPath`（既定 `.harness/requirement-test-matrix.json`）を新設し、`ValidatorSystemExecutionAdapter → RunL3ValidatorsUseCase` に供給。マトリクス不在時は「設定されているが不在」という実行可能なメッセージで fail-closed し、兄弟バリデータの実行は継続する。

これらにより、正当かつ完全網羅のマトリクスを持つプロジェクトでは L3-004 が正しく PASS するようになった（R3 到達時に自リポジトリでも PASS 可能になる）。
