---
id: WI-266
type: fix
severity: medium
status: reflected
affects: [biome-ast-engine]
---

# WI-266: lint プレーンテキスト formatter の violation 過少表示修正

> 起票日: 2026-07-15
> 経緯: v0.184.0 の dogfooding で発見・defer された実バグ。

## 背景 / 根本原因

`scripts/harness/biome-ast-engine/presentation/cli/harness-lint-command-handler.ts` の
`formatText()` は違反一覧を `errors.slice(0, 3)` で先頭 3 件だけ列挙し、残りを
`... and ${errors.length - 3} more` と表示していた。

先頭ヘッダ行 `${errors.length} violation(s):` に総数自体は出ていたものの、
運用者が列挙ブロックと "N more" 行だけを読むと「3 件しか出ていない」と誤読する実害が発生した
（`--json` は真の件数 `violationCount` を出すため、人間側が「3 件 vs 11 件」で混乱した）。

## 修正方針

truncation 自体は出力肥大防止として合理的なので残す。ただし省略行に
**正確な総数を必ず明示**する:

```
  ... and 8 more (shown 3 of 11)
```

これにより、列挙ブロック / 省略行のどちらを読んでも undercount が起きない。
`--json` 出力（真の件数）とも整合する。

## 再現条件

1. lint 違反が 4 件以上ある状態で `phasegate lint`（プレーンテキスト出力）を実行。
2. 列挙は先頭 3 件のみ。旧実装では省略行が `... and N more` で総数を明示しなかった。

## 検証

- 追加した回帰テストで「表示件数 3 件」「省略行に総数 11 を明示」「3 件以下では省略行なし」を検証。
- `npx phasegate lint` の実出力を目視。
- `validate --layer L2` PASS。
