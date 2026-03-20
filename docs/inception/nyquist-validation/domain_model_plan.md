# ドメインモデル設計計画: nyquist-validation

> **作成日**: 2026-03-17
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: nyquist-validation（H-07 Nyquist検証層）
> **担当ストーリー**: H07-01〜H07-04

---

## 1. スコープ

- **対象Unit**: nyquist-validation
- **担当ストーリー**:
  - H07-01: requirement-test-matrix.json新設
  - H07-02: phase-gate ACマッピング完了チェック追加
  - H07-03: test-coverage-checkerでの要件カバレッジ算出
  - H07-04: harness:impact-analysis HXX-XXコマンド
- **他Unitとの境界**:
  - traceability-model: `@story HXX-XX`メタデータとの整合性検証（StoryId値オブジェクト消費）
  - validator-system: `AcCoverageGatePolicy`を本Unitが定義し、validator-systemが実行主体として呼び出す
  - harness-api: `harness:impact-analysis`CLIのエントリポイントはharness-apiが所有。本Unitは実行ロジックを提供
  - harness-error: バリデーションエラー出力にHarnessError型を使用
  - config-foundation: `coverageThreshold`（standard: 90% / strict: 95%）をHarnessConfigV2から取得

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| RequirementTestMatrix | H07-01〜H07-04 | **集約ルート**（後述参照） |
| StoryMapping | H07-01〜H07-04 | **エンティティ**（RequirementTestMatrix集約内） |
| AcMapping | H07-01, H07-02 | 値オブジェクト（AC ID → TestReference[]のマッピング） |
| TestReference | H07-01〜H07-04 | 値オブジェクト（ファイルパス + テスト種別） |
| CoverageResult | H07-03 | 値オブジェクト（AC網羅率の算出結果） |
| ImpactAnalysisResult | H07-04 | 値オブジェクト（指定USに紐づくテストケース一覧） |
| AcCoverageGatePolicy | H07-02 | ドメインサービス（ACマッピング完了判定ロジック） |
| MatrixValidationService | H07-01 | ドメインサービス（JSONスキーマバリデーション） |
| CoverageCalculationService | H07-03 | ドメインサービス（AC網羅率算出） |
| ImpactAnalysisService | H07-04 | ドメインサービス（USからテストケースへの逆引き） |

### RequirementTestMatrixを集約ルートとする根拠

横断契約§6の再評価方針に照らして検討する。

**集約ルートである根拠**:
- requirement-test-matrix.jsonファイルというI/O境界を持つ
- StoryMapping（エンティティ）を内包し、その整合性を保証する責務がある
- ストーリー実装のたびにマッピングが追加・更新される（ライフサイクルを持つ）
- StoryId（traceability-model所有のShared Kernel）で識別されるStoryMappingを束ねる整合性境界として機能する

**集約ルートの範囲**:
- `RequirementTestMatrix`（集約ルート）
  - `StoryMapping[]`（エンティティ）— storyIdで識別
    - `AcMapping[]`（VO）— acIdで識別
      - `TestReference[]`（VO）— ファイルパス + テスト種別

### StoryMappingをエンティティとする根拠

- storyId（HXX-XX形式）で識別される
- ストーリー実装完了に伴い、AcMappingが追加される変更ライフサイクルを持つ
- 同一storyIdのStoryMappingは1つしか存在しない（RequirementTestMatrix内での一意性制約）

---

## 3. 設計方針

### 3.1 RequirementTestMatrix集約の責務

- requirement-test-matrix.jsonの読み込み・バリデーション・照会を統括する集約ルート
- 不変条件: 同一storyIdのStoryMappingは1つのみ存在する
- 不変条件: TestReferenceのテスト種別は`unit | it | scenario`のいずれか
- 不変条件: AcMappingのacIdは`AC-{n}`形式

### 3.2 AcCoverageGatePolicyの分離

`AcCoverageGatePolicy`はドメインサービスとして定義し、validator-systemが実行主体となる。本Unitがポリシーの計算ロジックを所有し、validator-systemがそれを呼び出す設計を維持する。これによりphase-gateバリデータ（L2-001）の実行をvalidator-systemに一元化しつつ、Nyquistドメインのルールを本Unitに閉じ込める。

### 3.3 CoverageResultの2軸構造

`CoverageResult`は以下の2軸を持つ複合VOとして定義する：
- **AC網羅率**: マッピング済みAC数/全AC数 + 未カバーAC一覧
- **コードカバレッジ閾値**: HarnessConfigV2から取得した閾値との対比（coverageThreshold: standard=90%, strict=95%）

2軸を単一のCoverageResultにまとめることで、harness:ci-checkコマンドの出力に統一されたカバレッジ情報を提供する。

### 3.4 ImpactAnalysisResultとharness-apiの境界

`ImpactAnalysisResult`はドメイン層のVOとして定義する。harness-apiのCLI出力（HarnessApiResponse.data）への変換はinfrastructure層のアダプターが担当する。本Unitはドメインロジック（どのテストが影響を受けるか）のみを持つ。

### 3.5 @storyメタデータとの整合性

H07-01 AC-5に定義される`@story`メタデータ（traceability-model所有）との整合性検証を`MatrixValidationService`が担当する。`@story HXX-XX`に記載されたstoryIdがRequirementTestMatrix内に存在することをValidationServiceが確認する。StoryId型はShared Kernel（traceability-model所有）を消費する。

---

## 4. QA（設計判断の根拠）

### Q1: RequirementTestMatrixのI/O管理をどこに置くか

**質問**: requirement-test-matrix.jsonのファイル読み書きはドメイン層か、インフラ層か？

**決定**: ファイルI/Oはインフラ層の`MatrixFilePort`が担当する。ドメイン層は`RequirementTestMatrix.create(data)`というファクトリメソッドでin-memoryオブジェクトを構築する。ファイルパスや読み込み実装の詳細はドメインに持ち込まない。

### Q2: CoverageResultにコードカバレッジを含めることの妥当性

**質問**: コードカバレッジ閾値の比較はvalidator-systemのL3-003（coverage）の責務ではないか？本Unitに含めると責務が重複しないか？

**決定**: 責務を分離する。本Unitの`CoverageResult`は**AC網羅率のみ**を担当する。コードカバレッジ閾値との対比はvalidator-systemのL3-003が担当する。`CoverageCalculationService`はAC網羅率の算出のみを行い、harness-apiのci-checkコマンドが2つの結果を統合して出力する。

### Q3: AcMappingのacIdの正規形式は何か

**質問**: acIdのフォーマット（`AC-1`、`AC-01`等）はどの形式を採用するか？HXX-XXストーリー体系との整合性は？

**決定**: `AC-{n}`形式（1始まり、ゼロパディングなし）を採用する。`AC-1`〜`AC-N`（Nはストーリーごとの受け入れ基準数）。HXX-XX.AC-Nの複合識別子で一意に特定できる。不変条件としてacIdは1以上の正整数であることを検証する。

### Q4: ImpactAnalysisServiceのスコープ — 直接テストのみか、間接テストも含めるか

**質問**: H07-04のimpact-analysisは「指定USに紐づくテストケース」を返すが、USに直接マッピングされたテストのみか、依存する設計要素を介した間接テストも含めるか？

**決定**: v1スコープはrequirement-test-matrix.jsonに登録された**直接マッピングのみ**とする。間接影響分析（設計要素の変更波及）はphase2-extensionsのスコープとして将来検討。ImpactAnalysisResultには「直接マッピング」の明示フラグを含め、将来の拡張ポイントを示す。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 |
|--------|------|------|
| MatrixFilePort | 外部→ドメイン | requirement-test-matrix.jsonのファイル読み書き |
| StoryRegistryPort | 外部→ドメイン | traceability-modelから有効なStoryId一覧を取得 |
| CoverageThresholdPort | 外部→ドメイン | HarnessConfigV2からcoverageThreshold設定を取得 |

---

## 6. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: traceability-model | StoryId VO（Shared Kernel）の確定が前提。Wave 1で実装済み |
| 依存: config-foundation | HarnessConfigV2のcoverageThreshold設定が前提。Wave 1で実装済み |
| 依存: harness-error | HarnessError型の確定が前提。Wave 1で実装済み |
| リスク: @storyメタデータ整合性の検証実装 | requirement-test-matrix.jsonとファイルシステム上の@storyアノテーションを突き合わせる実装は複雑になりうる。MatrixValidationServiceの責務範囲をスキーマバリデーションに限定し、@story整合性はvalidator-systemのL2 metadataバリデータに委ねることも検討 |
| リスク: matrix.jsonの更新頻度 | ストーリー実装のたびにmatrix.jsonを更新する運用負荷が発生する。skill-qualityの設計時にcascade-updater連携を考慮する |

---

## 7. 承認

- [ ] 人間承認済み（Phase 2着手許可）
