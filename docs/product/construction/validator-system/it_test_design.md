# ITテスト設計: validator-system

## WI-185 / WI-186 validator trust regressions

<!-- @work-item-id WI-185, WI-186 -->

| ID | 観点 | 入力 | 期待結果 |
| --- | --- | --- | --- |
| IT-WI185-VS-001 | L4 document command project-root semantics | downstream package-bin execution with caller docs | P2 freshness/pointer result count is non-zero |
| IT-WI186-VS-001 | live layer fail propagation | validator/lint live state includes enabled layer failure | harness-api status JSON is `status=fail` and layer `lastResult=fail` |

@story-id H08-01
@story-id H08-02
@story-id H08-03
@story-id H08-04
@story-id H08-05
@story-id H08-06
> **Unit ID**: validator-system
> **作成日**: 2026-03-19
> **対応ストーリー**: H08-01〜H08-06
> **前提ドキュメント**:
> - `docs/product/construction/validator-system/logical_design.md`
> - `docs/product/construction/validator-system/domain_model.md`
> - `docs/product/units/integration_contract.md`
> - `docs/inception/validator-system/it_test_design_plan.md`

---

## 1. 対象コンポーネント

- **UseCase**: RunL2ValidatorsUseCase, RunL3ValidatorsUseCase, RunL4ValidatorsUseCase, RunQuickModeUseCase, AggregateValidationResultsUseCase, RunFullValidationUseCase
- **Infrastructure Adapter**: HarnessConfigValidatorConfigAdapter, PhaseDependencyPhaseGatePolicyAdapter, TraceabilityMetadataPolicyAdapter, BiomeAstTestQualityAnalyzerAdapter, FileSystemSecurityPatternScannerAdapter, AstPerformanceScannerAdapter, JsonCoverageReportAdapter, NyquistAcCoveragePolicyAdapter, MarkdownDesignDocumentAdapter, BiomeAstSourceCodeAnalyzerAdapter, ImportGraphSourceAnalysisAdapter, AdrFoundationReferenceAdapter
- **CLIハンドラー**: RunValidatorsHandler, RunQuickModeHandler, ReportValidationResultsHandler

---

## 2. UseCaseテストケース

### RunL2ValidatorsUseCase（H08-01）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunL2-001 | validatorIdsを省略した場合、全L2バリデータ（L2-001〜L2-003, L2-013〜L2-015）が実行される | `{ targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" }` | ValidatorConfigPort: L2 LayerConfig(enabled=true)を返す。ExecutionService: 6件のpass結果を返す | `ValidationResultContract[]`が6件返る。各`validatorId`が"L2-001"/"L2-002"/"L2-003"/"L2-013"/"L2-014"/"L2-015"。@work-item-id WI-110 |
| IT-UC-RunL2-002 | validatorIdsに["L2-001"]を指定した場合、phase-gateのみが実行される | `{ validatorIds: ["L2-001"], targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" }` | ExecutionService: 1件のpass結果を返す | `ValidationResultContract[]`が1件返る。`validatorId`が"L2-001" |
| IT-UC-RunL2-003 | L2バリデータがfailした場合、passed=falseかつerrorsを含む結果が返る | `{ targetPaths: ["src/foo.ts"], unitName: "unit-a", currentPhase: "implementation" }` | ExecutionService: L2-002がfail（errors: [{code:"L2-002", severity:"error"}]）の結果を返す | `ValidationResultContract`の`passed=false`、`errors`に1件のHarnessErrorが含まれる |
| IT-UC-RunL2-004 | LayerConfig.enabled=falseの場合、全L2結果がskipped=trueで返る | 有効な入力DTO | ValidatorConfigPort: enabled=falseのLayerConfigを返す | 全`ValidationResultContract`が`skipped=true`、`passed=true`、`errors=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-RunL2-005 | 無効なvalidatorId（"L2-999"）を指定した場合、InvalidValidatorIdErrorが送出される | `{ validatorIds: ["L2-999"], targetPaths: [], unitName: "unit-a", currentPhase: "impl" }` | — | `InvalidValidatorIdError` |
| IT-UC-RunL2-006 | ValidatorConfigPortが例外をthrowした場合、ValidatorExecutionErrorとして伝播する | 有効な入力DTO | ValidatorConfigPort: `Error("config read failed")`をthrow | `ValidatorExecutionError` |
| IT-UC-RunL2-007 | targetPathsが空配列の場合、実行は続行され空のviotation結果が返る | `{ targetPaths: [], unitName: "unit-a", currentPhase: "impl" }` | ExecutionService: 4件のpass結果を返す | `ValidationResultContract[]`が4件すべて`passed=true` |
| IT-UC-RunL2-008 | consumer project に CLI E2E suite が存在しない場合、L2-013はlimitationとして扱う | `{ targetPaths: [], unitName: "unit-a", currentPhase: "impl" }` | E2eTestFileRegistryPort: `[]`、CliCommandRegistryPort: registered commandsあり | L2-013が missing command failure を返さず、L2 gate を誤失敗させない。@work-item-id WI-111 |

---

### RunL3ValidatorsUseCase（H08-02）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunL3-001 | validatorIdsを省略した場合、全L3バリデータ（L3-001〜L3-004）が実行される | `{ targetPaths: ["src/"] }` | ValidatorConfigPort: L3 LayerConfig(enabled=true, preset="standard")を返す。ExecutionService: 4件のpass結果 | `ValidationResultContract[]`が4件返る |
| IT-UC-RunL3-002 | preset="standard"の場合、L3-002（performance/strictOnly）がスキップされる | `{ targetPaths: ["src/"] }` | LayerConfig: strictOnly=false | L3-002の結果が`skipped=true` |
| IT-UC-RunL3-003 | preset="strict"の場合、L3-002も実行対象になる | `{ targetPaths: ["src/"] }` | LayerConfig: strictOnly=true、ExecutionService: L3-002のpass結果を返す | L3-002の`skipped`がfalse（通常実行） |
| IT-UC-RunL3-004 | LayerConfig.enabled=falseの場合、空のValidationResultContract[]が返る | `{ targetPaths: ["src/"] }` | LayerConfig: enabled=false | 戻り値が空配列 |
| IT-UC-RunL3-005 | coverageReportPathを指定した場合、L3-003がそのパスを使用する | `{ targetPaths: ["src/"], coverageReportPath: "coverage/summary.json" }` | ExecutionService: coverageReportPathが渡されたことを確認できるpass結果 | `ValidationResultContract[]`が4件、L3-003がpass |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-RunL3-006 | カバレッジレポートが存在しない場合、CoverageReportReadErrorが送出される | `{ targetPaths: ["src/"], coverageReportPath: "nonexistent/coverage.json" }` | CoverageReportPort: `CoverageReportNotFoundError`をthrow | `CoverageReportNotFoundError` |
| IT-UC-RunL3-007 | coverageThreshold=90%未達時、HarnessErrorに現在値と不足分が含まれること | `{ targetPaths: ["src/"], coverageReportPath: "coverage/summary.json" }` | CoverageReportPort: `{ overallCoverage: 75 }` を返す。LayerConfig: `coverageThreshold=90` | L3-003の`passed=false`、`errors[0].message`または`errors[0].details`に現在値（75）と不足分（15）が含まれること |

---

### RunL4ValidatorsUseCase（H08-03）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunL4-001 | validatorIdsを省略した場合、全L4バリデータ（L4-001〜L4-006）が実行される | `{ strictMode: false }` | ValidatorConfigPort: L4 LayerConfig(enabled=true)。ExecutionService: 6件のpass結果 | `ValidationResultContract[]`が6件返る。@work-item-id WI-156 |
| IT-UC-RunL4-002 | strictMode=falseの場合、L4-003（dead-code/strictOnly）がスキップされる | `{ strictMode: false }` | LayerConfig: strictOnly=false | L4-003の結果が`skipped=true` |
| IT-UC-RunL4-009 | skill count drift がある場合、L4-006 が warning finding を返す | `{ validatorIds: ["L4-006"] }` | SkillCatalogDriftService: documented count mismatch を返す | `L4-006` が `passed=false`、`errors[0].severity="warning"`、source path と expected count を含む。@work-item-id WI-156 |
| IT-REPO-SkillCatalog-001 | skills overview category headings are not total count declarations | temp repository with 2 skills and category headings `(1 skills)` | FileSystemSkillCatalogDriftAdapter | total declarations are only maintained total phrases; category headings are reported separately. @work-item-id WI-156 |
| IT-UC-RunL4-003 | targetUnitsを指定した場合、対象Unitのみが検査される | `{ targetUnits: ["harness-error"], strictMode: false }` | DriftDetectionService/ConsistencyCheckService: targetUnitsを受け取ってpass結果を返す | L4-001/L4-002の結果が`passed=true` |
| IT-UC-RunL4-004 | L4-001（drift-detect）がfailした場合、DriftReportが含まれたエラーが返る | `{ strictMode: false }` | ExecutionService: L4-001がfail（errors: [{code:"L4-001"}]）の結果を返す | L4-001の`passed=false`、`errors`にL4-001エラー |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-RunL4-005 | 設計文書の読み取りが失敗した場合、DesignDocumentReadErrorが伝播する | `{ strictMode: false }` | ExecutionService: `DesignDocumentReadError`をthrow | `DesignDocumentReadError` |
| IT-UC-RunL4-006 | AST解析が失敗した場合、SourceCodeAnalysisErrorが伝播する | `{ strictMode: false }` | ExecutionService: `SourceCodeAnalysisError`をthrow | `SourceCodeAnalysisError` |

---

### RunQuickModeUseCase（H08-04）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunQuick-001 | relaxationProfileのl2.maintained=["L2-002"]の場合、L2-002のみが実行される | `{ relaxationProfile: { l2: { maintained: ["L2-002"], skipped: ["L2-001","L2-003"] }, l3: { maintained: [], skipped: [...] }, l4: { all: false }, phaseExecution: { twoPhaseRequired: false } }, targetPaths: ["src/"], unitName: "unit-a", currentPhase: "impl" }` | ExecutionService.executeWithRelaxation: L2-002のpass結果を返す | `ValidationResultContract[]`にL2-002の結果のみ。L2-001/L2-003は`skipped=true` |
| IT-UC-RunQuick-002 | L4が常にスキップされることを確認する | `{ relaxationProfile: { ..., l4: { all: false } }, targetPaths: ["src/"], unitName: "unit-a", currentPhase: "impl" }` | ExecutionService: L4関連サービスが呼ばれないことを確認 | L4バリデータはすべて`skipped=true`として返る |
| IT-UC-RunQuick-003 | twoPhaseRequired=falseの場合、Phase Gate検証がスキップされる | 有効なrelaxationProfile | ExecutionService.executeWithRelaxation: phaseGate不要の結果を返す | L2-001が`skipped=true` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-RunQuick-004 | relaxationProfile.l4.allがfalse以外の場合、InvalidRelaxationProfileErrorが送出される | `{ relaxationProfile: { l4: { all: true } }, ... }` | — | `InvalidRelaxationProfileError` |
| IT-UC-RunQuick-005 | relaxationProfileがnullの場合、InvalidRelaxationProfileErrorが送出される | `{ relaxationProfile: null, targetPaths: [], unitName: "", currentPhase: "" }` | — | `InvalidRelaxationProfileError` |

---

### AggregateValidationResultsUseCase（H08-05）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-Agg-001 | 全バリデータがpassの場合、overallPassed=trueが返る | `{ results: [{ validatorId:"L2-001", passed:true, errors:[], durationMs:10 }, ...], failOnWarning: false }` | なし（純粋集約） | `AggregatedValidationReport.overallPassed=true`、`failedValidators=0` |
| IT-UC-Agg-002 | 1件でもfailがある場合、overallPassed=falseが返る | `{ results: [{ validatorId:"L2-002", passed:false, errors:[{code:"L2-002",severity:"error",...}], durationMs:5 }], failOnWarning: false }` | なし | `overallPassed=false`、`failedValidators=1` |
| IT-UC-Agg-003 | skipped=trueの結果は失敗扱いにならない | `{ results: [{ validatorId:"L3-002", passed:true, errors:[], durationMs:0, skipped:true }], failOnWarning: false }` | なし | `skippedValidators=1`、`overallPassed=true` |
| IT-UC-Agg-004 | failOnWarning=trueの場合、warningのみの結果もfailとして集計される | `{ results: [{ validatorId:"L4-003", passed:true, errors:[{code:"L4-003",severity:"warning",...}], durationMs:20 }], failOnWarning: true }` | なし | `failedValidators=1`、`overallPassed=false` |
| IT-UC-Agg-005 | errorsByLayerが正確にレイヤー別集計される | `{ results: [ L2-001:pass, L2-002:fail(errors:[{code:"L2-002"}]), L3-001:fail(errors:[{code:"L3-001"},{code:"L3-001"}]) ] }` | なし | `errorsByLayer.L2=1`、`errorsByLayer.L3=2`、`errorsByLayer.L4=0` |
| IT-UC-Agg-006 | 空の結果配列を受け取った場合、空の集計結果が返る | `{ results: [], failOnWarning: false }` | なし | `totalValidators=0`、`overallPassed=true`、`allErrors=[]` |
| IT-UC-Agg-007 | 同一HarnessError.codeの重複排除が行われる | `{ results: [{ validatorId:"L2-002", passed:false, errors:[{code:"L2-002",...},{code:"L2-002",...}] }] }` | なし | `allErrors`に同一codeのエラーが重複しない |
| IT-UC-Agg-008 | AggregatedValidationReportがObject.freezeで凍結されている | 有効な入力 | なし | `Object.isFrozen(actual) === true` |

---

### RunFullValidationUseCase（H08-06）

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RunFull-001 | 全バリデータ（L2+L3+L4）が実行され、統合レポートが返る | `{ targetPaths: ["src/"], unitName: "unit-a", currentPhase: "impl", includeL4: true, failOnWarning: false }` | RunL2UseCase: 3件pass。RunL3UseCase: 4件pass。RunL4UseCase: 3件pass | `AggregatedValidationReport.overallPassed=true`、`totalValidators=10` |
| IT-UC-RunFull-002 | includeL4=falseの場合、L4UseCaseが呼ばれず7件の結果で集計される | `{ targetPaths: ["src/"], unitName: "unit-a", currentPhase: "impl", includeL4: false }` | RunL4UseCase: 呼ばれないことをexpect | `totalValidators=7`（L2:3 + L3:4） |
| IT-UC-RunFull-003 | L2でfailが発生した場合、overallPassed=falseの統合レポートが返る | 有効な入力 | RunL2UseCase: 1件fail(L2-001)を含む結果を返す | `overallPassed=false`、`failedValidators >= 1` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-RunFull-004 | RunL2UseCaseが例外をthrowした場合、例外が上位に伝播する | 有効な入力 | RunL2UseCase: `ValidatorExecutionError`をthrow | `ValidatorExecutionError` |
| IT-UC-RunFull-005 | RunL3UseCaseが例外をthrowした場合、部分成功は認めず全体が失敗する | 有効な入力 | RunL2UseCase: pass。RunL3UseCase: `ValidatorExecutionError`をthrow | `ValidatorExecutionError` |

---

## 3. Repositoryテストケース（Infrastructure Adapter）

### HarnessConfigValidatorConfigAdapter

#### CRUDテスト（getLayerConfig）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-HCAdapter-001 | getLayerConfig("L2") | `"L2"` | phasegate.config.json: L2設定あり（enabled=true, validators:["L2-001","L2-002","L2-003"]） | `LayerConfig { layer:"L2", enabled:true, validatorIds:[...], thresholds:{}, strictOnly:false }` |
| IT-REPO-HCAdapter-002 | getLayerConfig("L3") | `"L3"` | phasegate.config.json: L3設定（preset="standard", coverageThreshold=90） | `LayerConfig { layer:"L3", thresholds:{ coverageThreshold:90 }, strictOnly:false }` |
| IT-REPO-HCAdapter-003 | getLayerConfig("L4") | `"L4"` | phasegate.config.json: L4設定あり | `LayerConfig { layer:"L4", enabled:true }` |
| IT-REPO-HCAdapter-004 | preset="strict"の場合strictOnly=trueが返る | `"L3"` | phasegate.config.json: preset="strict" | `LayerConfig.strictOnly=true` |
| IT-REPO-HCAdapter-005 | preset="minimal"の場合L3がdisabledになる | `"L3"` | phasegate.config.json: preset="minimal"（L3 enabled=false） | `LayerConfig.enabled=false` |
| IT-REPO-HCAdapter-006 | harnesses.bundleSizeLimitがL3-002のthresholdsにマッピングされる | `"L3"` | phasegate.config.json: harnesses.bundleSizeLimit=512000 | `LayerConfig.thresholds.bundleSizeLimit=512000` |

#### エラーハンドリング

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-HCAdapter-007 | phasegate.config.jsonが存在しない場合、エラーが返る | `"L2"` | ファイルなし | エラーがthrowされる（HarnessConfigReadError相当） |
| IT-REPO-HCAdapter-008 | phasegate.config.jsonが不正なJSONの場合、パースエラーが返る | `"L2"` | 不正JSON | エラーがthrowされる |

---

### PhaseDependencyPhaseGatePolicyAdapter

#### CRUDテスト（checkPrerequisites）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-PhaseGate-001 | 前提条件を満たす場合、satisfied=trueが返る | `{ unitName:"validator-system", currentPhase:"implementation" }` | Level 1/2のPlan文書が存在。phase-dependency-model: 条件充足を返す | `{ satisfied: true, violations: [] }` |
| IT-REPO-PhaseGate-002 | Level 2のPlan文書が存在しない場合、violated=trueが返る | `{ unitName:"unknown-unit", currentPhase:"implementation" }` | inception/unknown-unit/ディレクトリが存在しない | `{ satisfied: false, violations: [{ code:"L2-001", severity:"error", ... }] }` |
| IT-REPO-PhaseGate-003 | Level 1のPlan文書が存在しない場合も違反が返る | `{ unitName:"validator-system", currentPhase:"implementation" }` | inception/_shared/のplan文書がない | `{ satisfied: false, violations: [...] }` |
| IT-REPO-PhaseGate-004 | phase-dependency-modelが例外をthrowした場合、エラーが伝播する | 有効な入力 | phase-dependency-model: throw Error | エラーがthrowされる |

---

### TraceabilityMetadataPolicyAdapter

#### CRUDテスト（validateMetadata）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Meta-001 | @unitと@layerが正しく記載されたファイルはpassする | `{ filePath:"src/foo.ts", fileContent:"// @unit harness-error\n// @layer domain\nexport class Foo {}" }` | — | `{ passed: true, errors: [] }` |
| IT-REPO-Meta-002 | @unitコメントがないファイルはL2-002エラーが返る | `{ filePath:"src/foo.ts", fileContent:"// @layer domain\nexport class Foo {}" }` | — | `{ passed: false, errors: [{ code:"L2-002", ... }] }` |
| IT-REPO-Meta-003 | @layerコメントがないファイルはL2-002エラーが返る | `{ filePath:"src/foo.ts", fileContent:"// @unit harness-error\nexport class Foo {}" }` | — | `{ passed: false, errors: [{ code:"L2-002", ... }] }` |
| IT-REPO-Meta-004 | @story-idがHXX-XX形式でない場合はエラーが返る | `{ filePath:"src/foo.ts", fileContent:"// @unit x\n// @layer domain\n// @story-id US-001\n" }` | — | `{ passed: false, errors: [{ code:"L2-002", ... }] }` |
| IT-REPO-Meta-005 | バイナリファイル（.png等）はスキップされる | `{ filePath:"assets/logo.png", fileContent:"..." }` | — | `{ passed: true, errors: [] }` |
| IT-REPO-Meta-006 | テストファイルの@story HXX-XX形式が正しい場合はpassする | `{ filePath:"__tests__/foo.test.ts", fileContent:"// @story H01-01\n..." }` | StoryId: H01-01を有効と判定 | `{ passed: true, errors: [] }` |

---

### BiomeAstTestQualityAnalyzerAdapter

#### CRUDテスト（analyzeTestFiles）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-TestQuality-001 | AAAコメントが全て揃ったテストファイルはpassする | `targetPaths: ["tests/valid.test.ts"]` | ファイル内容: `// Arrange`, `// Act`, `// Assert`が存在 | `results[0].passed=true, violations=[]` |
| IT-REPO-TestQuality-002 | actualではなくresultを使っているファイルはL2-003エラーが返る | `targetPaths: ["tests/invalid.test.ts"]` | ファイル内容: `const result = await usecase.execute()` | `results[0].passed=false, violations`にL2-003エラー |
| IT-REPO-TestQuality-003 | 1テストに複数Actがあるファイル（single-act違反）はL2-003エラーが返る | `targetPaths: ["tests/multi-act.test.ts"]` | ファイル内容: `// Act`が2回登場 | `results[0].passed=false, violations`にL2-003エラー |
| IT-REPO-TestQuality-004 | 英語テスト名を使っているファイルはL2-003エラーが返る | `targetPaths: ["tests/english.test.ts"]` | ファイル内容: `it('returns 200 when valid input', ...)` | `results[0].passed=false` |
| IT-REPO-TestQuality-005 | targetPathsが空の場合、空のresults[]が返る | `targetPaths: []` | — | `results=[]` |
| IT-REPO-TestQuality-006 | no-domain-mock違反（Domain層オブジェクトをモックしているテスト）を検出すること | `targetPaths: ["tests/bad-mock.test.ts"]` | ファイル内容: `vi.mock('./domain/aggregates/invoice')` などDomain層をモック | `results[0].passed=false, violations`にL2-003エラー（no-domain-mock違反） |
| IT-REPO-TestQuality-007 | E2E seed pattern違反（`beforeEach`でDB直接操作など）を含むファイルはL2-003エラーが返る | `targetPaths: ["tests/e2e-bad.test.ts"]` | ファイル内容: `beforeEach(() => db.raw('DELETE FROM ...'))` などシードパターン違反 | `results[0].passed=false, violations`にL2-003エラー（E2E seed pattern違反） |

---

### FileSystemSecurityPatternScannerAdapter

#### CRUDテスト（scan）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Security-001 | セキュリティ問題のないファイル群はpassする | `targetPaths: ["src/safe.ts"]` | ファイル内容: 通常のコード | `{ passed: true, findings: [] }` |
| IT-REPO-Security-002 | ハードコードされたAPIキーを含むファイルはL3-001エラーが返る | `targetPaths: ["src/config.ts"]` | ファイル内容: `const API_KEY = "sk-abc123xyz"` | `{ passed: false, findings: [{ code:"L3-001", severity:"error", ... }] }` |
| IT-REPO-Security-003 | SQLインジェクション脆弱パターンを含むファイルはL3-001エラーが返る | `targetPaths: ["src/query.ts"]` | ファイル内容: `` `SELECT * FROM users WHERE id = ${userId}` `` | `{ passed: false, findings: [{ code:"L3-001", ... }] }` |
| IT-REPO-Security-004 | 複数ファイルにわたるスキャンで正しくfindings.filePath:lineNumberが付与される | `targetPaths: ["src/a.ts", "src/b.ts"]` | a.tsに問題あり、b.tsは正常 | `findings[0]`のmessageに"src/a.ts"のパスが含まれる |

---

### AstPerformanceScannerAdapter

#### CRUDテスト（scan）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Perf-001 | パフォーマンス問題のないファイル群はpassする | `targetPaths: ["src/clean.ts"], thresholds: { bundleSizeLimit: 512000 }` | ファイル内容: 通常コード。biome-ast-engine: violations=[] | `{ passed: true, findings: [] }` |
| IT-REPO-Perf-002 | ループ内awaitを含むファイルはL3-002エラーが返る | `targetPaths: ["src/slow.ts"], thresholds: {}` | biome-ast-engine: ループ内await違反を返す | `{ passed: false, findings: [{ code:"L3-002", ... }] }` |
| IT-REPO-Perf-003 | strictOnly=falseの環境ではbundleSizeLimitチェックがスキップされる | `targetPaths: ["src/"], thresholds: { bundleSizeLimit: 1 }` | strictOnly=false（LayerConfig経由） | bundleSizeLimitに関するfindingsが含まれない |

---

### JsonCoverageReportAdapter

#### CRUDテスト（getCoverage）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Coverage-001 | 正常なcoverage-summary.jsonが存在する場合、カバレッジデータが返る | なし | `coverage/coverage-summary.json`: overallCoverage=92、perFile情報あり | `{ overallCoverage: 92, perFileCoverage: [...] }` |
| IT-REPO-Coverage-002 | coverageが90%未満の場合も値として返す（閾値判定はUseCase側） | なし | coverage-summary.json: overallCoverage=85 | `{ overallCoverage: 85, ... }` |
| IT-REPO-Coverage-003 | カバレッジレポートファイルが存在しない場合、CoverageReportNotFoundErrorが返る | なし | ファイルなし | `CoverageReportNotFoundError` |
| IT-REPO-Coverage-004 | 不正なJSONフォーマットの場合、パースエラーが返る | なし | 不正なJSON | エラーがthrowされる |

---

### NyquistAcCoveragePolicyAdapter

#### CRUDテスト（getPolicy）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Nyquist-001 | getPolicy()がAcCoverageGatePolicyインスタンスを返す | なし | nyquist-validation: 有効なpolicyオブジェクトを返す | `policy.check`メソッドが存在する |
| IT-REPO-Nyquist-002 | 返されたpolicyのcheck()がRequirementTestMatrixを検証する | RequirementTestMatrix（全AC網羅済み） | nyquist-validation: passed=trueを返す | `{ passed: true, errors: [] }` |

---

### MarkdownDesignDocumentAdapter

#### CRUDテスト（loadDesignDocuments）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-DesignDoc-001 | domain_model.mdが存在する場合、概念一覧が返る | `targetUnits: ["harness-error"]` | docs/product/construction/harness-error/domain_model.md が存在 | `concepts`に"HarnessError"等のクラス名が含まれる |
| IT-REPO-DesignDoc-011 | HTML comment形式のpointersを含む場合、設計要素ごとのpointer一覧が返る | `domain_model.md` に `<!-- pointers: ... -->` を記述 | `getElementPointers(["test-unit"])` | element名をkeyにしたpath配列が返る |
| IT-REPO-DesignDoc-012 | `<pointers>` block形式のpointersを含む場合、複数pointerが返る | `domain_model.md` に `<pointers>` blockを記述 | `getElementPointers(["test-unit"])` | block内の複数pathが配列で返る |
| IT-REPO-DesignDoc-002 | ADR参照（ADR-001等）がadrRefsに収集される | `targetUnits: ["harness-error"]` | domain_model.mdにADR-001参照が含まれる | `adrRefs`に"ADR-001"が含まれる |
| IT-REPO-DesignDoc-003 | 同一Unit文書の2回目の読み取りがキャッシュから返る | `targetUnits: ["harness-error"]` | ファイルI/Oをspyでカウント | ファイルI/Oが1回のみ実行される |
| IT-REPO-DesignDoc-004 | 存在しないUnitを指定した場合、空の構造化データが返る | `targetUnits: ["nonexistent-unit"]` | ディレクトリ/ファイルが存在しない | 戻り値が空配列 |

---

### BiomeAstSourceCodeAnalyzerAdapter

#### CRUDテスト（analyzeExports）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-SourceAnalyzer-001 | ソースファイルのエクスポート一覧が返る | `targetUnits: ["harness-error"]` | scripts/harness/harness-error/配下にtsファイルが存在 | `exports`に"HarnessError"等のシンボルが含まれる |
| IT-REPO-SourceAnalyzer-002 | import一覧が正しく収集される | `targetUnits: ["harness-error"]` | tsファイルにimport文が含まれる | `imports`に対応する`source`が含まれる |

---

### ImportGraphSourceAnalysisAdapter

#### CRUDテスト（getImportGraph）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-ImportGraph-001 | biome-ast-engineのImportGraphがnodesとedgesにマッピングされる | なし | biome-ast-engine: ImportGraph（nodes/edges）を返す | `{ nodes: [...], edges: [...] }` |
| IT-REPO-ImportGraph-002 | ImportGraphが未構築の場合、空グラフが返る | なし | biome-ast-engine: 空のグラフを返す | `{ nodes: [], edges: [] }` |

---

### AdrFoundationReferenceAdapter

#### CRUDテスト（exists / getMetadata）

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-AdrRef-001 | 存在するADR参照（"ADR-001"）に対してexists()がtrueを返す | `"ADR-001"` | docs/ADR/001-xxx.mdが存在。adr-foundation: exists=trueを返す | `true` |
| IT-REPO-AdrRef-002 | 存在しないADR参照（"ADR-999"）に対してexists()がfalseを返す | `"ADR-999"` | adr-foundation: exists=falseを返す | `false` |
| IT-REPO-AdrRef-003 | getMetadata()がADRのフロントマターを返す | `"ADR-001"` | adr-foundation: {adrId:"001", title:"...", status:"Accepted"}を返す | `{ adrId:"001", title:"...", status:"Accepted" }` |
| IT-REPO-AdrRef-004 | status="Deprecated"のADRに対してgetMetadata()が警告を含む結果を返す | `"ADR-005"` | adr-foundation: status="Deprecated"のメタデータを返す | `{ status:"Deprecated", ... }`（warningあり） |

---

## 4. CLIハンドラー（Controller/API）テストケース

### RunValidatorsHandler

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-RunValidators-001 | `--layer all --unit validator-system --phase implementation` | stdout出力あり（human形式）、終了コード0（全pass） |
| IT-API-RunValidators-002 | `--layer L2 --unit validator-system --phase implementation` | L2バリデータのみ実行。終了コード0 |
| IT-API-RunValidators-003 | `--format ci` | JSON形式でstdout出力。`{ status:"pass", errors:[], summary:{ totalChecks:10, passed:10, failed:0, warnings:0 } }` |
| IT-API-RunValidators-004 | `--format agent` | AIエージェント向け詳細テキスト形式でstdout出力 |
| IT-API-RunValidators-005 | `--no-l4` フラグを指定した場合 | L4バリデータが実行されず、totalChecks=7 |
| IT-API-RunValidators-008 | `--format json` を指定した場合 | 未対応formatとして clear error を出し exit 2 になる。`validate` の対応 format は `human\|agent\|ci` のみ。@work-item-id WI-113 |

### WI-107: L4 advisory / gating policy

`validate --layer L4` は disabled L4 でも明示実行として L4 validator を走らせる。warning は既定では advisory として exit 0 を維持し、`--fail-on-warning` または config `validate.failOnWarning=true` のときだけ gating failure として exit 1 にする。`validate --layer all` は config disabled の L4 を skip として出力に含め、skip は warning gating の対象にしない。@work-item-id WI-107

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-RunValidators-006 | `--layer invalid-layer` | stderr出力あり、終了コード2 |
| IT-API-RunValidators-007 | RunFullValidationUseCaseが`ValidatorExecutionError`をthrowした場合 | stderr出力あり、終了コード2 |

#### 異常系（終了コード）

| ケースID | シナリオ | 期待終了コード |
|---------|---------|--------------|
| IT-API-RunValidators-008 | 全バリデータがpassした場合 | 0 |
| IT-API-RunValidators-009 | 1件以上のバリデータがfailした場合 | 1 |
| IT-API-RunValidators-010 | 実行エラー（I/O失敗等）が発生した場合 | 2 |

---

### RunQuickModeHandler

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-RunQuick-001 | `--relaxation-profile '{"l2":{...},"l3":{...},"l4":{"all":false},...}' --target-paths src/ --unit unit-a --phase impl` | stdout出力あり（human形式）、終了コード0 |
| IT-API-RunQuick-002 | `--format ci` を追加した場合 | JSON形式でstdout出力 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-RunQuick-003 | `--relaxation-profile` が省略された場合 | stderr出力あり、終了コード2 |
| IT-API-RunQuick-004 | `--relaxation-profile` に不正なJSONを渡した場合 | `InvalidRelaxationProfileError`相当のstderr出力、終了コード2 |

#### 異常系（終了コード）

| ケースID | シナリオ | 期待終了コード |
|---------|---------|--------------|
| IT-API-RunQuick-005 | 緩和実行後に全バリデータ通過した場合 | 0 |
| IT-API-RunQuick-006 | 1件以上のバリデータがfailした場合 | 1 |
| IT-API-RunQuick-007 | プロファイル不正・I/O失敗の場合 | 2 |

---

### ReportValidationResultsHandler

#### 正常系

| ケースID | 入力 | 期待レスポンス |
|---------|------|--------------|
| IT-API-Report-001 | `--input results.json --format human` | AggregatedValidationReport相当のhuman形式出力、終了コード0（全pass） |
| IT-API-Report-002 | `--input results.json --format ci` | JSON形式でstdout出力 |
| IT-API-Report-003 | stdinから`ValidationResultContract[]` JSONを受け取る場合 | stdinの内容が集約されてstdout出力 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-Report-004 | 不正なJSONファイルを`--input`に指定した場合 | stderr出力あり、終了コード2 |
| IT-API-Report-005 | `--input`のファイルが存在しない場合 | stderr出力あり、終了コード2 |

---

## 5. シードデータ要件

| データセット | 用途 | 内容 |
|------------|------|------|
| `valid-harness-config.json` | HarnessConfigValidatorConfigAdapterテスト | preset="standard"、全L2/L3/L4有効、coverageThreshold=90、bundleSizeLimit=512000 |
| `strict-harness-config.json` | strictOnly=true条件のテスト | preset="strict"、全レイヤー有効 |
| `minimal-harness-config.json` | L3 disabled条件のテスト | preset="minimal"、L3 enabled=false |
| `valid-metadata-file.ts` | TraceabilityMetadataPolicyAdapterテスト | `// @unit harness-error`、`// @layer domain`、`// @story-id H01-01` を含む正常なTSファイル |
| `missing-unit-file.ts` | @unitなしファイル | `// @layer domain` のみ |
| `valid-test-file.test.ts` | BiomeAstTestQualityAnalyzerAdapterテスト | AAAコメント・actual変数・日本語テスト名・describe-it構造を持つ正常なテストファイル |
| `invalid-test-file.test.ts` | テスト品質違反ファイル | `const result = await ...`（actual未使用）、英語テスト名 |
| `secure-source.ts` | SecurityPatternScannerAdapterテスト | セキュリティ問題なしの通常ソース |
| `insecure-source.ts` | セキュリティ問題検出テスト | `const API_KEY = "sk-hardcoded"` を含む |
| `coverage-summary.json` | JsonCoverageReportAdapterテスト | Istanbul形式のcoverage-summary.json（overallCoverage=92） |
| `low-coverage-summary.json` | カバレッジ低下テスト | overallCoverage=85 |
| `domain_model.md`（fixture） | MarkdownDesignDocumentAdapterテスト | ADR参照・概念定義・レイヤー依存を含む最小限のdomain_model.md |
| `relaxation-profile.json` | RunQuickModeHandlerテスト | l2.maintained=["L2-002"]、l4.all=falseの有効プロファイル |
| `validation-results.json` | ReportValidationResultsHandlerテスト | 全passの`ValidationResultContract[]` JSON |

---

## 6. テスト環境設定

### テストフレームワーク

| 項目 | 設定 |
|------|------|
| フレームワーク | Vitest 3.0.0 |
| 言語 | TypeScript 5.x (ES2022, Node16, strict) |
| テストファイル配置 | `scripts/harness/__tests__/integration/validator-system/` |
| フィクスチャ配置 | `scripts/harness/__tests__/fixtures/validator-system/` |

### モック設定

| 対象 | モック方法 |
|------|----------|
| ValidatorConfigPort | `vi.fn()` によるインターフェースモック |
| PhaseGatePolicyPort | `vi.fn()` によるインターフェースモック |
| MetadataPolicyPort | `vi.fn()` によるインターフェースモック |
| TestQualityAnalyzerPort | `vi.fn()` によるインターフェースモック |
| SecurityPatternScannerPort | `vi.fn()` によるインターフェースモック |
| PerformanceScannerPort | `vi.fn()` によるインターフェースモック |
| CoverageReportPort | `vi.fn()` によるインターフェースモック |
| AcCoveragePolicyPort | `vi.fn()` によるインターフェースモック |
| biome-ast-engine（Adapter層） | `vi.mock('scripts/harness/shared-kernel/biome-ast-engine')` |
| phase-dependency-model（Adapter層） | `vi.mock('scripts/harness/shared-kernel/phase-dependency-model')` |
| nyquist-validation（Adapter層） | `vi.mock('scripts/harness/shared-kernel/nyquist-validation')` |
| adr-foundation（Adapter層） | `vi.mock('scripts/harness/shared-kernel/adr-foundation')` |
| ファイルシステム（Adapter層） | `tmp` ディレクトリへの実ファイル書き込み + `afterEach`クリーンアップ |

### 認証設定

認証機構なし（ローカルCLIツールのため不要）。

### テスト命名規約

- テスト関連ファイル名: すべてkebab-case（例: `run-l2-validators-usecase.it.test.ts`）
- テストケース名: すべて日本語
- テスト構造: `target()` / `describe()` / `context()` / `it()` のエイリアス使用
- 実行結果変数: `actual` に統一
- パターン: AAAパターン（// Arrange / // Act / // Assert）

<!-- @work-item-id WI-132, WI-133, WI-136, WI-137, WI-138 -->
## G4 Contract Traceability Integration Tests

- `RunL2ValidatorsUseCase` default execution includes `L2-015`.
- Injecting `ContractTraceabilityPolicyPort` with an uncovered public contract returns a failing `L2-015` result.
- `HarnessConfigValidatorConfigAdapter` default L2 validator list includes `L2-015`.
- `config-foundation` validator-system config mapper propagates `L2-015` in the L2 validator list.

<!-- @work-item-id WI-159, WI-164 -->
## P1 Validator Catalog Regression Cases

- `RunL2ValidatorsUseCase` default execution returns `L2-001`, `L2-002`, `L2-003`, `L2-013`, `L2-014`, and `L2-015` in registry order.
- `RunFullValidationUseCase` with `targetLayers=["L4"]` force-enables disabled L4 for explicit `validate --layer L4`.
- `RunFullValidationUseCase` with aggregate/all execution keeps disabled L4 as skipped results and does not fail solely because L4 is skipped.
- `RunL4ValidatorsUseCase` maps `L4-004` freshness warnings and `L4-005` broken pointer warnings into standard `ValidationResultContract` errors with validator IDs preserved.
- Quick Mode relaxation profile containing canonical L2 skipped IDs (`L2-001`, `L2-013`, `L2-015`) executes without `InvalidRelaxationProfileError`.
## WI-217 Personal L4 Consistency Integration Tests

<!-- @work-item-id WI-217 -->

- A personal install fixture with `.phasegate-local/inception/**/description.md` and no product annotation reports an L4-002 missing reflection finding.
- Adding the matching `@work-item-id` annotation under `.phasegate-local/product/construction` clears the L4-002 finding.

## WI-212 Language Dispatch Integration Tests

<!-- @work-item-id WI-212 -->

- L3 validation for a TypeScript project executes TypeScript source validators through registered adapters.
- L3 validation for a Python-only project reports TypeScript-only validators as unsupported-language skips.
- Generic document validators still execute for non-TypeScript project language declarations.
