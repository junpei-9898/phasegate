# ユニットテスト設計計画: nyquist-validation

> **作成日**: 2026-03-19
> **対象Unit**: nyquist-validation
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H07-01〜H07-04

---

## 1. スコープ

### 対象Unitのドメインモデル

`docs/product/construction/nyquist-validation/domain_model.md` に記載された以下を対象とする。

- **集約ルート**: RequirementTestMatrix
- **エンティティ**: StoryMapping
- **値オブジェクト**: AcMapping, TestReference, CoverageResult, ImpactAnalysisResult
- **ドメインサービス**: AcCoverageGatePolicy, MatrixValidationService, CoverageCalculationService, ImpactAnalysisService

### テスト対象コンポーネント一覧

| コンポーネント | 分類 | 優先度 |
|-------------|------|--------|
| RequirementTestMatrix | 集約ルート | 高 |
| StoryMapping | エンティティ | 高 |
| AcMapping | 値オブジェクト | 高 |
| TestReference | 値オブジェクト | 高 |
| CoverageResult | 値オブジェクト | 高 |
| ImpactAnalysisResult | 値オブジェクト | 中 |
| AcCoverageGatePolicy | ドメインサービス | 高 |
| CoverageCalculationService | ドメインサービス | 高 |
| ImpactAnalysisService | ドメインサービス | 中 |
| MatrixValidationService | ドメインサービス | 中（StoryRegistryPortをモック） |

---

## 2. テスト対象分析

### 集約

| 集約名 | 不変条件数 | 状態遷移数 | テストケース概算 |
|--------|----------|----------|---------------|
| RequirementTestMatrix | 4（INV-1〜INV-4） | 2（StoryMapping追加・更新） | 15〜20件 |

### エンティティ

| エンティティ名 | ビジネスルール数 | テストケース概算 |
|--------------|---------------|---------------|
| StoryMapping | 1（storyIdで識別・AcMapping[]を管理） | 8〜12件 |

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| AcMapping | 2（acId形式 `AC-{n}`、testReferences配列） | 8〜10件 |
| TestReference | 2（testType列挙、filePath非空） | 8〜10件 |
| CoverageResult | 3（rate算出、coveredAcCount、uncoveredAcIds） | 8〜10件 |
| ImpactAnalysisResult | 2（storyId参照、directMappingOnly固定値） | 5〜7件 |

### ドメインサービス

| サービス名 | ルール数 | テストケース概算 |
|----------|---------|---------------|
| AcCoverageGatePolicy | 2（全AC有テスト参照→passed、未カバーAC存在→false+エラー） | 10〜12件 |
| CoverageCalculationService | 3（rate算出式、coveredAcCount計算、uncoveredAcIds収集） | 8〜10件 |
| ImpactAnalysisService | 2（直接マッピング逆引き、directMappingOnly=true固定） | 8〜10件 |
| MatrixValidationService | 3（JSONスキーマ、acId形式、storyId整合性） | 10〜12件 |

**合計概算**: 90〜115件

---

## 3. テスト方針

### 正常系/異常系のバランス

- **正常系**: 40%（基本的な生成・算出・判定の成功ケース）
- **異常系**: 40%（バリデーションエラー、不変条件違反）
- **境界値**: 20%（0件/1件/複数件、rate=0/rate=1など）

### 境界値テストの対象

| 対象 | 境界値 |
|------|--------|
| AcMapping.acId | `AC-1`（最小値）、`AC-0`（NG）、`AC-10`（複数桁正整数）、ゼロパディング `AC-01`（NG） |
| TestReference.filePath | 空文字（NG）、1文字以上のパス（OK） |
| TestReference.testType | `unit`/`it`/`scenario`（OK）、それ以外（NG） |
| CoverageResult.rate | 0（totalAcCount=0 または 全AC未カバー）、1（全AC網羅）、0.5（半分カバー） |
| RequirementTestMatrix | storyMappings空配列、storyId重複 |
| AcCoverageGatePolicy | 全AC有テスト参照、1件でも未カバー |

### テスト規約の適用

- テストケース名は**日本語**で記述する
- `target` / `describe` / `context` / `it` 構造を使用
- **AAAパターン**（Arrange / Act / Assert）で記述
- 実行結果は `actual` 変数に代入する
- モックは外部依存（StoryRegistryPort, CoverageThresholdPort, MatrixFilePort）のみ使用

---

## 4. QA（不明点・確認事項）

### [Question] Q1: CoverageResult.rate の算出式でtotalAcCount=0の場合の挙動

CoverageResultの算出式 `rate = coveredAcCount / totalAcCount` において、totalAcCount=0の場合にゼロ除算となる。この場合の期待値（0 or NaN or Infinity or エラー）が定義されていない。

**推奨案:** `rate = 0` として定義し、totalAcCount=0の場合は特殊ケースとして0を返す（空のmatrixはカバレッジなし）

[Answer]
（人間が回答を記入）

### [Question] Q2: MatrixValidationServiceにおけるStoryRegistryPortのモック範囲

MatrixValidationServiceのユニットテストではStoryRegistryPort（外部依存）をモックする必要がある。ユニットテスト設計として「存在するstoryId一覧」をモックで返すことを前提とするか。

**推奨案:** ユニットテストではStoryRegistryPortをモックし、返却するstoryId一覧を制御する。integration testでは実アダプターを使用する。

[Answer]
（人間が回答を記入）

---

## 5. 前提条件・リスク

### 前提条件

- `HarnessError`（harness-error Unit）はShared Kernelとして既実装済みであること
- `StoryId`（traceability-model Unit）はShared Kernelとして既実装済みであること
- `HarnessConfigV2`（config-foundation Unit）はShared Kernelとして既実装済みであること
- Wave 1全6 Unitの実装が完了済みであること（Memory参照）

### リスク

| リスク | 影響度 | 対応方針 |
|--------|--------|---------|
| Q1未解決（ゼロ除算）のままテスト設計を進めると実装時に仕様変更が発生しうる | 中 | 推奨案（rate=0）でテストケースを設計し、コメントで注記する |
| MatrixValidationServiceのユニットテストは統合的なロジックを含むため純粋なユニットテストの範囲が曖昧 | 中 | ドメインサービスとしてモック境界を明確化（StoryRegistryPortのみモック） |
| ImpactAnalysisResultの `directMappingOnly: true` は固定値のため、テスト価値が低い可能性 | 低 | 値オブジェクトの等値性・生成テストとして設計し、固定値の確認も含める |
