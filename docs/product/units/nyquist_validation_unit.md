# Unit定義: nyquist-validation

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-12
> **Wave**: 2（コア品質機構）
> **対応Epic**: H-07 Nyquist検証層

---

## 1. 概要

要件（AC）とテストケースの双方向トレーサビリティを保証するNyquist検証層を構築するUnit。requirement-test-matrix.jsonのJSONスキーマ定義、phase-gateバリデータへのACマッピング完了チェック追加、要件カバレッジ算出、impact-analysisコマンドを実現する。

v0ではVALIDATION.md自動生成（US-009）を含んでいたが、v1ではrequirement-test-matrix.jsonとtest-coverage-checkerの統合によって代替し、**構造化されたJSON駆動のトレーサビリティ検証**に特化する。@storyメタデータ（traceability-model）との整合性を確保し、要件→テスト→コードの完全な追跡チェーンを機械的に保証する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H07-01 | requirement-test-matrix.json新設 | Must |
| H07-02 | phase-gate ACマッピング完了チェック追加 | Must |
| H07-03 | test-coverage-checkerでの要件カバレッジ算出 | Must |
| H07-04 | phasegate:impact-analysis HXX-XXコマンド | Should |

---

## 3. 機能要件

### 3.1 requirement-test-matrix.json（H07-01）

- JSONスキーマ定義: User Story ID / AC ID / テストケースファイルパス / テスト種別（unit/it/scenario）のフィールドを含む
- スキーマバリデーションが通過するサンプルファイルの作成
- 無効なスキーマのファイルに対するバリデーションエラー検出
- @storyメタデータ（H03-03）との整合性定義

### 3.2 phase-gate ACマッピング完了チェック（H07-02）

- **AcCoverageGatePolicy**（ACマッピング完了判定ロジック）を本Unitが提供し、validator-systemのphase-gateバリデータ（L2-001）が実行する。本Unitはポリシーの定義・計算を担当し、実行主体はvalidator-systemに一元化する
- requirement-test-matrix.jsonに未マッピングのACが存在する場合、AcCoverageGatePolicyがfailを返す
- 全ACがマッピング済みの場合、AcCoverageGatePolicyがpassを返す
- phase-gate失敗時のHarnessErrorに未マッピングAC一覧を含める

### 3.3 要件カバレッジ算出（H07-03）

- requirement-test-matrix.jsonからAC網羅率（マッピング済みAC数/全AC数）を算出
- AC網羅率が100%未満の場合、未カバーACの一覧をレポートに出力
- コードカバレッジ閾値（standard: 90% / strict: 95%）と要件カバレッジの両方をレポートに含める

### 3.4 impact-analysisコマンド（H07-04）

- `phasegate:impact-analysis HXX-XX`コマンドの実行（正常時: 終了コード0、ストーリー未検出時: 終了コード1）。CLIエントリポイントはharness-apiが所有し、本Unitは実行ロジックを提供する
- 指定ストーリーIDに紐づくテストケース一覧をrequirement-test-matrix.jsonから特定・出力
- 存在しないストーリーID（HXX-XX形式）が指定された場合、適切なエラーメッセージを表示
- 出力にテスト種別（unit/it/scenario）とファイルパスを含める

---

## 4. ドメインモデル概要

- **RequirementTestMatrix（集約ルート）**: requirement-test-matrix.jsonの読み込み・検証・照会を統括
- **StoryMapping（エンティティ）**: 1つのUser Storyに属するACマッピング群を管理
- **AcMapping（値オブジェクト）**: AC ID → テストケースファイルパス・テスト種別のマッピング
- **TestReference（値オブジェクト）**: テストケースのファイルパスとテスト種別（unit/it/scenario）
- **CoverageResult（値オブジェクト）**: AC網羅率の算出結果（マッピング済み数/全AC数/網羅率/未カバーAC一覧）
- **ImpactAnalysisResult（値オブジェクト）**: 指定USに紐づくテストケース一覧
- **MatrixValidationService（ドメインサービス）**: JSONスキーマに基づくmatrixファイルのバリデーション
- **CoverageCalculationService（ドメインサービス）**: AC網羅率の算出・コードカバレッジとの統合レポート生成
- **ImpactAnalysisService（ドメインサービス）**: USからテストケースへの逆引き特定

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: phase-gate失敗時・バリデーションエラー時のエラー出力に使用
- **HarnessConfigV2型**（config-foundationが定義）: カバレッジ閾値（coverageThreshold）の参照

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **RequirementTestMatrix Schema** | 提供 | skill-quality (test-coverage-checker), harness-api | requirement-test-matrix.jsonのJSONスキーマ |
| **traceability-model（@story連携）** | 消費 | traceability-model | @storyメタデータとの整合性検証 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K3.5 | トレーサビリティ | 要件→テスト→コードの双方向トレーサビリティをrequirement-test-matrix.jsonで構造化し、機械的に検証 |
| K4 | テスト品質ルール | AC網羅率をphase-gateで強制し、テストマッピング不完全な状態での実装フェーズ移行を防止 |
| K14 | Phase Dependency | phase-gateバリデータにACマッピング完了チェックを追加し、フェーズ遷移の品質ゲートを強化 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| スキーマ | RequirementTestMatrix JSONスキーマ | skill-quality, harness-api |
| データ | requirement-test-matrix.json | skill-quality (test-coverage-checker, Plan-Checker Loop) |
| ポリシー | AcCoverageGatePolicy（ACマッピング完了判定ロジック） | validator-system（L2 phase-gateバリデータが実行） |
| モジュール | CoverageCalculationService（AC網羅率算出） | harness-api (phasegate:ci-check) |
| CLI | `phasegate:impact-analysis` | 外部利用者、harness-api |

---

## 8. 実装上の制約・注意事項

- **v0との差異**: v0のUS-009（VALIDATION.md自動生成）はv1ストーリーに含まれず意図的に削除。requirement-test-matrix.jsonとtest-coverage-checker統合で代替
- **@storyメタデータとの整合性**: H07-01のAC-5で定義される@storyメタデータ（H03-03）との整合性を、traceability-modelとの連携で保証する。@storyに記載されたUS IDがrequirement-test-matrix.jsonに存在することを検証
- **phase-gateバリデータの拡張**: phase-dependency-modelが定義するphase-gate機構を拡張する形でACマッピングチェックを追加。既存のphase-gate APIを壊さない後方互換拡張とする
- **カバレッジ閾値の参照**: コードカバレッジ閾値はconfig-foundationのPreset定義（standard: 90% / strict: 95%）から取得。ハードコーディング禁止
- **impact-analysisコマンドの所有**: CLIコマンド名`phasegate:impact-analysis`の入出力仕様・終了コードはharness-apiのCLI Command Registryに登録。本Unitは実行ロジックを提供し、harness-apiがCLIエントリポイントを所有
- **JSONスキーマバリデーション**: requirement-test-matrix.jsonのスキーマファイルを定義し、ajv等で機械的にバリデーション。スキーマファイルは本Unit内で管理
