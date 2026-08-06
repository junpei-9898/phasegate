---
id: WI-375
type: chore
severity: medium
status: drafted
affects: [agent-integration, quick-mode, config-foundation]
source: GitHub issue #44（skill-context 伝播 channel の設計確定と quickMode config の preset 解決経由化）
---

# WI-375: ADR-039 / ADR-040 の制定

<!-- @work-item-id WI-375 -->

## 背景

GitHub #44 は #27 follow-up として、アドホックな穴埋めでは解けない構造課題 2 件を story/ADR スコープに切り出したもの。

1. pre-tool-use hook の `caller_skill` / `PHASEGATE_CALLER_SKILL` は受け口だけがあり producer が存在しない（デッドパス + 偽の被覆）。
2. `HarnessConfigQuickModeConfigAdapter` が raw JSON を直読みし、防御プリセット解決を経由しない（presets の `quickMode` がデッド宣言）。

いずれも「どう直すか」の前に「何を正とするか」を決める必要があるため、実装前に ADR を制定する。

## 決定内容

- **ADR-039**: hook の authorization / guidance の入力は「hook が自ら観測・検証できる state」（対象パスと変更カテゴリ、session marker、設計文書の存在、WI 状態、解決済み config、baseline/attestation）に限る。エージェントの自己申告 identity（skill 名）は受け取らない。将来 skill context が必要になっても managed command 経由の検証可能な state のみを入口とする。
- **ADR-040**: Quick Mode の実効設定は防御プリセット解決結果から決定する。移行は挙動不変を絶対条件とし、presets の `quickMode` 宣言を実効既定値に揃える。preset 解決不能時は従来どおり fail-open。

## 後続 WI

| WI | スコープ |
|----|---------|
| WI-376 | ADR-039 の実装（`callerSkill` 分岐と受け口の削除、category ベース分岐の回帰固定） |
| WI-377 | ADR-040 の実装（adapter の preset 解決経由化、presets 宣言値の是正、挙動不変マトリクステスト） |
| WI-378 | WI-353 契約テストを「preset 宣言が実際に読まれる」検証へ昇格 |
