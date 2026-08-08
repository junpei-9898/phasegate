---
id: WI-259
type: story
severity: medium
status: tested
affects: [validator-system, config-foundation]
---

# WI-259: advisory インジェクションスキャナ（ADR-030 §Decision.3.④・L3 advisory）

<!-- @work-item-id WI-259 -->

> 起票日: 2026-07-10
> 経緯: ADR-030 §Decision.3.④ が承認済み。指示搭載ファイル（SKILL.md / CLAUDE.md / AGENTS.md / agent-context テンプレート / .claude/settings.json）に対し既知のインジェクションパターンを検査する L3 スキャナを追加する。**advisory（warning のみ・絶対に error にしない）** — パターン検査は原理的に回避可能であり、blocking 化は「検出をすり抜けた＝安全」という誤った信頼を生む（ADR-030 §Decision.4.(b) 残存リスク）。人間レビューへの注意喚起に留める。

## スコープ（本 WI で landed）

新 L3 validator **L3-006（injection-scan）** を追加し、指示搭載ファイル群を走査して既知のインジェクションパターンを検出、**warning-only の finding として file:line と種別を報告**する。violation（error）は一切生成しない。新 CLI コマンドは追加しない（`validate --layer L3` / `ci-check` で実行される）。

### 走査対象（指示搭載ファイル）

cwd 起点で以下を走査する（targetPaths 非依存の corpus 走査。L2-016 / L2-014 と同方式）:

- `skills/**/SKILL.md`
- `CLAUDE.md`
- `AGENTS.md`（存在すれば）
- `docs/templates/agent-context/**`（`*.md`）
- `.claude/settings.json`

docs 全体は v1 では対象外とする（ノイズ過多・自リポジトリのセキュリティ記述で誤検知が増える）。この判断を記録する。

### 検出パターン（narrow に。自リポジトリの正当な文書に誤検知しないこと）

1. **instruction-override**: 指示上書きフレーズ。英語定型 `/ignore (all |any )?(previous|prior|above) (instructions|rules)/i`・`/disregard (your|all) (instructions|training)/i` 等 + 相当する日本語定型（「これまでの指示を無視」等）。
2. **invisible-unicode**: 不可視 Unicode。zero-width（U+200B–U+200D, U+FEFF）・bidi 制御（U+202A–U+202E, U+2066–U+2069）。
3. **base64-blob**: 連続 200 文字以上の base64 文字列塊。
4. **html-comment-instruction**: HTML コメント内に (1) のフレーズがある場合は別種別として区別する（隠蔽意図の可視化）。

すべて **severity=warning**。0 件なら無音（finding なし → pass）。

## Anti-false-positive rationale

パターンは blocking ではないが、警告のノイズは人間レビューの信頼を損なうため narrow に設計する。ADR-030 本文等のセキュリティ記述（パターンを「説明」する散文）は走査対象外の docs 配下にあるため誤検知しない。現 corpus（SKILL.md ×30 / CLAUDE.md / AGENTS.md / agent-context テンプレート / .claude/settings.json）をスキャンして誤検知 0 を実証する。

## スコープ外

- authoritative なインジェクション遮断（原理的に不可能。advisory に留める — ADR-030 §Decision.4.(b)）。
- docs 全体の走査（v1 対象外）。
- 新 CLI コマンド追加・`known-harness-commands.ts` 更新（不要）。
- 悪性サンプルファイルのリポジトリ内コミット（禁止。テストは tmpdir + 文字列生成で行う）。

## 検証

- targeted テスト green（domain service / adapter / usecase override / 実 corpus 統合）。
- `npx phasegate lint` 0 violations。
- `npx phasegate validate --layer L3` が L3-006 込みで advisory 動作（現 corpus に対し finding 0・overall PASS）。
- story-reflection corpus 回帰 green。
