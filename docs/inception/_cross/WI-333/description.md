---
type: fix
source: ADR-038 G1 (github#40 完全解消)
---

# WI-333: config 不在時の pre-tool-use hook 全遮断デッドロック修正

<!-- @work-item-id WI-333 -->

## 問題

WI-330 の実測で発見（ADR-038 §4 G1 として記録済み）: `phasegate.config.json` が**存在しない**状態で pre-tool-use hook が動くと、`HarnessConfigConfigQueryAdapter.loadConfig()` の `readFileSync` が throw する ENOENT が `hook-to-cli-translator.ts`（`translatePreToolUse` → `getProtectedFilePatterns()`）を素通りし、`pre-tool-use-hook.ts` の outer catch で「実行エラー」exit 2 = **全ツール遮断**になる。config 自身を作成する Write すら遮断されるため、自己修復デッドロックが missing 状態で現存していた。WI-314（#40）で invalid-json は fail-open 化済みだったが、missing 状態が漏れていた。

## 修正

- `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts` `loadConfig()`: `readFileSync` の **ENOENT を捕捉**し、stderr 警告 + 空 doc `{}` の fail-open（WI-314 の JSON.parse fail-open と同じ意味論）。**ENOENT 以外の fs エラー（EACCES / EISDIR 等）は従来どおり throw**（真の異常は隠さない）
- adapter の契約テスト「存在しない場合 throw」を新契約「ENOENT は fail-open」に更新（この adapter は hook 専用のため。config-foundation 側 `FileSystemConfigRepository` の `ConfigNotFoundError` throw 契約は不変 — そちらは `main.ts` が捕捉済み）
- `invalid-config-fail-open.integration.test.ts` の WI-330「【現状固定・既知ギャップ】」テスト群を fail-open 期待（exit 0）に反転し、gated パス書込が missing 状態でも既定設定の phase-gate 判定で fail-closed に遮断されること（フェーズゲート違反、exit 2、ENOENT クラッシュではない）を追加固定
- ADR-038 更新: §2 許可表の missing 列を ○ fail-open に書き換え、§4 G1 を「WI-333 で解消」と追記

## 不変条件

- gated パス（`scripts/harness/` 等）への書き込みは missing 状態でも fail-closed（fail-open は「遮断の解除」ではなく「既定設定への縮退」、ADR-038 §3-3）
- doctor の missing → `configStatus: missing` + `config-status` warn 表示（WI-330）は不変
- 検査系（`validate` 等）の挙動は不変
