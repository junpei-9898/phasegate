# Unit定義: config-foundation

> **Unit ID**: config-foundation
> **作成日**: 2026-03-10
> **Wave**: 1（基盤構築）
> **対応Epic**: E-08 phasegate.config.json v2（設定統合）

---

## 1. 概要

phasegate.config.json v2のスキーマ設計・バリデーション・マイグレーションを担うUnit。Phasegate v1の全Unitが依存する設定基盤を提供する。GSD由来の新セクション（orchestration、session）をv1スキーマに統合しつつ、Progressive adoption（デフォルトOFF）を実現する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-027 | orchestrationセクションの追加 | Must |
| US-028 | sessionセクションの追加 | Must |
| US-029 | GSD由来機能のデフォルト無効化 | Must |
| US-030 | phasegate:migrate-configによるv1→v2自動マイグレーション | Should |

---

## 3. 機能要件

### 3.1 phasegate.config.json v2スキーマ

- `orchestration`セクション: mode / parallelization / modelProfile / contextStrategy / commitStrategy / workflow
- `session`セクション: stateFile / roadmapFile のパス設定
- 既存v1セクション（project / layers / harnesses / paths / reporting）との共存
- JSONスキーマバリデーション

### 3.2 デフォルト無効化

- GSD由来の全設定項目が`enabled: false`をデフォルト値とする
- `phasegate:enable`コマンドで個別機能を有効化可能

### 3.3 v1→v2マイグレーション

- `phasegate:migrate-config`コマンド
- v1形式の保持 + v2セクション追加
- マイグレーション前のバックアップ自動作成

---

## 4. データモデル概要

- **phasegate.config.json v2**: 既存v1スキーマ + orchestration + session セクション
- **JSONスキーマ定義**: v2スキーマのバリデーション用スキーマファイル

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| なし（基盤Unit） | — | 他Unitに依存しない。全Unitがこの Unitに依存する |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 設定ファイル | phasegate.config.json v2スキーマ | 全Unit |
| CLI | `phasegate:enable` / `phasegate:disable` | 全Unit |
| CLI | `phasegate:migrate-config` | 外部利用者 |
| モジュール | config-loader（v2スキーマ読み込み） | 全Unit |
