---
id: WI-355
type: chore
severity: medium
status: drafted
affects: [skills, docs]
source: GitHub issue #27（カテゴリがパス判定であること・config が allowlist であることがどこにも書かれていない）
---

# WI-355: パスベースのカテゴリ分類器とその復旧経路を文書化する

<!-- @work-item-id WI-355 -->

## 背景

`quick-implementor` は「bugfix / docs / test / config なら使える」とだけ advertise しており、
カテゴリがファイルパスから機械判定されること、`config` が allowlist であることが
どこにも書かれていなかった。そのため allowlist 外のパスを config のつもりで書いてブロックされ、
原因に辿り着けない。

## 修正

- `skills/quick-implementor/SKILL.md`: カテゴリ判定がパスベースであること、
  config allowlist の実体（WI-352 適用後）、ブロック時の `check-change-category` による
  分類確認と `config:plan --intent quick-mode-relax` による一時拡張の手順を追記。
- `docs/guide/quick-vs-full-mode.md`: 分類ルールの評価順テーブルを新設。
  あわせて実装との乖離を修正する:
  - 「Quick Mode does not inspect paths」→ 実際は完全にパスベースで、
    `domain/` 配下の 1 行修正も機械的にブロックされる
  - 「allowedCategories is a fixed enum (4 値)」→ enum は `ChangeCategory` の 7 値で、
    既定 allow-list が 4 値
  - 「allowedCategories を空にすれば Quick Mode を無効化できる」→ 空配列は
    invalid config として拒否されるため無効化手段にならない
