---
id: WI-255
type: chore
severity: normal
status: drafted
---

# WI-255: P3 docs バッチ — skill-creator 書き直し・ストーリーID規約統一・story-mapper ハンドオフ接続

## Context

30スキル監査（WI-242/244/245 に続く P3）。ユーザー承認済みスコープのうち、
カタログ変更（スキル増減）を伴わない docs-only の3項目を扱う。

1. skill-creator は Anthropic 汎用版の複製で、phasegate 固有規約（model:/review: frontmatter、
   正規見出し、日本語テスト規約、npm 配信モデル）を反映していない → phasegate 専用に書き直す
2. ストーリーID表記が HXX-XX / US-XXX / {story_id} で混在し、発番元の story-writer に規約定義がない
   → 実リポジトリとバリデータ実装から正を確定し、全スキルの表記を統一
3. story-mapper の MVP 収束結果（user_story_mapping.md）を unit-designer が入力に取らず
   ハンドオフが断線 → unit-designer の入力に追加

## Acceptance Criteria

- [ ] skill-creator/SKILL.md が phasegate のスキル規約・配信モデル前提で書き直され、他29スキルとの規約矛盾が解消される
- [ ] ストーリーID採番規約が story-writer に定義され、下流スキル（unit-designer / uiux-designer / logical-designer 等）の表記が統一される。規約はバリデータ実装・実ディレクトリ構造と一致していること（プロセスドキュメントの側をコードに合わせる）
- [ ] unit-designer の入力に user_story_mapping.md（任意入力）が追加され、story-mapper からのハンドオフが記述される
- [ ] バリデータがパースする実パス・実アノテーション形式は変更しない
- [ ] レンダラー結合文字列・正規見出し構造・frontmatter 契約は不変
- [ ] スキル品質テスト（現在全 green）が green のまま
