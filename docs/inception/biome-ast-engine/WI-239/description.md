---
id: WI-239
type: fix
severity: normal
status: tested
affects: [biome-ast-engine]
source: internal
---

# WI-239: no-comment-flood（L1-007）のコメント密度分子定義を訂正し慣用ファイルの false positive を解消する

> 補記: 本 description は WI-239 の出荷（commit `515f846`）後に、既存の `logical_design.md` と git 履歴から起こした遡及ドキュメント。`work-items:status` が description.md 欠落で Fatal になるデータ欠損の補完であり、設計内容は同ディレクトリの `logical_design.md` が正。

## 問題

`comment-density-parser.ts` が「行頭 `//` / `/*` の全行」を密度分子 `commentLineCount` に数えるため、PhaseGate 自身が必須化しているメタデータヘッダ（`// @unit` / `// @layer` 等）や宣言前 JSDoc（`/** … */`）が加算され、健全な型・DTO・ポート・薄アダプタ 11 ファイルが flood 誤判定されていた（`npx phasegate lint` 失敗）。

## 対応（出荷済み）

密度分子から (1) ファイル冒頭の必須メタデータヘッダ行、(2) `/** … */` doc-comment ブロック全体を除外。narrative な `//` 行コメントと非 doc `/* … */` ブロックのみを分子に残す。分母・閾値・`LintRunner` 評価ロジック・VO フィールド名は不変。

## Acceptance Criteria

- AC-1: 対象 11 ファイル（attestation 9 / nyquist-validation 1 / validator-system 1）が flood 誤判定されない
- AC-2: narrative なコメント洪水は引き続き検出される（flood signal の実効性維持）
- AC-3: `npx phasegate lint` が全ファイル green
