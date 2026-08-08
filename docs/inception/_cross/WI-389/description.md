---
id: WI-389
type: fix
status: drafted
severity: normal
affects: [traceability-model, docs]
source: L2-014 staged work-item status drift
---

# WI-389: work item status drift を全件個別同期する

<!-- @work-item-id WI-389 -->

## 問題

`work-items:status` の全件 dry-run で検出できる frontmatter status 乖離が残ると、
関連ファイルを stage した時点で L2-014 が芋づる式に失敗する。

## 修正

- 全件 dry-run で乖離を列挙する。
- 各 WI を必ず `--apply --id <id>` で 1 件ずつ同期し、status 欄が無い WI は補完する。
- 全件一括 `--apply` は使用せず、最終 dry-run で乖離ゼロを確認する。

