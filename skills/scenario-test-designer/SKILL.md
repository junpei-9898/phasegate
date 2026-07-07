---
name: scenario-test-designer
description: ユーザーストーリー・論理設計・モックからシナリオテストケースを設計（AIDLC Step 6）
model: sonnet
review: opus
languages: [typescript]
---

# Scenario Test Designer

ユーザーストーリー、論理設計、モック（あれば）をベースに、ユーザーの業務シナリオに沿ったE2Eテストケースを設計するスキル。AIDLCプロセスのStep 6「シナリオテストケース設計」に対応。

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **論理設計** — `docs/product/construction/{unit}/logical_design.md` または `docs/inception/{unit}/{story_id}/logical_design.md`
- **ユーザーストーリー** — 対象ストーリーの定義と受け入れ基準

### 任意インプット（あれば参照）
- **UIモック** — `/mock/*.html`（画面フローの参考）
- **テスト規約** — `docs/principles/testing-rules.md`
- **既存シナリオテスト** — 既存パターンの参考

---

## ⛔ スキップ禁止

**このスキルはTDDフローの必須ステップです。スキップして実装に進むことは禁止されています。**

### スキップした場合のリスク
- テスト漏れが発生し、品質が低下する
- `story-implementor` で実装が拒否される
- `implementation-readiness-checker` でブロックされる

### このスキルの位置づけ
```
scenario-test-designer（本スキル）← テストケース設計の最初
        ↓
uiux-designer ← シナリオテスト設計を入力にUI/UX定義
        ↓
unit-test-designer
        ↓
it-test-designer
        ↓
test-coverage-checker ← カバレッジ検証
        ↓
テストロジック設計
        ↓
implementation-readiness-checker
        ↓
story-implementor ← TDD実装
```

**必ず完了してから次のステップに進んでください。**

---

## ⚠️ 上位レイヤー存在チェック

**このスキルは AIDLC Step 6「シナリオテストケース設計」に対応します。実行前に上位設計の存在を確認してください。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/logical_design.md` | ✅ 必須 | 論理設計の存在を確認 |
| `docs/product/units/{unit}.md` | ✅ 必須 | 対象ストーリーの定義を確認 |
| `/mock/*.html` | 📋 推奨 | モックの存在を確認（あれば参照） |

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

以下の設計文書が存在しないため、シナリオテスト設計を開始できません：
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
- **Phase 2（実行）**: 委任先モデルに委任して成果物を生成する（`npx phasegate delegate-sonnet` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## Phase 1: 計画（plan）

### 目的
テスト設計のスコープ・テストシナリオ概要・不明点を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/{story_id}/scenario_test_plan.md`

### 計画ファイルの構成

詳細なテンプレートは [references/scenario-test-plan-template.md](references/scenario-test-plan-template.md) を参照。

主要セクション: スコープ / テストシナリオ概要 / 前提条件 / テスト実行環境 / QA（不明点） / 前提条件・リスク

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

1. **シナリオ定義** — 業務フローに沿ったテストシナリオを定義
2. **テストケース詳細化** — 各シナリオのステップ・期待結果を詳細化
3. **テストデータ要件** — 必要なシードデータ・テストユーザーを定義
4. **エッジケース抽出** — 異常系・境界値のテストケースを追加

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| シナリオ数 | 受け入れ基準1つにつき最低1シナリオが対応していること |
| 正常系/異常系 | 各シナリオに正常系・異常系の両方のテストケースがあること |
| テストステップ | 各シナリオに操作手順と期待結果が明記されていること |
| テストデータ | 必要なシードデータ・テストユーザーが定義されていること |
| 非機能観点 | パフォーマンス・セキュリティ・アクセシビリティに関連するテストケースが検討されていること |
| 受け入れ基準カバー | 全受け入れ基準に対応するテストケースが存在すること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `docs/inception/{unit}/{story_id}/scenario_test_design.md` |

### scenario_test_design.md の構成

詳細なテンプレートは [references/scenario-test-design-template.md](references/scenario-test-design-template.md) を参照。

主要セクション: 対象ストーリー / テストシナリオ（SC-XXX） / テストデータ要件 / 異常系・エッジケース / 実装時の注意点

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
- [ ] 全受け入れ基準に対応するシナリオが存在するか
- [ ] 各シナリオの操作手順が具体的か（曖昧な「操作する」等がないか）
- [ ] 異常系テストケースが網羅されているか（バリデーションエラー、権限不足、タイムアウト等）
- [ ] テストデータ要件が具体的か（ID、名前、状態等の値が定義されているか）
- [ ] 非機能要件（パフォーマンス・セキュリティ・アクセシビリティ）のテスト観点が含まれているか

### 過剰テスト検知（engineering-perspective: YAGNI + シンプルさ）
以下に該当するテストケースを検出した場合、**削除または統合**する：
- [ ] **重複検証**: ITテスト・ユニットテストで既にカバーされている検証をE2Eで再テストしているケース（E2Eはユーザー視点のフローに集中）
- [ ] **シナリオの細分化過剰**: 1つの業務フローを不必要に細かいシナリオに分割しているケース（統合すべき）
- [ ] **過剰な異常系**: ユーザーが到達不可能なエラーパス（UI上で発生しえない入力等）のテスト
- [ ] **非機能の肥大化**: 全画面に同じアクセシビリティ・パフォーマンスチェックを個別に書いているケース（共通テストで集約すべき）

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **ファイル配置は `docs/folder_management_rules.md` に従うこと**
- **テストコードは生成しない**（設計文書のみ）— 実装は `story-implementor` スキル（codex-delegator経由、またはメインセッションで直接実行）が行う
- 受け入れ基準を漏れなくカバーする
- TDDプロセスの「正しくRED」になる状態を目指す設計を行う
- テスト規約（`docs/principles/testing-rules.md`）がある場合は遵守する
- Playwrightの使用を前提とする（プロジェクト固有の要件がある場合は調整）

---

## 次ステップへの誘導

シナリオテストケース設計はテストケース設計フェーズの最初に位置づけられる（成果物 `scenario_test_design.md` は `uiux-designer` の必須インプット）。完了後、以下の順序で進めてください：

### UI/UX設計フェーズ
1. **UI/UX定義** — シナリオテスト設計・論理設計・既存UIを加味した最終UI/UX策定
   - `uiux-designer` スキルを実行

### テストケース設計フェーズ（続き）
2. **ユニットテストケース設計** — Entity/ValueObjectのテストケース
   - `unit-test-designer` スキルを実行
3. **ITテストケース設計** — UseCase/Repository/Controllerのテストケース
   - `it-test-designer` スキルを実行

### カバレッジ検証フェーズ
4. **テストカバレッジ検証** — テストケース設計の網羅性チェック
   - `test-coverage-checker` スキルを実行
   - カバレッジ90%以上を確認

### テストロジック設計フェーズ
5. **テストロジック設計** — 各レベルの実装ロジック
   - `unit-test-logic-designer` → `it-test-logic-designer` → `scenario-test-logic-designer`

### TDD実装フェーズ
6. **実装準備検証・TDD実装** — Unit → IT → E2E の順序で実装
   - `implementation-readiness-checker` → `story-implementor` スキルを実行

**推奨フロー図:**
```
scenario-test-designer（本スキル）
        ↓
uiux-designer
        ↓
unit-test-designer → it-test-designer
        ↓
test-coverage-checker
        ↓
*-test-logic-designer（各レベル）
        ↓
implementation-readiness-checker
        ↓
story-implementor
```
