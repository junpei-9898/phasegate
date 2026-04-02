# Unit定義: quick-mode

> **Unit ID**: quick-mode
> **作成日**: 2026-03-10
> **Wave**: 3（拡張機能）
> **対応Epic**: E-03 Quick Mode

---

## 1. 概要

小規模変更（typo修正、テスト追加、docs修正、リファクタリング）に対してフル設計フローをスキップし、最小限のバリデーションで迅速に完了させるQuick Modeを提供するUnit。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-010 | quick_modeセクションの定義 | Must |
| US-011 | Quick Modeでの最小バリデータ実行とphase-gateスキップ | Must |
| US-012 | harness:quick-checkコマンドの新設 | Must |

---

## 3. 機能要件

### 3.1 quick_modeセクション定義

- phasegate.config.jsonに`quick_mode`セクション追加
- 対象条件: テストファイルのみ変更 / docs配下修正 / typo修正 / リファクタリング
- 対象外条件: 新規ドメインモデル追加 / API契約変更 / 新機能追加

### 3.2 最小バリデータ実行

- Quick Mode時: architecture / dependency / security バリデータのみ実行
- phase-gateスキップ
- 対象/対象外の自動判定ロジック + 境界ケーステスト

### 3.3 harness:quick-check

- `harness:quick-check`コマンド
- 成功/失敗サマリー表示
- 失敗時HarnessError形式出力

---

## 4. データモデル概要

- **phasegate.config.json quick_modeセクション**: `{ "quick_mode": { "targetConditions": string[], "excludeConditions": string[], "validators": string[] } }`

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| config-foundation | 設定 | phasegate.config.json v2のquick_modeセクション |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| CLI | `harness:quick-check` | 外部利用者 |
| ロジック | Quick Mode対象判定 | 外部利用者（`/gsdlc:quick`コマンド内部） |
