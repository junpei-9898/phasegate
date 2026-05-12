# Unit定義: harness-error

@story-id H06-01
> **Unit ID**: harness-error
> **作成日**: 2026-03-12
> **Wave**: 1（基盤構築）
> **対応Epic**: H-06 HarnessError体系

---

## 1. 概要

HarnessError統一フォーマットの定義、fix_example品質保証、severity権限契約を担うUnit。全バリデータ（L1-L4）のエラー出力を`{code, severity, message, suggestion, adr_ref, fix_example, suggested_skill, scaffold_command, template_path}`に統一し、AIエージェントがエラーメッセージとfix_exampleから自律的に自己修正できる「Error as Teacher」原則を実現する。追加の recovery metadata は任意フィールドであり、既存必須フィールドの互換性を維持する。<!-- @work-item-id WI-149 -->

v0（harness-dx）ではAGENTS.mdポインタ型移行（US-035）も含んでいたが、v1ではAGENTS.md管理をci-governanceに移管し、**HarnessError型の定義・品質保証・権限契約に専任**する。`HarnessError`型はShared Kernelとして全Unitが参照する最重要の共有型である。新規追加のfix_example品質保証（H06-02）とseverity権限契約（H06-03）により、エラー品質の継続的保証とオーケストレーション層による勝手な緩和の防止を実現する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H06-01 | HarnessError統一フォーマット + 全バリデータへの適用 | Must |
| H06-02 | fix_example品質保証 | Must |
| H06-03 | severity権限契約 | Must |

---

## 3. 機能要件

### 3.1 HarnessError統一フォーマット（H06-01）

- HarnessError型を`{code, severity, message, suggestion, adr_ref, fix_example, suggested_skill, scaffold_command, template_path}`で定義
- L1-L4全バリデータのエラー出力をHarnessErrorフォーマットに統一
- 全バリデータのHarnessErrorに`adr_ref`フィールド（関連ADRへの参照）を付与
- 全バリデータのHarnessErrorに`fix_example`フィールド（修正コード例）を付与
- HarnessErrorフォーマット準拠を検証する自動テスト

### 3.2 fix_example品質保証（H06-02）

- 全バリデータのfix_exampleをテスト資産として管理
- CIパイプラインでfix_exampleの妥当性（適用後にバリデータが通過すること）を検証
- fix_exampleが構文的に不正な場合、CIが失敗
- fix_example更新時にバリデーションが自動実行

### 3.3 severity権限契約（H06-03）

- severity権限契約（`severity: "error"`の格下げ禁止）を仕様として定義
- Harness APIレスポンスでseverityフィールドが`readonly`であることを型レベルで保証
- severity格下げを試みるケースを検出するテスト
- 契約違反時のエラーメッセージに違反内容と根拠（ADR参照）を含める

---

## 4. ドメインモデル概要

- **HarnessError（集約ルート）**: エラーフォーマットの生成・検証を統括
  - `code`: バリデータ固有のエラーコード（例: `L1-001`）
  - `severity`: `"error"` | `"warning"`（read-only契約）
  - `message`: 人間可読なエラーメッセージ
  - `suggestion`: 修正の方向性を示すテキスト
  - `adr_ref`: 関連ADRへの参照（例: `ADR-003`）
  - `fix_example`: 修正コード例（AIエージェントの自己修正用）
  - `suggested_skill`: 次に起動すべき skill 名（任意）
  - `scaffold_command`: 最小雛形生成や修復に使う CLI 例（任意）
  - `template_path`: 参照すべきテンプレート path（任意）
- **ErrorCode（値オブジェクト）**: バリデータID + 連番のエラーコード体系
- **Severity（値オブジェクト）**: error / warning の列挙型。read-only契約を型レベルで表現
- **FixExample（値オブジェクト）**: 修正コード例。構文的妥当性の検証メソッドを持つ
- **SeverityContract（ドメインサービス）**: severity格下げの検出・契約違反レポート
- **FixExampleValidator（ドメインサービス）**: fix_exampleの妥当性検証（適用後にバリデータが通過するか）

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessConfigV2型**（config-foundationが定義）: fix_example検証時にバリデータ実行のための設定参照

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **HarnessError型** | 提供 | 全Unit | Shared Kernelとして全バリデータのエラー出力フォーマットを定義 |
| **ADR Frontmatter Schema** | 消費 | adr-foundation | `adr_ref`フィールドの参照先ADRの実在性・構造検証 |
| **Validator ID Registry** | 消費 | validator-system | fix_example検証対象のバリデータID一覧 |
| **config-foundation（実装時依存）** | 消費 | config-foundation | fix_example検証時にバリデータ実行にconfig参照が必要 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | L1-L4全バリデータのエラー出力をHarnessErrorフォーマットに統一 |
| K4 | テスト品質ルール | fix_exampleをテスト資産として管理し、CIで妥当性を検証 |
| K10 | Security/Performance検出 | L3バリデータのセキュリティ・パフォーマンス検出エラーもHarnessErrorフォーマットに準拠 |
| K12 | Consistency Checker | HarnessErrorフォーマットの一貫性を型レベルで保証。全Unitのエラー出力が統一フォーマットに準拠していることを検証可能にする |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 型定義 | `HarnessError`型（Shared Kernel） | 全Unit（バリデータ出力） |
| 型定義 | `Severity`型（read-only契約付き） | harness-api, agent-integration |
| 仕様 | severity権限契約 | harness-api（APIレスポンスでの格下げ防止） |
| テスト資産 | fix_exampleテストスイート | CI（回帰テスト） |

---

## 8. 実装上の制約・注意事項

- **v0との差異**: v0（harness-dx）ではAGENTS.mdポインタ型移行（US-035）を含んでいたが、v1ではci-governanceに移管。HarnessError専任に再定義
- **Shared Kernel責務**: `HarnessError`型は全Unitが参照する最重要の共有型。インターフェース変更の波及範囲が全Unitに及ぶため、型定義の安定性を最優先する
- **型定義の先行確定**: Wave 1開始前に`HarnessError`型のインターフェースを先行定義し、他Unitの並列開発を可能にする
- **config-foundationへの実装時依存**: fix_example検証でバリデータ実行にconfig参照が必要。ただし型定義の先行確定により実装フェーズも並列開発可能
- **severity read-only契約**: TypeScriptの`readonly`修飾子等を使い、型レベルでseverityの変更不可を表現。ランタイムでの格下げ検出テストも必須。Harness API Response DTO（harness-api所有）がHarnessErrorを含む際も、`severity`フィールドのread-only契約を維持する。harness-api Unitの`HarnessApiResponse.errors[]`内のseverityフィールドに対するfreeze/immutability保証が必要
- **fix_example検証のCI統合**: fix_exampleは「適用後にバリデータが通過すること」を検証するため、対象バリデータの実装が完了している必要がある。Wave 2以降のバリデータについてはバリデータ実装と同時にfix_exampleテストを追加する段階的アプローチ
- **Error as Teacher原則**: fix_exampleの品質がAIエージェントの自己修正率に直結する。構文的正しさだけでなく、実際にバリデータを通過する「正しい修正例」であることを保証する
