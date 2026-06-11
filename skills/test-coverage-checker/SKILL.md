---
name: test-coverage-checker
description: テストケース設計の網羅性検証 - 受け入れ基準・ドメインロジック・UseCaseのカバレッジチェック
model: sonnet
review: opus
languages: [typescript]
---

# Test Coverage Checker

テストケース設計（unit/it/scenario）の網羅性を検証し、漏れを検出するスキル。テストケース設計フェーズ完了後、テストロジック設計フェーズの前に実行することで、早期にフィードバックを得る。

## 実行タイミング

```
テストケース設計フェーズ
  scenario-test-designer → it-test-designer → unit-test-designer
                          ↓
              ┌───────────────────────────┐
              │  test-coverage-checker    │ ← ここで実行
              │  （本スキル）              │
              └───────────────────────────┘
                          ↓
テストロジック設計フェーズ
  *-test-logic-designer（各レベル）
                          ↓
TDD実装フェーズ
  story-implementor
```

## 前提条件チェック

> **パス設定:** 以下のファイルパスはプレースホルダで記述。`{constructionDir}` / `{inceptionDir}` / `{unitsDir}` は `phasegate.config.json` のプロジェクト設定から解決される。

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **ユーザーストーリー** — `{unitsDir}/{unit}.md` 内の受け入れ基準
- **少なくとも1つのテスト設計文書** — 以下のいずれか
  - `{constructionDir}/{unit}/unit_test_design.md`
  - `{constructionDir}/{unit}/it_test_design.md`
  - `{inceptionDir}/{unit}/{story_id}/scenario_test_design.md`

### 推奨インプット（あれば参照）
- **ドメインモデル** — `{constructionDir}/{unit}/domain_model.md`
- **論理設計** — `{constructionDir}/{unit}/logical_design.md`
- **ストーリー固有論理設計** — `{inceptionDir}/{unit}/{story_id}/logical_design.md`
- **全テスト設計文書** — 網羅性検証の精度向上

---

## 検証観点

### 1. 受け入れ基準カバレッジ

各受け入れ基準（AC）に対応するテストケースが存在するかを検証。

| 受け入れ基準ID | 基準内容 | 対応テストケースID | カバー状態 |
|--------------|---------|------------------|----------|
| AC-1 | ... | SC-001, IT-UC-001 | ✅ カバー |
| AC-2 | ... | なし | ❌ 未カバー |

### 2. ドメインロジックカバレッジ

Entity/ValueObjectの不変条件・ビジネスルールがテストされているか。

| ドメインモデル | 不変条件/ルール | 対応テストケースID | カバー状態 |
|--------------|---------------|------------------|----------|
| InvoiceAmount | 金額は0以上 | UT-VO-001 | ✅ カバー |
| Invoice | 発行後の金額変更不可 | なし | ❌ 未カバー |

### 3. UseCaseカバレッジ

全UseCaseの正常系/異常系がテストされているか。

| UseCase名 | 正常系テスト | 異常系テスト | カバー状態 |
|----------|------------|------------|----------|
| CreateInvoiceUseCase | IT-UC-001 | IT-UC-002 | ✅ カバー |
| UpdateInvoiceUseCase | なし | なし | ❌ 未カバー |

### 4. APIカバレッジ（該当する場合）

全エンドポイントの認証/認可/バリデーションがテストされているか。

| エンドポイント | 認証テスト | 認可テスト | バリデーションテスト | カバー状態 |
|--------------|----------|----------|------------------|----------|
| POST /api/invoices | IT-API-001 | IT-API-002 | IT-API-003 | ✅ カバー |

### 5. UIUXカバレッジ（UIUX設計が存在する場合）

UIUX設計で定義された全画面がシナリオテストでカバーされているか。

| 画面名 | パス | 対応シナリオテスト | カバー状態 |
|--------|------|------------------|----------|
| {画面名} | `/path` | SC-001 | ✅ カバー |

**チェック対象:**
- `{constructionDir}/{unit}/uiux_design.md` が存在する場合のみ実行
- 画面一覧の全画面にシナリオテストが対応しているか
- data-testid一覧がシナリオテストロジックで使用されているか

---

## ⚠️ 3フェーズ実行ルール

**このスキルは3フェーズで実行する。**
- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: プロジェクトのモデルルーティング設定に従い、実行モデルに委譲して成果物を生成する
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。**

---

## Phase 1: 計画（plan）

### 目的
検証対象のスコープ・検証観点を整理し、人間の承認を得る。

### 出力ファイル
`{inceptionDir}/{unit}/test_coverage_plan.md`

### 計画ファイルの構成

```markdown
# テストカバレッジ検証計画: {Unit名}

## 1. スコープ
- 対象Unit
- 検証対象テスト設計文書一覧

## 2. 受け入れ基準一覧（対象ストーリーから抽出）
| AC ID | 基準内容 |
|-------|---------|
| AC-1 | ... |

## 3. ドメインモデル概要（検証対象）
- 集約: {一覧}
- エンティティ: {一覧}
- 値オブジェクト: {一覧}

## 4. UseCase概要（検証対象）
| UseCase名 | 正常系パス | 異常系パス |
|----------|----------|----------|

## 5. API概要（検証対象）
| エンドポイント | メソッド | 認証要否 |
|--------------|--------|---------|

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
- 検証スコープを明確にした
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **詳細検証レポートはまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **受け入れ基準カバレッジ分析** — 各ACに対応するテストケースをマッピング
2. **ドメインロジックカバレッジ分析** — 不変条件/ビジネスルールのカバー状況を分析
3. **UseCaseカバレッジ分析** — 正常系/異常系のカバー状況を分析
4. **APIカバレッジ分析** — 認証/認可/バリデーションのカバー状況を分析
5. **未カバー項目の抽出** — 漏れているテストケースを一覧化
6. **推奨追加ケースの提案** — 追加すべきテストケースを提案

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| 受け入れ基準カバレッジ | 全受け入れ基準の対応テストケースマッピングが完了していること |
| ドメインロジックカバレッジ | 全集約・エンティティ・値オブジェクトの不変条件/ルールがマッピングされていること |
| UseCaseカバレッジ | 全UseCaseの正常系/異常系カバー状況が分析されていること |
| APIカバレッジ | 全エンドポイントの認証/認可/バリデーションカバー状況が分析されていること |
| UIUXカバレッジ | UIUX設計が存在する場合、定義された全画面がシナリオテストでカバーされているか分析すること |
| 未カバー項目一覧 | 未カバー項目が優先度付きで一覧化されていること |
| カバレッジ率 | 総合カバレッジ率が算出されていること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `{constructionDir}/{unit}/coverage_report.md` |

### coverage_report.md の構成

詳細なテンプレートは [references/coverage-report-template.md](references/coverage-report-template.md) を参照。

主要セクション:
1. **サマリー** — 観点別カバレッジ率と判定結果（90%以上=合格/70-90%=要確認/70%未満=不合格）
2. **受け入れ基準カバレッジ詳細** — 各ACとテストケースのマッピング
3. **ドメインロジックカバレッジ詳細** — 集約/エンティティ/値オブジェクトの不変条件カバー状況
4. **UseCaseカバレッジ詳細** — 正常系/異常系のカバー状況
5. **APIカバレッジ詳細** — 認証/認可/バリデーションのカバー状況
6. **未カバー項目一覧** — 優先度付き（高:AC関連 > 中:ドメイン > 低:網羅性）
7. **推奨追加ケース** — テストレベル別の追加提案
8. **次のアクション** — カバレッジ率に応じた推奨フロー

---

## カバレッジ判定基準

| レベル | カバレッジ率 | 判定 | アクション |
|--------|------------|------|----------|
| A | 90%以上 | ✅ 合格 | テストロジック設計に進む |
| B | 70-90% | ⚠️ 要確認 | 未カバー項目を確認し判断 |
| C | 70%未満 | ❌ 不合格 | テストケース設計を追加 |

---

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（Opus 4.6）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. プロジェクトのレビュー基準に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] 全受け入れ基準に対応するテストケースのマッピングが完了しているか
- [ ] カバレッジ分析が4観点（受け入れ基準/ドメインロジック/UseCase/API）を全て含んでいるか
- [ ] UIUX設計が存在する場合、画面カバレッジが分析されているか
- [ ] 未カバー項目の優先度付けが妥当か（受け入れ基準関連が最優先）
- [ ] 推奨追加ケースが具体的か（テストレベル・ケースIDが指定されているか）

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **テストコードは生成しない**（検証レポートのみ）
- テストレベル間の責務分担を意識する（Unit/IT/E2Eの重複は問題なし、漏れは問題）
- 受け入れ基準が最優先のカバレッジ対象
- カバレッジ率は参考値であり、重要な項目が漏れていないことが本質

---

## 次ステップへの誘導

テストカバレッジ検証完了後、以下のスキルに進んでください：

1. **テストロジック設計** — テストの実装ロジックを設計
   - `unit-test-logic-designer` → `it-test-logic-designer` → `scenario-test-logic-designer`

2. **TDD実装** — テストロジック設計完了後
   - `story-implementor`

---

## 実装済みコードへのテスト追加モード

既に実装が完了しているが、テストが不足している場合に使用するモード。

### 使用タイミング

- 実装完了後にテスト漏れが発覚した場合
- レガシーコードにテストを追加する場合
- TDDフローを経ずに実装されたコードにテストを追加する場合

### ワークフロー

#### Step 1: 実装済みコードの分析

**以下のディレクトリを調査し、実装済みコンポーネントを特定する：**

```
{sourceDir}/{context}/domain/aggregates/      → Entity/集約
{sourceDir}/{context}/domain/value-objects/   → ValueObject
{sourceDir}/{context}/domain/policies/        → Policy
{sourceDir}/{context}/application/usecases/   → UseCase
{sourceDir}/{context}/infrastructure/repositories/ → Repository
{sourceDir}/{context}/interfaces/controllers/ → Controller
```

#### Step 2: 既存テストの確認

**以下のディレクトリを調査し、既存テストを特定する：**

```
{testDir}/unit/{context}/       → ユニットテスト
{testDir}/integration/{context}/ → ITテスト
{e2eDir}/{context}/             → E2Eテスト
```

#### Step 3: ギャップ分析

実装済みコンポーネントと既存テストを突き合わせ、不足テストを特定する。

### 出力フォーマット

```markdown
## 🔍 既存実装のテスト状況分析: {ストーリーID}

### 実装済みコンポーネント一覧

| コンポーネント | 種類 | ファイルパス |
|--------------|------|------------|
| {Name} | Entity | {sourceDir}/{context}/domain/aggregates/{name}.ts |
| {Name} | ValueObject | {sourceDir}/{context}/domain/value-objects/{name}.ts |
| {Name} | UseCase | {sourceDir}/{context}/application/usecases/{name}.ts |
| {Name} | Repository | {sourceDir}/{context}/infrastructure/repositories/{name}.ts |
| {Name} | Controller | {sourceDir}/{context}/interfaces/controllers/{name}.ts |

### テスト状況マトリクス

| コンポーネント | 種類 | ユニットテスト | ITテスト | E2Eテスト |
|--------------|------|--------------|---------|----------|
| {Entity名} | Entity | ❌ なし | - | - |
| {VO名} | ValueObject | ❌ なし | - | - |
| {UseCase名} | UseCase | - | ❌ なし | - |
| {Repository名} | Repository | - | ❌ なし | - |
| {Controller名} | Controller | - | ❌ なし | - |
| {シナリオ} | E2E | - | - | ✅ あり |

### 不足テストの作成に必要なスキル

| 不足テスト | 対応スキル | 優先度 |
|----------|----------|-------|
| Entity/VOのユニットテスト設計 | `unit-test-designer` | 🔴 高 |
| UseCase/Repository/ControllerのITテスト設計 | `it-test-designer` | 🔴 高 |
| ユニットテストロジック設計 | `unit-test-logic-designer` | 🟡 中 |
| ITテストロジック設計 | `it-test-logic-designer` | 🟡 中 |

### 推奨フロー

既存実装にテストを追加する場合、以下の順序でスキルを実行してください：

1. **`unit-test-designer`** → 既存Entity/VOに対するテストケース設計
2. **`it-test-designer`** → 既存UseCase/Repository/Controllerに対するテストケース設計
3. **`test-coverage-checker`** → カバレッジ再検証（本スキル）
4. **`unit-test-logic-designer`** → ユニットテストロジック設計
5. **`it-test-logic-designer`** → ITテストロジック設計
6. **TDDエージェント** → テスト実装（RED→GREEN）
   - `model-tdd-executor` → ユニットテスト
   - `it-tdd-executor` → ITテスト

### 注意事項

- 既存実装を変更せず、テストのみを追加する
- テスト設計時は実装コードを参照して、正確なテストケースを設計する
- TDDの原則から外れるが、品質向上のために許容される
```
