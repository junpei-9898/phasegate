---
id: WI-171
type: story
severity: high
status: tested
affects: [documentation, setup, skill-quality, agent-integration]
source: internal
---

# WI-171: First-Time User Onboarding And Recipe Guide

> 起票日: 2026-05-12
> 起票経緯: PhaseGate 初見ユーザーが、人間として読んでも、agent に依頼しても、初回導入から運用開始まで迷わない導線を作るため。

## スコープ

- first-run path: `init` -> `doctor` -> `install` / `reconcile` -> `check-ready` -> `validate`
- 新規 repo / 既存 repo retrofit / CI-only / agent hook enabled / strict validation rollout の分岐
- first success checklist
- doctor finding から suggestedSkill / repairHint / next command へ進む導線
- CLI catalog を使う前の「どの順番で使うか」の説明
- README 入口、`docs/guide/getting-started.md`, `docs/guide/recipes.md`, `docs/guide/troubleshooting.md`

## 主要成果物

- `README.md`
- 新規または更新 `docs/guide/getting-started.md`
- 新規または更新 `docs/guide/recipes.md`
- 新規または更新 `docs/guide/troubleshooting.md`
- 必要なら `docs/guide/installation.md` / `docs/guide/hooks-integration.md`

## 受け入れ基準

- [x] README から 5 分以内に「次に実行する command」と「成功状態」が分かる。
- [x] 初回導入時の分岐が、利用者の回答可能な質問として表現されている。
- [x] `doctor` finding / error code / `suggestedSkill` / `repairHint` の読み方が、初心者向けの troubleshooting から辿れる。
- [x] 全機能の網羅表ではなく、first-run / daily-use / CI-use / agent-use の recipe として読める。

## 依存

`WI-149`, `WI-150`, `WI-152`, `WI-153` の用語と command catalog に合わせる。

## 対応結果

`docs/guide/getting-started.md`, `docs/guide/recipes.md`, `docs/guide/troubleshooting.md` を追加し、README / installation / CLI reference から first-run, daily-use, CI-use, agent-use の導線を辿れるようにした。
