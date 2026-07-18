---
id: WI-335
type: fix
severity: major
status: implemented
affects: [harness-error, validator-system]
source: exocortex-review P1 後半
---

# WI-335: エラー案内の「機械往復」保証 — remediationType 分類と round-trip テスト

## Context

phasegate の中核価値は「エラー + 次の 1 手」でエージェントの自己修正を駆動すること。しかし
suggested action（suggestion）が本当に「従えば直る」かは人間レビュー頼みで、
github#37（案内された opt-out が到達不能）・github#39（Python リポに vitest を案内）型の破れが
実際に起きた。

本 WI では remediation を **mechanical / ai-assisted / manual** に分類し、mechanical と宣言した
エラーについて「エラー → suggestion を機械適用 → 同じ validator を再実行 → pass」の往復を
CI テストで保証する。

## 実装

1. **`remediationType` フィールドの導入（optional・後方互換）**
   - `HarnessError` VO / `HarnessErrorContract`（`remediation_type`）/ `ErrorDefinition`
     （`defaultRemediationType` + `resolveRemediationType()`）/ `HarnessErrorFactory` /
     `CreateHarnessErrorInput` に optional で追加。**未設定は 'manual' 扱い**
     （`effectiveRemediationType()`）。breaking change なし。
   - validator-system 側は `HarnessErrorLike` に optional `remediationType` を追加し、
     `ValidationResultContractMapper` の詳細フィールド透過（`...details`）で contract まで伝搬。

2. **往復テストの新設** —
   `scripts/harness/__tests__/integration/validator-system/remediation-round-trip.test.ts`
   - 機械適用器（テストヘルパー `applyMechanicalRemediation`）は **suggestion の文言そのもの**を
     解析して操作を導出する。導出できなければ throw = テスト fail。
     **mechanical と宣言されたエラーの suggestion が現在のプロジェクト状態で実行不能なら fail**
     する構造（文言乖離 = github#37/#39 型の破れをここで検出）。
   - 適用ロジックはテストヘルパーのみ。プロダクションに適用器は作らない（今回は保証が目的）。

## 分類表（error code → remediationType）

**未分類のエラーコードはすべて 'manual' 扱い**（機械適用可能と過剰宣言しない安全側の既定）。
全 validator の網羅棚卸しは P4 で別途。

| error code | finding | remediationType | 根拠 |
|---|---|---|---|
| L2-002 | @unit / @layer メタデータ欠落 | **mechanical** | suggestion「`// @unit <unit-name>` / `// @layer ...` を先頭コメントに追加」は解釈なしで機械適用可能。往復テスト ケース(a) で CI 保証 |
| L3-003 | coverageThreshold 設定あり + カバレッジレポート不在 | **mechanical** | suggestion の選択肢 (b)「config の `layers.L3.coverageThreshold` を 0 に設定」（WI-317 / github#37 の正規 opt-out）は config 編集のみで完結。往復テスト ケース(b) で「機械適用 → SKIP（実効 pass）」を CI 保証 |
| L3-003 | カバレッジ閾値未達（レポートは存在） | **ai-assisted** | 解消にはテスト追加（AI/人間の判断）が必要。registry 既定（mechanical）を emit 側で明示上書き。過剰宣言ガードのテストあり |
| L3-001 | セキュリティパターン検出（秘密情報） | **manual** | 秘密の無効化・ローテーション・保管方式の選定は人間の判断が必須。「機械適用すれば直る」と宣言しない |
| L4-001 | 設計と実装の乖離（design drift） | **ai-assisted** | 設計意図の理解が必要で機械適用不能だが、AI が設計文書を読んで自己修正できる |
| L4-002 | 文書間整合性の崩れ | **ai-assisted** | 「どちらの記述が正か」の判断を伴う |

注: L3-003 は同一コードでも finding によって修復方式が異なるため、分類は **error（finding）単位**。
`ErrorDefinition.defaultRemediationType` はコード単位の既定で、emit 側の明示指定が優先される
（`resolveRemediationType(explicit)`）。

## 往復テストのケース

| ケース | 流れ |
|---|---|
| (a) L2-002 | @unit/@layer 欠落ファイル → L2-002 fail（mechanical×2）→ suggestion 文言から「先頭コメントに追加」を機械適用 → 再実行 → pass |
| (b) L3-003 | coverageThreshold: 90 + レポート不在 → L3-003 fail（mechanical）→ suggestion 文言から `layers.L3.coverageThreshold: 0` を config に機械適用 → config 再読込で再実行 → SKIP（実効 pass） |
| ガード1 | 閾値未達 finding は mechanical と過剰宣言されず ai-assisted であること |
| ガード2 | mechanical 宣言 × 機械適用不能な suggestion は適用器が throw = テスト fail する構造の明文化 |
