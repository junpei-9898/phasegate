---
name: unit-test-logic-designer
description: Unitテストケース設計を元にVitest実装ロジックを設計 - 疑似コード付きの詳細設計
model: sonnet
review: opus
languages: [typescript]
---

# Unit Test Logic Designer

Unitテストケース設計（`unit_test_design.md`）を元に、Vitest実装ロジックを詳細設計するスキル。テストケース設計フェーズとTDD実装フェーズの間に位置し、TDDで「正しくRED」になるテストコードの設計を行う。

## 実行タイミング

```
テストケース設計フェーズ
  scenario-test-designer → uiux-designer → unit-test-designer → it-test-designer
                          ↓
              test-coverage-checker
                          ↓
┌────────────────────────────────────────┐
│  unit-test-logic-designer（本スキル）    │ ← ここで実行
└────────────────────────────────────────┘
                          ↓
  it-test-logic-designer → scenario-test-logic-designer
                          ↓
TDD実装フェーズ
  implementation-readiness-checker → story-implementor
```

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **ユニットテストケース設計** — `docs/product/construction/{unit}/unit_test_design.md`
- **ドメインモデル** — `docs/product/construction/{unit}/domain_model.md`

### 推奨インプット（あれば参照）
- **カバレッジレポート** — `docs/product/construction/{unit}/coverage_report.md`
- **既存ユニットテスト** — `backend/test/unit/**/*.test.ts`（パターン参考）
- **テスト規約** — `docs/principles/testing-rules.md`

---

## 上位レイヤー存在チェック

**このスキルはテストケース設計完了後、TDD実装前に実行します。**

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/unit_test_design.md` | 必須 | ユニットテストケース設計の存在を確認 |
| `docs/product/construction/{unit}/domain_model.md` | 必須 | ドメインモデルの存在を確認 |
| `docs/product/construction/{unit}/coverage_report.md` | 推奨 | カバレッジ検証済みか確認 |

上位設計文書が存在しない場合、**ロジック設計を開始せず**、以下を行う：
1. **状況報告** — 不足している設計文書を明示
2. **選択肢提示** — 上位設計を先に実行する / スキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断でロジック設計を開始しない

---

## ⚠️ 3フェーズ実行ルール

- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: 委任先モデルに委任して成果物を生成する（`npx phasegate delegate-sonnet` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## Phase 1: 計画（plan）

### 目的
ロジック設計のスコープ・テストファイル構成・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/unit_test_logic_plan.md`

### 計画ファイルの構成

```markdown
# ユニットテストロジック設計計画: {Unit名}

## 1. スコープ
- 対象テストケース設計: unit_test_design.md
- テストケース総数: X件

## 2. テストファイル構成（計画）

| テストファイル | 対象モデル | ケース数 |
|--------------|----------|---------|
| `{aggregate}.test.ts` | {集約名} | X |

## 3. モック/ファクトリ設計方針

## 4. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
**推奨案:** {AIの推奨案}
[Answer]（人間が回答を記入）

## 5. 前提条件・リスク
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
2. **各テストケースの疑似コード設計** — AAA パターンで詳細化
3. **ファクトリ関数の設計** — テストデータ生成の共通化
4. **モック戦略の設計** — vi.mock の使用方針

詳細なテストパターン（ファクトリ関数、集約/VOテストテンプレート、モック戦略、AAAパターン例）は [references/test-patterns.md](references/test-patterns.md) を参照。

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| ケース網羅 | unit_test_design.mdの全テストケースに対応する疑似コードがあること |
| AAAパターン | 全テストケースがArrange/Act/Assertの3セクションを持つこと |
| 具体値 | テストデータに具体的な値（プレースホルダでなく実際の値）が記載されていること |
| ファクトリ関数 | テストデータ生成用のファクトリ関数が設計されていること |
| import文 | 各テストファイルの必要なimport文が明記されていること |
| テスト実行コマンド | テスト実行方法が記載されていること |

### 出力ファイル

`docs/product/construction/{unit}/unit_test_logic.md`

### unit_test_logic.md の構成

成果物は以下のセクションで構成する：

1. **テストファイル構成** — ファイルパス・対象モデル・ケース数の一覧
2. **共通ヘルパー・ファクトリ** — ファクトリ関数とインポートパス
3. **テストケース詳細ロジック** — 各テストの疑似コード（AAAパターン）
4. **モック戦略** — vi.mock の使用方針と対象
5. **境界値テスト一覧** — ケースID・境界条件・入力例・期待結果
6. **テスト実行コマンド** — 実行方法

各セクションのテンプレートは [references/test-patterns.md](references/test-patterns.md) を参照。

---

## 設計原則

1. **AAA パターンの徹底** — Arrange / Act / Assert を全テストで使用し、コメントで明示する
2. **既存パターンの踏襲** — `target()` / `context()` ヘルパー使用、相対パスで統一
3. **疑似コードの粒度** — 実装エージェントが迷わないレベル（具体的な値・型・メソッド名を記載）

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（model-routing.md の Architect ロール）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` の「レビュー観点」節に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] unit_test_design.mdの全テストケースIDに対応する疑似コードが存在するか
- [ ] 疑似コードがTDDの「正しくRED」になる設計か（実装前にfailする前提のテスト）
- [ ] target()/context()ヘルパーの使用が既存パターンと一致しているか
- [ ] ファクトリ関数の設計がテスト間のデータ独立性を保っているか
- [ ] import パスが相対パスで統一されているか

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

---

## 🔗 テストファイルのトレーサビリティメタデータ（必須）

Phase 2 で設計するテストファイル（`*.test.ts` / `*.spec.ts`）の疑似コード冒頭には、ファイル先頭コメントブロックに `// @story HXX-XX` を emit するよう明記する。`MetadataValidator.validateTest` が検証対象とし、ISSUE-008 Phase C-2 以降は `npx phasegate validate-metadata` / pre-commit で自動チェックされる。

```typescript
// @unit <被テストコードと同じ Unit ID>
// @layer <被テストコードと同じ layer>
// @story H03-02
```

形式ルール:
- `@unit` / `@layer` と同じヘッダーコメントブロックに配置
- `HXX-XX` は `docs/product/user_stories.md` に存在する ID（StoryCatalog）
- 複数ストーリーをカバーするテストは `// @story H03-01, H03-02` のようにカンマ区切りで列挙
- 目的: US↔テストの逆引きを機械化（test-coverage-checker / nyquist の集計入力）

---

## 注意事項

- **テストコードは生成しない**（設計文書のみ）— 実装は `story-implementor` が行う
- 疑似コードは実装の指針となる詳細レベルで記載する
- TDDの「RED」フェーズで正しく失敗するテストを設計する
- 既存のテストパターン（`backend/test/unit/**/*.test.ts`）を参照してスタイルを統一する

---

## 次ステップへの誘導

ユニットテストロジック設計完了後、以下のスキルに進んでください：

1. **ITテストロジック設計** — `it-test-logic-designer`
2. **シナリオテストロジック設計** — `scenario-test-logic-designer`
3. **TDD実装**（全テストロジック設計完了後） — `story-implementor`
