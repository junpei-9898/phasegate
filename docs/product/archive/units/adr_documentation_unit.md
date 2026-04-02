# Unit定義: adr-documentation

> **Unit ID**: adr-documentation
> **作成日**: 2026-03-10
> **Wave**: 1（基盤構築）
> **対応Epic**: E-06 ADR・ドキュメント管理基盤

---

## 1. 概要

Architecture Decision Records（ADR）のテンプレート整備、初期10件のADR作成、ステータス管理を担うUnit。技術的意思決定の形式知化を実現し、harness-dx UnitのHarnessError ADR参照の基盤となる。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-020 | ADRテンプレートの整備 | Must |
| US-021 | 初期10件ADRの作成 | Must |
| US-022 | ADRステータス管理の付与 | Must |

---

## 3. 機能要件

### 3.1 ADRテンプレート

- タイトル / ステータス / コンテキスト / 決定 / 結果 / 代替案 の構造
- YAMLフロントマター（機械的ステータス判別用）
- ステータス値: Proposed / Accepted / Deprecated / Superseded

### 3.2 初期10件ADR

1. フェーズゲート採用理由
2. 5層防御モデル設計根拠
3. Biome AST解析選定
4. 2-Phase Execution設計
5. inception/product分離設計
6. phasegate.config.json統一設定
7. DDD設計スキル群の設計哲学
8. GSD2.0概念採用・npmパッケージ棄却
9. Quick Mode導入とフェーズゲート緩和
10. Nyquist検証層導入

### 3.3 ステータス管理

- 全ADRのフロントマターにstatusフィールド必須
- Superseded状態のADRに後継ADR参照を含める
- フロントマターバリデーションテスト

---

## 4. データモデル概要

- **ADRファイル**: `docs/ADR/{NNN}-{title}.md`（YAMLフロントマター + Markdown本文）
- **ADRテンプレート**: `docs/ADR/template.md`

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| なし（基盤Unit） | — | 他Unitに依存しない |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| ドキュメント | `docs/ADR/*.md` | harness-dx（HarnessError adr_ref参照先） |
| スキーマ | ADRフロントマター構造定義 | harness-dx |
