# ドメインモデル: nyquist-validation

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H07-01〜H07-04
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| RequirementTestMatrix | 集約ルート | requirement-test-matrix.jsonのin-memoryモデル。StoryMapping[]を内包 |
| StoryMapping | エンティティ | ストーリーごとのAC→テスト対応表。storyIdで識別 |
| AcMapping | 値オブジェクト | AC ID（`AC-{n}`形式）→ TestReference[]のマッピング |
| TestReference | 値オブジェクト | テストファイルパス + テスト種別（unit\|it\|scenario） |
| CoverageResult | 値オブジェクト | AC網羅率の算出結果（network率 + 未カバーAC一覧） |
| ImpactAnalysisResult | 値オブジェクト | 指定USに紐づくテストケース一覧（直接マッピングのみ v1） |
| AcCoverageGatePolicy | ドメインサービス | ACマッピング完了判定ロジック（validator-systemが実行主体として呼び出す） |
| MatrixValidationService | ドメインサービス | JSONスキーマバリデーション + @storyメタデータ整合性確認 |
| CoverageCalculationService | ドメインサービス | AC網羅率算出 |
| ImpactAnalysisService | ドメインサービス | USからテストケースへの逆引き |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | バリデーションエラー出力に使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | coverageThreshold設定（standard: 90% / strict: 95%）取得 | 読取専用 |
| StoryId | traceability-model | StoryMappingのstoryId識別子として消費（Shared Kernel） | 読取専用 |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| AcCoverageGatePolicy インターフェース | validator-system | ACマッピング完了判定ロジック（L3-004 nyquistバリデータの実行ロジックとして提供） |
| ImpactAnalysisResult Contract | harness-api | `{ storyId, directTests: TestReference[], directMappingOnly: true }` |

---

## 2. Aggregate Boundary

### 結論: RequirementTestMatrixを集約ルートとして採用

横断契約§6の再評価方針に照らして集約採用を決定。

### 集約ルートとする根拠

- **I/O境界**: requirement-test-matrix.jsonファイルというI/O境界を持つ（MatrixFilePort経由）
- **整合性責務**: StoryMapping（エンティティ）を内包し、同一storyIdのStoryMappingが1つのみ存在する整合性を保証する責務がある
- **ライフサイクル**: ストーリー実装のたびにStoryMappingが追加・更新される変更ライフサイクルを持つ
- **整合性境界**: StoryId（Shared Kernel）で識別されるStoryMappingを束ねる整合性境界として機能する

### 集約構造

```
RequirementTestMatrix（集約ルート）
  └── StoryMapping[]（エンティティ, storyIdで識別）
        └── AcMapping[]（VO, acIdで識別: AC-1, AC-2, ...）
              └── TestReference[]（VO）
```

### 集約の不変条件

- **INV-1**: 同一storyIdのStoryMappingは1つのみ存在する
- **INV-2**: AcMapping.acIdは `AC-{n}` 形式（n は1以上の正整数、ゼロパディングなし）
- **INV-3**: TestReference.testTypeは `unit | it | scenario` のいずれか
- **INV-4**: TestReference.filePathは空文字でない

---

## 3. Model Classification

### 集約ルート

| 集約ルート | 識別子 | 不変条件 |
|----------|--------|---------|
| RequirementTestMatrix | — （単一インスタンス） | INV-1〜INV-4 |

### エンティティ

| エンティティ | 識別子 | ライフサイクル |
|------------|--------|--------------|
| StoryMapping | StoryId（Shared Kernel） | ストーリー実装時に追加・AcMappingが更新 |

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| AcMapping | ✓ | ✓ | acId（`AC-{n}`形式）+ testReferences: TestReference[] |
| TestReference | ✓ | ✓ | filePath: string, testType: 'unit'\|'it'\|'scenario' |
| CoverageResult | ✓ | ✓ | coveredAcCount: number, totalAcCount: number, rate: number, uncoveredAcIds: string[] |
| ImpactAnalysisResult | ✓ | ✓ | storyId: StoryId, directTests: TestReference[], directMappingOnly: true |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| AcCoverageGatePolicy | ACマッピング完了判定（全ACがテスト参照を持つかチェック）。validator-systemのL3-004実行ロジックとして公開 | — |
| MatrixValidationService | requirement-test-matrix.jsonのJSONスキーマバリデーション + @storyメタデータとのstoryId整合性確認 | StoryRegistryPort |
| CoverageCalculationService | RequirementTestMatrix内のAC網羅率算出 → CoverageResult生成 | — |
| ImpactAnalysisService | 指定storyIdに直接マッピングされたTestReference[]を逆引き → ImpactAnalysisResult生成 | — |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス |
|---------|------|------------|
| MatrixFilePort | requirement-test-matrix.jsonのファイル読み書き | RequirementTestMatrix.create() ファクトリ入力 |
| StoryRegistryPort | traceability-modelから有効なStoryId一覧を取得 | MatrixValidationService |
| CoverageThresholdPort | HarnessConfigV2からcoverageThreshold設定を取得 | CoverageCalculationService |

---

## 5. Domain Rules and Invariants

### AcCoverageGatePolicyのルール

- 全StoryMappingの全AcMappingに1つ以上のTestReferenceが存在する場合: passed = true
- 1つでもTestReferenceが空のAcMappingが存在する場合: passed = false, 未カバーACのHarnessErrorリストを返す

### CoverageResultの算出ロジック

```
rate = coveredAcCount / totalAcCount
coveredAcCount = AcMappingのうちtestReferences.length > 0のもの数
totalAcCount = 全AcMappingの数（全StoryMappingの集計）
uncoveredAcIds = testReferences.length === 0のAcMappingのacId一覧
```

**注意**: コードカバレッジ閾値（90%/95%）との対比はvalidator-systemのL3-003が担当。本UnitのCoverageResultはAC網羅率のみを扱う。

### ImpactAnalysisServiceのスコープ（v1）

- v1は**直接マッピングのみ**: requirement-test-matrix.jsonに登録されたTestReferenceのみを返す
- 間接影響分析（設計要素の変更波及）はphase2-extensionsのスコープ
- `directMappingOnly: true` フラグで将来の拡張ポイントを明示する

### MatrixValidationServiceの責務範囲

- JSONスキーマバリデーション: 必須フィールド存在・型チェック・AcId形式チェック
- storyId整合性: StoryRegistryPortから取得したStoryId一覧との照合（matrix.json内storyIdが有効かチェック）
- @storyアノテーション整合性はvalidator-systemのL2-002（metadata）バリデータに委ねる（責務分離）

---

## 6. RequirementTestMatrix JSON Schema

```json
{
  "storyMappings": [
    {
      "storyId": "H07-01",
      "acMappings": [
        {
          "acId": "AC-1",
          "testReferences": [
            {
              "filePath": "scripts/harness/__tests__/unit/nyquist-validation/matrix-validation-service.test.ts",
              "testType": "unit"
            }
          ]
        }
      ]
    }
  ]
}
```

### スキーマ不変条件

- `storyId`: HXX-XX形式（traceability-modelのStoryId型と整合）
- `acId`: `AC-{n}` 形式（n は1以上の正整数）
- `testType`: `"unit" | "it" | "scenario"`
- `filePath`: 空文字不可

---

## 7. Data Flow

```
[harness:ci-check / harness:impact-analysis コマンド]
         ↓
MatrixFilePort → requirement-test-matrix.json 読み込み
         ↓
MatrixValidationService.validate()
  → StoryRegistryPort（有効storyId一覧取得）
  → JSONスキーマ + storyId整合性チェック
  → バリデーションエラー → HarnessError[]
         ↓
RequirementTestMatrix.create(validatedData) → 集約インスタンス
         ↓
         ├── [L3-004 nyquistバリデータ用]
         │   AcCoverageGatePolicy.check(matrix) → passed/false + HarnessError[]
         │   → validator-systemのValidatorExecutionServiceが呼び出し
         │
         ├── [harness:ci-check 用]
         │   CoverageCalculationService.calculate(matrix) → CoverageResult
         │   CoverageThresholdPort → threshold設定取得
         │   → harness-apiのci-checkコマンドが出力に使用
         │
         └── [harness:impact-analysis 用]
             ImpactAnalysisService.analyze(matrix, storyId) → ImpactAnalysisResult
             → harness-apiのinfrastructure層アダプターがCLI出力形式に変換
```

---

## 8. 設計判断記録

### D1: RequirementTestMatrixを集約ルートに維持した理由

横断契約§6の集約降格方針を参照しつつも、以下3点からRequirementTestMatrixは集約ルートが適切と判断した。（1）requirement-test-matrix.jsonというI/O境界を持つ（biome-ast-engineのようなステートレス計算処理ではなくファイル永続化を持つ）、（2）StoryMappingエンティティの整合性（同一storyIdの一意性）を保証する責務がある、（3）ストーリー実装ごとに変更ライフサイクルを持つ。

### D2: CoverageResultの責務範囲を絞った理由

当初CoverageResultに「コードカバレッジ閾値との対比」を含めることを検討したが、コードカバレッジ閾値の比較はvalidator-systemのL3-003の責務と判断し分離した。本UnitのCoverageResultはAC網羅率のみを担当する。harness-apiのci-checkコマンドが2つの結果（AC網羅率 + コードカバレッジ）を統合して出力する。

### D3: AcMapping.acIdのフォーマット決定

`AC-{n}` 形式（1始まり、ゼロパディングなし）を採用。`AC-1`〜`AC-N`（Nはストーリーごとの受け入れ基準数）。HXX-XX.AC-Nの複合識別子で一意に特定可能。不変条件として n は1以上の正整数。

### D4: ImpactAnalysisServiceをv1直接マッピング限定にした理由

H07-04のimpact-analysisの「間接影響分析」（依存する設計要素を介したテスト波及）は実装複雑度が高く、v1スコープでは不要。`directMappingOnly: true`フラグで将来の拡張ポイントを明示しつつ、v1はrequirement-test-matrix.jsonに登録された直接マッピングのみを返す設計を採用した。

### D5: @storyアノテーション整合性の責務分離

MatrixValidationServiceの責務範囲をJSONスキーマとstoryId一覧照合に限定し、ファイルシステム上の`@story`アノテーションとの突き合わせはvalidator-systemのL2-002（metadata）バリデータに委ねた。実装複雑度の抑制と責務分離の両立を図る。
