---
name: implementation-readiness-checker
description: 実装開始前の準備状況を自動検証 - テスト設計・カバレッジ・ロジック設計の存在チェックとギャップ分析
model: sonnet
review: opus
languages: [typescript]
---

# Implementation Readiness Checker

## 目的

実装開始前に呼び出し、全ての前提条件（設計文書、テスト設計、カバレッジ検証）を**自動検証**するスキル。不足があれば具体的に何が必要かを報告し、対応するスキルを提案する。

## 入力

- 検証対象の Unit / ストーリー (`{unit}` / `{story_id}`)
- 存在確認する設計文書群（`{constructionDir}` / `{inceptionDir}` 配下の論理設計・テスト設計・カバレッジレポート等、後述「検証ワークフロー Step 1」の一覧参照）

## 使用タイミング

- `story-implementor` の前に実行（推奨）
- 実装中にテスト漏れに気づいた場合にも実行可能
- 既存実装に対してテストを追加する前に実行

---

## ⚠️ このスキルの役割

**ゲートキーパーとして機能し、テスト漏れを防止する。**

```
設計フェーズ → テストケース設計 → カバレッジ検証 → テストロジック設計
                                                        ↓
                              ┌─────────────────────────────────────┐
                              │  implementation-readiness-checker   │ ← ここで検証
                              │  （本スキル）                        │
                              └─────────────────────────────────────┘
                                                        ↓
                                               story-implementor
```

---

## 検証ワークフロー

> **パス設定:** 以下のファイルパスはプレースホルダで記述。`{constructionDir}` / `{inceptionDir}` は `phasegate.config.json` のプロジェクト設定から解決される。

### Step 1: ファイル存在チェック（自動実行）

**以下のファイルの存在を実際に確認する（Glob/Readツールを使用）：**

#### 必須ファイル（1つでも欠落したら実装不可）

| カテゴリ | ファイルパス | 作成スキル |
|---------|------------|----------|
| 論理設計 | `{constructionDir}/{unit}/logical_design.md` | `logical-designer` |
| 論理設計 | `{inceptionDir}/{unit}/{story_id}/logical_design.md` | `logical-designer` |
| ユニットテスト設計 | `{constructionDir}/{unit}/unit_test_design.md` | `unit-test-designer` |
| ITテスト設計 | `{constructionDir}/{unit}/it_test_design.md` | `it-test-designer` |
| シナリオテスト設計 | `{inceptionDir}/{unit}/{story_id}/scenario_test_design.md` | `scenario-test-designer` |
| カバレッジレポート | `{constructionDir}/{unit}/coverage_report.md` | `test-coverage-checker` |

#### 推奨ファイル（なくても実装可能だが、あればより安全）

| カテゴリ | ファイルパス | 作成スキル |
|---------|------------|----------|
| ユニットテストロジック | `{constructionDir}/{unit}/unit_test_logic.md` | `unit-test-logic-designer` |
| ITテストロジック | `{constructionDir}/{unit}/it_test_logic.md` | `it-test-logic-designer` |
| シナリオテストロジック | `{inceptionDir}/{unit}/{story_id}/scenario_test_logic.md` | `scenario-test-logic-designer` |
| UIUX設計 | `{constructionDir}/{unit}/uiux_design.md` | `uiux-designer` |

### Step 2: カバレッジレポートの確認

`coverage_report.md` が存在する場合、`test-coverage-checker` の検証結果を参照する。
カバレッジの詳細分析は `test-coverage-checker` が担当するため、本スキルでは存在確認のみ行う。

### Step 3: 検証結果の報告

---

## 出力フォーマット

### ✅ 全て揃っている場合

```markdown
## ✅ 実装準備完了

全ての前提条件を満たしています。`story-implementor` を実行してTDD実装を開始できます。

### 検証結果サマリー

| カテゴリ | 状態 | 詳細 |
|---------|------|------|
| 論理設計 | ✅ 存在 | logical_design.md |
| ユニットテスト設計 | ✅ 存在 | unit_test_design.md |
| ITテスト設計 | ✅ 存在 | it_test_design.md |
| シナリオテスト設計 | ✅ 存在 | scenario_test_design.md |
| カバレッジ検証 | ✅ 95% | coverage_report.md |
| テストロジック設計 | ✅ 全て存在 | unit/it/scenario |

### 次のアクション
`story-implementor` を実行してTDD実装を開始してください。
```

### ⛔ 必須ファイルが欠落している場合

```markdown
## ⛔ 実装準備未完了

以下の前提条件が不足しているため、**実装を開始できません**。

### 欠落している必須ファイル

| 欠落ファイル | 対応スキル | 優先度 |
|------------|----------|-------|
| `unit_test_design.md` | `unit-test-designer` | 🔴 高 |
| `it_test_design.md` | `it-test-designer` | 🔴 高 |
| `coverage_report.md` | `test-coverage-checker` | 🔴 高 |

### 推奨フロー

以下の順序でスキルを実行してください：

1. **`unit-test-designer`** → ユニットテストケース設計
2. **`it-test-designer`** → ITテストケース設計
3. **`test-coverage-checker`** → カバレッジ検証（90%以上を確認）
4. **`implementation-readiness-checker`** → 再検証（本スキル）
5. **`story-implementor`** → TDD実装

### 選択肢

- [ ] **推奨フローを実行する**（推奨）
- [ ] **テスト設計をスキップして実装する**（非推奨：テスト漏れリスクあり）

どちらを選択しますか？
```

### ⚠️ 推奨ファイルが欠落している場合

```markdown
## ⚠️ 実装準備完了（推奨ファイル欠落あり）

必須の前提条件は満たしていますが、以下の推奨ファイルが欠落しています。

### 欠落している推奨ファイル

| 欠落ファイル | 対応スキル | 影響 |
|------------|----------|------|
| `unit_test_logic.md` | `unit-test-logic-designer` | TDD実装時の指針が不足 |
| `it_test_logic.md` | `it-test-logic-designer` | TDD実装時の指針が不足 |

### 選択肢

- [ ] **推奨ファイルを作成してから実装する**（より安全）
- [ ] **このまま実装を開始する**（可能だが、実装エージェントの判断に依存）

どちらを選択しますか？
```

---

## 既存実装に対するテスト追加

既に実装が完了しているがテストが不足している場合は、`test-coverage-checker` の「実装済みコードへのテスト追加モード」を使用すること。本スキルはファイル存在チェックに特化し、テストギャップ分析は `test-coverage-checker` が担当する。

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（model-routing.md の Architect ロール）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. プロジェクトのレビュー基準に沿って検証する
3. 判定結果を出力する

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **このスキルはファイルの存在確認のみ行い、実装は行わない**
- 欠落ファイルを検出した場合、対応するスキルを提案するのみ
- 実装開始の最終判断はユーザーに委ねる
- 「スキップして実装する」選択肢は提示するが、非推奨であることを明示する

---

## 関連スキル

| スキル | 役割 |
|-------|------|
| `unit-test-designer` | ユニットテストケース設計 |
| `it-test-designer` | ITテストケース設計 |
| `scenario-test-designer` | シナリオテストケース設計 |
| `test-coverage-checker` | カバレッジ検証 |
| `unit-test-logic-designer` | ユニットテストロジック設計 |
| `it-test-logic-designer` | ITテストロジック設計 |
| `scenario-test-logic-designer` | シナリオテストロジック設計 |
| `story-implementor` | TDD実装 |
