---
id: WI-358
type: fix
severity: medium
status: drafted
affects: [phase-dependency-model]
source: GitHub issue #29（`## Q&A` と書くと Planning Mode の evidence 判定が落ちる）
---

# WI-358: 計画文書の QA セクション見出しの表記ゆれを受け入れる

<!-- @work-item-id WI-358 -->

## 背景

Planning Mode の evidence 判定に使う QA セクション検出は `QA` 綴りしか受け付けず、
エージェントが自然に書く `## Q&A` や全角の `## Q＆A` を弾いていた。
中身は同一なのに phase gate だけが落ち、
原因が見出しの綴りだと気付けないまま止まる。

## 修正

- `markdown-plan-document-reader.ts`: `QA_SECTION_PATTERN` を
  `/^##+\s*(?:\d+[.．]\s*)?Q[&＆]?A\b/m` に緩和する。
  緩和方向のみの変更であり、既存の `## QA` / `## 4. QA（不明点・確認事項）` / `### QA` は
  従来どおりマッチする。`\b` により `## QAtest` のような別語は引き続きマッチしない。
- `markdown-plan-document-reader.test.ts`: 見出し表記ゆれのテーブル駆動テストと、
  `## Q&A` + `Q:` / `A:` ペアが embedded-qa で完了判定されることの回帰テストを追加。
