---
name: implementation-readiness-checker
description: 実装開始前の準備状況を自動検証 - テスト設計・カバレッジ・ロジック設計の存在チェックとギャップ分析
model: sonnet
review: opus
---

# Implementation Readiness Checker

実装開始前に呼び出し、全ての前提条件（設計文書、テスト設計、カバレッジ検証）を**自動検証**するスキル。不足があれば具体的に何が必要かを報告し、対応するスキルを提案する。

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

### Step 1: ファイル存在チェック（自動実行）

**以下のファイルの存在を実際に確認する（Glob/Readツールを使用）：**

#### 必須ファイル（1つでも欠落したら実装不可）

| カテゴリ | ファイルパス | 作成スキル |
|---------|------------|----------|
| 論理設計 | `docs/product/construction/{unit}/logical_design.md` | `logical-designer` |
| 論理設計 | `docs/inception/{unit}/{story_id}/logical_design.md` | `logical-designer` |
| ユニットテスト設計 | `docs/product/construction/{unit}/unit_test_design.md` | `unit-test-designer` |
| ITテスト設計 | `docs/product/construction/{unit}/it_test_design.md` | `it-test-designer` |
| シナリオテスト設計 | `docs/inception/{unit}/{story_id}/scenario_test_design.md` | `scenario-test-designer` |
| カバレッジレポート | `docs/product/construction/{unit}/coverage_report.md` | `test-coverage-checker` |

#### 推奨ファイル（なくても実装可能だが、あればより安全）

| カテゴリ | ファイルパス | 作成スキル |
|---------|------------|----------|
| ユニットテストロジック | `docs/product/construction/{unit}/unit_test_logic.md` | `unit-test-logic-designer` |
| ITテストロジック | `docs/product/construction/{unit}/it_test_logic.md` | `it-test-logic-designer` |
| シナリオテストロジック | `docs/inception/{unit}/{story_id}/scenario_test_logic.md` | `scenario-test-logic-designer` |
| UIUX設計 | `docs/product/construction/{unit}/uiux_design.md` | `uiux-designer` |

### Step 2: カバレッジレポートの内容確認

`coverage_report.md` が存在する場合、その内容を読み取り：
- カバレッジ率が90%以上か確認
- 未カバー項目がないか確認

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

## 既存実装に対するテスト追加モード

既に実装が完了しているが、テストが不足している場合に使用。

### 使用方法

```
「US-XXXは実装済みだが、ユニットテスト/ITテストが不足している。テスト追加の準備状況を確認してほしい」
```

### 検証内容

1. **実装済みコードの分析**
   - `backend/src/{context}/` の実装ファイルを確認
   - Entity/ValueObject/UseCase/Repository/Controllerを特定

2. **既存テストの確認**
   - `backend/test/unit/{context}/` のユニットテスト
   - `backend/test/integration/{context}/` のITテスト
   - `e2e/tests/{context}/` のE2Eテスト

3. **ギャップ分析**
   - 実装済みコンポーネントに対するテストの存在/不存在を一覧化

### 出力例

```markdown
## 🔍 既存実装のテスト状況分析: US-217

### 実装済みコンポーネント

| コンポーネント | 種類 | ユニットテスト | ITテスト | E2Eテスト |
|--------------|------|--------------|---------|----------|
| WithholdingTaxProcess | Entity | ❌ なし | - | - |
| CsvData | ValueObject | ❌ なし | - | - |
| ParseCsvUseCase | UseCase | - | ❌ なし | - |
| WithholdingTaxRepository | Repository | - | ❌ なし | - |
| UploadCsvController | Controller | - | ❌ なし | - |
| CSVアップロードフロー | E2E | - | - | ✅ あり |

### 不足テストの作成に必要なスキル

| 不足テスト | 対応スキル | 優先度 |
|----------|----------|-------|
| Entity/VOのユニットテスト | `unit-test-designer` → `unit-test-logic-designer` | 高 |
| UseCase/Repository/ControllerのITテスト | `it-test-designer` → `it-test-logic-designer` | 高 |

### 推奨フロー

1. **`unit-test-designer`** → 既存Entity/VOに対するテストケース設計
2. **`it-test-designer`** → 既存UseCase/Repository/Controllerに対するテストケース設計
3. **`test-coverage-checker`** → カバレッジ検証
4. **`unit-test-logic-designer`** → ユニットテストロジック設計
5. **`it-test-logic-designer`** → ITテストロジック設計
6. **`story-implementor`** → TDD実装（RED→GREEN）
```

---

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（Opus 4.6）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` のレビュー観点 R1〜R7 に沿って検証する
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
