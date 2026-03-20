# Unit定義: session-lifecycle

> **Unit ID**: session-lifecycle
> **作成日**: 2026-03-10
> **Wave**: 3（拡張機能）
> **対応Epic**: E-04 セッション継続性 + E-07 ライフサイクル管理

---

## 1. 概要

セッション状態の永続化・復元とプロジェクトライフサイクル管理（マイルストーン・進捗追跡）を統合的に担うUnit。session-state.json、milestones.json、state.jsonを中心に、harness:resume / harness:pause / harness:progress / harness:audit-milestoneの各コマンドを提供する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 | 元Epic |
|----------|---------|--------|--------|
| US-013 | session-state.jsonへのセッション状態自動保存 | Must | E-04 |
| US-014 | harness:resumeによるセッション状態復元 | Must | E-04 |
| US-015 | Stop Hook/pause実行時のsession-state.json自動更新 | Must | E-04 |
| US-023 | milestones.jsonによるマイルストーン管理 | Must | E-07 |
| US-024 | state.jsonによるプロジェクト状態追跡 | Must | E-07 |
| US-025 | harness:progressコマンドによる進捗可視化 | Should | E-07 |
| US-026 | マイルストーン完了時の自動監査 | Should | E-07 |

---

## 3. 機能要件

### 3.1 セッション状態管理（E-04由来）

- `.harness/session-state.json`にセッション状態をJSON形式で保存
- 保存情報: 現在のSkill / 対象Unit・Story / 完了済みステップ / 次のアクション / 作業メモ
- スキル実行ステップ完了ごとの自動更新
- `harness:resume`による前回状態復元・次アクション提案
- `harness:pause`による明示的状態保存 + 次アクションメモ記録
- Stop Hook実行時のsession-state.json自動更新

### 3.2 ライフサイクル管理（E-07由来）

- `docs/inception/_shared/milestones.json`: マイルストーン名 / Story ID一覧 / 完了条件
- `docs/inception/_shared/state.json`: 現在フェーズ / 完了済みStory / 進行中Story / 残作業
- `harness:progress`による進捗サマリー表示（マイルストーン完了率）
- `harness:audit-milestone`によるマイルストーン完了時自動監査（AC充足 + カバレッジ90%検証）

---

## 4. データモデル概要

- **session-state.json**: `{ "currentSkill": string, "targetUnit": string, "targetStory": string, "completedSteps": string[], "nextAction": string, "memo": string, "updatedAt": string }`
- **milestones.json**: `{ "milestones": [{ "name": string, "storyIds": string[], "completionCriteria": string }] }`
- **state.json**: `{ "currentPhase": string, "completedStories": string[], "inProgressStories": string[], "remainingWork": string[] }`

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| config-foundation | 設定 | harness.config.json v2のsessionセクション（stateFile / roadmapFileパス）を参照 |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| CLI | `harness:resume` / `harness:pause` | 外部利用者 |
| CLI | `harness:progress` | 外部利用者 |
| CLI | `harness:audit-milestone` | 外部利用者 |
| データ | session-state.json | quality-hooks（Stop Hook統合） |
| データ | milestones.json / state.json | 外部利用者 |
