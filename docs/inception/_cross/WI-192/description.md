---
id: WI-192
type: issue
severity: high
status: drafted
affects: [skill-quality]
source: github#17
external_ref: https://github.com/junpei-9898/phasegate/issues/17
---

# WI-192: Cascade update dry-run mutates files

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #17。`skill:apply-cascade-update --dry-run` が preview ではなく実際に docs を変更する。

## 問題

`skill:apply-cascade-update --story <id> --dry-run` が writer を呼び、frontmatter 挿入や `.gitkeep` 作成を行う。dry-run は safe preview であるべきだが、現状は reporting layer だけが dry-run を扱っている可能性がある。

## 再現概要

```text
$ npx phasegate skill:apply-cascade-update --story H01-01 --dry-run
Updated 48 files with tags: @story-id H01-01

$ git status --short docs/
 M docs/inception/_shared/product_overview_plan.md
?? docs/inception/u1-definition/
```

## 影響

- agent が安全確認として dry-run を実行しただけで repository が汚れる。
- unintended frontmatter や `.gitkeep` が実装差分に混入する。
- #6 の dependency crash 修正後に実行経路が進むようになったため顕在化した。

## 受け入れ基準

- [ ] `--dry-run` は filesystem mutation を一切行わない。
- [ ] dry-run human output は `Would update ...` など preview wording を使う。
- [ ] `--dry-run --json` で structured plan を返す。
- [ ] regression test が dry-run 前後の target tree 不変性を検証する。
