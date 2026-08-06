---
id: WI-365
type: chore
severity: medium
status: drafted
affects: [docs]
source: GitHub issue #46（文書鮮度債務 error 11 件 / warn 50 件）
---

# WI-365: 文書鮮度債務（error 判定分）を実質レビューで返済する

<!-- @work-item-id WI-365 -->

## 背景

`npx tsx scripts/harness/main.ts p2:check-freshness` において、
`docs/product/construction/` 配下の 11 文書が error 閾値（既定 90 日）を超え 104 日経過となっていた。

WI-359 は `--dry-run` を report-only に戻すことで CI 赤化を解消したが、
「鮮度そのものは劣化したまま」であり、債務の返済は明示的にスコープ外としていた。
本 WI がその返済にあたる。

## 方針

**空 touch / タイムスタンプ偽装は行わない。** 対象 11 文書を現行コードと突き合わせて
実測レビューし、その結果を文書に記録したうえでコミットすることで鮮度を更新する。

検証方法は以下の 3 段:

1. 文書が参照するテストファイルパスの実在検査（機械的）
2. 各テストファイルの `it(` 実測数と文書の設計ケース数の突合（機械的）
3. 文書が記述するクラス名・コンストラクタ形・メソッド名・戻り値形・エラーコード・閾値と
   現行ソースの突合（並列サブエージェント 4 体による読解 + 実測、結果は本体で再検証）

## 対象文書（11 件、いずれも 104 日経過）

- `docs/product/construction/ci-governance/it_test_logic.md`
- `docs/product/construction/ci-governance/unit_test_logic.md`
- `docs/product/construction/config-foundation/unit_test_logic.md`
- `docs/product/construction/harness-api/unit_test_logic.md`
- `docs/product/construction/harness-error/unit_test_logic.md`
- `docs/product/construction/nyquist-validation/it_test_logic.md`
- `docs/product/construction/nyquist-validation/unit_test_logic.md`
- `docs/product/construction/regression-suite/unit_test_design.md`
- `docs/product/construction/regression-suite/unit_test_logic.md`
- `docs/product/construction/skill-quality/it_test_logic.md`
- `docs/product/construction/skill-quality/unit_test_logic.md`

## 実施内容

各文書に `WI-365 実装突合レビュー記録（2026-08-06）` セクションを追加し、

- **検証済み（記述と実装が一致）** — レビューが実際に行われたことの根拠として、
  確認できた項目を具体名で列挙する
- **是正した記述** — 本 WI で本文を書き換えた箇所
- **実装差分** — 乖離が実在するが、改稿量が quick スコープを超えるため事実記録に留めた箇所

の 3 区分で記録した。本文の是正は次のとおり:

| 文書 | 是正内容 |
|---|---|
| config-foundation/unit_test_logic | §1 の 12 パスを実配置（`__tests__/unit/config-foundation/` フラット）へ更新 |
| harness-error/unit_test_logic | §1 の 11 パスすべてを実配置へ更新、実装ケース数の列を追加、未実装ファイルを明示 |
| harness-api/unit_test_logic | §1 に実装ケース数の列を追加（14 件中 8 件が乖離） |
| ci-governance/it_test_logic | §1 のケース数 5 件と合計（68 → 83）を是正、スコープ外ファイルの存在を注記 |
| ci-governance/unit_test_logic | §1 に未掲載 5 ファイル（29 ケース）を注記 |
| nyquist-validation/unit_test_logic | §1 のケース数 2 件（10 → 14、8 → 12）を是正 |
| nyquist-validation/it_test_logic | 是正なし（§1 は 12 件すべて実測と一致）。差分は記録のみ |
| regression-suite/unit_test_design | 未実装テストファイル 2 件を明示、補助型 10 → 11 件の算術誤りと合計を是正 |
| regression-suite/unit_test_logic | ツリーの未実装 2 件を明示、ファクトリの配置前提を実態へ訂正 |
| skill-quality/it_test_logic | §1 ツリーを実配置 13 ファイルへ書き換え、移動 2 件・未実装 13 件を別掲 |
| skill-quality/unit_test_logic | §1 に未掲載 5 ファイルを注記 |

## レビューで判明した主要な実装差分（記録のみ、後続 WI 候補）

1. **skill-quality/it_test_logic §4.6** — `HarnessConfigQueryAdapter` は引数なしで
   閾値をハードコード返却する実装だが、文書は config 駆動であるかのように書かれている。
   本レビューで見つかった中で最もリスクが高い。
2. **skill-quality/it_test_logic §4.8〜4.11** — L1/L2 バリデータおよび coverage runner の
   アダプタ 4 節が、コンストラクタ・メソッド名・戻り値形・エラー挙動のすべてで乖離。
3. **harness-api/unit_test_logic §3.13** — `ValidatorExecutionPort.runCompleteCheck` は存在せず、
   `detect-drift` は advisory pass、未知コマンドは reject ではなく error レスポンス。
4. **harness-error/unit_test_logic §3.11** — `isHarnessError` と `shared-kernel/` は実在しない。
5. **regression-suite** — `MigrationAnalyzer` / `ImportGuardService` の単体テストが未実装で、
   分岐ロジックが e2e 経由でしか触れられていない実質的なカバレッジ穴。
6. **UT-ID の再利用** — harness-error / harness-api / config-foundation で、
   退役した設計ケース ID を新規テストが別の意味で再利用している。ID 再割当ポリシーが必要。

## スコープ外

- warn 判定 50 件（30〜89 日経過）。本 WI では扱わない。
- 上記「実装差分」の本文全面改稿。改稿量が quick-implementor のスコープを超えるため、
  事実記録に留めた。
