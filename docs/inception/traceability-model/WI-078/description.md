---
id: WI-078
type: story
severity: normal
status: tested
legacy_id: H03-08
---

# WorkItem migration apply

@story-id H03-08
設計要素: ISSUE-026 Phase B-3 として、dry-run plan に基づき旧 issue レイアウトを WI レイアウトへ実移行する。

- **対応ストーリー**: H03-08
- **対応 Issue**: ISSUE-026 (Phase B-3)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 背景

H03-06 / H03-07 により、旧 issue レイアウトから WI レイアウトへの候補生成と CLI dry-run 表示ができるようになった。Phase B-3 では `phasegate migrate work-items --apply` を追加し、conflict がない場合に限って物理ディレクトリ移動と `description.md` frontmatter 付与を行う。

## 受け入れ基準

- [ ] AC-1: `phasegate migrate work-items --apply` が旧 issue ディレクトリを target WI ディレクトリへ移動する
- [ ] AC-2: `issue_description.md` は `description.md` に rename され、WI frontmatter が先頭に付与される
- [ ] AC-3: 既に `description.md` の旧issueは同ファイルにWI frontmatterが付与される
- [ ] AC-4: `logical_design.md` 等の付随ファイルは target directory に保持される
- [ ] AC-5: plan に conflict が1件でもある場合は、ファイルシステムを書き換えず終了コード1を返す
- [ ] AC-6: `--apply --dry-run` の同時指定は拒否し、ファイルシステムを書き換えない
