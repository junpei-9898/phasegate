# ITテスト設計: quick-mode

@story-id H10-01
@story-id H10-02
@story-id H10-03
> **作成日**: 2026-03-19
> **対象Unit**: quick-mode
> **対応ストーリー**: H10-01, H10-02, H10-03
> **Wave**: 2（コア品質機構）
> **参照計画**: `docs/inception/quick-mode/it_test_design_plan.md`
> **参照設計**: `docs/product/construction/quick-mode/logical_design.md`

---

## 1. 対象コンポーネント

- **UseCase**:
  - `JudgeQuickModeEligibilityUseCase`（H10-01）
  - `BuildRelaxationProfileUseCase`（H10-02）
  - `ExecuteQuickCiCheckUseCase`（H10-03）
- **Adapter（Repository相当）**:
  - `GitDiffChangedFilesAdapter`
  - `HarnessConfigQuickModeConfigAdapter`
  - `ValidatorSystemValidatorIdRegistryAdapter`
- **Handler / Formatter（Controller相当）**:
  - `CiCheckQuickModeHandler`
  - `HumanQuickModeFormatter`
  - `AgentQuickModeFormatter`
  - `JsonQuickModeFormatter`

---

## 2. UseCaseテストケース

### テスト方針

- PortのみをVitestモック（`vi.fn()`）で置き換える
- `QuickModeJudgmentEngine` / `ValidatorRelaxationService` は実体を使用（Domainモック禁止）
- テスト名は日本語。`target` / `context` / `describe` / `it` 構造
- AAAパターン（`actual` 変数に結果を代入）を遵守する

### JudgeQuickModeEligibilityUseCase

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-Judge-001 | allowedCategoriesのみのファイル変更でeligible=trueが返る | `changedFiles: undefined`（ポート経由取得） | `changedFilesPort.getChangedFiles()` → `[{filePath: "src/foo.ts", changeKind: "MODIFY"}]`（bugfix相当）, `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定 | `{ eligible: true, reason: 非空文字列 }` |
| IT-UC-Judge-002 | changedFilesを明示指定したとき、ポートを呼ばずに入力値で判定する | `changedFiles: [{filePath: "docs/README.md", changeKind: "MODIFY"}]` | `changedFilesPort.getChangedFiles()` は呼ばれない（spy確認）, `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定 | `{ eligible: true }` かつ `changedFilesPort.getChangedFiles` 未呼び出し |
| IT-UC-Judge-003 | テストファイルのみの変更でeligible=trueが返る | `changedFiles: undefined` | `changedFilesPort.getChangedFiles()` → `[{filePath: "src/foo.test.ts", changeKind: "MODIFY"}]`, `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定 | `{ eligible: true }` |
| IT-UC-Judge-004 | 空のchangedFilesリストでeligible=trueが返る | `changedFiles: []` | `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定 | `{ eligible: true }` |

#### 異常系（3拒否ルール）

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー/期待結果 |
|---------|---------|------|----------|-----------------|
| IT-UC-Judge-005 | domain/配下のMODIFYファイルが含まれる場合にMIXED_CHANGES拒否が返る | `changedFiles: [{filePath: "scripts/harness/quick-mode/domain/value-objects/changed-file.ts", changeKind: "MODIFY"}]` | `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定（allowedCategories: ['bugfix','docs','test','config']） | `{ eligible: false, rejectionRule: 'MIXED_CHANGES', rejectedFiles: length>=1 }` |
| IT-UC-Judge-006 | domain/配下のCREATEファイルが含まれる場合にNEW_DOMAIN拒否が返る（MIXED_CHANGESより先に判定されないことを確認） | `changedFiles: [{filePath: "scripts/harness/quick-mode/domain/value-objects/new-vo.ts", changeKind: "CREATE"}]` | `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定 | `{ eligible: false, rejectionRule: 'MIXED_CHANGES' }`（domainカテゴリはMIXED_CHANGES先検出） |
| IT-UC-Judge-007 | *port.tsファイルの変更が含まれる場合にMIXED_CHANGESまたはAPI_CONTRACT拒否が返る | `changedFiles: [{filePath: "scripts/harness/quick-mode/domain/ports/changed-files-port.ts", changeKind: "MODIFY"}]` | `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定 | `{ eligible: false, rejectionRule: 'MIXED_CHANGES' or 'API_CONTRACT', rejectedFiles: length>=1 }` |
| IT-UC-Judge-008 | allowedCategoriesに含まれるカテゴリとdomain/配下ファイルが混在するとMIXED_CHANGES拒否が返る | `changedFiles: [{filePath: "docs/README.md", changeKind: "MODIFY"}, {filePath: "scripts/harness/quick-mode/domain/services/engine.ts", changeKind: "MODIFY"}]` | デフォルト設定 | `{ eligible: false, rejectionRule: 'MIXED_CHANGES' }` |
| IT-UC-Judge-009 | bugfixとdocs混在（両方allowedCategories内）でeligible=trueが返る | `changedFiles: [{filePath: "src/util.ts", changeKind: "MODIFY"}, {filePath: "docs/guide.md", changeKind: "MODIFY"}]` | デフォルト設定 | `{ eligible: true }` |

#### Portエラー

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-Judge-010 | changedFilesPortがエラーを投げた場合、UseCaseがそのエラーを伝播する | `changedFiles: undefined` | `changedFilesPort.getChangedFiles()` → `throw new Error('git error')` | `Error('git error')` が再スロー（またはラップされた例外）される |
| IT-UC-Judge-011 | quickModeConfigPortがエラーを投げた場合、UseCaseがそのエラーを伝播する | `changedFiles: [{filePath: "src/foo.ts", changeKind: "MODIFY"}]` | `quickModeConfigPort.getQuickModeConfig()` → `throw new Error('config error')` | `Error('config error')` が再スロー（またはラップされた例外）される |

#### 出力DTO形式

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-Judge-012 | 返却されるDTOがObject.freeze済みで不変であること | `changedFiles: []` | デフォルト設定 | 返却されたDTOへのプロパティ代入が例外またはsilentlyスキップされる（`Object.isFrozen(actual) === true`） |

---

### BuildRelaxationProfileUseCase

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-Build-001 | eligible=trueのeligibilityを渡すとデフォルト緩和プロファイルが生成される | `{ eligibility: { eligible: true, reason: '...' } }` | `quickModeConfigPort.getQuickModeConfig()` → デフォルト設定, `validatorIdRegistryPort.getAllValidatorIds()` → `['L1-001',...,'L4-006']`（24件） | `{ levelDependencyRelaxed: false, l1: {all:true}, l2: {maintained:['L2-002','L2-003','L2-014'], skipped:['L2-001','L2-013','L2-015']}, l3: {maintained:['L3-001'], skipped:['L3-002','L3-003','L3-004']}, l4: {all:false}, phaseExecution: {twoPhaseRequired:false} }`. @work-item-id WI-156 |
| IT-UC-Build-002 | 返却されるDTOがINV-P1〜INV-P6の不変条件をすべて満たすこと | `{ eligibility: { eligible: true, reason: '...' } }` | デフォルト設定, 全ID一覧 | `levelDependencyRelaxed === false`, `l1.all === true`, `l4.all === false`, `phaseExecution.twoPhaseRequired === false`, `l2.maintained∪l2.skipped = {L2-001,L2-002,L2-003,L2-013,L2-014,L2-015}`, `l3.maintained∪l3.skipped = {L3-001,L3-002,L3-003,L3-004}` |
| IT-UC-Build-003 | カスタムmaintainedLayers設定でプロファイルが正しく生成される | `{ eligibility: { eligible: true, reason: '...' } }` | `quickModeConfigPort.getQuickModeConfig()` → `{ allowedCategories: ['bugfix','docs','test','config'], maintainedLayers: ['L1','L2-001','L2-002','L2-003','L2-013','L2-014','L2-015','L3-001'], relaxedGates: ['L3-002','L3-003','L3-004','L4'] }`, 全ID一覧 | `l2.maintained` が全L2 IDを含み、`l2.skipped === []`（全L2維持）, `l3.maintained === ['L3-001']` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-Build-004 | eligible=falseのeligibilityを渡すとQuickModeNotEligibleErrorが投げられる | `{ eligibility: { eligible: false, reason: '...', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [...] } }` | （Portは呼ばれない） | `QuickModeNotEligibleError`（またはそれに相当するエラー）がスローされる |
| IT-UC-Build-005 | eligible=falseの場合、PortのgetQuickModeConfigは呼ばれないこと | `{ eligibility: { eligible: false, reason: '...', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [...] } }` | Portはspy設定 | `quickModeConfigPort.getQuickModeConfig` が呼ばれていないことを spy で確認 |

#### Portエラー

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-Build-006 | quickModeConfigPortがエラーを投げた場合、そのエラーが伝播する | `{ eligibility: { eligible: true, reason: '...' } }` | `quickModeConfigPort.getQuickModeConfig()` → `throw new Error('config not found')` | エラーが再スローされる |
| IT-UC-Build-007 | validatorIdRegistryPortがエラーを投げた場合、そのエラーが伝播する | `{ eligibility: { eligible: true, reason: '...' } }` | `validatorIdRegistryPort.getAllValidatorIds()` → `throw new Error('registry error')` | エラーが再スローされる |

---

### ExecuteQuickCiCheckUseCase

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-Execute-001 | eligible=trueかつdryRun=falseで判定+プロファイル生成が実行される | `{ changedFiles: undefined, dryRun: false }` | `judgeUseCase.execute()` → `{ eligible: true, reason: '...' }`, `buildUseCase.execute()` → デフォルトプロファイル | `{ eligibility: { eligible: true }, relaxationProfile: { levelDependencyRelaxed: false, ... } }` |
| IT-UC-Execute-002 | eligible=falseのとき、relaxationProfile=undefinedのDecisionContractが返る | `{ changedFiles: undefined, dryRun: false }` | `judgeUseCase.execute()` → `{ eligible: false, rejectionRule: 'MIXED_CHANGES', ... }` | `{ eligibility: { eligible: false }, relaxationProfile: undefined }` |
| IT-UC-Execute-003 | eligible=falseのとき、buildUseCaseは呼ばれないこと | `{ changedFiles: undefined, dryRun: false }` | `judgeUseCase.execute()` → `{ eligible: false, ... }`, `buildUseCase.execute` はspy | `buildUseCase.execute` が呼ばれていないことを spy で確認 |
| IT-UC-Execute-004 | dryRun=trueのとき、validator-systemへの実行指示（Port呼び出し）がスキップされる | `{ changedFiles: undefined, dryRun: true }` | `judgeUseCase.execute()` → `{ eligible: true, ... }`, `buildUseCase.execute()` → デフォルトプロファイル, validator-system Portはspy | validator-system Portの実行メソッドが呼ばれていないことを spy で確認 |
| IT-UC-Execute-005 | changedFilesを明示指定したとき、judgeUseCaseに正しく渡される | `{ changedFiles: [{filePath: "src/foo.ts", changeKind: "MODIFY"}], dryRun: false }` | `judgeUseCase.execute` はspy, `judgeUseCase.execute()` → `{ eligible: false, ... }` | `judgeUseCase.execute` が `{ changedFiles: [{filePath: "src/foo.ts", changeKind: "MODIFY"}] }` で呼ばれたことを確認 |
| IT-UC-Execute-008 | eligible=trueかつdryRun=trueのとき、relaxationProfile含むDecisionContractが返ること | `{ changedFiles: undefined, dryRun: true }` | `judgeUseCase.execute()` → `{ eligible: true, reason: '...' }`, `buildUseCase.execute()` → デフォルトプロファイル, validatorExecutionPortはspy | `{ eligibility: { eligible: true }, relaxationProfile: { levelDependencyRelaxed: false, ... } }` が返り、かつ `validatorExecutionPort.executeWithProfile` が呼ばれていないことを spy で確認 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-Execute-006 | judgeUseCaseがエラーを投げた場合、そのエラーが伝播する | `{ changedFiles: undefined, dryRun: false }` | `judgeUseCase.execute()` → `throw new Error('judge failed')` | `Error('judge failed')` が再スローされる |
| IT-UC-Execute-007 | buildUseCaseがエラーを投げた場合（eligible=true後）、そのエラーが伝播する | `{ changedFiles: undefined, dryRun: false }` | `judgeUseCase.execute()` → `{ eligible: true, ... }`, `buildUseCase.execute()` → `throw new Error('build failed')` | `Error('build failed')` が再スローされる |

---

## 3. Repositoryテストケース（Infrastructure Adapter）

### テスト方針

- `child_process.execSync` を `vi.spyOn` でモックし、fixture stdout 文字列を返す方式で git 依存を排除する
- `fs/promises` を `vi.spyOn` でモックし、fixture の JSON 文字列を返す方式でファイルシステム依存を排除する
- テスト名は日本語、AAAパターン、`actual` 変数使用

### GitDiffChangedFilesAdapter

#### git diffパース

| ケースID | 操作 | fixture入力（git diff stdout） | 事前データ | 期待結果 |
|---------|------|-------------------------------|----------|---------|
| IT-REPO-Git-001 | MODIFYファイルのパース | `"M\tscripts/harness/quick-mode/domain/value-objects/changed-file.ts\n"` | なし | `[{ filePath: 'scripts/harness/quick-mode/domain/value-objects/changed-file.ts', changeKind: 'MODIFY' }]` |
| IT-REPO-Git-002 | ADDファイルのパース | `"A\tsrc/new-feature.ts\n"` | なし | `[{ filePath: 'src/new-feature.ts', changeKind: 'CREATE' }]` |
| IT-REPO-Git-003 | DELETEファイルのパース | `"D\tsrc/old-feature.ts\n"` | なし | `[{ filePath: 'src/old-feature.ts', changeKind: 'DELETE' }]` |
| IT-REPO-Git-004 | RENAMEファイルのパース（移動先をMODIFYとして扱う） | `"R100\tsrc/old.ts\tsrc/new.ts\n"` | なし | `[{ filePath: 'src/new.ts', changeKind: 'MODIFY' }]` |
| IT-REPO-Git-005 | 複数ファイル混在のパース | `"M\tsrc/a.ts\nA\tsrc/b.ts\nD\tsrc/c.ts\n"` | なし | `[ {filePath:'src/a.ts', changeKind:'MODIFY'}, {filePath:'src/b.ts', changeKind:'CREATE'}, {filePath:'src/c.ts', changeKind:'DELETE'} ]`（3件） |
| IT-REPO-Git-006 | 空の差分（staged変更なし）で空配列が返る | `""` | なし | `[]` |
| IT-REPO-Git-007 | ファイルパスの正規化（../ を含むパスが解決される） | `"M\t./scripts/../scripts/harness/foo.ts\n"` | なし | `[{ filePath: 'scripts/harness/foo.ts', changeKind: 'MODIFY' }]` |

#### エラーハンドリング

| ケースID | 操作 | fixture入力 | 事前データ | 期待エラー |
|---------|------|------------|----------|----------|
| IT-REPO-Git-008 | gitコマンドが失敗した場合にGitCommandErrorが投げられる | execSyncが`Error('Command failed')`をスロー | なし | `GitCommandError`（またはそれに相当するエラー） |
| IT-REPO-Git-009 | git未インストール環境でGitNotAvailableErrorが投げられる | execSyncが`Error('git: command not found')`をスロー | なし | `GitNotAvailableError`（またはそれに相当するエラー） |
| IT-REPO-Git-010 | 非gitディレクトリでGitNotAvailableErrorが投げられる | execSyncが`Error('not a git repository')`をスロー | なし | `GitNotAvailableError`（またはそれに相当するエラー） |

---

### HarnessConfigQuickModeConfigAdapter

#### CRUDテスト（読取）

| ケースID | 操作 | fixture入力（phasegate.config.json内容） | 事前データ | 期待結果 |
|---------|------|--------------------------------------|----------|---------|
| IT-REPO-Config-001 | quickModeセクションが存在するとき、その値でQuickModeConfigが生成される | `{ "quickMode": { "allowedCategories": ["bugfix","docs"], "maintainedLayers": ["L1","L2-002"], "relaxedGates": ["L2-001","L3-002","L3-003","L3-004","L4"] } }` を含むphasegate.config.json | なし | `QuickModeConfig` の `allowedCategories = ['bugfix','docs']`, `maintainedLayers = ['L1','L2-002']` |
| IT-REPO-Config-002 | quickModeセクションが存在しないとき、デフォルト設定でQuickModeConfigが生成される | `{ "project": { "name": "test", "preset": "standard" }, "layers": {}, "phaseDependencies": {} }` （quickModeなし） | なし | `QuickModeConfig` の `allowedCategories = ['bugfix','docs','test','config']`, `maintainedLayers = ['L1','L2-002','L2-003','L3-001']`, `relaxedGates = ['L2-001','L3-002','L3-003','L3-004','L4']` |
| IT-REPO-Config-003 | quickModeセクションのallowedCategoriesが有効値（bugfix/docs/test/config）のとき正常に生成される | `{ "quickMode": { "allowedCategories": ["bugfix","docs","test","config"], "maintainedLayers": ["L1","L2-002","L2-003","L3-001"], "relaxedGates": ["L2-001","L3-002","L3-003","L3-004","L4"] } }` | なし | `QuickModeConfig` が生成され例外なし |

#### エラーハンドリング

| ケースID | 操作 | fixture入力 | 事前データ | 期待エラー |
|---------|------|------------|----------|----------|
| IT-REPO-Config-004 | ファイルが存在しないときHarnessConfigNotFoundErrorが投げられる | `fs.readFile` → `ENOENT` エラー | なし | `HarnessConfigNotFoundError`（またはそれに相当するエラー） |
| IT-REPO-Config-005 | JSONパースが失敗するときHarnessConfigParseErrorが投げられる | `"invalid json {"` | なし | `HarnessConfigParseError`（またはそれに相当するエラー） |
| IT-REPO-Config-006 | quickMode.allowedCategoriesに'domain'が含まれるとき、QuickModeConfigErrorが投げられる | `{ "quickMode": { "allowedCategories": ["bugfix","domain"], "maintainedLayers": ["L1"], "relaxedGates": ["L4"] } }` | なし | `QuickModeConfigError`（domain/api/featureは設定不可のバリデーション） |
| IT-REPO-Config-007 | quickMode.allowedCategoriesが空配列のとき、QuickModeConfigErrorが投げられる | `{ "quickMode": { "allowedCategories": [], "maintainedLayers": ["L1"], "relaxedGates": ["L4"] } }` | なし | `QuickModeConfigError`（allowedCategoriesは空不可） |

---

### ValidatorSystemValidatorIdRegistryAdapter

#### IDレジストリ検証

| ケースID | 操作 | 入力 | 事前データ | 期待結果 |
|---------|------|------|----------|---------|
| IT-REPO-Registry-001 | getAllValidatorIdsが全ID（L1-001〜L4-006）を返すこと | なし | 静的定義 | 返却配列が `['L1-001','L1-002','L1-003','L1-004','L1-005','L1-006','L1-007','L1-008','L2-001','L2-002','L2-003','L2-013','L2-014','L2-015','L3-001','L3-002','L3-003','L3-004','L4-001','L4-002','L4-003','L4-004','L4-005','L4-006']` の全24件を含む（順序を問わず）。@work-item-id WI-156 |
| IT-REPO-Registry-002 | L1 IDが8件（L1-001〜L1-008）含まれること | なし | 静的定義 | `actual.filter(id => id.startsWith('L1')).length === 8` |
| IT-REPO-Registry-003 | L2 IDが6件（L2-001〜L2-015）含まれること | なし | 静的定義 | `actual.filter(id => id.startsWith('L2')).length === 6` |
| IT-REPO-Registry-004 | L3 IDが4件（L3-001〜L3-004）含まれること | なし | 静的定義 | `actual.filter(id => id.startsWith('L3')).length === 4` |
| IT-REPO-Registry-005 | L4 IDが6件（L4-001〜L4-006）含まれること | なし | 静的定義 | `actual.filter(id => id.startsWith('L4')).length === 6`. @work-item-id WI-156 |
| IT-REPO-Registry-006 | 返却値がreadonly配列であること | なし | 静的定義 | 返却されたオブジェクトへの要素追加がエラーまたはsilentlyスキップされる |

---

## 4. Controller/APIテストケース（Handler / Formatter）

### テスト方針

- `CiCheckQuickModeHandler` は `ExecuteQuickCiCheckUseCase` をテストダブルで置き換える
- Formatterは `QuickModeDecisionContract` の固定値を入力として決定論的な出力文字列を検証する
- `process.exit` は `vi.spyOn(process, 'exit')` でモックし終了コードを検証する

---

### CiCheckQuickModeHandler

#### 認証・認可テスト

（`integration_contract.md §8` の通り、quick-modeは認証・認可を持たない。対象外。）

#### フラグ解釈・終了コードテスト

| ケースID | 入力フラグ | eligible状態 | モック設定 | 期待終了コード / 期待動作 |
|---------|-----------|-------------|----------|----------------------|
| IT-API-Handler-001 | `--quick` のみ（--fail-on-reject未指定）、eligible=false | eligible=false | `usecase.execute()` → `{ eligibility: { eligible: false, ... }, relaxationProfile: undefined }` | 終了コード0（--fail-on-reject未指定のため拒否でも正常終了） |
| IT-API-Handler-002 | `--quick --fail-on-reject`、eligible=false | eligible=false | `usecase.execute()` → `{ eligibility: { eligible: false, ... }, relaxationProfile: undefined }` | 終了コード1 |
| IT-API-Handler-003 | `--quick --fail-on-reject`、eligible=true | eligible=true | `usecase.execute()` → `{ eligibility: { eligible: true, ... }, relaxationProfile: {...} }` | 終了コード0 |
| IT-API-Handler-004 | `--quick`、UseCaseが例外をスロー | — | `usecase.execute()` → `throw new Error('unexpected')` | 終了コード2 |

#### --dry-runフラグ

| ケースID | 入力フラグ | モック設定 | 期待動作 |
|---------|-----------|----------|---------|
| IT-API-Handler-005 | `--quick --dry-run` | `usecase.execute` はspy | `usecase.execute` が `{ dryRun: true }` で呼ばれたことを確認 |
| IT-API-Handler-006 | `--quick`（--dry-run未指定） | `usecase.execute` はspy | `usecase.execute` が `{ dryRun: false }` または `{ dryRun: undefined }` で呼ばれたことを確認 |

#### --filesフラグ

| ケースID | 入力フラグ | モック設定 | 期待動作 |
|---------|-----------|----------|---------|
| IT-API-Handler-007 | `--quick --files src/a.ts,src/b.ts` | `usecase.execute` はspy | `usecase.execute` の `changedFiles` に指定ファイルが渡されていることを確認 |
| IT-API-Handler-008 | `--quick`（--files未指定） | `usecase.execute` はspy | `usecase.execute` の `changedFiles` が `undefined` であることを確認 |

#### --formatフラグ

| ケースID | 入力フラグ | eligible状態 | モック設定 | 期待動作 |
|---------|-----------|-------------|----------|---------|
| IT-API-Handler-009 | `--quick --format human` | eligible=true | `usecase.execute()` → approved Decision | stdout出力が人間可読形式（"Quick Mode 判定: ✓ 承認" を含む）であること |
| IT-API-Handler-010 | `--quick --format json` | eligible=false | `usecase.execute()` → rejected Decision | stdout出力がJSONパース可能な文字列であること、かつ `eligible: false` を含むこと |
| IT-API-Handler-011 | `--quick --format agent` | eligible=false | `usecase.execute()` → `{ rejectionRule: 'MIXED_CHANGES', rejectedFiles: [...] }` | stdout出力にrejectedFilesの詳細が含まれること |
| IT-API-Handler-012 | `--quick`のみ（--format未指定） | eligible=true | `usecase.execute()` → approved Decision | デフォルトフォーマット（human形式）でstdoutに出力されること（`--format human` と同等の出力） |

---

### HumanQuickModeFormatter

#### 正常系

| ケースID | 入力 | 期待出力 |
|---------|------|---------|
| IT-API-HumanFmt-001 | `{ eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' }, relaxationProfile: { l2: { maintained: ['L2-002','L2-003','L2-014'], skipped: ['L2-001','L2-013','L2-015'] }, l3: { maintained: ['L3-001'], skipped: ['L3-002','L3-003','L3-004'] }, ... } }` | "Quick Mode 判定: ✓ 承認" を含む文字列、L2/L3の維持/スキップ情報が表示される、末尾改行あり |
| IT-API-HumanFmt-002 | `{ eligibility: { eligible: false, reason: '...', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [{filePath: 'src/x.ts', changeKind: 'MODIFY'}] }, relaxationProfile: undefined }` | "Quick Mode 判定: ✗ 拒否" を含む文字列、"MIXED_CHANGES" を含む文字列、拒否ファイルが表示される、末尾改行あり |
| IT-API-HumanFmt-003 | `{ eligibility: { eligible: false, reason: '...', rejectionRule: 'NEW_DOMAIN', rejectedFiles: [...] }, relaxationProfile: undefined }` | "NEW_DOMAIN" を含む文字列 |
| IT-API-HumanFmt-004 | `{ eligibility: { eligible: false, reason: '...', rejectionRule: 'API_CONTRACT', rejectedFiles: [...] }, relaxationProfile: undefined }` | "API_CONTRACT" を含む文字列 |

#### 決定論的出力

| ケースID | シナリオ | 入力 | 期待動作 |
|---------|---------|------|---------|
| IT-API-HumanFmt-005 | 同一入力に対して複数回呼び出しても同一の出力が返る（決定論的） | approved Decision（固定値） | 2回呼び出した出力が完全一致する |

---

### AgentQuickModeFormatter

#### 正常系

| ケースID | 入力 | 期待出力 |
|---------|------|---------|
| IT-API-AgentFmt-001 | rejected Decision（`rejectedFiles: [{filePath: 'src/domain/vo.ts', changeKind: 'MODIFY'}]`） | `rejectedFiles` の詳細（filePath + changeKind）が出力に含まれる、末尾改行あり |
| IT-API-AgentFmt-002 | approved Decision（`l2.skipped: ['L2-001','L2-013','L2-015']`, `l3.skipped: ['L3-002','L3-003','L3-004']`） | スキップされたバリデータID（L2-001等）が出力に含まれる |
| IT-API-AgentFmt-003 | approved Decision | 維持されるバリデータID（L2-002、L2-003等）が出力に含まれる |

#### 決定論的出力

| ケースID | シナリオ | 入力 | 期待動作 |
|---------|---------|------|---------|
| IT-API-AgentFmt-004 | 同一入力に対して複数回呼び出しても同一の出力が返る | approved Decision（固定値） | 2回呼び出した出力が完全一致する |

---

### JsonQuickModeFormatter

#### 正常系

| ケースID | 入力 | 期待出力 |
|---------|------|---------|
| IT-API-JsonFmt-001 | approved Decision（`{ eligibility: { eligible: true, ... }, relaxationProfile: {...} }`） | JSONパース可能な文字列、`eligible: true`・`relaxationProfile` が含まれる、末尾改行あり |
| IT-API-JsonFmt-002 | rejected Decision（`{ eligibility: { eligible: false, rejectionRule: 'MIXED_CHANGES', ... }, relaxationProfile: undefined }`） | JSONパース可能な文字列、`eligible: false`・`rejectionRule: 'MIXED_CHANGES'`・`relaxationProfile: null` or 省略が含まれる |
| IT-API-JsonFmt-003 | 出力がJSON.parseで再現可能で構造が一致すること | approved Decision | `JSON.parse(actual)` が `QuickModeDecisionContract` の全フィールドを含むこと |

#### 決定論的出力

| ケースID | シナリオ | 入力 | 期待動作 |
|---------|---------|------|---------|
| IT-API-JsonFmt-004 | 同一入力に対して複数回呼び出しても同一のJSON文字列が返る | approved Decision（固定値） | 2回呼び出した出力が完全一致する |

---

## 5. シードデータ要件

| データセット | 用途 | 内容 |
|------------|------|------|
| `git-diff-fixture-modify.txt` | IT-REPO-Git-001 | `"M\tscripts/harness/quick-mode/domain/value-objects/changed-file.ts\n"` |
| `git-diff-fixture-add.txt` | IT-REPO-Git-002 | `"A\tsrc/new-feature.ts\n"` |
| `git-diff-fixture-delete.txt` | IT-REPO-Git-003 | `"D\tsrc/old-feature.ts\n"` |
| `git-diff-fixture-rename.txt` | IT-REPO-Git-004 | `"R100\tsrc/old.ts\tsrc/new.ts\n"` |
| `git-diff-fixture-mixed.txt` | IT-REPO-Git-005 | `"M\tsrc/a.ts\nA\tsrc/b.ts\nD\tsrc/c.ts\n"` |
| `harness-config-with-quickmode.json` | IT-REPO-Config-001, Config-003 | quickModeセクションを含む phasegate.config.json |
| `harness-config-without-quickmode.json` | IT-REPO-Config-002 | quickModeセクションなしの phasegate.config.json（デフォルトフォールバック確認用） |
| `harness-config-invalid-quickmode.json` | IT-REPO-Config-006, Config-007 | allowedCategoriesに'domain'を含むまたは空配列を含むphasegate.config.json |
| `quick-mode-decision-approved.fixture.ts` | Formatter系テスト共通 | eligible=trueのQuickModeDecisionContract固定値 |
| `quick-mode-decision-rejected.fixture.ts` | Formatter系テスト共通 | eligible=false（MIXED_CHANGES）のQuickModeDecisionContract固定値 |

配置先: `scripts/harness/__tests__/integration/quick-mode/fixtures/`

---

## 6. テスト環境設定

### テスト配置

```text
scripts/harness/__tests__/integration/quick-mode/
├── fixtures/
│   ├── git-diff-fixture-modify.txt
│   ├── git-diff-fixture-add.txt
│   ├── git-diff-fixture-delete.txt
│   ├── git-diff-fixture-rename.txt
│   ├── git-diff-fixture-mixed.txt
│   ├── harness-config-with-quickmode.json
│   ├── harness-config-without-quickmode.json
│   ├── harness-config-invalid-quickmode.json
│   ├── quick-mode-decision-approved.fixture.ts
│   └── quick-mode-decision-rejected.fixture.ts
├── usecases/
│   ├── judge-quick-mode-eligibility-usecase.test.ts
│   ├── build-relaxation-profile-usecase.test.ts
│   └── execute-quick-ci-check-usecase.test.ts
├── git-diff-changed-files-adapter.test.ts
├── harness-config-quick-mode-config-adapter.test.ts
├── validator-system-validator-id-registry-adapter.test.ts
└── presentation/
    ├── ci-check-quick-mode-handler.test.ts
    ├── human-quick-mode-formatter.test.ts
    ├── agent-quick-mode-formatter.test.ts
    └── json-quick-mode-formatter.test.ts
```

### モック設定

| 対象 | モック方法 | 適用テスト |
|------|----------|----------|
| `ChangedFilesPort` | `vi.fn()` によるモックオブジェクト | UseCase ITテスト |
| `QuickModeConfigPort` | `vi.fn()` によるモックオブジェクト | UseCase ITテスト |
| `ValidatorIdRegistryPort` | `vi.fn()` によるモックオブジェクト | UseCase ITテスト |
| `child_process.execSync` | `vi.spyOn(childProcess, 'execSync')` | GitDiffChangedFilesAdapter ITテスト |
| `fs/promises.readFile` | `vi.spyOn(fs, 'readFile')` | HarnessConfigQuickModeConfigAdapter ITテスト |
| `ExecuteQuickCiCheckUseCase` | `vi.fn()` によるモックオブジェクト | Handler ITテスト |
| `process.exit` | `vi.spyOn(process, 'exit')` | Handler ITテスト（終了コード検証） |
| `process.stdout.write` | `vi.spyOn(process.stdout, 'write')` または stdout キャプチャ | Handler/Formatter ITテスト（出力検証） |

### テストフレームワーク設定

| 設定項目 | 値 |
|---------|---|
| テストフレームワーク | Vitest 3.0.0 |
| 言語 | TypeScript 5.x（ES2022, Node16, strict） |
| テスト名言語 | 日本語 |
| 命名規約 | kebab-case（ファイル名）、target/context/describe/it 構造 |
| 結果変数名 | `actual` |
| パターン | AAAパターン（Arrange / Act / Assert） |
| ドメインモック | 禁止（UseCase層テストではPort以外の実体を使用） |

### DB・永続化設定

quick-mode はステートレス判定エンジンのため、DBや永続化状態は不要。各Adapterは fixture データ（ファイル・文字列）をモックとして使用する。

### 実行コマンド

```bash
# integration テスト全体
pnpm test -- --testPathPattern="integration/quick-mode"

# Adapter ITテストのみ
pnpm test -- --testPathPattern="integration/quick-mode/.*adapter"

# UseCase ITテストのみ
pnpm test -- --testPathPattern="integration/quick-mode/usecases"
```

## WI-384 hook changeKind integration

<!-- @work-item-id WI-384 -->

agent-integration adapter から渡る explicit CREATE / MODIFY / DELETE を既存
`QuickModeFullModeRequirementAdapter` が欠落なく classifier へ転送し、DELETE を含む mixed targets の
dominant category / Full Mode 判定が path rule と一致することを検証する。field を渡さない既存
Write / Edit / Bash fixture の結果は不変とする。

## WI-390 Public classification integration

<!-- @work-item-id WI-390 -->

`check-change-category`、pre-tool-use hook、`ci-check --quick` の共有 config 経路で `.md` / `.mdx` の docs
分類が一致することを確認する。単一不許可カテゴリは JSON / human output とも
`CATEGORY_NOT_ALLOWED`、カテゴリ混在だけ `MIXED_CHANGES` を表示する。
