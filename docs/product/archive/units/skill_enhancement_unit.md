# Unit定義: skill-enhancement

> **Unit ID**: skill-enhancement
> **作成日**: 2026-03-10
> **Wave**: 3（拡張機能）
> **対応Epic**: E-13 既存スキル強化

---

## 1. 概要

既存の3スキル（story-implementor、test-coverage-checker、implementation-readiness-checker）を強化するUnit。Fresh Context Protocol + Atomic Git Commits、Nyquist Validation Layer統合、Plan-Checker Loopの各機能を既存スキルに追加する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-045 | story-implementorへのFresh Context Protocol+Atomic Git Commits追加 | Must |
| US-046 | test-coverage-checkerへのNyquist Validation Layer統合 | Must |
| US-047 | implementation-readiness-checkerへのPlan-Checker Loop統合 | Must |

---

## 3. 機能要件

### 3.1 story-implementor強化（US-045）

- SKILL.mdにFresh Context Protocolの手順記載
- Executor起動時のcontext-priority.jsonに基づくドキュメントロード
- TDDサイクル（Red→Green→Refactor）ごとのAtomic commit生成
- コミットメッセージに`feat(unit/US):`プレフィックス付与
- v1スコープでは単一executor向け実装

### 3.2 test-coverage-checker強化（US-046）

- requirement-test-matrix.jsonの生成または更新
- 要件→テスト方向のトレーサビリティ検証
- テスト→要件方向のトレーサビリティ検証
- coverage_report.mdに要件カバレッジ（AC網羅率）含む
- AC網羅率閾値の設定可能化

### 3.3 implementation-readiness-checker強化（US-047）

- 最大3回の検証→修正ループ（Plan-Checker Loop）
- 各ループでNyquist coverageRate（AC網羅率）検証
- 閾値未満時の不足箇所指摘・修正促進
- 3回で閾値未達成時の人間へのエスカレーション
- ループ実行履歴のログ記録

---

## 4. データモデル概要

- **SKILL.md拡張**: 各スキルのSKILL.mdにFCP/Nyquist/Plan-Checker手順セクション追加
- **requirement-test-matrix.json**: nyquist-validation Unitで定義されたスキーマに準拠
- **Atomic commitメッセージ**: `feat({unit}/{US}): {description}` 形式

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| nyquist-validation | データ | requirement-test-matrix.jsonスキーマ、AC網羅率算出ロジック |
| context-engineering | ガイドライン | Fresh Context Protocol、context-priority.json |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| スキル | story-implementor（FCP + Atomic Commits強化版） | 外部利用者（`/gsdlc:execute`内部） |
| スキル | test-coverage-checker（Nyquist統合版） | 外部利用者（Unit設計フロー内） |
| スキル | implementation-readiness-checker（Plan-Checker Loop版） | 外部利用者（`/gsdlc:plan`内部） |
