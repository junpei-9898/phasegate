# ユニットテスト設計: nyquist-validation

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H07-01〜H07-04
> **インプット**: `domain_model.md`, `logical_design.md`, `docs/principles/testing-rules.md`

---

## 1. 対象ドメインモデル

- **集約**: RequirementTestMatrix
- **エンティティ**: StoryMapping
- **値オブジェクト**: AcMapping, TestReference, CoverageResult, ImpactAnalysisResult
- **ドメインサービス**: AcCoverageGatePolicy, MatrixValidationService, CoverageCalculationService, ImpactAnalysisService

### テスト規約サマリー（`docs/principles/testing-rules.md` 準拠）

- テストケース名は**日本語**で記述する
- `target` / `describe` / `context` / `it` 構造を使用する
- **AAAパターン**（Arrange / Act / Assert）で記述する
- 実行結果は `actual` 変数に代入する
- モックは外部依存（StoryRegistryPort, CoverageThresholdPort, MatrixFilePort）のみ使用する

---

## 2. 集約テストケース

### RequirementTestMatrix

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RTM-001 | 有効なstoryMappings（1件、acMappings 1件、testReferences 1件） | RequirementTestMatrixインスタンスが生成される |
| UT-RTM-002 | storyMappings が空配列 | RequirementTestMatrixインスタンスが生成される（totalAcCount=0） |
| UT-RTM-003 | storyMappings が複数件（異なるstoryId） | 全StoryMappingを内包したインスタンスが生成される |
| UT-RTM-004 | storyMappings 内にacMappingsが空配列のStoryMapping | インスタンスが生成される（そのStoryMappingのAC数=0） |
| UT-RTM-005 | testReferences が空配列のacMapping（未カバー状態） | インスタンスが生成される（未カバーACとして保持） |

#### 不変条件テスト（INV-1: storyId重複禁止）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RTM-006 | INV-1: 同一storyIdのStoryMappingは1つのみ | storyId「H07-01」が2件含まれるstoryMappings | DuplicateStoryMappingErrorがthrowされる |
| UT-RTM-007 | INV-1: 複数storyIdが異なる | storyId「H07-01」と「H07-02」が1件ずつ | 正常にインスタンスが生成される |

#### 不変条件テスト（INV-2: acId形式）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RTM-008 | INV-2: acIdが `AC-0` | acId = `AC-0` のacMapping | InvalidAcIdFormatErrorがthrowされる |
| UT-RTM-009 | INV-2: acIdが `AC-01`（ゼロパディング） | acId = `AC-01` のacMapping | InvalidAcIdFormatErrorがthrowされる |
| UT-RTM-010 | INV-2: acIdが `AC-1`（最小正整数） | acId = `AC-1` のacMapping | 正常にインスタンスが生成される |
| UT-RTM-011 | INV-2: acIdが `AC-10`（複数桁正整数） | acId = `AC-10` のacMapping | 正常にインスタンスが生成される |
| UT-RTM-012 | INV-2: acIdが `AC-` | acId = `AC-` のacMapping | InvalidAcIdFormatErrorがthrowされる |

#### 不変条件テスト（INV-3: testType列挙）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RTM-013 | INV-3: testTypeが `unit` | testType = `unit` | 正常にインスタンスが生成される |
| UT-RTM-014 | INV-3: testTypeが `it` | testType = `it` | 正常にインスタンスが生成される |
| UT-RTM-015 | INV-3: testTypeが `scenario` | testType = `scenario` | 正常にインスタンスが生成される |
| UT-RTM-016 | INV-3: testTypeが `e2e` | testType = `e2e` | InvalidTestTypeErrorがthrowされる |
| UT-RTM-017 | INV-3: testTypeが空文字 | testType = `""` | InvalidTestTypeErrorがthrowされる |

#### 不変条件テスト（INV-4: filePath非空）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RTM-018 | INV-4: filePathが空文字 | filePath = `""` | EmptyFilePathErrorがthrowされる |
| UT-RTM-019 | INV-4: filePathがスペースのみ | filePath = `"   "` | EmptyFilePathErrorがthrowされる |
| UT-RTM-020 | INV-4: filePathが有効なパス | filePath = `"scripts/harness/__tests__/unit/foo.test.ts"` | 正常にインスタンスが生成される |

#### 状態遷移テスト

| ケースID | 初期状態 | 操作 | 期待状態 |
|---------|---------|------|---------|
| UT-RTM-021 | storyMappings 2件（H07-01, H07-02） | `findStoryMapping("H07-01")` | H07-01のStoryMappingが返される |
| UT-RTM-022 | storyMappings 1件（H07-01） | `findStoryMapping("H07-99")` | null が返される |
| UT-RTM-023 | storyMappings 2件（各2つのacMapping） | `totalAcCount()` | 4 が返される |
| UT-RTM-024 | storyMappings 2件（カバー済み2件・未カバー1件） | `coveredAcCount()` | 2 が返される |
| UT-RTM-025 | storyMappings 空配列 | `totalAcCount()` | 0 が返される |
| UT-RTM-026 | storyMappings 空配列 | `coveredAcCount()` | 0 が返される |
| UT-RTM-027 | storyMappings 1件（H07-01, H07-02） | `getAllStoryMappings()` | storyId昇順のreadonly配列が返される |

---

## 3. エンティティテストケース

### StoryMapping

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SM-001 | 有効なstoryId（H07-01）とacMappings 1件 | StoryMappingインスタンスが生成される |
| UT-SM-002 | acMappings が空配列 | StoryMappingインスタンスが生成される（AC数=0） |
| UT-SM-003 | acMappings に不正なacId（`AC-0`） | InvalidAcIdFormatErrorがthrowされる |
| UT-SM-004 | acMappings 内のTestReferenceに不正なtestType | InvalidTestTypeErrorがthrowされる |
| UT-SM-005 | acMappings 内のTestReferenceに空のfilePath | EmptyFilePathErrorがthrowされる |

#### ビジネスルールテスト

| ケースID | ルール | 入力 | 期待結果 |
|---------|-------|------|---------|
| UT-SM-006 | storyIdで識別される | 2つのStoryMapping（同一storyId） | `equals()` が true を返す |
| UT-SM-007 | storyIdで識別される | 2つのStoryMapping（異なるstoryId） | `equals()` が false を返す |

#### 振る舞いテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-SM-008 | `findAcMapping` | 存在するacId（`AC-1`） | 対応するAcMappingが返される |
| UT-SM-009 | `findAcMapping` | 存在しないacId（`AC-99`） | null が返される |
| UT-SM-010 | `uncoveredAcIds` | テスト参照なしのacMapping 2件、あり1件 | 未カバーの2件のacIdが返される |
| UT-SM-011 | `uncoveredAcIds` | 全acMappingにテスト参照あり | 空配列が返される |
| UT-SM-012 | `uncoveredAcIds` | acMappings が空配列 | 空配列が返される |

---

## 4. 値オブジェクトテストケース

### AcMapping

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ACM-001 | acId = `AC-1`、testReferences 1件 | AcMappingインスタンスが生成される |
| UT-ACM-002 | acId = `AC-1`、testReferences 空配列 | AcMappingインスタンスが生成される（未カバー状態） |
| UT-ACM-003 | acId = `AC-100`（3桁正整数） | AcMappingインスタンスが生成される |

#### 制約テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ACM-004 | acId = `AC-0`（ゼロ） | InvalidAcIdFormatErrorがthrowされる |
| UT-ACM-005 | acId = `AC-01`（ゼロパディング） | InvalidAcIdFormatErrorがthrowされる |
| UT-ACM-006 | acId = `ac-1`（小文字） | InvalidAcIdFormatErrorがthrowされる |
| UT-ACM-007 | acId = `AC1`（ハイフンなし） | InvalidAcIdFormatErrorがthrowされる |
| UT-ACM-008 | acId = `AC-`（数字なし） | InvalidAcIdFormatErrorがthrowされる |
| UT-ACM-009 | acId = `AC--1`（負数） | InvalidAcIdFormatErrorがthrowされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-ACM-010 | 同一acId・同一testReferences | `equals()` が true を返す |
| UT-ACM-011 | 異なるacId | `equals()` が false を返す |
| UT-ACM-012 | 同一acId・異なるtestReferences | `equals()` が false を返す |

#### 振る舞いテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-ACM-013 | `isCovered` | testReferences 1件あり | true が返される |
| UT-ACM-014 | `isCovered` | testReferences 空配列 | false が返される |

---

### TestReference

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-TR-001 | filePath = `"scripts/foo.test.ts"`、testType = `"unit"` | TestReferenceインスタンスが生成される |
| UT-TR-002 | testType = `"it"` | TestReferenceインスタンスが生成される |
| UT-TR-003 | testType = `"scenario"` | TestReferenceインスタンスが生成される |

#### 制約テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-TR-004 | filePath = `""`（空文字） | EmptyFilePathErrorがthrowされる |
| UT-TR-005 | filePath = `"  "`（スペースのみ） | EmptyFilePathErrorがthrowされる |
| UT-TR-006 | testType = `"e2e"` | InvalidTestTypeErrorがthrowされる |
| UT-TR-007 | testType = `"Unit"`（大文字） | InvalidTestTypeErrorがthrowされる |
| UT-TR-008 | testType = `""`（空文字） | InvalidTestTypeErrorがthrowされる |
| UT-TR-009 | testType = `"integration"` | InvalidTestTypeErrorがthrowされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-TR-010 | 同一filePath・同一testType | `equals()` が true を返す |
| UT-TR-011 | 異なるfilePath・同一testType | `equals()` が false を返す |
| UT-TR-012 | 同一filePath・異なるtestType | `equals()` が false を返す |

---

### CoverageResult

#### 生成テスト（`CoverageCalculationService.calculate` 経由で生成）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CVR-001 | totalAcCount=4, coveredAcCount=4 | rate=1.0、uncoveredAcIds=[] のCoverageResultが生成される |
| UT-CVR-002 | totalAcCount=4, coveredAcCount=2 | rate=0.5、uncoveredAcIds=2件 のCoverageResultが生成される |
| UT-CVR-003 | totalAcCount=4, coveredAcCount=0 | rate=0.0、uncoveredAcIds=4件 のCoverageResultが生成される |
| UT-CVR-004 | totalAcCount=0（空のmatrix） | rate=1.0（空は全網羅とみなす）のCoverageResultが生成される |

#### 制約テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CVR-005 | coveredAcCount > totalAcCount（不正な状態） | エラーがthrowされる（構築禁止） |
| UT-CVR-006 | rate が 0.0〜1.0 の範囲外（直接構築） | エラーがthrowされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CVR-007 | 全フィールドが等しいCoverageResult同士 | `equals()` が true を返す |
| UT-CVR-008 | rateが異なるCoverageResult同士 | `equals()` が false を返す |

#### 振る舞いテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CVR-009 | `meetsThreshold` | rate=0.9、threshold=0.9 | true が返される |
| UT-CVR-010 | `meetsThreshold` | rate=0.89、threshold=0.9 | false が返される |
| UT-CVR-011 | `meetsThreshold` | rate=1.0、threshold=0.95 | true が返される |
| UT-CVR-012 | `toPercentage` | rate=0.9 | 90 が返される |
| UT-CVR-013 | `toPercentage` | rate=0.9999 | 99.99 が返される |
| UT-CVR-014 | `toPercentage` | rate=0.0 | 0 が返される |

---

### ImpactAnalysisResult

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-IAR-001 | 有効なstoryId、directTests 2件 | ImpactAnalysisResultが生成され、directMappingOnly=true が設定される |
| UT-IAR-002 | 有効なstoryId、directTests 空配列 | ImpactAnalysisResultが生成される（isEmpty=true） |
| UT-IAR-003 | directTestsに重複filePath（同一テスト参照）が含まれる | 重複が除去されたdirectTestsで生成される |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-IAR-004 | 同一storyId・同一directTests | `equals()` が true を返す |
| UT-IAR-005 | 異なるstoryId・同一directTests | `equals()` が false を返す |
| UT-IAR-006 | 同一storyId・異なるdirectTests | `equals()` が false を返す |

#### 振る舞いテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-IAR-007 | `isEmpty` | directTests 空配列 | true が返される |
| UT-IAR-008 | `isEmpty` | directTests 1件 | false が返される |
| UT-IAR-009 | 固定値確認 | 任意の有効な入力 | `directMappingOnly` が常に `true` である |

---

## 5. ドメインサービステストケース

### AcCoverageGatePolicy

#### 正常系テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-ACGP-001 | 全ACにTestReferenceが1件以上ある（1ストーリー2AC） | `check(matrix)` | `{ passed: true, errors: [] }` が返される |
| UT-ACGP-002 | 全ACにTestReferenceが1件以上ある（3ストーリー複数AC） | `check(matrix)` | `{ passed: true, errors: [] }` が返される |
| UT-ACGP-003 | storyMappings が空配列 | `check(matrix)` | `{ passed: true, errors: [] }` が返される（ACなし=全AC網羅済み） |
| UT-ACGP-004 | acMappings が空配列のStoryMappingのみ | `check(matrix)` | `{ passed: true, errors: [] }` が返される |

#### 異常系テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-ACGP-005 | AC-1 のTestReferenceが空（未カバー1件） | `check(matrix)` | `{ passed: false, errors: [HarnessError（AC-1未カバー）] }` が返される |
| UT-ACGP-006 | 2ストーリーで各1件ずつ未カバーAC | `check(matrix)` | `{ passed: false, errors: 2件 }` が返される |
| UT-ACGP-007 | 複数ACのうち1件だけ未カバー | `check(matrix)` | `passed=false、errorsに未カバーAC1件のみ` が返される |

#### 不変条件テスト

| ケースID | 条件 | 期待結果 |
|---------|------|---------|
| UT-ACGP-008 | `passed=true` のとき | `errors` が空配列であること |
| UT-ACGP-009 | `passed=false` のとき | `errors` が1件以上存在すること |
| UT-ACGP-010 | エラーのcodeフィールド | 各HarnessErrorの `code` が `L3-004` であること |

---

### CoverageCalculationService

#### 正常系テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-CCS-001 | 全4ACがカバー済み | `calculate(matrix)` | rate=1.0、coveredAcCount=4、totalAcCount=4、uncoveredAcIds=[] |
| UT-CCS-002 | 4ACのうち2件カバー済み | `calculate(matrix)` | rate=0.5、coveredAcCount=2、totalAcCount=4、uncoveredAcIds=2件 |
| UT-CCS-003 | 全ACが未カバー（4件） | `calculate(matrix)` | rate=0.0、coveredAcCount=0、totalAcCount=4、uncoveredAcIds=4件 |
| UT-CCS-004 | storyMappings 空配列 | `calculate(matrix)` | rate=1.0、coveredAcCount=0、totalAcCount=0、uncoveredAcIds=[] |
| UT-CCS-005 | 2ストーリー × 2AC（全カバー） | `calculate(matrix)` | rate=1.0、totalAcCount=4 |

#### uncoveredAcIds 収集テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-CCS-006 | H07-01: AC-1未カバー、H07-02: AC-2未カバー | `calculate(matrix)` | uncoveredAcIdsに `AC-1`（H07-01）と `AC-2`（H07-02）が含まれる |
| UT-CCS-007 | 全ACカバー済み | `calculate(matrix)` | uncoveredAcIds が空配列 |

#### 境界値テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-CCS-008 | totalAcCount=1, coveredAcCount=1 | `calculate(matrix)` | rate=1.0（小数点以下4桁で保持） |
| UT-CCS-009 | totalAcCount=3, coveredAcCount=1 | `calculate(matrix)` | rate=0.3333（小数点以下4桁） |

---

### ImpactAnalysisService

#### 正常系テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-IAS-001 | H07-01 に2つのAcMapping（各1件のTestReference） | `analyze(matrix, "H07-01")` | storyId=H07-01、directTests=2件のImpactAnalysisResultが返される |
| UT-IAS-002 | H07-01 に全ACがカバー済み | `analyze(matrix, "H07-01")` | directMappingOnly=true のImpactAnalysisResultが返される |
| UT-IAS-003 | H07-01 のacMappings が空配列 | `analyze(matrix, "H07-01")` | storyId=H07-01、directTests=[]のImpactAnalysisResultが返される |

#### 異常系テスト（storyId未検出）

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-IAS-004 | matrixにH07-01のみ存在 | `analyze(matrix, "H07-99")` | directTests=[]の空ImpactAnalysisResultが返される（エラーなし） |

#### 重複除去テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-IAS-005 | AC-1とAC-2に同一filePath・同一testTypeのTestReferenceが重複 | `analyze(matrix, "H07-01")` | directTestsで重複が除去され、1件になる |
| UT-IAS-006 | AC-1とAC-2に同一filePathだが異なるtestTypeのTestReference | `analyze(matrix, "H07-01")` | 両方のTestReferenceが含まれる（filePathのみ一致では重複とみなさない） |

#### 不変条件テスト

| ケースID | 条件 | 期待結果 |
|---------|------|---------|
| UT-IAS-007 | どのstoryIdで `analyze` を呼んでも | 返却されるImpactAnalysisResultの `directMappingOnly` が常に `true` |

---

### MatrixValidationService

> **注**: MatrixValidationServiceのユニットテストでは `StoryRegistryPort` をモックして使用する。

#### storyId整合性テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-MVS-001 | validStoryIds = ["H07-01"]、rawDataのstoryId = "H07-01" | `validate(rawData)` | `{ passed: true, validatedData: rawData }` が返される |
| UT-MVS-002 | validStoryIds = ["H07-01"]、rawDataのstoryId = "H07-99"（未登録） | `validate(rawData)` | `{ passed: false, errors: [HarnessError（H07-99未登録）] }` が返される |
| UT-MVS-003 | validStoryIds = ["H07-01", "H07-02"]、rawDataに両方のstoryId | `validate(rawData)` | `{ passed: true, validatedData: rawData }` が返される |
| UT-MVS-004 | validStoryIds = []（空）、rawDataのstoryId = "H07-01" | `validate(rawData)` | `{ passed: false, errors: 1件 }` が返される |

#### 複数エラー収集テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-MVS-005 | validStoryIds = ["H07-01"]、rawDataに"H07-02","H07-03"（未登録2件） | `validate(rawData)` | `{ passed: false, errors: 2件 }` が返される |

#### 不変条件テスト

| ケースID | 条件 | 期待結果 |
|---------|------|---------|
| UT-MVS-006 | `passed=true` のとき | `validatedData` が非null であること |
| UT-MVS-007 | `passed=false` のとき | `validatedData` が null であること |

#### StoryRegistryPort エラー伝播テスト

| ケースID | 初期状態 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-MVS-008 | StoryRegistryPortが例外をthrow | `validate(rawData)` | ポート例外がそのまま上位に伝播する |

---

## 6. 境界値・異常系（横断）

| ケースID | 対象 | 入力 | 期待結果 |
|---------|------|------|---------|
| UT-BND-001 | AcMapping.acId | `AC-1`（最小正整数） | 有効として受け入れられる |
| UT-BND-002 | AcMapping.acId | `AC-0`（ゼロ） | InvalidAcIdFormatErrorがthrowされる |
| UT-BND-003 | AcMapping.acId | `AC-999`（大きい数値） | 有効として受け入れられる |
| UT-BND-004 | CoverageResult.rate | 0.0（全AC未カバー） | rate=0.0 として保持される |
| UT-BND-005 | CoverageResult.rate | 1.0（全AC網羅済み） | rate=1.0 として保持される |
| UT-BND-006 | CoverageResult.rate | totalAcCount=0 | rate=1.0（空は全網羅とみなす） |
| UT-BND-007 | RequirementTestMatrix | storyMappings 空配列 | インスタンスが正常に生成される（空matrix） |
| UT-BND-008 | StoryMapping | acMappings 空配列 | インスタンスが正常に生成される |
| UT-BND-009 | AcMapping | testReferences 空配列 | インスタンスが正常に生成される（未カバー状態） |
| UT-BND-010 | ImpactAnalysisResult | directTests 空配列 | isEmpty()=true として扱われる |
| UT-BND-011 | TestReference.filePath | trim後に空文字になる入力（例: `"  "`） | EmptyFilePathErrorがthrowされる |
| UT-BND-012 | AcCoverageGatePolicy | 1件のみ未カバーAC | errors に1件のみHarnessErrorが返される |
| UT-BND-013 | CoverageCalculationService | totalAcCount=1, coveredAcCount=0 | rate=0.0 として計算される |
| UT-BND-014 | ImpactAnalysisService | storyId未検出の場合 | 例外なし・空ImpactAnalysisResultが返される |
| UT-BND-015 | MatrixValidationService | validStoryIds が空配列 | 全storyIdについてエラーが生成される |

---

## 7. テストケース総数サマリー

| コンポーネント | 生成 | 不変条件 | 状態遷移/振る舞い | 等値性 | 境界値・異常系 | 合計 |
|-------------|------|---------|----------------|--------|--------------|------|
| RequirementTestMatrix（集約） | 5 | 12 | 7 | — | — | 27 |
| StoryMapping（エンティティ） | 5 | — | 5 | 2 | — | 12 |
| AcMapping（VO） | 3 | 6 | 2 | 3 | — | 14 |
| TestReference（VO） | 3 | 6 | — | 3 | — | 12 |
| CoverageResult（VO） | 4 | 2 | 6 | 2 | — | 14 |
| ImpactAnalysisResult（VO） | 3 | — | 3 | 3 | — | 9 |
| AcCoverageGatePolicy（DS） | — | — | 7 | — | 3 | 10 |
| CoverageCalculationService（DS） | — | — | 9 | — | — | 9 |
| ImpactAnalysisService（DS） | — | — | 7 | — | — | 7 |
| MatrixValidationService（DS） | — | — | 8 | — | — | 8 |
| 横断境界値・異常系 | — | — | — | — | 15 | 15 |
| **合計** | **23** | **26** | **54** | **13** | **18** | **127** |

---

## 8. 次ステップ

1. **test-coverage-checker** — テストケース設計の網羅性チェック（カバレッジ90%以上を確認）
2. **unit-test-logic-designer** — ユニットテストの疑似コード設計
3. **story-implementor** — TDD実装
