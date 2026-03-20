# Unit定義: orchestration-commands

> **Unit ID**: orchestration-commands
> **作成日**: 2026-03-10
> **Wave**: 3（拡張機能 — skill-enhancement完了後に着手）
> **対応Epic**: E-15 オーケストレーションコマンド定義

---

## 1. 概要

GSDLC v1の5メインコマンド（`/gsdlc:init-project`, `/gsdlc:design`, `/gsdlc:plan`, `/gsdlc:execute`, `/gsdlc:verify`）のオーケストレーションSKILL.mdを定義するUnit。各コマンドは既存の設計・実装・検証スキル群を正しい順序で逐次実行するフローを標準化する。v1では単一executor版として定義し、Phase 2でWave並列実行に拡張予定。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-050 | /gsdlc:init-project オーケストレーションSKILL.md定義 | Must |
| US-051 | /gsdlc:design オーケストレーションSKILL.md定義 | Must |
| US-052 | /gsdlc:plan オーケストレーションSKILL.md定義 | Must |
| US-053 | /gsdlc:execute オーケストレーション定義（単一executor版） | Must |
| US-054 | /gsdlc:verify オーケストレーション定義 | Must |

---

## 3. 機能要件

### 3.1 /gsdlc:init-project（US-050）

Phase 0: プロジェクト基盤構築の逐次実行フロー定義。

- 実行フロー: product-architect → story-writer → unit-designer → story-mapper
- 各スキル間のゲート条件（前スキル出力→次スキル入力の検証）
- research-coordinatorはv1スコープ外（Phase 2延期）、v1ではスキップ
- 2-Phase Execution（計画→人間承認→実行）のフロー組み込み
- コンテキストバジェットセクション（US-002準拠）

### 3.2 /gsdlc:design（US-051）

Phase 1: Unit設計のスキル実行順序定義。

- 実行フロー: domain-designer → logical-designer → test-designers → uiux-designer → readiness-checker
- 各スキルが2-Phase Executionで実行されることの定義
- readiness-checker（implementation-readiness-checker）のゲート機能と不合格時フロー
- 出力先: `docs/product/construction/{unit}/`
- コンテキストバジェットセクション（US-002準拠）

### 3.3 /gsdlc:plan（US-052）

Phase 2: 実装計画のフロー定義。

- 実行フロー: implementation-planner → consistency-checker → nyquist-validator
- Plan-Check Loop（最大3回）の自動検証→修正フロー（US-047連携）
- Nyquist Validation（要件→テストマッピング完全性検証、US-005〜007連携）
- VALIDATION.md（US-009）の生成
- コンテキストバジェットセクション（US-002準拠）

### 3.4 /gsdlc:execute（US-053）

Phase 3: v1単一executor版の実行フロー定義。

- 実行フロー: pre-flight → story-implementor → post-wave
- Pre-flightゲート: harness:check-ready（全storyのPhase Gate通過確認）
- story-implementorのFresh Context Protocol準拠（US-045連携）
- Post-waveバリデーション: L2 harness validators実行
- v1は単一executor逐次実行。Phase 2でwave-orchestratorによるWave並列に拡張
- コンテキストバジェットセクション（US-002準拠）

### 3.5 /gsdlc:verify（US-054）

Phase 4: 検証・整合フロー定義。

- 実行フロー: consistency-checker → drift-detector → test-coverage-checker → cascade-updater → lesson-collector
- test-coverage-checker: 90%+閾値の検証
- cascade-updater: `product/`設計文書の累積更新
- lesson-collector: AGENTS.md更新
- state.json / milestones.jsonの進捗反映
- コンテキストバジェットセクション（US-002準拠）

---

## 4. データモデル概要

本Unitの成果物はSKILL.md（マークダウンドキュメント）が中心。コードの実装は最小限で、主にスキル実行順序・ゲート条件・コンテキストバジェットの定義ドキュメントを生成する。

- **SKILL.md**: 各コマンドの実行フロー定義（`skills/`配下に配置）
- **コンテキストバジェット定義**: 各SKILL.md内のセクション

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| config-foundation | 設定 | harness.config.json v2のorchestrationセクション参照 |
| skill-enhancement | 基盤 | story-implementor FCP（US-045）、test-coverage-checker Nyquist（US-046）、readiness-checker Plan-Checker（US-047）の強化完了が前提 |
| context-engineering | 参照 | context-priority.json（US-001）、コンテキストバジェットガイドライン（US-003） |
| nyquist-validation | 参照 | requirement-test-matrix.json（US-005）、VALIDATION.md（US-009） |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| SKILL.md | `/gsdlc:init-project` SKILL.md | 外部利用者（開発者） |
| SKILL.md | `/gsdlc:design` SKILL.md | 外部利用者（開発者） |
| SKILL.md | `/gsdlc:plan` SKILL.md | 外部利用者（開発者） |
| SKILL.md | `/gsdlc:execute` SKILL.md | 外部利用者（開発者） |
| SKILL.md | `/gsdlc:verify` SKILL.md | 外部利用者（開発者） |

---

## 7. Phase 2拡張予定

- `/gsdlc:execute`: wave-orchestratorによるWave並列実行への拡張
- `/gsdlc:init-project`: research-coordinator（4並列リサーチャー）の統合
- 全コマンド: モデルプロファイル（quality/balanced/budget）による自動モデル選択
