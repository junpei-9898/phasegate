---
id: WI-354
type: fix
severity: high
status: drafted
affects: [agent-integration]
source: GitHub issue #27 Defect B（quick スコープの遮断でも常に /story-implementor が案内される）
---

# WI-354: quick-mode 復旧案内をカテゴリから導出する

<!-- @work-item-id WI-354 -->

## 背景

Full Mode ブロック時の quick-mode-relax 案内は `callerSkill === "quick-implementor"` を
条件にしていた。しかし `callerSkill` を供給する producer
（hook input の `caller_skill` / 環境変数 `PHASEGATE_CALLER_SKILL`）は実運用で設定されず、
この分岐は到達不能だった。

結果として `bugfix` / `docs` / `test` / `config` のような Quick Mode スコープの遮断でも
常に `/story-implementor`（= 設計フェーズからやり直せ）が案内され、
実際の原因である `allowedCategories` 設定に辿り着けなかった。

## 修正

`dominantCategory` を一次条件にする。Quick Mode スコープのカテゴリなら
`allowedCategories` の確認と `config:plan --intent quick-mode-relax` による一時拡張、
および `check-change-category` による分類確認を案内する。
`feature` / `domain` / `api` は従来どおり `/story-implementor` 誘導を維持する。
カテゴリ不明時のみ従来どおり `callerSkill` を手掛かりにする。

あわせてカテゴリ未確定時に「カテゴリ: undefined」と出る表示バグも修正する。
