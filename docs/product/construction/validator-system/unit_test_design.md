# ユニットテスト設計: validator-system

@story-id H08-01
@story-id H08-02
@story-id H08-03
@story-id H08-04
@story-id H08-05
@story-id H08-06
@work-item-id WI-129
@work-item-id WI-130
> **Unit ID**: validator-system
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H08-01〜H08-06
> **インプット**: `domain_model.md`, `logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. 対象ドメインモデル

- 集約: なし（ValidatorDefinition VOパターン採用）
- エンティティ: なし
- 値オブジェクト: ValidatorId, ValidatorDefinition, ValidationRule, ValidationResult, LayerConfig, DriftReport, ConsistencyReport, DeadCodeReport, TestCaseStructure, SemanticAssertion
- ドメインサービス: ValidatorRegistry, ValidatorExecutionService, DriftDetectionService, ConsistencyCheckService, DeadCodeDetectionService

---

## 2. 値オブジェクトテストケース

### L2-003 Test Quality Semantics

<!-- @work-item-id WI-129, WI-130 -->

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-TQS-001 | Arrange / Act / Assert があり `const actual = ...` を Assert する TypeScript test case | `passed=true` |
| UT-TQS-002 | 英語 test name | `L2-003` warning |
| UT-TQS-003 | Act が名前付き観測値に保持されていない test case | `L2-003` warning |
| UT-TQS-004 | unit/integration test case に Act が複数ある | `L2-003` warning |
| UT-TQS-005 | Assert が Act の観測結果ではなく入力値だけを検証する | `L2-003` warning |
| UT-TQS-006 | domain/internal module を `vi.mock` / `jest.mock` で置き換える | `L2-003` warning |
| UT-TQS-007 | E2E lifecycle test が Act / Assert を繰り返す | lifecycle exception として許可 |
| UT-TQS-008 | `it.each` parameterized test が semantic AAA を満たす | `passed=true` |
| UT-TQS-009 | weak truthiness / snapshot only / length only / interaction only | assertion strength warning |
| UT-TQS-010 | bare `toThrow()` だけの error case | error contract warning |

### ValidatorId

#### 生成テスト（`ValidatorId.create()`）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VID-001 | `"L2-001"` | ValidatorId生成成功。`value === "L2-001"` |
| UT-VID-002 | `"L3-003"` | ValidatorId生成成功。`value === "L3-003"` |
| UT-VID-003 | `"L4-003"`（最大有効値） | ValidatorId生成成功。`value === "L4-003"` |
| UT-VID-004 | `"L2-001"`（最小有効値） | ValidatorId生成成功 |
| UT-VID-005 | `"l2-001"`（小文字） | `InvalidValidatorIdError` をスロー |
| UT-VID-006 | `"L1-001"`（L1は無効レイヤー） | `InvalidValidatorIdError` をスロー |
| UT-VID-007 | `"L5-001"`（L5は無効レイヤー） | `InvalidValidatorIdError` をスロー |
| UT-VID-008 | `"L2-004"`（L2レイヤー範囲外） | `InvalidValidatorIdError` をスロー |
| UT-VID-009 | `"L2-000"`（連番下限未満） | `InvalidValidatorIdError` をスロー |
| UT-VID-010 | `""` （空文字） | `InvalidValidatorIdError` をスロー |
| UT-VID-011 | `"L2-01"` （桁数不足） | `InvalidValidatorIdError` をスロー |
| UT-VID-012 | `"L2-0001"` （桁数超過） | `InvalidValidatorIdError` をスロー |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-VID-013 | `getLayer()` | `ValidatorId("L2-001")` | `"L2"` を返す |
| UT-VID-014 | `getLayer()` | `ValidatorId("L4-003")` | `"L4"` を返す |
| UT-VID-015 | `getName()` | `ValidatorId("L2-001")` | `"phase-gate"` を返す |
| UT-VID-016 | `getName()` | `ValidatorId("L3-003")` | `"coverage"` を返す |
| UT-VID-017 | `getName()` | `ValidatorId("L4-001")` | `"drift-detect"` を返す |
| UT-VID-018 | `toString()` | `ValidatorId("L2-002")` | `"L2-002"` を返す |
| UT-VID-019 | `equals()` | 同一IDの2つのValidatorId | `true` を返す |
| UT-VID-020 | `equals()` | 異なるIDの2つのValidatorId（`"L2-001"` vs `"L2-002"`） | `false` を返す |

#### `ValidatorId.fromName()` テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VID-021 | `"phase-gate"` | `ValidatorId("L2-001")` と等価なインスタンスを返す |
| UT-VID-022 | `"dead-code"` | `ValidatorId("L4-003")` と等価なインスタンスを返す |
| UT-VID-023 | `"unknown-validator"` | `InvalidValidatorIdError` をスロー |

---

### ValidatorDefinition

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VDF-001 | 全フィールド有効（validatorId: L2-001, layer: "L2", rules: [1件], enabledCondition: "always", externalPolicyRef: "PhaseGatePolicyPort"） | ValidatorDefinition生成成功 |
| UT-VDF-002 | `rules: []`（空配列） | エラーまたは例外をスロー（rulesは最低1件必要） |
| UT-VDF-003 | `validatorId.getLayer() === "L2"` かつ `layer === "L3"`（layerIdミスマッチ） | エラーまたは例外をスロー |
| UT-VDF-004 | `externalPolicyRef: null`（L2-003/test-quality相当） | ValidatorDefinition生成成功。`requiresExternalPolicy() === false` |
| UT-VDF-005 | `externalPolicyRef: "AcCoveragePolicyPort"`（L3-004/nyquist相当） | ValidatorDefinition生成成功。`requiresExternalPolicy() === true` |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-VDF-006 | `requiresExternalPolicy()` | `externalPolicyRef !== null` | `true` を返す |
| UT-VDF-007 | `requiresExternalPolicy()` | `externalPolicyRef === null` | `false` を返す |
| UT-VDF-008 | `isStrictOnly()` | `enabledCondition === "strictOnly"` | `true` を返す |
| UT-VDF-009 | `isStrictOnly()` | `enabledCondition === "always"` | `false` を返す |
| UT-VDF-010 | `isStrictOnly()` | `enabledCondition === "layerEnabled"` | `false` を返す |
| UT-VDF-011 | `equals()` | 同一validatorIdを持つ2つのValidatorDefinition | `true` を返す |
| UT-VDF-012 | `equals()` | 異なるvalidatorIdを持つ2つのValidatorDefinition | `false` を返す |

---

### ValidationRule

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRL-001 | 全フィールド有効（ruleName: "aaa-pattern", errorTemplate有効） | ValidationRule生成成功 |
| UT-VRL-002 | `fixExample: null` | ValidationRule生成成功（fixExampleはオプション） |
| UT-VRL-003 | `errorTemplate.severity: "error"` | ValidationRule生成成功 |
| UT-VRL-004 | `errorTemplate.severity: "warning"` | ValidationRule生成成功 |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-VRL-005 | `buildErrorCode()` | `errorTemplate.code: "L2-003"` | `"L2-003"` を返す |
| UT-VRL-006 | `equals()` | 同一ruleNameの2つのValidationRule | `true` を返す |
| UT-VRL-007 | `equals()` | 異なるruleNameの2つのValidationRule（`"aaa-pattern"` vs `"hardcoded-secret"`） | `false` を返す |

---

### ValidationResult

#### ファクトリメソッドテスト（正常系）

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-VRS-001 | `ValidationResult.pass()` | `validatorId: L2-001, durationMs: 100` | `passed: true`, `errors: []`, `skipped: false`, `durationMs: 100` |
| UT-VRS-002 | `ValidationResult.fail()` | `validatorId: L2-001, errors: [HarnessError], durationMs: 50` | `passed: false`, `errors.length: 1`, `skipped: false` |
| UT-VRS-003 | `ValidationResult.skip()` | `validatorId: L3-002` | `passed: true`, `errors: []`, `skipped: true`, `durationMs: 0` |
| UT-VRS-004 | `ValidationResult.pass()` | `durationMs: 0`（境界値） | 生成成功。`durationMs: 0` |

#### 不変条件テスト（INV-5〜8）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-VRS-005 | INV-5: passed=trueの場合errors[]は空 | `passed: true, errors: [HarnessError]`（矛盾状態） | 生成時にエラーまたは例外をスロー |
| UT-VRS-006 | INV-7: durationMs >= 0 | `durationMs: -1` | 生成時にエラーまたは例外をスロー |
| UT-VRS-007 | INV-8: skipped=trueの場合passed=trueかつerrors=[] | `ValidationResult.skip()` で生成 | `passed: true`, `errors: []` が保証される |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-VRS-008 | `hasErrors()` | `errors.length === 0` | `false` を返す |
| UT-VRS-009 | `hasErrors()` | `errors.length > 0` | `true` を返す |
| UT-VRS-010 | `errorCount()` | `errors.length === 3` | `3` を返す |
| UT-VRS-011 | `equals()` | 同一validatorId + 同一passed + 同一errorsの2つのValidationResult | `true` を返す |
| UT-VRS-012 | `equals()` | passedが異なる2つのValidationResult | `false` を返す |

---

### LayerConfig

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LCF-001 | `layer: "L2", enabled: true, validatorIds: ["L2-001"], thresholds: {}, strictOnly: false, preset: "standard"` | LayerConfig生成成功 |
| UT-LCF-002 | `enabled: false` | LayerConfig生成成功。`isValidatorEnabled()` は全て `false` を返す |
| UT-LCF-003 | `thresholds: { coverageThreshold: 90 }` | LayerConfig生成成功。`getThreshold("coverageThreshold") === 90` |
| UT-LCF-004 | `preset: "strict", strictOnly: true` | LayerConfig生成成功 |

#### メソッドテスト（不変条件 INV-8, INV-9）

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-LCF-005 | `isValidatorEnabled()` | `enabled: true, validatorIds: ["L2-001"]`, 問い合わせ: `L2-001` | `true` を返す（INV-9） |
| UT-LCF-006 | `isValidatorEnabled()` | `enabled: true, validatorIds: ["L2-001"]`, 問い合わせ: `L2-002` | `false` を返す |
| UT-LCF-007 | `isValidatorEnabled()` | `enabled: false`, 問い合わせ: `L2-001` | `false` を返す（INV-8） |
| UT-LCF-008 | `getThreshold()` | `thresholds: { coverageThreshold: 90 }`, キー: `"coverageThreshold"` | `90` を返す |
| UT-LCF-009 | `getThreshold()` | `thresholds: {}`, キー: `"bundleSizeLimit"` | `null` を返す（未定義） |
| UT-LCF-010 | `equals()` | 全フィールドが同一の2つのLayerConfig | `true` を返す |
| UT-LCF-011 | `equals()` | `enabled` フィールドのみ異なる2つのLayerConfig | `false` を返す |

---

### DriftReport

#### 生成テスト（INV-10）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-DRP-001 | `direction: "design→code"`, 全フィールド有効 | DriftReport生成成功 |
| UT-DRP-002 | `direction: "code→design"`, 全フィールド有効 | DriftReport生成成功 |
| UT-DRP-003 | `direction: "invalid-direction"`（無効値） | エラーまたは例外をスロー（INV-10） |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-DRP-004 | `toHarnessError()` | `direction: "design→code"`, `unitName: "validator-system"`, `element: "ValidatorId"` | `HarnessError` が返る。`code: "L4-001"` |
| UT-DRP-005 | `toHarnessError()` | `direction: "code→design"` | `HarnessError` が返る。`code: "L4-001"` |
| UT-DRP-006 | `equals()` | 全フィールドが同一の2つのDriftReport | `true` を返す |
| UT-DRP-007 | `equals()` | `direction` フィールドが異なる2つのDriftReport | `false` を返す |
| UT-DRP-008 | `equals()` | `element` フィールドが異なる2つのDriftReport | `false` を返す |

---

### ConsistencyReport

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CSR-001 | `mismatchPairs: []`, `checkTargets: ["domain_model.md"]` | ConsistencyReport生成成功 |
| UT-CSR-002 | `mismatchPairs: [{expected: "L2", actual: "L3", location: "domain_model.md:12"}]` | ConsistencyReport生成成功 |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CSR-003 | `hasMismatches()` | `mismatchPairs: []` | `false` を返す |
| UT-CSR-004 | `hasMismatches()` | `mismatchPairs.length === 2` | `true` を返す |
| UT-CSR-005 | `mismatchCount()` | `mismatchPairs.length === 3` | `3` を返す |
| UT-CSR-006 | `toHarnessErrors()` | `mismatchPairs.length === 2` | `HarnessError[]` が2件返る。各 `code: "L4-002"` |
| UT-CSR-007 | `toHarnessErrors()` | `mismatchPairs: []` | 空配列を返す |

---

### DeadCodeReport

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-DCR-001 | `unusedExports: [], unreachableCode: [], gcRecommended: false` | DeadCodeReport生成成功 |
| UT-DCR-002 | `unusedExports: ["src/index.ts::unusedFn"]`, `unreachableCode: [{filePath: "src/util.ts", range: {startLine: 10, endLine: 15}}]` | DeadCodeReport生成成功 |

#### メソッドテスト

| ケースID | メソッド | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-DCR-003 | `hasDeadCode()` | `unusedExports: [], unreachableCode: []` | `false` を返す |
| UT-DCR-004 | `hasDeadCode()` | `unusedExports.length === 1` | `true` を返す |
| UT-DCR-005 | `hasDeadCode()` | `unusedExports: [], unreachableCode.length === 1` | `true` を返す |
| UT-DCR-006 | `toHarnessErrors()` | `unusedExports: ["src/index.ts::unusedFn"]` | `HarnessError[]` が1件返る。`code: "L4-003"` |
| UT-DCR-007 | `toHarnessErrors()` | `unusedExports: [], unreachableCode: []` | 空配列を返す |

---

## 3. ドメインサービステストケース

### ValidatorRegistry

#### 登録・初期化テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRG-001 | 10件の有効なValidatorDefinitionリストで初期化 | ValidatorRegistry生成成功 |
| UT-VRG-002 | 同一validatorIdを持つDefinitionが重複して存在するリストで初期化 | エラーまたは例外をスロー（重複登録禁止） |
| UT-VRG-003 | 空リストで初期化 | ValidatorRegistry生成成功（定義0件） |

#### `getDefinition()` テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRG-004 | 登録済みの `ValidatorId("L2-001")` | 対応するValidatorDefinitionを返す |
| UT-VRG-005 | 未登録の `ValidatorId`（Registryに定義が登録されていない場合） | `UnknownValidatorError` をスロー |

#### `getAllDefinitions()` テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRG-006 | 10件登録済みのRegistry | 10件全てのValidatorDefinitionをvalidatorId昇順で返す |
| UT-VRG-007 | 返却されたreadonly配列 | 外部から変更不能なreadonly配列を返す |

#### `listByLayer()` テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRG-008 | `layer: "L2"` | L2-001〜L2-003の3件のDefinitionをvalidatorId昇順で返す |
| UT-VRG-009 | `layer: "L3"` | L3-001〜L3-004の4件のDefinitionを返す |
| UT-VRG-010 | `layer: "L4"` | L4-001〜L4-005の5件のDefinitionを返す |

#### `select()` テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRG-011 | `[ValidatorId("L2-001"), ValidatorId("L3-003")]` | 2件のDefinitionを入力順序で返す |
| UT-VRG-012 | 未登録IDを含む配列 | `UnknownValidatorError` をスロー |

#### `hasDefinition()` テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-VRG-013 | 登録済みの `ValidatorId("L2-001")` | `true` を返す |
| UT-VRG-014 | 未登録のValidatorId | `false` を返す |
| UT-VRG-015 | 空Registryへの問い合わせ | `false` を返す |

---

### ValidatorExecutionService

> **モック方針**: 全Portインターフェース（ValidatorConfigPort, PhaseGatePolicyPort等）はモックを使用する。ドメインサービス（DriftDetectionService等）は実体またはモックを使用する。

#### `execute()` — スキップ制御テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-VES-001 | `LayerConfig.enabled: false` のL3バリデータ定義 | `execute()` 呼び出し | `ValidationResult.skip()` が返る（INV-8） |
| UT-VES-002 | `enabledCondition: "strictOnly"` かつ `LayerConfig.strictOnly: false` のバリデータ定義 | `execute()` 呼び出し | `ValidationResult.skip()` が返る（INV-4） |
| UT-VES-003 | `enabledCondition: "strictOnly"` かつ `LayerConfig.strictOnly: true` のバリデータ定義 | `execute()` 呼び出し | スキップされずに実行される |
| UT-VES-004 | `enabled: true` かつ `enabledCondition: "always"` のバリデータ定義 | `execute()` 呼び出し | 対応するPortが呼び出される |

#### `execute()` — 順次実行・結果順序テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-VES-005 | L2-001, L2-002の2件のDefinition（全て有効） | `execute()` 呼び出し | 2件のValidationResultが入力順で返る |
| UT-VES-006 | 複数DefinitionでL2-001が成功、L2-002が失敗 | `execute()` 呼び出し | 2件の結果が返る。順序は入力順と一致 |

#### `execute()` — エラーハンドリングテスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-VES-007 | Port実装がエラーをスローするバリデータ定義 | `execute()` 呼び出し | 個別エラーをキャッチし `ValidationResult.fail()` に変換して返す（他バリデータへの影響なし） |
| UT-VES-008 | Port実装が予期せぬエラーをスローする | `execute()` 呼び出し | `ValidatorExecutionError` がスローされる（または fail変換） |

#### `execute()` — 実行時間計測テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-VES-009 | 有効なバリデータ定義（スキップなし） | `execute()` 呼び出し後にValidationResultを確認 | `durationMs >= 0` が保証される（INV-7） |
| UT-VES-010 | スキップされるバリデータ定義（enabled: false） | `execute()` 呼び出し後にValidationResultを確認 | `durationMs === 0` が返る |

#### `executeWithRelaxation()` — quick-mode緩和テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-VES-011 | 緩和プロファイルで特定バリデータが除外指定 | `executeWithRelaxation()` 呼び出し | 除外指定されたバリデータがスキップされる |
| UT-VES-012 | 空の緩和プロファイル | `executeWithRelaxation()` 呼び出し | 通常の `execute()` と同一の結果が返る |

---

### DriftDetectionService

> **モック方針**: `DesignDocumentPort` と `SourceCodeAnalyzerPort` はモックを使用する。

#### `detect()` — DriftReport生成テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-DDS-001 | 設計文書に存在するがコードに存在しない要素あり | `detect()` 呼び出し | `direction: "design→code"` のDriftReportが生成される |
| UT-DDS-002 | コードに存在するが設計文書に存在しない要素あり | `detect()` 呼び出し | `direction: "code→design"` のDriftReportが生成される |
| UT-DDS-003 | 設計とコードが完全に一致 | `detect()` 呼び出し | 空のDriftReport[]が返る（乖離なし） |
| UT-DDS-004 | 設計→コードとコード→設計の両方向で乖離あり | `detect()` 呼び出し | 両方向のDriftReportが含まれる結果が返る |
| UT-DDS-010 | 設計要素のpointerがコード要素の定義ファイルに一致 | `detect()` 呼び出し | 名前が異なってもDriftReportは生成されない |
| UT-DDS-011 | 設計要素のpointerがどのコード定義ファイルにも一致しない | `detect()` 呼び出し | 従来通りdesign→codeとcode→designのDriftReportが生成される |

#### ポートインタラクションテスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-DDS-005 | モックDesignDocumentPortがデータを返す | `detect()` 呼び出し | DesignDocumentPortとSourceCodeAnalyzerPortが両方呼び出される |
| UT-DDS-006 | DesignDocumentPortがエラーをスロー | `detect()` 呼び出し | 適切なエラーが伝播する |

---

### ConsistencyCheckService

> **モック方針**: `DesignDocumentPort` と `AdrReferencePort` はモックを使用する。

#### `check()` — ConsistencyReport生成テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-CCS-001 | 設計文書間でレイヤー記述が一致 | `check()` 呼び出し | `mismatchPairs: []` のConsistencyReportが返る |
| UT-CCS-002 | 設計文書間でレイヤー記述が不整合（例: domain_modelはL2と記述、logical_designはL3と記述） | `check()` 呼び出し | `mismatchPairs` に不整合ペアが含まれるConsistencyReportが返る |
| UT-CCS-003 | ADRへの参照が実在しない | `check()` 呼び出し | 不整合として検出される |

#### ポートインタラクションテスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-CCS-004 | モックが正常にデータを返す | `check()` 呼び出し | DesignDocumentPortとAdrReferencePortが両方呼び出される |
| UT-CCS-005 | DesignDocumentPortがエラーをスロー | `check()` 呼び出し | 適切なエラーが伝播する |

---

### DeadCodeDetectionService

> **モック方針**: `SourceAnalysisPort` はモックを使用する。

#### `detect()` — DeadCodeReport生成テスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-DCD-001 | 未使用エクスポートが存在するImportGraph | `detect()` 呼び出し | `unusedExports` に未使用エクスポートが含まれるDeadCodeReportが返る |
| UT-DCD-002 | 到達不能コードが存在するソース解析結果 | `detect()` 呼び出し | `unreachableCode` に位置情報が含まれるDeadCodeReportが返る |
| UT-DCD-003 | デッドコードなし（全エクスポートが使用済み） | `detect()` 呼び出し | `hasDeadCode() === false` のDeadCodeReportが返る |
| UT-DCD-004 | `strictOnly: true` の設定 + デッドコードあり | `detect()` 呼び出し | `gcRecommended: true` のDeadCodeReportが返る |
| UT-DCD-005 | `strictOnly: false` の設定 + デッドコードあり | `detect()` 呼び出し | `gcRecommended: false` のDeadCodeReportが返る |

#### ポートインタラクションテスト

| ケースID | 初期条件 | 操作 | 期待結果 |
|---------|---------|------|---------|
| UT-DCD-006 | モックSourceAnalysisPortが正常にデータを返す | `detect()` 呼び出し | SourceAnalysisPortが呼び出される（biome-ast-engineへの直接依存なし） |
| UT-DCD-007 | SourceAnalysisPortがエラーをスロー | `detect()` 呼び出し | 適切なエラーが伝播する |

---

## 4. 境界値・異常系

| ケースID | 対象 | 入力 | 期待結果 |
|---------|------|------|---------|
| UT-BND-001 | ValidatorId | `"L2-001"`（有効範囲最小値） | 生成成功 |
| UT-BND-002 | ValidatorId | `"L4-003"`（有効範囲最大値） | 生成成功 |
| UT-BND-003 | ValidatorId | `"L4-004"`（有効範囲超過） | `InvalidValidatorIdError` をスロー |
| UT-BND-004 | ValidatorId | `"L2-000"`（連番ゼロ） | `InvalidValidatorIdError` をスロー |
| UT-BND-005 | ValidationResult.durationMs | `durationMs: 0`（下限境界値） | 生成成功 |
| UT-BND-006 | ValidationResult.durationMs | `durationMs: -1`（下限未満） | エラーまたは例外をスロー（INV-7） |
| UT-BND-007 | ValidationResult.durationMs | `durationMs: 999999`（大きな値） | 生成成功 |
| UT-BND-008 | LayerConfig.thresholds | `{ coverageThreshold: 0 }`（閾値下限） | 生成成功 |
| UT-BND-009 | LayerConfig.thresholds | `{ coverageThreshold: 100 }`（閾値上限） | 生成成功 |
| UT-BND-010 | ValidatorRegistry | 10件全て登録済みのRegistryに対して `getAllDefinitions()` | 10件全て返る |
| UT-BND-011 | ValidatorRegistry | 空Registryに対して `getAllDefinitions()` | 空配列を返す |
| UT-BND-012 | ValidatorDefinition.rules | `rules: []`（空配列） | エラーまたは例外をスロー（最低1件必要） |
| UT-BND-013 | ConsistencyReport.mismatchPairs | `mismatchPairs: []` に対して `toHarnessErrors()` | 空配列を返す |
| UT-BND-014 | DeadCodeReport | `unusedExports: []` かつ `unreachableCode: []` に対して `hasDeadCode()` | `false` を返す |
| UT-BND-015 | DriftReport | `direction` フィールドが `"design→code"` と `"code→design"` 以外の無効値 | エラーまたは例外をスロー（INV-10） |
| UT-BND-016 | ValidatorExecutionService | 入力 `definitions: []`（空配列）で `execute()` 呼び出し | 空の `ValidationResult[]` を返す |
| UT-BND-017 | ValidatorExecutionService | 10件全バリデータが `enabled: false` の設定で `execute()` 呼び出し | 全件 `skipped: true` のValidationResultを返す |

---

## 5. テスト実装方針（設計文書注記）

### describe/it構造（テスト規約準拠）

```
target('{クラス名またはメソッド名}', () => {
  describe('{振る舞いの説明}', () => {
    context('{前提条件}', () => {   // 前提条件がある場合のみ
      it('{期待値（日本語）}', () => {
        // Arrange
        // Act → actual に代入
        // Assert
      });
    });
  });
});
```

### モック利用方針

- ドメインポート（`ValidatorConfigPort` 等12種のPort）: モックを使用（テスト規約「外部依存にのみモック利用」準拠）
- 値オブジェクト: モック不使用（実体を直接生成）
- ドメインサービス内のPortは全てモック。ドメインサービス同士の依存（`ValidatorExecutionService` → `DriftDetectionService` 等）はモックまたは実体の選択が可能

### ケースID命名規則

`UT-{対象略称}-{3桁連番}` 形式

| 対象 | 略称 |
|------|------|
| ValidatorId | VID |
| ValidatorDefinition | VDF |
| ValidationRule | VRL |
| ValidationResult | VRS |
| LayerConfig | LCF |
| DriftReport | DRP |
| ConsistencyReport | CSR |
| DeadCodeReport | DCR |
| ValidatorRegistry | VRG |
| ValidatorExecutionService | VES |
| DriftDetectionService | DDS |
| ConsistencyCheckService | CCS |
| DeadCodeDetectionService | DCD |
| 境界値・異常系共通 | BND |
<!-- @work-item-id WI-117 -->
## WI-117 Drift Precision Tests

- Same element name in multiple Units is compared by Unit-scoped key.
- Explicit pointer matching does not hide unrelated exports in the same file.

<!-- @work-item-id WI-118 -->
## WI-118 Consistency Semantics Tests

- Known layer annotations pass.
- Unknown layer vocabulary, missing ADR references, and Unit mismatches produce L4-002 mismatches with location / expected / actual.

<!-- @work-item-id WI-139 -->
## WI-139 Semantic Drift Tests

- Missing implementation/test observations for design behaviors are reported.
- Undesigned public code behaviors and undesigned test observations are reported as warnings.

<!-- @work-item-id WI-132, WI-133, WI-136, WI-137, WI-138 -->
## G4 Contract Traceability Unit Tests

- `ContractTraceabilityCoverageService` reports missing required behavior observations for public contracts.
- Port contracts without `adapter-contract` observations report `missing-port-contract-test`.
- Config/domain boundary cases without `{contractId}:boundary:{case}` observations report `missing-boundary-test`.
- Incomplete `ErrorContract` records report shape, exit-code, and missing error-path findings.
- `StateMachineModel` docs/code mismatches, terminal outgoing transitions, and missing transition observations are reported.
- `TraceabilityGraphSlice` affected-unit reflection gaps, implementation/test mismatches, and public docs/contract sync gaps are reported.
- `ValidatorId` accepts `L2-015` as `contract-traceability-coverage`.
## G5 Semantic Analysis Tests

<!-- @work-item-id WI-119, WI-120, WI-121, WI-134, WI-135 -->

- L3-001 detects representative OpenAI/GitHub/AWS/npm/Slack token fixtures and redacts raw values.
- L3-001 respects explicit fixture/docs allowlist markers.
- L3-002 detects await-in-loop and synchronous I/O, and respects inline performance suppression.
- L4-003 reports unused exports but preserves barrel re-export references and public/test boundaries.
- Architecture semantic policy fixtures cover capability boundaries and advisory decision-placement findings.
- L4 use case integration tests verify semantic findings are included in `L4-002` output.
