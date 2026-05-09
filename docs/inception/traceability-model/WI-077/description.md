---
id: WI-077
type: story
severity: normal
status: tested
legacy_id: H03-07
---

# WorkItem migration CLI dry-run

@story-id H03-07
設計要素: ISSUE-026 Phase B-2 として、H03-06 の WorkItem migration plan を CLI から dry-run 表示できるようにする。

- **対応ストーリー**: H03-07
- **対応 Issue**: ISSUE-026 (Phase B-2)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 背景

H03-06 では旧 issue レイアウトから WI レイアウトへの移行候補生成を domain/application/infrastructure に閉じて実装した。Phase B-2 ではその計画を `phasegate migrate work-items --dry-run` から確認可能にし、実ファイル移動の前に candidate / warning / conflict を人間がレビューできる状態にする。

## 受け入れ基準

- [ ] AC-1: `phasegate migrate work-items --dry-run` が WorkItem migration plan を表示する
- [ ] AC-2: `--json` 指定時は `{ candidates, warnings }` を JSON で出力する
- [ ] AC-3: human 出力では source path、target path、legacy id、next id、conflict を確認できる
- [ ] AC-4: conflict が1件以上ある場合は終了コード1を返す
- [ ] AC-5: `--dry-run` 未指定または `--apply` 指定時は、ファイルシステムを書き換えず終了コード2を返す
- [ ] AC-6: 既存 `phasegate migrate --schema v3` の config schema migration は従来通り動作する
