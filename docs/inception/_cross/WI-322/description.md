---
id: WI-322
type: fix
severity: normal
status: implemented
affects: [validator-system]
source: verification-followup (github#37 残課題)
---

# WI-322: config なし fallback（DEFAULT_CONFIG）の coverageThreshold: 90 がオプトイン思想と矛盾

<!-- @work-item-id WI-322 -->

## 背景

WI-317 (github#37) で「カバレッジゲートはオプトイン、`coverageThreshold: 0` = 正規の opt-out」と定義した。
しかし config なし環境で使われるハードコード fallback `DEFAULT_CONFIG`
（`scripts/harness/validator-system/composition-root.ts`）の `coverageThreshold` が 90 のまま残っており、
phasegate.config.json を持たない環境で勝手にカバレッジ 90% ゲートが有効化される矛盾があった。
カバレッジレポート不在の環境では L3-003 が fail-closed FAIL になり、opt-in のはずのゲートが
ユーザーの意思表示なしに発動していた。

## 修正

- `DEFAULT_CONFIG.layers.L3.coverageThreshold` を `90` → `0` に変更（opt-in 思想を示すコメントを付記）
- 防御プリセット定義（minimal=0 / standard=90 / strict=95）は変更しない — 本 WI は config なし
  fallback のみの修正。config ありでプリセットを選んだユーザーは従来どおりプリセット値が適用される
- 回帰テスト追加: `createValidatorSystemModule()`（config 未指定）で L3-003 を実行すると
  opt-out 理由付きの透過 SKIP になることを固定
  （`scripts/harness/__tests__/integration/validator-system/composition-root-default-config.test.ts`）

## 確認事項（変更なし・報告のみ）

DEFAULT_CONFIG 内の他の値の opt-in 思想との整合を目視確認した:

- `L2-016` / `L3-007`（attestation gate 系）が validators に含まれるのは ADR-030 §Decision.3.② の
  default-ON 設計どおり（意図的）
- `bundleSizeLimit: 512000` は残るが、consumer の L3-002 は strictOnly であり
  DEFAULT_CONFIG の `preset: "standard"` では実行されないため、config なし環境で発動しない
- `L3-005` / `L4-007` は validators に含めない default-OFF が維持されている

## Acceptance Criteria

- [x] config なし環境（DEFAULT_CONFIG fallback）で L3-003 がカバレッジ FAIL しない（opt-out SKIP になる）
- [x] 防御プリセット定義は不変
- [x] 回帰テストが green
