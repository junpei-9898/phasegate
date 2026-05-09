# ITテスト設計: harness-api

@story-id H09-01
@story-id H09-02
@story-id H09-03
@story-id H09-04
@work-item-id WI-025
> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **最終更新**: 2026-04-24（ISSUE-025 init --agent setup の IT 観点を追加）
> **Wave**: 2（コア品質機構）
> **対応ストーリー**: H09-01, H09-02, H09-03, H09-04
> **参照計画**: `docs/inception/harness-api/it_test_design_plan.md`

---

## 1. 対象コンポーネント

- **UseCase**: InitializeCommandRegistryUseCase, DispatchCommandUseCase, DecideExitCodeUseCase, DeriveHarnessStatusUseCase
- **Infrastructure Adapter**: ValidatorSystemExecutionAdapter, PhaseDependencyModelQueryAdapter, BiomeAstEngineLintAdapter, NyquistValidationImpactAnalysisAdapter, FileSystemArtifactScannerAdapter, HarnessConfigQueryAdapter
- **Presentation Handler**: CheckReadyHandler, CheckPhaseHandler, CiCheckHandler, DetectDriftHandler, StatusHandler, LintHandler, CompleteCheckHandler, ImpactAnalysisHandler
- **Cross-Layer Integration**: CommandDispatch統合フロー, StatusDerivation統合フロー, Shared Kernel Contract検証

---

## 2. UseCaseテストケース

### InitializeCommandRegistryUseCase（H09-01）

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/initialize-command-registry-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-InitRegistry-001 | 8コマンドの定義を一括登録できること | 8コマンドのCliCommandDefinitionInput配列 | CommandRegistryは実体を使用 | registeredCount=8、commandNamesに全8コマンド名が含まれる、failedRegistrations=[] |
| IT-UC-InitRegistry-002 | 登録済みコマンド名の一覧が昇順で返されること | 8コマンドのCliCommandDefinitionInput配列（順序不定） | CommandRegistryは実体を使用 | commandNamesがアルファベット昇順（phasegate:check-phase < phasegate:check-ready < ... ) |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-InitRegistry-003 | 重複するコマンド名が入力された場合、成功した登録はそのまま維持してfailedRegistrationsに記録されること | 同一commandNameのInput 2件を含む配列（計9件） | CommandRegistryは実体を使用 | failedRegistrations.length=1、registeredCountは8、エラー理由にDuplicateCommandNameErrorが示される |
| IT-UC-InitRegistry-004 | `harness:` プレフィックスのないコマンド名はInvalidCommandNameErrorをスローすること | commandName='invalid-cmd' のInput | CommandRegistryは実体を使用 | InvalidCommandNameErrorがスローされる |
| IT-UC-InitRegistry-005 | コマンドリストが空配列の場合、registeredCount=0で正常完了すること | commands=[] | CommandRegistryは実体を使用 | registeredCount=0、commandNames=[]、failedRegistrations=[] |

---

### DispatchCommandUseCase（H09-02）

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-DispatchCmd-001 | check-readyコマンドが全ストーリー通過状態を返すこと | commandName='phasegate:check-ready', args={}, flags={} | PhaseGateQueryPortモック: queryAllStories→3件全通過のPhaseGateStoryResult[] | response.status='pass', exitCode=0, response.data.allPassed=true |
| IT-UC-DispatchCmd-002 | check-phaseコマンドが指定Unitのフェーズ情報を返すこと | commandName='phasegate:check-phase', args={unit:'harness-error'}, flags={} | PhaseGateQueryPortモック: queryUnit→PhaseInfo(currentLevel=2) | response.status='pass', exitCode=0, response.data.unitId='harness-error' |
| IT-UC-DispatchCmd-003 | ci-checkコマンドが全L3バリデータ通過を返すこと | commandName='phasegate:ci-check', args={}, flags={} | ValidatorExecutionPortモック: runL3Validators→3件全通過のValidatorCheckItem[] | response.status='pass', exitCode=0, response.data.allPassed=true |
| IT-UC-DispatchCmd-004 | detect-driftコマンドが乖離なしを返すこと | commandName='phasegate:detect-drift', args={}, flags={} | ValidatorExecutionPortモック: runDriftDetection→[] | response.status='pass', exitCode=0, response.data.totalCount=0 |
| IT-UC-DispatchCmd-005 | lintコマンドがpass結果を返すこと | commandName='phasegate:lint', args={}, flags={} | BiomeLintPortモック: runLint→{passed:true, errors:[], warnings:[]} | response.status='pass', exitCode=0 |
| IT-UC-DispatchCmd-006 | impact-analysisコマンドが影響テストケースを返すこと | commandName='phasegate:impact-analysis', args={storyId:'H09-01'}, flags={} | ImpactAnalysisPortモック: analyze→ImpactAnalysisResult（ダミー） | response.status='pass', exitCode=0, response.data!=null |
| IT-UC-DispatchCmd-011 | complete-checkコマンドがValidatorExecutionPortとBiomeLintPortの両方を呼び出すこと | commandName='phasegate:complete-check', args={}, flags={} | ValidatorExecutionPortモック: runL3Validators→pass, BiomeLintPortモック: runLint→{passed:true, errors:[]} | ValidatorExecutionPortとBiomeLintPortの両方がそれぞれ1回ずつ呼び出されたことをspy確認。response.status='pass', exitCode=0 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-DispatchCmd-007 | 未登録コマンド名の場合、exitCode=2のerror responseを返すこと | commandName='harness:unknown-cmd', args={}, flags={} | CommandDispatchServiceは実体を使用（CommandRegistryに登録なし） | response.status='error', exitCode=2, response.errors.length>=1 |
| IT-UC-DispatchCmd-008 | check-phaseで存在しないUnit名を指定した場合、exitCode=1のfail responseを返すこと | commandName='phasegate:check-phase', args={unit:'non-existent-unit'}, flags={} | PhaseGateQueryPortモック: queryUnit→null | response.status='fail', exitCode=1 |
| IT-UC-DispatchCmd-009 | ポート呼び出しが例外をスローした場合、exitCode=2のerror responseを返すこと（例外は再スローしない） | commandName='phasegate:ci-check', args={}, flags={} | ValidatorExecutionPortモック: runL3Validators→throw new Error('network error') | response.status='error', exitCode=2、UseCase外に例外が伝播しない |
| IT-UC-DispatchCmd-010 | detect-driftで乖離が検出された場合、exitCode=1のfail responseを返すこと | commandName='phasegate:detect-drift', args={}, flags={} | ValidatorExecutionPortモック: runDriftDetection→[DriftItem1件] | response.status='fail', exitCode=1, response.data.totalCount=1 |

---

### DecideExitCodeUseCase（H09-03）

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/decide-exit-code-usecase.test.ts`

#### 正常系（ExitCode決定ルール網羅）

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-DecideExit-001 | status='pass'のコマンドはexitCode=0を返すこと | status='pass', commandName='phasegate:check-ready' | モックなし（純粋関数） | exitCode=0 |
| IT-UC-DecideExit-002 | status='fail'の通常コマンドはexitCode=1を返すこと | status='fail', commandName='phasegate:ci-check' | モックなし | exitCode=1 |
| IT-UC-DecideExit-003 | status='error'のコマンドはexitCode=2を返すこと | status='error', commandName='phasegate:lint' | モックなし | exitCode=2 |

#### 特殊ルール（phasegate:status D5ルール）

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-DecideExit-004 | phasegate:statusでstatus='fail'でもexitCode=0を返すこと（D5ルール） | status='fail', commandName='phasegate:status' | モックなし | exitCode=0、reason文字列にD5ルール適用の旨が含まれる |
| IT-UC-DecideExit-005 | phasegate:statusでstatus='pass'はexitCode=0を返すこと | status='pass', commandName='phasegate:status' | モックなし | exitCode=0 |
| IT-UC-DecideExit-006 | phasegate:statusでstatus='error'はexitCode=2を返すこと | status='error', commandName='phasegate:status' | モックなし | exitCode=2 |

---

### DeriveHarnessStatusUseCase（H09-04）

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-DeriveStatus-001 | 全レイヤーの成果物が揃っている場合、全LayerHealth.lastResult='pass'を返すこと | StatusDerivationInput（パラメータなし） | ArtifactScannerPortモック: scan→全レイヤー成果物ありのArtifactScanResult; ConfigQueryPortモック: getPresetInfo→{name:'standard', enabledLayers:['L1','L2','L3']} | HarnessStatusSummary.layers全てlastResult='pass', layers[3].enabled=false（L4がstandardでは無効） |
| IT-UC-DeriveStatus-002 | strictプリセットで全成果物が揃っている場合、L1-L4全てenabledかつlastResult='pass'を返すこと | StatusDerivationInput | ArtifactScannerPortモック: 全レイヤー成果物あり; ConfigQueryPortモック: getPresetInfo→{name:'strict', enabledLayers:['L1','L2','L3','L4']} | 全4レイヤーのlastResult='pass' |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-DeriveStatus-003 | 有効なレイヤーの成果物が存在しない場合、lastResult='unknown'を返すこと | StatusDerivationInput | ArtifactScannerPortモック: scan→L3成果物なしのArtifactScanResult; ConfigQueryPortモック: getPresetInfo→{name:'standard', enabledLayers:['L1','L2','L3']} | L3のLayerHealth.lastResult='unknown' |
| IT-UC-DeriveStatus-004 | ArtifactScannerPortが例外をスローした場合、HarnessApiDomainErrorがスローされること | StatusDerivationInput | ArtifactScannerPortモック: scan→throw new Error('fs error') | HarnessApiDomainErrorがスローされる |
| IT-UC-DeriveStatus-005 | ConfigQueryPortが例外をスローした場合、HarnessApiDomainErrorがスローされること | StatusDerivationInput | ConfigQueryPortモック: getPresetInfo→throw new Error('config error') | HarnessApiDomainErrorがスローされる |
| IT-UC-DeriveStatus-006 | minimalプリセットの場合、L2-L4がdisabledとして返されること | StatusDerivationInput | ArtifactScannerPortモック: 全成果物あり; ConfigQueryPortモック: getPresetInfo→{name:'minimal', enabledLayers:['L1']} | L1のみenabled=true、L2-L4はenabled=false |

---

## 3. Infrastructure Adapterテストケース

### ValidatorSystemExecutionAdapter

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/validator-system-execution-adapter.test.ts`

#### CRUDテスト相当（ポート操作）

| ケースID | 操作 | 入力 | 事前データ/スタブ | 期待結果 |
|---------|------|------|----------------|---------|
| IT-REPO-ValidatorExec-001 | runL3Validators実行 | なし | validator-systemスタブ: L3-001〜L3-004を全通過で返す | ValidatorCheckItem[]の長さ=4、全てpassed=true |
| IT-REPO-ValidatorExec-002 | runL3Validatorsでバリデータ失敗 | なし | validator-systemスタブ: L3-003（coverage）がfailed+HarnessError1件 | ValidatorCheckItem[]内にpassed=falseが1件、errors.length=1 |
| IT-REPO-ValidatorExec-003 | runDriftDetection実行（乖離なし） | なし | validator-systemスタブ: drift-detectが空配列を返す | DriftItem[].length=0 |
| IT-REPO-ValidatorExec-004 | runDriftDetection実行（乖離あり） | なし | validator-systemスタブ: drift-detectが2件のDriftItemを返す | DriftItem[].length=2、各DriftItemにdirection/unit/element/recommendationが含まれる |
| IT-REPO-ValidatorExec-005 | validator-systemが例外をスローした場合、ValidatorCheckItemのpassed=falseにラップされること | なし | validator-systemスタブ: runL3Validators→throw new Error | ValidatorCheckItem[]内にpassed=falseのアイテムが存在する（例外は再スローしない） |

#### トランザクションテスト（スタブ差し替え）

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-REPO-ValidatorExec-006 | runAllValidatorsはL1-L4全バリデータの結果を集約して返すこと | ValidatorCheckItem[]の長さ>=4（L1×8 + L2×3 + L3×4 + L4×3） |

---

### PhaseDependencyModelQueryAdapter

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/phase-dependency-model-query-adapter.test.ts`

#### CRUDテスト相当

| ケースID | 操作 | 入力 | 事前データ/スタブ | 期待結果 |
|---------|------|------|----------------|---------|
| IT-REPO-PhaseGateQuery-001 | queryAllStories実行（全ストーリー通過） | なし | phase-dependency-modelスタブ: 3件全通過のPhaseGateStoryResult[]を返す | PhaseGateStoryResult[].length=3、全てpassed=true |
| IT-REPO-PhaseGateQuery-002 | queryAllStories実行（一部未通過） | なし | phase-dependency-modelスタブ: 1件missingPhases=['domain-design']を含む | passed=falseのResult.missingPhases=['domain-design'] |
| IT-REPO-PhaseGateQuery-003 | queryUnit実行（存在するUnit） | unitId='harness-error' | phase-dependency-modelスタブ: PhaseInfo(unitId='harness-error', currentLevel=2)を返す | PhaseInfo.unitId='harness-error'、currentLevel=2 |
| IT-REPO-PhaseGateQuery-004 | queryUnit実行（存在しないUnit） | unitId='non-existent' | phase-dependency-modelスタブ: nullを返す | nullが返される（例外は投げない） |
| IT-REPO-PhaseGateQuery-005 | phase-dependency-modelが例外をスローした場合、呼び出し元に伝播すること | なし | phase-dependency-modelスタブ: throw new Error('query failed') | Errorが呼び出し元にスローされる |

---

### BiomeAstEngineLintAdapter

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/biome-ast-engine-lint-adapter.test.ts`

#### CRUDテスト相当

| ケースID | 操作 | 入力 | 事前データ/スタブ | 期待結果 |
|---------|------|------|----------------|---------|
| IT-REPO-BiomeLint-001 | runLint実行（全通過） | なし | biome-ast-engineスタブ: 全L1ルールpassedの結果を返す | {passed:true, errors:[], warnings:[]} |
| IT-REPO-BiomeLint-002 | runLint実行（エラーあり） | なし | biome-ast-engineスタブ: L1-001違反のRuleViolation 2件 | passed=false、errors.length=2、各errorにcode/severity/message/suggestionが含まれる |
| IT-REPO-BiomeLint-003 | runLint実行（warningのみ） | なし | biome-ast-engineスタブ: warningのみのRuleViolation 1件 | passed=true（warningはpassed判定に影響しない）、warnings.length=1 |
| IT-REPO-BiomeLint-004 | RuleViolationがHarnessError形式に正しく変換されること | なし | biome-ast-engineスタブ: {filePath, line, column, ruleName, message, severity, fix_example?}のRuleViolation | errors[0].code=ruleName、errors[0].severity='error'、errors[0].message が含まれる |

---

### NyquistValidationImpactAnalysisAdapter

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts`

#### CRUDテスト相当

| ケースID | 操作 | 入力 | 事前データ/スタブ | 期待結果 |
|---------|------|------|----------------|---------|
| IT-REPO-ImpactAnalysis-001 | analyze実行（storyId存在） | storyId='H09-01' | nyquist-validationスタブ: ImpactAnalysisResult(storyId='H09-01')を返す | ImpactAnalysisResultが返される |
| IT-REPO-ImpactAnalysis-002 | analyze実行（storyId未存在） | storyId='H99-99' | nyquist-validationスタブ: nullを返す | nullが返される |
| IT-REPO-ImpactAnalysis-003 | storyId形式が不正な場合HarnessApiDomainErrorをスローすること | storyId='invalid-id'（HXX-XX形式でない） | モック不要 | HarnessApiDomainErrorがスローされる |
| IT-REPO-ImpactAnalysis-004 | requirement-test-matrix.jsonが存在しない場合nullを返すこと | storyId='H09-01' | nyquist-validationスタブ: matrix未存在シミュレーション（null返却） | nullが返される |
| IT-REPO-ImpactAnalysis-005 | nyquist-validationが例外をスローした場合、呼び出し元に伝播すること | storyId='H09-01' | nyquist-validationスタブ: throw new Error | Errorが呼び出し元にスローされる |

---

### FileSystemArtifactScannerAdapter

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/file-system-artifact-scanner-adapter.test.ts`

#### CRUDテスト相当

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-ArtifactScan-001 | scan実行（全成果物あり） | なし | テスト用フィクスチャーディレクトリに全レイヤーの成果物を配置（design-doc, test-file, metadata） | ArtifactScanResult.foundArtifacts全件present=true |
| IT-REPO-ArtifactScan-002 | scan実行（L3テストファイルなし） | なし | フィクスチャーにL3統合テストファイルなし | foundArtifactsにL3のArtifactPresence.present=false が含まれる |
| IT-REPO-ArtifactScan-003 | scan実行（空ディレクトリ） | なし | フィクスチャー: 対象ディレクトリが空 | ArtifactScanResult.foundArtifactsは空またはpresent=false |
| IT-REPO-ArtifactScan-004 | phasegate.config.jsonのpathsを参照してスキャン対象を決定すること | なし | テスト用phasegate.config.json（paths.designDocs='docs/product/construction'）を参照 | scannedPathsにdesignDocsパスが含まれる |
| IT-REPO-ArtifactScan-005 | ファイルシステムアクセス失敗時に例外をスローすること | なし | アクセス不可なパスを設定（権限なしディレクトリシミュレーション） | Errorがスローされる |

---

### HarnessConfigQueryAdapter

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/harness-config-query-adapter.test.ts`

#### CRUDテスト相当

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-ConfigQuery-001 | getPresetInfo実行（standard） | なし | テスト用phasegate.config.json（project.preset='standard'） | PresetInfo{name:'standard', enabledLayers:['L1','L2','L3']} |
| IT-REPO-ConfigQuery-002 | getPresetInfo実行（strict） | なし | テスト用phasegate.config.json（project.preset='strict'） | PresetInfo{name:'strict', enabledLayers:['L1','L2','L3','L4']} |
| IT-REPO-ConfigQuery-003 | getPresetInfo実行（strict + L4 disabled override） | なし | テスト用phasegate.config.json（project.preset='strict', layers.L4.enabled=false） | PresetInfo{name:'strict', enabledLayers:['L1','L2','L3']} |
| IT-REPO-ConfigQuery-004 | getPresetInfo実行（minimal + L4 enabled override） | なし | テスト用phasegate.config.json（project.preset='minimal', layers.L4.enabled=true） | PresetInfo{name:'minimal', enabledLayers:['L1','L4']} |
| IT-REPO-ConfigQuery-003 | getConfigSummary実行 | なし | テスト用phasegate.config.json（既知のパス） | ConfigSummary.configPathが正しいパス、lastModifiedがISO 8601形式 |
| IT-REPO-ConfigQuery-004 | phasegate.config.jsonが存在しない場合に例外をスローすること | なし | phasegate.config.jsonなし | Errorがスローされる |

---

## 4. Presentation（CLIハンドラー）テストケース

## 3.7 Init / update-skills setup integration（ISSUE-025）

**テスト配置**: `scripts/harness/__tests__/integration/setup/init-codex-agent.integration.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| IT-SET-001 | `--agent claude` で shared skill 実体と Claude 導線が作成される | `phasegate init --agent claude` | `skills/.harness-version` が存在し、`.claude/skills` は `../skills` を向く symlink、`.codex/skills` は未作成 |
| IT-SET-002 | `--agent codex` で Codex hooks と Codex 導線が作成される | `phasegate init --agent codex` | `.codex/hooks.json` が存在し、`.codex/skills` は `../skills` を向く symlink、`.claude/settings.json` は未作成 |
| IT-SET-003 | `--agent both` で両 agent の導線が作成される | `phasegate init --agent both` | `.claude/skills` と `.codex/skills` の両方が symlink として存在 |

### CheckReadyHandler

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CheckReady-001 | 引数なし・フラグなし | DispatchCommandUseCaseモック: response={status:'pass', errors:[], summary:{...}, data:{allPassed:true, stories:[]}}, exitCode=0 | stdout JSON {status:'pass', data.allPassed:true}、process.exitCode=0 |
| IT-API-CheckReady-002 | 未通過ストーリーあり | DispatchCommandUseCaseモック: response={status:'fail', errors:[HarnessError1件], summary:{...}, data:{allPassed:false, stories:[{passed:false}]}}, exitCode=1 | stdout JSON {status:'fail', errors.length=1}、process.exitCode=1 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-CheckReady-003 | 不明な引数（例: unit='xxx'）を渡した場合 | 引数無視または無視してデフォルト動作（phasegate:check-readyは引数不要） |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CheckReady-004 | 引数なし | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

### CheckPhaseHandler

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/check-phase-cli.integration.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CheckPhase-001 | unit='harness-error' | DispatchCommandUseCaseモック: response={status:'pass', data:PhaseInfo{unitId:'harness-error', currentLevel:2}}, exitCode=0 | stdout JSON {status:'pass', data.unitId:'harness-error'}、process.exitCode=0 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-CheckPhase-002 | unit引数なし（必須引数の省略） | stdout JSON {status:'error', errors[0].message に引数不足の旨}、process.exitCode=2 |
| IT-API-CheckPhase-003 | unit=''（空文字） | stdout JSON {status:'error'}、process.exitCode=2 |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CheckPhase-004 | unit='non-existent' | DispatchCommandUseCaseモック: response={status:'fail', errors:[...]}, exitCode=1 | stdout JSON {status:'fail'}、process.exitCode=1 |
| IT-API-CheckPhase-005 | unit='harness-error'、UseCaseが例外スロー | DispatchCommandUseCaseモック: throw new Error | stdout JSON {status:'error'}、process.exitCode=2、例外がプロセス外に伝播しない |

---

### CiCheckHandler

**テスト配置**: `scripts/harness/__tests__/unit/harness-api/ci-check-result.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CiCheck-001 | 引数なし | DispatchCommandUseCaseモック: response={status:'pass', data:{allPassed:true, validatorResults:[...]}}, exitCode=0 | stdout JSON {status:'pass', data.allPassed:true}、process.exitCode=0 |
| IT-API-CiCheck-002 | 引数なし（一部バリデータ失敗） | DispatchCommandUseCaseモック: response={status:'fail', errors:[HarnessError1件], data:{allPassed:false}}, exitCode=1 | stdout JSON {status:'fail', errors.length>=1}、process.exitCode=1 |

#### バリデーションテスト（JSONフォーマット）

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-CiCheck-003 | --prettyフラグあり | stdout JSONがインデント付き整形出力になること |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CiCheck-004 | 引数なし | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

### DetectDriftHandler

**テスト配置**: `scripts/harness/__tests__/unit/harness-api/drift-report-summary.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-DetectDrift-001 | 引数なし | DispatchCommandUseCaseモック: response={status:'pass', data:{drifts:[], totalCount:0}}, exitCode=0 | stdout JSON {status:'pass', data.totalCount:0}、process.exitCode=0 |
| IT-API-DetectDrift-002 | --jsonフラグあり | DispatchCommandUseCaseモック: response={status:'fail', data:{drifts:[...], totalCount:2}}, exitCode=1 | stdout JSONの構造が正しい（--jsonフラグによる出力形式変化なし、既にJSON）、process.exitCode=1 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-DetectDrift-003 | 不明なフラグ（--unknownFlag） | フラグ無視または引数エラーとして処理 |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-DetectDrift-004 | 引数なし | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

### StatusHandler

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-Status-001 | 引数なし（全レイヤー健全） | DispatchCommandUseCaseモック: response={status:'pass', data:HarnessStatusSummary{...}}, exitCode=0 | stdout JSON {status:'pass', data.layers.length=4}、process.exitCode=0 |
| IT-API-Status-002 | 引数なし（一部レイヤー健全性unknown） | DispatchCommandUseCaseモック: response={status:'pass', data:{layers:[{layerId:'L3', lastResult:'unknown'},...]}}, exitCode=0 | stdout JSON {status:'pass'}、process.exitCode=0（statusコマンドはfailでも0） |

#### D5ルール検証（phasegate:status特殊ルール）

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-Status-003 | 引数なし | DispatchCommandUseCaseモック: response={status:'fail', ...}, exitCode=0（D5ルール適用済み） | process.exitCode=0（failでも0） |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-Status-004 | 引数なし | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

### LintHandler

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/biome-ast-engine-lint-adapter.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-Lint-001 | 引数なし（全ルール通過） | DispatchCommandUseCaseモック: response={status:'pass', errors:[], summary:{totalChecks:8, passed:8, failed:0}}, exitCode=0 | stdout JSON {status:'pass'}、process.exitCode=0 |
| IT-API-Lint-002 | 引数なし（L1違反あり） | DispatchCommandUseCaseモック: response={status:'fail', errors:[HarnessError...], summary:{failed:2}}, exitCode=1 | stdout JSON {status:'fail', errors.length>=1}、process.exitCode=1 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-Lint-003 | 不明な引数 | 引数無視または無視してデフォルト動作 |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-Lint-004 | 引数なし | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

### CompleteCheckHandler

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CompleteCheck-001 | 引数なし（全バリデータ通過） | DispatchCommandUseCaseモック: response={status:'pass', summary:{totalChecks:15, passed:15}}, exitCode=0 | stdout JSON {status:'pass'}、process.exitCode=0 |
| IT-API-CompleteCheck-002 | 引数なし（一部失敗） | DispatchCommandUseCaseモック: response={status:'fail', errors:[...], summary:{failed:3}}, exitCode=1 | stdout JSON {status:'fail', errors.length>=1}、process.exitCode=1 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-CompleteCheck-003 | 不明な引数 | 引数無視または無視してデフォルト動作 |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-CompleteCheck-004 | 引数なし | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

### ImpactAnalysisHandler

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts`

#### 正常系

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-ImpactAnalysis-001 | storyId='H09-01' | DispatchCommandUseCaseモック: response={status:'pass', data:ImpactAnalysisResult{storyId:'H09-01'}}, exitCode=0 | stdout JSON {status:'pass', data.storyId:'H09-01'}、process.exitCode=0 |

#### バリデーションテスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-ImpactAnalysis-002 | storyId引数なし（必須引数の省略） | stdout JSON {status:'error', errors[0].message に引数不足の旨}、process.exitCode=2 |
| IT-API-ImpactAnalysis-003 | storyId='invalid'（HXX-XX形式でない） | stdout JSON {status:'error', errors[0].messageにフォーマット不正の旨}、process.exitCode=2 |

#### エラーハンドリングテスト

| ケースID | 入力 | モック設定 | 期待レスポンス |
|---------|------|----------|--------------|
| IT-API-ImpactAnalysis-004 | storyId='H99-99'（未存在） | DispatchCommandUseCaseモック: response={status:'fail', ...}, exitCode=1 | stdout JSON {status:'fail'}、process.exitCode=1 |
| IT-API-ImpactAnalysis-005 | storyId='H09-01' | DispatchCommandUseCaseモック: response={status:'error', ...}, exitCode=2 | stdout JSON {status:'error'}、process.exitCode=2 |

---

## 5. Cross-Layer統合テストケース

### CommandDispatch統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts`

> 論理設計§1.3に指定されているテストファイル。UseCase・DomainService・ポートモックを組み合わせたEnd-to-Endフロー検証（CLI実行を除く）。

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-DispatchInteg-001 | check-readyコマンド全フロー（Presentation→Application→Domain→Port）が正しく連携すること | CheckReadyHandlerを直接呼び出し（CLIなし） | PhaseGateQueryPortモック: 2件通過+1件未通過 | stdout JSON {status:'fail', data.allPassed:false, data.stories.length=3}、process.exitCode=1 |
| IT-API-DispatchInteg-002 | check-phaseコマンド全フロー。CommandRegistry初期化→DispatchCommandUseCase実行が正しく連携すること | 事前にInitializeCommandRegistryUseCaseで8コマンドを登録 → CheckPhaseHandlerを呼び出し | PhaseGateQueryPortモック | 正しいPhaseInfoが返される |
| IT-API-DispatchInteg-003 | CommandRegistryに未登録のコマンド名を指定した場合、全フローを通じてexit=2で返されること | 未登録コマンド名をDispatchCommandUseCaseに直接渡す | モックなし（CommandRegistry実体） | response.status='error', exitCode=2 |
| IT-API-DispatchInteg-004 | complete-checkコマンド全フロー。ValidatorExecutionPortとBiomeLintPortの両方が呼ばれること | commandName='phasegate:complete-check' | ValidatorExecutionPortモック（runAllValidators）+ BiomeLintPortモック（runLint）、両方toHaveBeenCalledWith検証 | 両ポートが正確に1回ずつ呼ばれる |
| IT-API-DispatchInteg-005 | statusコマンド全フロー。ArtifactScannerPort・ConfigQueryPort・StatusDerivationServiceが連携すること | commandName='phasegate:status' | ArtifactScannerPortモック + ConfigQueryPortモック（全メソッド） | response.status='pass' or 'error'（failはD5ルールで0）、exitCode=0 |

---

### StatusDerivation統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts`

> 論理設計§1.3に指定されているテストファイル。DeriveHarnessStatusUseCase + StatusDerivationService（実体）+ ポートモックの統合検証。

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-StatusInteg-001 | 全成果物が揃っているstrictプリセット環境でHarnessStatusSummaryが正しく導出されること | StatusDerivationInput（パラメータなし） | ArtifactScannerPortモック: 全4レイヤー成果物あり; ConfigQueryPortモック: strict, phaseGateSummary{totalStories:5, passedStories:5} | HarnessStatusSummary.isAllLayersHealthy()=true、layers.length=4 |
| IT-API-StatusInteg-002 | 成果物が部分的にない場合、対応するレイヤーのlastResult='unknown'が正しく導出されること | StatusDerivationInput | ArtifactScannerPortモック: L4成果物なし; ConfigQueryPortモック: strict | L4のLayerHealth.lastResult='unknown' |
| IT-API-StatusInteg-003 | ポートがエラーを返した場合、CommandDispatchServiceがHarnessApiResponse.error()に変換すること | phasegate:statusコマンドのDispatchCommandUseCase全フロー | ArtifactScannerPortモック: throw new Error | response.status='error', exitCode=2 |
| IT-API-StatusInteg-004 | disabledレイヤーはisActionable()=falseを返すこと | StatusDerivationInput | ConfigQueryPortモック: minimal（L2-L4 disabled） | L2-L4のLayerHealth.isActionable()=false |

---

### Shared Kernel Contract検証

**テスト配置**: `scripts/harness/__tests__/unit/harness-api/cli-command-definition.test.ts`

> 論理設計§1.3に指定されているテストファイル。HarnessApiResponse<T>のJSON構造がintegration_contract.md §2.2に準拠することを検証する。

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-SharedKernel-001 | HarnessApiResponse<T>のJSON出力構造がCross-Unit ContractのDTOスキーマに完全準拠すること | HarnessApiResponse.pass()・fail()・error()の各静的メソッドで生成したresponse | モックなし | JSONに{status, errors[], summary{totalChecks, passed, failed, warnings}, data?}が全て含まれる |
| IT-API-SharedKernel-002 | HarnessApiResponseContractとして公開されるDTOが読取専用（readonly/freeze）であること | HarnessApiResponseMapperでcontractに変換 | モックなし | Object.isFrozen(contract)=true、contractのプロパティへの書き込み試行がTypeErrorまたは無視される |
| IT-API-SharedKernel-003 | CheckReadyResponse型・CiCheckResponse型等の具体化型が正しくHarnessApiResponse<T>の型パラメータを満たすこと | 各コマンド応答のData型を設定したHarnessApiResponse | モックなし | TypeScript型検証（コンパイル時）が通過する。dataフィールドの型が指定通りである |

---

## 6. シードデータ要件

| データセット | 用途 | 内容 |
|------------|------|------|
| `scripts/harness/__tests__/fixtures/harness-api/artifact-scan/full-artifacts/` | FileSystemArtifactScannerAdapter IT-REPO-ArtifactScan-001 | 全レイヤーの成果物フィクスチャー（設計文書stub、テストファイルstub、メタデータstub） |
| `scripts/harness/__tests__/fixtures/harness-api/artifact-scan/missing-l3/` | FileSystemArtifactScannerAdapter IT-REPO-ArtifactScan-002 | L3統合テストファイルなしのフィクスチャー |
| `scripts/harness/__tests__/fixtures/harness-api/config/harness-config-standard.json` | HarnessConfigQueryAdapter IT-REPO-ConfigQuery-001 | standardプリセットのphasegate.config.json |
| `scripts/harness/__tests__/fixtures/harness-api/config/harness-config-strict.json` | HarnessConfigQueryAdapter IT-REPO-ConfigQuery-002 | strictプリセットのphasegate.config.json |
| `scripts/harness/__tests__/fixtures/harness-api/config/harness-config-minimal.json` | DeriveHarnessStatusUseCase IT-UC-DeriveStatus-006 | minimalプリセットのphasegate.config.json |
| モックPhaseGateStoryResult（インライン定義） | PhaseGateQueryPort関連テスト全般 | `[{storyId:'H09-01', passed:true, missingPhases:[]}, ...]` |
| モックValidatorCheckItem（インライン定義） | ValidatorExecutionPort関連テスト全般 | `[{validatorId:'L3-001', passed:true, errors:[]}, ...]` |
| モックDriftItem（インライン定義） | DetectDrift関連テスト全般 | `[{direction:'design-to-code', unit:'harness-api', element:'CliCommand', recommendation:'...'}]` |

---

## 7. テスト環境設定

### テストフレームワーク設定

| 項目 | 設定値 | 備考 |
|------|--------|------|
| テストフレームワーク | Vitest 3.0.0 | `integration_contract.md §1` 準拠 |
| テストファイルパターン | `scripts/harness/__tests__/integration/harness-api/**/*.test.ts` | 論理設計§1.3のパス |
| タイムアウト | 10000ms | ファイルシステムアクセスを含むため余裕を持たせる |

### モック設定

| 依存 | モック方法 | 備考 |
|------|----------|------|
| ValidatorExecutionPort | `vi.fn()` でメソッドをスタブ | スタブ実装クラスを定義 |
| PhaseGateQueryPort | `vi.fn()` でメソッドをスタブ | スタブ実装クラスを定義 |
| BiomeLintPort | `vi.fn()` でメソッドをスタブ | スタブ実装クラスを定義 |
| ImpactAnalysisPort | `vi.fn()` でメソッドをスタブ | スタブ実装クラスを定義 |
| ArtifactScannerPort | `vi.fn()` でメソッドをスタブ | スタブ実装クラスを定義 |
| ConfigQueryPort | `vi.fn()` でメソッドをスタブ | スタブ実装クラスを定義 |
| CommandRegistry | 実体を使用 | Domain管理下の依存 |
| StatusDerivationService | 実体を使用 | 純粋関数・Domain管理下 |
| node:fs/promises | フィクスチャーディレクトリを使用（モックなし） | FileSystemAdapterテストのみ |

### テスト記述規約

テスト規約（`docs/principles/testing-rules.md`）に従い、以下の規約を適用する。

| 規約 | 内容 |
|------|------|
| テストケース名 | 全て日本語で記述する |
| テスト構造 | `target(メソッド名)` → `describe(ふるまい)` → `context(前提条件)` → `it(期待値)` |
| 実行結果変数名 | `actual` に統一 |
| パターン | AAAパターン（Arrange/Act/Assert）で記述 |
| テストヘルパー | `scripts/harness/__tests__/helpers/test-helpers.ts` の `target`/`context` エイリアスを使用 |
| ファイル名 | kebab-caseで統一 |

### 認証設定

- 不要（harness-apiは認証認可機構を持たない）

### スタブ注記規約

Wave 2未完Adapterに関するテストには以下のコメントを付与する。

```typescript
// @stub: wave2-pending - validator-system の正式インターフェース確定後に差し替え
```

---

## 8. WI-031 `init --with-ci` 統合テスト

<!-- @work-item-id WI-031 -->

### 8.1 setup deployer

**テスト配置**: `scripts/harness/__tests__/unit/setup/skill-deployer.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-SETUP-DeployCiWorkflows-WI031-001 | 空 project に CI workflow を配置すること | `deployCiWorkflows(harnessRoot, projectRoot)` | `.github/workflows/aidlc-gate.yml` と `.github/workflows/consistency-check.yml` が作成される |
| IT-SETUP-DeployCiWorkflows-WI031-002 | 既存 workflow を上書きしないこと | 既存 `.github/workflows/aidlc-gate.yml` あり | 既存内容を維持し、該当 path が skipped として返る |
| IT-SETUP-InitHarnessConfig-WI031-001 | CI opt-in config を新規作成すること | `initHarnessConfig(..., { ciEnabled:true })` | `phasegate.config.json` に `ci.enabled=true` が入る |

### 8.2 CLI flag validation

**テスト配置**: `scripts/harness/__tests__/integration/harness-api/init-flag-validation.integration.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-API-InitFlag-WI031-001 | `init --with-ci` が既知 flag として扱われること | `phasegate init --with-ci --yes` | unknown flag エラーにならない |
| IT-API-InitFlag-WI031-002 | `init --with-ci --with-husky` を併用できること | `phasegate init --with-ci --with-husky --yes` | CI workflow と husky hook がそれぞれ opt-in 配置される |

### 8.3 agent context refresh workflow

<!-- @work-item-id WI-032 -->

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-SETUP-DeployCiWorkflows-WI032-001 | `deployCiWorkflows` が agent context workflow を配置すること | `deployCiWorkflows(harnessRoot, projectRoot)` | `.github/workflows/agent-context-refresh.yml` が作成される |
| IT-API-InitFlag-WI032-001 | `init --with-ci` が agent context workflow も配置すること | `phasegate init --with-ci --yes` | aidlc / consistency / agent-context-refresh の 3 workflow が存在する |
