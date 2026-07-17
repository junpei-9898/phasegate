---
id: WI-314
type: fix
severity: critical
status: drafted
affects: [harness-api, agent-integration]
source: github#40
---

# WI-314: 不正 config が pre-tool-use hook 経由で全ツールを遮断し自己修復不能になる

<!-- @work-item-id WI-314 -->

## 背景

`main.ts` の `loadResolvedConfig()` がコマンド dispatch より上流で `ConfigValidationError` を `process.exit(2)` にしていたため、スキーマ違反の `phasegate.config.json` は `doctor` を含む全コマンドを非ゼロ終了させる。`.claude/settings.json` の pre-tool-use hook 構成では Bash / Write / Edit の全ツール呼び出しが遮断され、**config を修復する編集自体がブロックされる**自己修復デッドロックになる（#31 の同種再発）。また hook 内部の `HarnessConfigConfigQueryAdapter` は素の `JSON.parse` で throw するため、JSON 構文が壊れた config でも同じデッドロックが起きる（修復中の typo で再突入する経路）。

## 修正

- `loadResolvedConfig(command)` に fail-open コマンド集合（`hook` / `doctor`）を導入。不正 config でも警告 + 既定設定で続行し、診断・自己修復経路を常に残す。`validate` / `ci-check` 等の検査系は fail-closed を維持（復旧手順の案内を追加）
- `HarnessConfigConfigQueryAdapter.loadConfig()` の JSON parse エラーを警告 + 既定値の fail-open に変更（fs エラーは既存契約どおり throw）。gated スコープへの書き込みは phase-gate 側が引き続き fail-closed でブロックする
- 回帰 IT: スキーマ違反 config での hook exit 0 / config 自身への Write 許可 / doctor 続行 / validate fail-closed 維持 / 構文破壊 JSON での hook exit 0
