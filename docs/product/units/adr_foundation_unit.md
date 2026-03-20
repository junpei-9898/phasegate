# Unit定義: adr-foundation

> **Unit ID**: adr-foundation
> **作成日**: 2026-03-12
> **Wave**: 1（基盤構築）
> **対応Epic**: H-05 ADR基盤

---

## 1. 概要

Architecture Decision Records（ADR）のテンプレート整備、初期11件のADR作成、ステータス管理、フロントマターバリデーションを担うUnit。技術的意思決定を機械可読な形式知として記録し、HarnessErrorの`adr_ref`フィールドからの参照基盤を提供する。

v0（adr-documentation）ではテンプレート整備・初期10件ADR・ステータス管理を担当していたが、v1ではarchgateパターン（ADRに対応するバリデータ検証パターン）の定義を追加し、初期ADRを11件に拡充（harness_product_overview §12 Key Decisions全件カバー）。また、フロントマターバリデーションの自動テストを明確にスコープに含める。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H05-01 | ADRテンプレート整備 + archgateパターン定義 | Must |
| H05-02 | 初期ADR作成（§12 Key Decisions全件カバー） | Must |
| H05-03 | ADRステータス管理 + フロントマターバリデーション | Must |

---

## 3. 機能要件

### 3.1 ADRテンプレート + archgateパターン（H05-01）

- `docs/ADR/`にADRテンプレートファイルを作成
- テンプレート構造: タイトル / ステータス / コンテキスト / 決定 / 結果 / 代替案
- YAMLフロントマター（`title`, `status`, `date`, `adr_id`）を含み、機械的に解析可能
- archgateパターン（ADR-XXX → HarnessError codeのマッピング定義方法）を機械可読なJSON/YAML形式で定義する
  - 形式: `{ adr_id: string; enforced_by: { validator_id: string; error_code: string }[] }`
  - 例: `{ adr_id: "ADR-002", enforced_by: [{ validator_id: "L1", error_code: "L1-001" }] }`
  - ADRテンプレートのフロントマターに`archgate`フィールド（オプショナル）を追加

### 3.2 初期ADR 11件作成（H05-02）

以下のADRを`docs/ADR/`に作成:

1. パッケージ分離（Quality Harness / Orchestration）
2. ESLint→Biome全面移行
3. K1-K13全て品質ハーネス側帰属
4. FUSE Hooks Engineはv1スコープ外
5. HarnessErrorにfix_example必須化
6. Quick Mode適用条件の厳格定義
7. 設定ファイル分離（harness.config.json / orchestration.config.json）
8. Nyquist統合（GSD-2 Truths/Artifacts検証パターン）
9. 成果物駆動の状態導出
10. スタック検出（バリデータ無限ループ防止）
11. L0→4層一時定義→5層復帰パス

- 各ADRはH05-01のテンプレート構造に準拠
- §12でDecided済みのものはステータス`Accepted`、検討中のものは`Proposed`
- 各ADRのフロントマターが機械的に解析可能

### 3.3 ステータス管理 + フロントマターバリデーション（H05-03）

- 全ADRのフロントマターに`status`フィールドを必須化
- statusの値が`Proposed` / `Accepted` / `Deprecated` / `Superseded`のいずれかであることを検証
- `Superseded`状態のADRには後継ADRへの参照（`superseded_by`フィールド）を含める
- フロントマターバリデーション（statusフィールドの存在・有効値・Superseded時の後継参照）の自動テスト

---

## 4. ドメインモデル概要

- **ADR（集約ルート）**: ADRファイルの読み込み・ステータス管理・フロントマター検証を統括
- **AdrId（値オブジェクト）**: ADR識別子（例: `ADR-001`）
- **AdrStatus（値オブジェクト）**: Proposed / Accepted / Deprecated / Superseded の列挙型
- **AdrFrontmatter（値オブジェクト）**: title, status, date, adr_id, superseded_by(optional) の構造体
- **ArchgateMapping（値オブジェクト）**: ADR-XXX → HarnessError codeのマッピング
- **AdrValidationService（ドメインサービス）**: フロントマターの構造検証・ステータス遷移の整合性チェック

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: バリデーションエラーの出力に使用

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **ADR Frontmatter Schema** | 提供 | harness-error（adr_ref参照）, ci-governance（ADRリンク + archgate検証） | ADRフロントマターのYAML構造定義。archgateフィールドを含む機械可読スキーマ |
| **ADRファイル群** | 提供 | harness-error | `adr_ref`フィールドの参照先として全ADRファイルを提供 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K6 | 2-Phase Execution | ADRテンプレートに2-Phase Execution設計のADRを含む |
| K7 | Document Split（inception/product） | ADRをinception/product分離設計のADRとして記録 |
| K13 | harness.config.json | 設定ファイル分離のADRを含む |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| ドキュメント | `docs/ADR/*.md`（ADRファイル群） | harness-error（adr_ref参照先） |
| スキーマ | ADRフロントマター構造定義 | harness-error, ci-governance |
| テンプレート | `docs/ADR/template.md` | 外部利用者（新規ADR作成時） |
| ドキュメント | archgateパターン定義 | harness-error（ADR→HarnessError codeマッピング） |

---

## 8. 実装上の制約・注意事項

- **v0との差異**: v0（adr-documentation）ではUS-020/021/022で初期10件ADRだったが、v1では§12 Key Decisions全件カバーにより11件に拡充。archgateパターン定義が新規追加
- **ADRファイル命名規則**: `docs/ADR/{NNN}-{kebab-case-title}.md`形式
- **フロントマターの機械可読性**: YAMLフロントマターは`---`で囲み、`title`, `status`, `date`, `adr_id`を必須フィールドとする
- **ステータス遷移の整合性**: `Superseded`状態のADRには`superseded_by`フィールドが必須。後継ADRの実在性も検証対象
- **harness-errorとの連携**: harness-errorのHarnessError `adr_ref`フィールドが本Unitが管理するADRを参照する。ADR IDの一意性と実在性を保証する必要がある
- **ci-governanceとの連携**: ci-governanceがADRリンクを参照するため、ADR Frontmatter Schemaの安定性を維持する
