# ITテスト設計: nyquist-validation

@story-id H07-01
@story-id H07-02
@story-id H07-03
@story-id H07-04
> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-19
> **対応ストーリー**: H07-01, H07-02, H07-03, H07-04
> **参照計画**: `docs/inception/nyquist-validation/it_test_design_plan.md`
> **参照論理設計**: `docs/product/construction/nyquist-validation/logical_design.md`

---

## 1. 対象コンポーネント

- **UseCase**: ValidateMatrixUseCase, CheckAcCoverageGateUseCase, CalculateCoverageUseCase, AnalyzeImpactUseCase
- **Repository（Adapter）**: FileSystemMatrixFileAdapter, TraceabilityModelStoryRegistryAdapter, ConfigFoundationCoverageThresholdAdapter, AjvJsonSchemaValidatorAdapter
- **Controller（Handler）**: ValidateMatrixHandler, CheckAcCoverageGateHandler, CalculateCoverageHandler, AnalyzeImpactHandler

---

## 2. UseCaseテストケース

### ValidateMatrixUseCase（H07-01）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ValidateMatrix-001 | 有効なmatrixファイルパスを渡すと、バリデーションが通過すること | `{ matrixFilePath: "/valid/path.json", failFast: false }` | MatrixFilePort.read → 有効JSONデータ返却。AjvValidator.validate → `{ valid: true, errors: [] }`。MatrixValidationService.validate → `{ passed: true, validatedData: {...} }` | `{ passed: true, errors: [], schemaErrors: [], integrityErrors: [], validatedData: 非null }` |
| IT-UC-ValidateMatrix-002 | failFast=trueでスキーマエラーなしの場合、整合性チェックまで実行されること | `{ matrixFilePath: "/valid/path.json", failFast: true }` | MatrixFilePort.read → 有効データ。AjvValidator → valid。MatrixValidationService.validate → 呼ばれること | `passed: true`、MatrixValidationServiceが1回呼ばれる |
| IT-UC-ValidateMatrix-003 | 全ACにテスト参照があるデータで、integrityErrorsが空配列であること | `{ matrixFilePath: "/full-coverage.json" }` | MatrixFilePort.read → 全ACにtestReferences。AjvValidator → valid。StoryRegistry → 有効storyIds | `{ passed: true, integrityErrors: [] }` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-ValidateMatrix-004 | JSONスキーマバリデーション違反がある場合、schemaErrorsに変換されること | `{ matrixFilePath: "/invalid-schema.json" }` | MatrixFilePort.read → スキーマ不適合JSON。AjvValidator → `{ valid: false, errors: [HarnessError(code:"L3-004")] }` | `{ passed: false, schemaErrors: [HarnessError], integrityErrors: [], validatedData: null }` |
| IT-UC-ValidateMatrix-005 | failFast=trueかつスキーマエラーがある場合、MatrixValidationServiceが呼ばれないこと | `{ matrixFilePath: "/invalid.json", failFast: true }` | AjvValidator → スキーマエラーあり | `passed: false`、MatrixValidationService.validateが呼ばれない（0回） |
| IT-UC-ValidateMatrix-006 | storyId整合性エラーがある場合、integrityErrorsに格納されること | `{ matrixFilePath: "/unknown-story.json" }` | AjvValidator → valid。MatrixValidationService → `{ passed: false, errors: [HarnessError] }` | `{ passed: false, integrityErrors: [HarnessError], schemaErrors: [] }` |
| IT-UC-ValidateMatrix-007 | スキーマエラーと整合性エラーが両方ある場合、errorsに両方が含まれること | `{ matrixFilePath: "/double-error.json" }` | AjvValidator → schemaErrors[1件]。MatrixValidationService → integrityErrors[1件] | `errors.length === 2`、`schemaErrors.length === 1`、`integrityErrors.length === 1` |
| IT-UC-ValidateMatrix-008 | matrixファイルが存在しない場合、I/OエラーがスローされてUseCaseから伝播すること | `{ matrixFilePath: "/not-found.json" }` | MatrixFilePort.read → Errorをthrow | UseCaseからエラーがthrowされる（passed返却なし） |
| IT-UC-ValidateMatrix-009 | StoryRegistryPortがエラーを返した場合、UseCaseからエラーが伝播すること | `{ matrixFilePath: "/valid.json" }` | AjvValidator → valid。MatrixValidationService内でStoryRegistryPort → Errorをthrow | UseCaseからエラーがthrowされる |
| IT-UC-ValidateMatrix-010 | 複数のスキーマエラーがある場合、全件がschemaErrorsに格納されること | `{ matrixFilePath: "/multi-error.json", failFast: false }` | AjvValidator → 3件のHarnessError | `schemaErrors.length === 3` |

---

### CheckAcCoverageGateUseCase（H07-02）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CheckACGate-001 | 全ACにテスト参照があるmatrixの場合、ゲートを通過すること | `{ matrixFilePath: "/full-coverage.json" }` | MatrixFilePort.read → 全AC covered。AjvValidator → valid。MatrixValidationService → passed。AcCoverageGatePolicy.check → `{ passed: true, errors: [] }` | `{ passed: true, errors: [] }` |
| IT-UC-CheckACGate-002 | ゲート通過時、matrixプロパティが非nullで返ること | `{ matrixFilePath: "/full-coverage.json" }` | 全ポート正常 | `output.matrix instanceof RequirementTestMatrix` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-CheckACGate-003 | 未カバーACがある場合、passed=falseとHarnessError[]が返ること | `{ matrixFilePath: "/partial-coverage.json" }` | AcCoverageGatePolicy.check → `{ passed: false, errors: [HarnessError(code:"L3-004")] }` | `{ passed: false, errors: [1件以上のHarnessError] }` |
| IT-UC-CheckACGate-004 | 複数の未カバーACがある場合、各ACに対してHarnessErrorが生成されること | `{ matrixFilePath: "/no-coverage.json" }` | AcCoverageGatePolicy.check → `{ passed: false, errors: [3件のHarnessError] }` | `errors.length === 3` |
| IT-UC-CheckACGate-005 | JSONスキーマ違反のmatrixの場合、passed=falseになること | `{ matrixFilePath: "/invalid-schema.json" }` | AjvValidator → スキーマエラー | `{ passed: false }` |
| IT-UC-CheckACGate-006 | storyId整合性エラーのmatrixの場合、passed=falseになること | `{ matrixFilePath: "/unknown-story.json" }` | MatrixValidationService → passed=false | `{ passed: false }` |
| IT-UC-CheckACGate-007 | matrixファイルが存在しない場合、エラーが伝播すること | `{ matrixFilePath: "/not-found.json" }` | MatrixFilePort.read → Errorをthrow | エラーがthrowされる |
| IT-UC-CheckACGate-008 | RequirementTestMatrix.createで不変条件違反がある場合、エラーが伝播すること | `{ matrixFilePath: "/duplicate-story.json" }` | MatrixFilePort.read → 重複storyId含むデータ。AjvValidator → valid | DuplicateStoryMappingError がthrowされる |

---

### CalculateCoverageUseCase（H07-03）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CalcCoverage-001 | checkThreshold=falseの場合、閾値チェックなしで網羅率が返ること | `{ matrixFilePath: "/partial.json", checkThreshold: false }` | CoverageCalculationService.calculate → CoverageResult（rate=0.75）。CoverageThresholdPort.getThresholdが呼ばれないこと | `{ ratePercent: 75.0, threshold: null, meetsThreshold: null }` |
| IT-UC-CalcCoverage-002 | checkThreshold=trueで閾値を充足する場合、meetsThreshold=trueが返ること | `{ matrixFilePath: "/high-coverage.json", checkThreshold: true }` | CoverageCalculationService.calculate → rate=0.95。CoverageThresholdPort → `{ active: 0.90 }` | `{ meetsThreshold: true, threshold: 0.90 }` |
| IT-UC-CalcCoverage-003 | 全AC網羅済みの場合、ratePercent=100が返ること | `{ matrixFilePath: "/full.json" }` | CoverageCalculationService.calculate → rate=1.0 | `{ ratePercent: 100.0, uncoveredAcIds: [] }` |
| IT-UC-CalcCoverage-004 | totalAcCount=0の場合（空matrix）、rate=1.0として扱われること | `{ matrixFilePath: "/empty.json" }` | MatrixFilePort.read → stories: []。CoverageCalculationService → rate=1.0 | `{ ratePercent: 100.0, coveredAcCount: 0, totalAcCount: 0 }` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-CalcCoverage-005 | checkThreshold=trueで閾値未達の場合、meetsThreshold=falseが返ること | `{ matrixFilePath: "/low-coverage.json", checkThreshold: true }` | CoverageCalculationService → rate=0.60。CoverageThresholdPort → `{ active: 0.90 }` | `{ meetsThreshold: false, threshold: 0.90 }` |
| IT-UC-CalcCoverage-006 | CoverageThresholdPortがエラーを返した場合、エラーが伝播すること | `{ matrixFilePath: "/valid.json", checkThreshold: true }` | CoverageThresholdPort → Errorをthrow | エラーがthrowされる |
| IT-UC-CalcCoverage-007 | uncoveredAcIdsが正しく列挙されること | `{ matrixFilePath: "/partial.json" }` | CoverageCalculationService → uncoveredAcIds: ["H01-01.AC-2", "H01-02.AC-1"] | `output.uncoveredAcIds` に両IDが含まれる |
| IT-UC-CalcCoverage-008 | ratePercentが小数点以下2桁で返ること | `{ matrixFilePath: "/partial.json" }` | CoverageCalculationService → rate=0.6667 | `ratePercent === 66.67` |

---

### AnalyzeImpactUseCase（H07-04）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-AnalyzeImpact-001 | 存在するstoryIdを渡すと、直接マッピングされたテスト参照が返ること | `{ matrixFilePath: "/valid.json", storyId: "H07-01" }` | ImpactAnalysisService.analyze → directTests: [TestRef1, TestRef2] | `{ found: true, directTests: [2件], directMappingOnly: true }` |
| IT-UC-AnalyzeImpact-002 | directMappingOnlyが常にtrueであること | `{ matrixFilePath: "/valid.json", storyId: "H07-01" }` | 正常フロー | `output.directMappingOnly === true` |
| IT-UC-AnalyzeImpact-003 | storyIdがmatrixに存在しない場合、found=falseで空のdirectTestsが返ること | `{ matrixFilePath: "/valid.json", storyId: "H99-99" }` | ImpactAnalysisService.analyze → directTests: [] | `{ found: false, directTests: [] }` |
| IT-UC-AnalyzeImpact-004 | 重複するテスト参照が除去されて返ること | `{ matrixFilePath: "/duplicate-refs.json", storyId: "H07-01" }` | ImpactAnalysisService.analyze → 重複除去済みdirectTests | `directTests`内に重複なし |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-AnalyzeImpact-005 | storyId書式が不正な場合（HXX-XX形式でない）、エラーがthrowされること | `{ matrixFilePath: "/valid.json", storyId: "invalid-id" }` | StoryId.create → フォーマット違反エラー | エラーがthrowされる |
| IT-UC-AnalyzeImpact-006 | matrixファイルが存在しない場合、エラーが伝播すること | `{ matrixFilePath: "/not-found.json", storyId: "H07-01" }` | MatrixFilePort.read → Errorをthrow | エラーがthrowされる |
| IT-UC-AnalyzeImpact-007 | JSONスキーマ違反のmatrixの場合、エラーが伝播すること | `{ matrixFilePath: "/invalid.json", storyId: "H07-01" }` | AjvValidator → スキーマエラー → エラーthrow | エラーがthrowされる |

---

## 3. Repositoryテストケース（Adapterテスト）

### FileSystemMatrixFileAdapter

#### CRUDテスト（read/write操作）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-FileAdapter-001 | read | 有効なJSONファイルパス | 有効なrequirement-test-matrix.json | JSONパース済みのオブジェクトが返る |
| IT-REPO-FileAdapter-002 | read | 存在しないファイルパス | ファイルなし | エラーがthrowされる（ENOENT相当） |
| IT-REPO-FileAdapter-003 | read | 壊れたJSON（構文エラー）のファイルパス | 不正JSON文字列のファイル | MatrixValidationFailedErrorがthrowされる |
| IT-REPO-FileAdapter-004 | read | 空ファイルパス | 空ファイル | MatrixValidationFailedErrorがthrowされる |
| IT-REPO-FileAdapter-005 | write | 有効なファイルパスとValidatedMatrixData | 書き込み先ディレクトリ存在 | ファイルがJSON.stringify(data, null, 2)形式で書き込まれる |
| IT-REPO-FileAdapter-006 | write | 書き込み権限なしのファイルパス | 権限なしのパス | エラーがthrowされる |
| IT-REPO-FileAdapter-007 | read（相対パス） | 相対パス文字列 | — | アダプタが絶対パスを要求するため、呼び出し側の責務として動作（相対パスの場合の挙動を明示） |
| IT-REPO-FileAdapter-008 | read/write往復 | 有効なValidatedMatrixData | — | write後にreadすると同一データが返ること |

#### トランザクションテスト

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-REPO-FileAdapter-TX-001 | writeが途中でエラーになった場合、元ファイルが残ること | 元ファイルが破壊されないこと（アトミック書き込み相当） |

---

### TraceabilityModelStoryRegistryAdapter

#### CRUDテスト

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-StoryRegistry-001 | getValidStoryIds | なし（正常系） | traceability-modelが有効storyIds一覧を返す | `readonly StoryId[]`が返る（HXX-XX形式） |
| IT-REPO-StoryRegistry-002 | getValidStoryIds（空） | なし | storyIdが0件 | 空配列`[]`が返る |
| IT-REPO-StoryRegistry-003 | getValidStoryIds（エラー） | なし | traceability-model呼び出しが失敗 | エラーがthrowされる |
| IT-REPO-StoryRegistry-004 | getValidStoryIds（フォールバック） | なし | traceability-model未実装でuser_stories.md存在 | user_stories.mdパース結果がStoryId[]で返る |

---

### ConfigFoundationCoverageThresholdAdapter

#### CRUDテスト

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Threshold-001 | getThreshold | なし（preset: standard） | `HarnessConfigV2 { project.preset: "standard" }` | `{ standard: 0.90, strict: 0.95, active: 0.90 }` |
| IT-REPO-Threshold-002 | getThreshold | なし（preset: strict） | `HarnessConfigV2 { project.preset: "strict" }` | `{ standard: 0.90, strict: 0.95, active: 0.95 }` |
| IT-REPO-Threshold-003 | getThreshold | なし（preset: minimal） | `HarnessConfigV2 { project.preset: "minimal" }` | `{ standard: 0.90, strict: 0.95, active: 0.80 }` |
| IT-REPO-Threshold-004 | getThreshold（設定読み込み失敗） | なし | config-foundation読み込みが失敗 | デフォルト値`{ active: 0.90 }`にフォールバック |
| IT-REPO-Threshold-005 | getThreshold（未知のpreset） | なし | `HarnessConfigV2 { project.preset: "unknown" }` | デフォルト値`{ active: 0.90 }`にフォールバック |

---

### AjvJsonSchemaValidatorAdapter

#### バリデーションテスト

| ケースID | 操作 | 入力 | 期待結果 |
|---------|------|------|---------|
| IT-REPO-AjvValidator-001 | validate | 完全に有効なrequirement-test-matrix.json相当オブジェクト | `{ valid: true, errors: [] }` |
| IT-REPO-AjvValidator-002 | validate | `stories`フィールドが欠損したオブジェクト | `{ valid: false, errors: [HarnessError(code:"L3-004")] }` |
| IT-REPO-AjvValidator-003 | validate | `storyId`が不正形式（HXX-XX形式でない） | `valid: false`、errorsにpatternエラー含む |
| IT-REPO-AjvValidator-004 | validate | `testType`が"unit"/"it"/"scenario"以外 | `valid: false`、errorsにenumエラー含む |
| IT-REPO-AjvValidator-005 | validate | `filePath`が空文字 | `valid: false`、errorsにminLengthまたはpatternエラー含む |
| IT-REPO-AjvValidator-006 | validate | `acId`が`AC-0`（ゼロパディング） | `valid: false`、errorsにpatternエラー含む |
| IT-REPO-AjvValidator-007 | validate | 複数フィールドが同時に不正 | `allErrors: true`設定により、全エラーが一括でerrorsに格納される |
| IT-REPO-AjvValidator-008 | validate | `null`またはプリミティブ型 | `valid: false`、errorsにtypeエラー含む |

---

## 4. Controller/APIテストケース（Handlerテスト）

### ValidateMatrixHandler（H07-01）

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-ValidateHandler-001 | `--matrix-file /valid.json` | stdout にバリデーション成功メッセージ、終了コード 0 |
| IT-API-ValidateHandler-002 | `--matrix-file /valid.json --format json` | stdout に JSON形式の ValidateMatrixOutput、終了コード 0 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-ValidateHandler-003 | `--matrix-file /invalid-schema.json` | stdout にエラー一覧表示、終了コード 1 |
| IT-API-ValidateHandler-004 | `--matrix-file /invalid.json --fail-fast` | 最初のエラーで打ち切られ、termination code 1 |
| IT-API-ValidateHandler-005 | `--matrix-file /not-found.json` | stderr にI/Oエラー表示、終了コード 2 |
| IT-API-ValidateHandler-006 | `--matrix-file` 引数なし | 引数不足エラー、終了コード 2 |

---

### CheckAcCoverageGateHandler（H07-02）

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-CheckACGateHandler-001 | `--matrix-file /full-coverage.json` | stdout に `{ status: "pass" }` 相当のJSON、終了コード 0 |
| IT-API-CheckACGateHandler-002 | `--matrix-file /full.json --format json` | stdout に HarnessApiResponseエンベロープJSONで `status: "pass"`、終了コード 0 |

#### 異常系

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-CheckACGateHandler-003 | `--matrix-file /partial-coverage.json` | HarnessApiResponseで `status: "fail"`、errors に未カバーAC一覧、終了コード 1 |
| IT-API-CheckACGateHandler-004 | `--matrix-file /not-found.json` | 実行エラー表示、終了コード 2 |
| IT-API-CheckACGateHandler-005 | `--matrix-file /invalid-schema.json` | スキーマエラー表示、終了コード 1 |

---

### CalculateCoverageHandler（H07-03）

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-CalcCoverageHandler-001 | `--matrix-file /partial.json` | stdout に網羅率（例: "75.00%"）、終了コード 0 |
| IT-API-CalcCoverageHandler-002 | `--matrix-file /full.json --check-threshold` | 閾値充足、終了コード 0 |
| IT-API-CalcCoverageHandler-003 | `--matrix-file /partial.json --format json` | stdout にCalculateCoverageOutput JSON、終了コード 0 |

#### 異常系

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-CalcCoverageHandler-004 | `--matrix-file /low-coverage.json --check-threshold` | 閾値未達メッセージ、終了コード 1 |
| IT-API-CalcCoverageHandler-005 | `--matrix-file /not-found.json` | I/Oエラー表示、終了コード 2 |
| IT-API-CalcCoverageHandler-006 | `--matrix-file /invalid-schema.json --check-threshold` | スキーマエラー表示、終了コード 2 |

---

### AnalyzeImpactHandler（H07-04）

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-AnalyzeImpactHandler-001 | `--matrix-file /valid.json --story-id H07-01` | stdout にテスト参照一覧、終了コード 0 |
| IT-API-AnalyzeImpactHandler-002 | `--matrix-file /valid.json --story-id H07-01 --format json` | stdout に AnalyzeImpactOutput JSON（found: true）、終了コード 0 |
| IT-API-AnalyzeImpactHandler-003 | `--matrix-file /valid.json --story-id H99-99`（存在しないstoryId） | 空のdirectTests表示（"テスト参照なし"相当）、終了コード 1 |

#### 異常系

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-AnalyzeImpactHandler-004 | `--story-id invalid-format` | storyId書式エラー表示、終了コード 2 |
| IT-API-AnalyzeImpactHandler-005 | `--matrix-file /not-found.json --story-id H07-01` | I/Oエラー表示、終了コード 2 |
| IT-API-AnalyzeImpactHandler-006 | `--story-id` 引数なし | 引数不足エラー、終了コード 2 |

---

## 5. シードデータ要件

| データセット | ファイル名（fixtures） | 用途 | 内容 |
|------------|----------------------|------|------|
| 有効・全AC網羅済みmatrix | `valid-full-coverage.json` | 正常系全般 | stories: H07-01〜H07-04。各ACにtestReferences 1件以上 |
| 有効・部分カバーmatrix（75%） | `valid-partial-coverage.json` | 網羅率算出テスト | 4AC中3ACにtestReferences。1AC未カバー |
| 有効・全未カバーmatrix | `valid-no-coverage.json` | AC未カバーエラーテスト | 全ACにtestReferences空 |
| 空storiesmatrix | `valid-empty-stories.json` | totalAcCount=0テスト | `stories: []` |
| JSONスキーマ違反matrix（requiredフィールド欠損） | `invalid-missing-required.json` | スキーマバリデーションエラーテスト | `acId`フィールド欠損のstoryMappings |
| JSONスキーマ違反matrix（testType不正） | `invalid-wrong-testtype.json` | enumエラーテスト | testType: "e2e"（許容外） |
| JSONスキーマ違反matrix（acId形式違反） | `invalid-acid-format.json` | patternエラーテスト | acId: "AC-0", "AC-01" |
| 整合性違反matrix（未知storyId） | `invalid-unknown-storyid.json` | storyId整合性エラーテスト | storyId: "H99-99"（registry未登録） |
| 重複storyId matrix | `invalid-duplicate-storyid.json` | DuplicateStoryMappingErrorテスト | 同一storyIdが2件 |
| 重複testReference matrix | `valid-duplicate-testrefs.json` | 重複除去テスト | 同一filePathのTestReferenceが複数AC |
| 有効・複数ACのmatrix（storyId: H07-01） | `valid-impact-analysis.json` | impactAnalysisテスト | H07-01に3つのAC、各ACに複数のTestReference |

**fixtures配置先**: `scripts/harness/__tests__/integration/nyquist-validation/fixtures/`

---

## 6. テスト環境設定

### テストフレームワーク

- Vitest 3.0.0（integration_contract.md §1 規定）
- テストファイル配置: `scripts/harness/__tests__/integration/nyquist-validation/`
  - `usecase/validate-matrix-usecase.it.test.ts`
  - `usecase/check-ac-coverage-gate-usecase.it.test.ts`
  - `usecase/calculate-coverage-usecase.it.test.ts`
  - `usecase/analyze-impact-usecase.it.test.ts`
  - `adapter/file-system-matrix-file-adapter.it.test.ts`
  - `adapter/traceability-model-story-registry-adapter.it.test.ts`
  - `adapter/config-foundation-coverage-threshold-adapter.it.test.ts`
  - `adapter/ajv-json-schema-validator-adapter.it.test.ts`
  - `handler/validate-matrix-handler.it.test.ts`
  - `handler/check-ac-coverage-gate-handler.it.test.ts`
  - `handler/calculate-coverage-handler.it.test.ts`
  - `handler/analyze-impact-handler.it.test.ts`

### モック設定

| 対象 | モック方法 | 備考 |
|------|-----------|------|
| MatrixFilePort（UseCaseテスト） | `vi.fn()`でインターフェースをスタブ化 | I/O排除 |
| StoryRegistryPort（UseCaseテスト） | `vi.fn()`でスタブ化 | traceability-model依存排除 |
| CoverageThresholdPort（UseCaseテスト） | `vi.fn()`でスタブ化 | config-foundation依存排除 |
| AjvJsonSchemaValidatorAdapter（UseCaseテスト） | `vi.fn()`でスタブ化 | スキーマファイルI/O排除 |
| node:fs/promises（Adapterテスト） | `vi.mock("node:fs/promises")`でモジュールモック | 実ファイルシステム操作排除 |
| traceability-model共有カーネル（Adapterテスト） | `vi.mock()`でスタブ化 | Wave 1 Unit依存排除 |
| config-foundation共有カーネル（Adapterテスト） | `vi.mock()`でスタブ化 | Wave 1 Unit依存排除 |
| ValidateMatrixUseCase（Handlerテスト） | `vi.fn()`でexecuteをスタブ化 | ビジネスロジック排除 |
| CheckAcCoverageGateUseCase（Handlerテスト） | `vi.fn()`でexecuteをスタブ化 | 同上 |
| CalculateCoverageUseCase（Handlerテスト） | `vi.fn()`でexecuteをスタブ化 | 同上 |
| AnalyzeImpactUseCase（Handlerテスト） | `vi.fn()`でexecuteをスタブ化 | 同上 |

### テストヘルパー

- `scripts/harness/__tests__/helpers/test-helpers.ts`のtarget/contextエイリアスを使用
- テストケース名は全て日本語で記述（testing-rules.md 規約準拠）
- AAAパターンで記述（Arrange / Act / Assert コメントを付与）
- 実行結果は`actual`変数に代入する（`result`不可）

### 認証設定

- 不要（本Unitは認証・認可機構なし）

### @storyアノテーション

全テストファイルの先頭に対応ストーリーのアノテーションを付与する（integration_contract.md §2.1 規定）：
- `validate-matrix-*.test.ts` → `// @story H07-01`
- `check-ac-coverage-gate-*.test.ts` → `// @story H07-02`
- `calculate-coverage-*.test.ts` → `// @story H07-03`
- `analyze-impact-*.test.ts` → `// @story H07-04`
- `file-system-matrix-file-adapter.it.test.ts` → `// @story H07-01`
- `ajv-json-schema-validator-adapter.it.test.ts` → `// @story H07-01`
- `traceability-model-story-registry-adapter.it.test.ts` → `// @story H07-01`
- `config-foundation-coverage-threshold-adapter.it.test.ts` → `// @story H07-03`
