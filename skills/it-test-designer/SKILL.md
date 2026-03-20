---
name: it-test-designer
description: 論理設計からIT（結合テスト）ケースを設計（AIDLC Step 8の前段）
model: sonnet
review: opus
---

# IT Test Designer

論理設計（UseCase、Repository、Controller等）に対するIT（Integration Test / 結合テスト）ケースを設計するスキル。AIDLCプロセスのStep 8「TDDで実装」の前段階として、アプリケーション層・インフラ層のテスト設計を行う。

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **論理設計** — `docs/product/construction/{unit}/logical_design.md`
- **統合契約** — `docs/product/units/integration_contract.md`

### 任意インプット（あれば参照）
- **ドメインモデル** — `docs/product/construction/{unit}/domain_model.md`
- **環境設計** — `docs/product/environment_contract.md`
- **テスト規約** — `docs/principles/testing_rules.md`
- **既存ITテスト** — 既存パターンの参考

---

## ⛔ スキップ禁止

**このスキルはTDDフローの必須ステップです。スキップして実装に進むことは禁止されています。**

### スキップした場合のリスク
- UseCase/Repository/ControllerのITテストが漏れる
- `story-implementor` で実装が拒否される
- `implementation-readiness-checker` でブロックされる

### このスキルの位置づけ
```
scenario-test-designer
        ↓
it-test-designer（本スキル）← ITテストケース設計
        ↓
unit-test-designer
        ↓
test-coverage-checker ← カバレッジ検証
        ↓
テストロジック設計
        ↓
story-implementor ← TDD実装
```

**必ず完了してから次のステップに進んでください。**

---

## ⚠️ 上位レイヤー存在チェック

**このスキルは AIDLC Step 8「TDDで実装」の前段階に対応します。実行前に上位設計の存在を確認してください。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/logical_design.md` | ✅ 必須 | 論理設計の存在を確認 |
| `docs/product/units/integration_contract.md` | ✅ 必須 | 統合契約の存在を確認 |

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**テスト設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（logical-designer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断でテスト設計を開始しない

**報告テンプレート:**
```markdown
## ⚠️ 上位レイヤー設計が見つかりません

以下の設計文書が存在しないため、ITテスト設計を開始できません：
- `docs/product/construction/{unit}/logical_design.md` ❌ 未作成

### 推奨アクション
`logical-designer` スキルを使用して論理設計を作成してください。

### 選択肢
1. **logical-designerを先に実行する**（推奨）
2. **このまま進める**（上位設計なしで進める場合、整合性リスクあり）

どちらを選択しますか？
```

---

## ⚠️ 3フェーズ実行ルール

**このスキルは3フェーズで実行する。**
- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: Sonnet 4.6 に委任して成果物を生成する（`scripts/delegate-sonnet.sh` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## Phase 1: 計画（plan）

### 目的
ITテスト設計のスコープ・テスト対象・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/it_test_design_plan.md`

### 計画ファイルの構成

```markdown
# ITテスト設計計画: {Unit名}

## 1. スコープ
- 対象Unitの論理設計
- テスト対象コンポーネント一覧

## 2. テスト対象分析

### UseCase
| UseCase名 | 依存Repository数 | テストケース概算 |
|-----------|----------------|---------------|

### Repository
| Repository名 | CRUD操作数 | テストケース概算 |
|-------------|----------|---------------|

### Controller/API
| エンドポイント | メソッド | テストケース概算 |
|--------------|--------|---------------|

## 3. テスト方針
- モック/スタブの使用方針
- DBテストの方針（テストDB or インメモリ）
- 認証・認可のテスト方針

## 4. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

## 5. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **テスト設計文書はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **UseCaseテスト設計** — ユースケースの入出力・処理フローのテストケースを設計
2. **Repositoryテスト設計** — CRUD操作・トランザクションのテストケースを設計
3. **Controller/APIテスト設計** — エンドポイント・認証・バリデーションのテストケースを設計
4. **エッジケース抽出** — エラーハンドリング・境界値のテストケースを追加

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| UseCase網羅 | 論理設計の全UseCaseに対応するテストケースがあること |
| Repository網羅 | 全RepositoryのCRUD操作にテストケースがあること |
| Controller網羅 | 全エンドポイントに認証・認可・バリデーション・正常系のテストケースがあること |
| 正常系/異常系 | 各コンポーネントに正常系・異常系の両方のテストケースがあること |
| シードデータ | テストに必要なシードデータ要件が定義されていること |
| テスト環境設定 | DB設定・モック設定・認証設定が記載されていること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `docs/product/construction/{unit}/it_test_design.md` |

### it_test_design.md の構成

```markdown
# ITテスト設計: {Unit名}

## 1. 対象コンポーネント
- UseCase: {UseCase名一覧}
- Repository: {Repository名一覧}
- Controller: {Controller名一覧}

## 2. UseCaseテストケース

### {UseCase名}

#### 正常系
| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-{名}-001 | ... | ... | ... | ... |

#### 異常系
| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|

## 3. Repositoryテストケース

### {Repository名}

#### CRUDテスト
| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|

#### トランザクションテスト
| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|

## 4. Controller/APIテストケース

### {エンドポイント}

#### 認証・認可テスト
| ケースID | 認証状態 | 権限 | 期待レスポンス |
|---------|---------|------|--------------|

#### バリデーションテスト
| ケースID | 入力 | 期待エラー |
|---------|------|----------|

#### 正常系
| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|

## 5. シードデータ要件
| データセット | 用途 | 内容 |
|------------|------|------|

## 6. テスト環境設定
- DB設定
- モック設定
- 認証設定
```

---

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
- [ ] 論理設計の全UseCase/Repository/Controllerにテストケースが対応しているか
- [ ] 認証・認可テストが全エンドポイントでカバーされているか
- [ ] バリデーションテストが入力パラメータ毎に存在するか
- [ ] エラーハンドリング（Not Found、権限不足、バリデーションエラー）のテストがあるか
- [ ] モック/スタブの使用方針が明確か

### 過剰テスト検知（engineering-perspective: YAGNI + シンプルさ）
以下に該当するテストケースを検出した場合、**削除または統合**する：
- [ ] **重複検証**: ユニットテストで既にカバーされているドメインロジックをITテストで再検証しているケース
- [ ] **自明なCRUD**: 単純なパススルー（ロジックのないCRUD）を個別にテストしているケース（代表1件で十分）
- [ ] **過剰なバリデーション**: ドメイン層で既にガードされているバリデーションをController層で重複テストしているケース
- [ ] **モック過多**: モックが多すぎて実際の結合を検証していないケース（ITテストの意義が薄い）

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **ファイル配置は `docs/folder_management_rules.md` に従うこと**
- **テストコードは生成しない**（設計文書のみ）— 実装は `story-implementor` スキル（codex-delegator経由、またはメインセッションで直接実行）が行う
- 論理設計のすべてのユースケース・エンドポイントをカバーする
- TDDプロセスの「正しくRED」になる状態を目指す設計を行う
- テスト規約（`docs/principles/testing_rules.md`）がある場合は遵守する
- AAAパターン（Arrange-Act-Assert）を前提としたケース設計を行う

---

## 次ステップへの誘導

ITテストケース設計完了後、以下の順序で進めてください：

### テストケース設計フェーズ（続き）
1. **ユニットテストケース設計** — Entity/ValueObjectのテストケース
   - `unit-test-designer` スキルを実行

### カバレッジ検証フェーズ
2. **テストカバレッジ検証** — テストケース設計の網羅性チェック
   - `test-coverage-checker` スキルを実行
   - カバレッジ90%以上を確認

### テストロジック設計フェーズ
3. **テストロジック設計** — 各レベルの実装ロジック
   - `unit-test-logic-designer` → `it-test-logic-designer` → `scenario-test-logic-designer`

### TDD実装フェーズ
4. **TDD実装** — Unit → IT → E2E の順序で実装
   - `story-implementor` スキルを実行

**推奨フロー図:**
```
scenario-test-designer
        ↓
it-test-designer（本スキル）
        ↓
unit-test-designer
        ↓
test-coverage-checker
        ↓
*-test-logic-designer（各レベル）
        ↓
story-implementor
```
