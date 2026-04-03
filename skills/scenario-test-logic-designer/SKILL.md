---
name: scenario-test-logic-designer
description: シナリオテストケース設計を元にPlaywright実装ロジックを設計 - E2Eテストの疑似コード・セレクタ戦略・シードデータ付き詳細設計
model: sonnet
review: opus
---

# Scenario Test Logic Designer

シナリオテストケース設計（`scenario_test_design.md`）を元に、Playwright実装ロジックを詳細設計するスキル。テストケース設計フェーズとTDD実装フェーズの間に位置し、E2Eテストの設計を行う。

## 実行タイミング

```
テストケース設計フェーズ
  unit-test-designer → it-test-designer → scenario-test-designer
                          ↓
              test-coverage-checker
                          ↓
  unit-test-logic-designer → it-test-logic-designer
                          ↓
┌────────────────────────────────────────────┐
│  scenario-test-logic-designer（本スキル）    │ ← ここで実行
└────────────────────────────────────────────┘
                          ↓
TDD実装フェーズ
  story-implementor
```

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **シナリオテストケース設計** — `docs/inception/{unit}/{story_id}/scenario_test_design.md`
- **論理設計** — `docs/inception/{unit}/{story_id}/logical_design.md`

### 推奨インプット（あれば参照）
- **カバレッジレポート** — `docs/product/construction/{unit}/coverage_report.md`
- **既存シナリオテスト** — `e2e/tests/**/*.spec.ts`（パターン参考）
- **UIUX設計** — `docs/inception/{unit}/{story_id}/uiux_design.md`
- **テスト規約** — `docs/principles/testing_rules.md`

---

## 上位レイヤー存在チェック

**このスキルはテストケース設計完了後、TDD実装前に実行します。**

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/inception/{unit}/{story_id}/scenario_test_design.md` | 必須 | シナリオテストケース設計の存在を確認 |
| `docs/inception/{unit}/{story_id}/logical_design.md` | 必須 | 論理設計の存在を確認 |
| `docs/product/construction/{unit}/coverage_report.md` | 推奨 | カバレッジ検証済みか確認 |

上位設計文書が存在しない場合、**ロジック設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 上位設計（scenario-test-designer）を先に実行する / スキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断でロジック設計を開始しない

---

## 3フェーズ実行ルール

- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: Sonnet 4.6 に委任して成果物を生成する（`scripts/delegate-sonnet.sh` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## Phase 1: 計画（plan）

### 目的
ロジック設計のスコープ・テストファイル構成・セレクタ戦略・シードデータを整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/{story_id}/scenario_test_logic_plan.md`

### 計画ファイルの構成

```markdown
# シナリオテストロジック設計計画: {ストーリーID}

## 1. スコープ
- 対象テストケース設計: scenario_test_design.md
- テストシナリオ総数: X件

## 2. テストファイル構成（計画）

| テストファイル | シナリオ | ケース数 |
|--------------|---------|---------|
| `{story_id}-{feature}.spec.ts` | {シナリオ名} | X |

## 3. セレクタ戦略
- data-testid命名規約（uiux-designerスキル準拠）
- 既存コンポーネントの再利用

## 4. シードデータ設計
| データセット | 用途 | テーブル |
|------------|------|---------|

## 5. MSWモック設計（必要な場合）
| エンドポイント | モック内容 |
|--------------|----------|

## 6. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

## 7. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **ロジック設計文書はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **テストファイル構成の決定** — ファイル配置と命名規約
2. **各シナリオの疑似コード設計** — ステップ・アサーション・待機戦略
3. **セレクタ戦略の設計** — data-testid・ロケーター
4. **シードデータの設計** — 初期データ・クリーンアップ
5. **MSWモックの設計** — APIモック（必要な場合）

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| ケース網羅 | scenario_test_design.mdの全シナリオに対応する疑似コードがあること |
| ステップコメント | 各テストに「Step N: 操作内容」形式のコメントがあること |
| セレクタ定義 | 使用するdata-testidが一覧として定義されていること |
| 待機戦略 | ページ遷移・API応答・要素表示の待機方法が具体的に設計されていること |
| クリーンアップ | try/finallyパターンでのクリーンアップが設計されていること |
| テスト実行コマンド | テスト実行方法（通常・headed・UIモード）が記載されていること |

### 出力ファイル

`docs/inception/{unit}/{story_id}/scenario_test_logic.md`

### scenario_test_logic.md の構成

成果物は以下のセクションで構成する。各セクションのコードテンプレート・パターン詳細は `references/` を参照。

1. **テストファイル構成** — ファイルパス・シナリオ・ケース数の一覧表
2. **ヘルパー・シードデータ** — インポート定義とシードデータ設計（テンプレート: `references/playwright-patterns.md` セクション6, 7）
3. **シナリオテスト詳細ロジック** — 各シナリオの疑似コード（テンプレート: `references/playwright-patterns.md` セクション5）
4. **セレクタ戦略** — data-testid の命名規則は `uiux-designer` スキルを参照。ロケーター優先順位は `references/playwright-patterns.md` セクション1
5. **待機戦略** — ページ遷移・要素表示・API応答（詳細: `references/playwright-patterns.md` セクション2）
6. **MSWモック設計**（必要な場合） — 詳細: `references/msw-patterns.md`
7. **ヘルパー関数設計** — テンプレート: `references/playwright-patterns.md` セクション7
8. **テスト実行コマンド** — 実行方法一覧（`references/playwright-patterns.md` セクション8）

---

## 設計原則

1. **ステップコメントの徹底** — 各テストステップに `// Step N: 操作内容` を付与（例: `references/playwright-patterns.md` セクション3）
2. **try/finallyパターン** — クリーンアップを確実に実行（例: `references/playwright-patterns.md` セクション4）
3. **既存パターンの踏襲** — `loginAsUser()` でログイン共通化、`TEST_USERS` で認証情報管理、ヘルパー関数でクリーンアップ共通化
4. **疑似コードの粒度** — 実装エージェントが迷わないレベルの詳細さ。具体的なセレクタ・URL・待機時間を記載。エッジケースのテストパターンを明示

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（Opus 4.6）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` のレビュー観点 R1〜R7 に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] scenario_test_design.mdの全シナリオに対応する疑似コードが存在するか
- [ ] セレクタ戦略がdata-testid優先で設計されているか（CSSセレクタを避けているか）
- [ ] 待機戦略が明示的か（固定sleep()ではなくwaitForURL/waitForLoadState等を使用）
- [ ] クリーンアップがtry/finallyで確実に実行される設計か
- [ ] UIUX設計との整合性が取れているか（data-testid名の一致等）

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **テストコードは生成しない**（設計文書のみ）— 実装は `story-implementor` スキル（codex-delegator経由、またはメインセッションで直接実行）が行う
- 疑似コードは実装の指針となる詳細レベルで記載する
- TDDの「RED」フェーズで正しく失敗するテストを設計する
- 既存のテストパターン（`e2e/tests/**/*.spec.ts`）を参照してスタイルを統一する
- クリーンアップを確実に行い、テスト間の独立性を保つ

---

## 次ステップへの誘導

シナリオテストロジック設計完了後、以下のスキルに進んでください：

1. **TDD実装** — 全テストロジック設計完了後
   - `story-implementor` でTDDサイクル（Unit → IT → E2E）を実行
