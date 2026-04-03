# Unit定義: context-engineering

> **Unit ID**: context-engineering
> **作成日**: 2026-03-10
> **Wave**: 2（コア品質機構）
> **対応Epic**: E-01 コンテキストエンジニアリング基盤

---

## 1. 概要

AIエージェントのコンテキストウィンドウを効率的に管理するための基盤を構築するUnit。context-priority.jsonによるドキュメント優先度定義、SKILL.mdへのコンテキストバジェット明記、Fresh Context Protocolガイドライン策定、Compact時の優先保持ファイル指示を実現する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-001 | context-priority.jsonによるドキュメント優先度定義 | Must |
| US-002 | SKILL.mdへのコンテキストバジェット明記 | Must |
| US-003 | Fresh Context Protocolガイドライン策定 | Must |
| US-004 | Compact時の優先保持ファイル指示 | Must |

---

## 3. 機能要件

### 3.1 context-priority.json

- `.harness/context-priority.json` ファイルの作成・バリデーション
- 4段階優先度: critical / important / reference / archive
- `phasegate:status`コマンドでの優先度設定表示
- 存在しないファイルパスのバリデーションエラー

### 3.2 SKILL.mdコンテキストバジェット

- 全スキルのSKILL.mdに`コンテキストバジェット`セクション追加
- critical/importantドキュメント一覧と推定トークン数
- 100K超スキルへの警告コメント
- SKILL.md構造検証バリデータの更新

### 3.3 Fresh Context Protocol

- Executorごとの200Kコンテキストバジェット配分方針
- context-priority.jsonに基づくドキュメントロード順序
- Compact実行時の優先保持ルール

### 3.4 Compact時優先保持

- AGENTS.mdにCompact時優先保持ファイルリストへのポインタ
- context-priority.jsonのcritical/importantエントリとの連動

---

## 4. データモデル概要

- **context-priority.json**: `{ "files": [{ "path": string, "priority": "critical"|"important"|"reference"|"archive" }] }`
- **SKILL.md拡張**: コンテキストバジェットセクション構造

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| config-foundation | 設定 | phasegate.config.json v2のorchestration.contextStrategy設定を参照 |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 設定ファイル | `.harness/context-priority.json` | skill-enhancement（story-implementor FCP）、fuse-hooks-engine（PreReadフィルタ） |
| ドキュメント | Fresh Context Protocolガイドライン | skill-enhancement |
