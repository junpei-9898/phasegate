# ITテストロジック設計: config-foundation

> 本書は `docs/product/construction/config-foundation/it_test_design.md` に定義された `IT-CF-001` から `IT-CF-079` のみを対象とする。`coverage_report.md` に記載の未カバー推奨項目は、本書では新規ケースIDを追加せずに据え置く。

## 1. テストファイル構成

| テストファイル | 対象 | 対応ケースID |
|---|---|---|
| `scripts/harness/__tests__/config-foundation/application/use-cases/load-resolved-config-use-case.test.ts` | `LoadResolvedConfigUseCase.execute` | IT-CF-001 から IT-CF-008 |
| `scripts/harness/__tests__/config-foundation/application/use-cases/validate-config-use-case.test.ts` | `ValidateConfigUseCase.execute` | IT-CF-009 から IT-CF-014 |
| `scripts/harness/__tests__/config-foundation/application/use-cases/enable-feature-use-case.test.ts` | `EnableFeatureUseCase.execute` | IT-CF-015 から IT-CF-022 |
| `scripts/harness/__tests__/config-foundation/application/use-cases/disable-feature-use-case.test.ts` | `DisableFeatureUseCase.execute` | IT-CF-023 から IT-CF-029 |
| `scripts/harness/__tests__/config-foundation/application/use-cases/list-available-features-use-case.test.ts` | `ListAvailableFeaturesUseCase.execute` | IT-CF-030 から IT-CF-034 |
| `scripts/harness/__tests__/config-foundation/infrastructure/repositories/file-system-config-repository.test.ts` | `FileSystemConfigRepository.load/save` | IT-CF-035 から IT-CF-042 |
| `scripts/harness/__tests__/config-foundation/infrastructure/validators/ajv-config-schema-validator.test.ts` | `AjvConfigSchemaValidator.validate` | IT-CF-043 から IT-CF-050 |
| `scripts/harness/__tests__/config-foundation/infrastructure/registries/static-feature-registry-adapter.test.ts` | `StaticFeatureRegistryAdapter.listAvailable` | IT-CF-051 から IT-CF-053 |
| `scripts/harness/__tests__/config-foundation/infrastructure/preset-definition-store.test.ts` | `PresetDefinitionStore` の公開取得API | IT-CF-054 から IT-CF-058 |
| `scripts/harness/__tests__/config-foundation/presentation/cli/enable-feature-command-handler.test.ts` | `EnableFeatureCommandHandler.execute` | IT-CF-059 から IT-CF-066 |
| `scripts/harness/__tests__/config-foundation/presentation/cli/disable-feature-command-handler.test.ts` | `DisableFeatureCommandHandler.execute` | IT-CF-067 から IT-CF-072 |
| `scripts/harness/__tests__/config-foundation/presentation/cli/list-available-features-command-handler.test.ts` | `ListAvailableFeaturesCommandHandler.execute` | IT-CF-073 から IT-CF-076 |
| `scripts/harness/__tests__/config-foundation/application/facades/load-config.test.ts` | `loadConfig` | IT-CF-077 から IT-CF-079 |

各ファイルの基本テンプレートは共通化する。

```ts
import { describe, expect, it, vi } from 'vitest';

const target = describe;
const context = describe;

target('execute', () => {
  describe('対象のふるまいを説明する', () => {
    context('前提条件を説明する', () => {
      it('期待値を日本語で記述する', async () => {
        // Arrange
        // Act
        const actual = await sut.execute();
        // Assert
        expect(actual).toEqual(expected);
      });
    });
  });
});
```

## 2. テストヘルパー・シードデータ

本UnitのITはE2Eシードではなく、設定ドキュメントのファクトリと一時ディレクトリでデータを構成する。

### 2.1 共通ヘルパー

| ヘルパー名 | 用途 | 主な利用先 |
|---|---|---|
| `createValidSourceDocument(overrides?)` | `project` / `layers` / `quickMode` / `phaseDependencies` / `planningMode` / `paths` / `reporting` / `harnesses` を持つ正当な raw document を生成する | IT-CF-001 から IT-CF-004, 005 から 008, 015 から 034, 043, 077 |
| `createMinimalPresetDocument(overrides?)` | `project.preset = "minimal"` を前提にGSD機能がすべて無効な document を返す | IT-CF-004, 031, 056 |
| `createStandardPresetDocument(overrides?)` | `project.preset = "standard"` の document を返す | IT-CF-003, 010 |
| `createStrictPresetDocument(overrides?)` | `project.preset = "strict"` の document を返す | IT-CF-030, 032, 057, 058 |
| `createInvalidPresetDocument()` | `project.preset = "unknown"` を含む異常 document を返す | IT-CF-007, 012, 046 |
| `createBrokenPresetDefinitions()` | deep merge で破綻する preset 定義を返す | IT-CF-008, 013 |
| `createHarnessError(partial?)` | `HarnessError` 形式のテストエラーを作る | IT-CF-005, 011, 020, 028, 033, 044 から 050, 079 |
| `createAvailableFeatures()` | `["agentLessonCollection", "cascadeUpdate", "bundleSizeLimit", "deadCodeGC"]` を固定順で返す | IT-CF-015 から 034, 060, 061, 063, 065, 067, 069, 073, 074 |
| `createUseCaseMocks()` | 各 Port の `vi.fn()` と SUT 生成をまとめる | UseCase全般 |
| `withTempDir(testFn)` | `fs.mkdtempSync()` で一時ディレクトリを作成し、終了後に削除する | IT-CF-035 から 042, 077 から 079 |
| `writeJsonFile(path, document)` | `JSON.stringify(document, null, 2) + "\\n"` で fixture を書く | IT-CF-035 から 041, 077 から 079 |
| `writeBrokenJsonFile(path, rawText)` | 壊れたJSONファイルを書き込む | IT-CF-039 |
| `createCliSpies()` | `console.log` / `console.error` / `process.exit` を spy する | IT-CF-059 から 076 |

### 2.2 UseCaseテスト用の基本セットアップ

```ts
function createLoadResolvedConfigUseCaseSut() {
  const configRepository = { load: vi.fn(), save: vi.fn() };
  const schemaValidator = { validate: vi.fn() };
  const presetResolutionService = new PresetResolutionService();
  const presetDefinitions = createPresetDefinitions();

  const sut = new LoadResolvedConfigUseCase(
    configRepository,
    schemaValidator,
    presetDefinitions,
    presetResolutionService,
  );

  return { sut, configRepository, schemaValidator, presetDefinitions };
}
```

`EnableFeatureUseCase` と `DisableFeatureUseCase` では上記に加えて `featureRegistryPort` のモックと実体 `FeatureRegistry` を組み込む。`ListAvailableFeaturesUseCase` も同様とする。

### 2.3 CLIテスト用の基本セットアップ

```ts
function createCliSpies() {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

  return { logSpy, errorSpy, exitSpy };
}
```

CLIハンドラの依存はUseCaseスタブに差し替える。`target()` と `context()` の構造は守るが、振る舞いに不要な `beforeEach` へ Arrange を隠さない。

## 3. UseCase統合テスト詳細ロジック

### 3.1 LoadResolvedConfigUseCase

`target('execute')` 配下は `describe('設定ファイルを読み込み、Preset解決済みDTOを返す')` を親ふるまいとする。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-001 | `configPathを指定した場合` | `sourceDocument = createValidSourceDocument()`。`configRepository.load.mockResolvedValue({ path: '/tmp/phasegate.config.json', document: sourceDocument })`。`schemaValidator.validate.mockReturnValue([])`。 | `const actual = await sut.execute('/tmp/phasegate.config.json')` | `load` が指定パスで呼ばれること。`validate` が raw document に対して1回呼ばれること。`actual.sourcePath === '/tmp/phasegate.config.json'`。`actual.config.project` と `actual.config.layers` が解決済みDTOとして返ること。 |
| IT-CF-002 | `configPathを省略した場合` | `configRepository.load.mockResolvedValue({ path: '/discovered/path/phasegate.config.json', document: createValidSourceDocument() })`。`schemaValidator.validate.mockReturnValue([])`。 | `const actual = await sut.execute()` | `load` が `undefined` で呼ばれること。`actual.sourcePath` が探索結果の絶対パスと一致すること。 |
| IT-CF-003 | `standard Presetに個別上書きがある場合` | `sourceDocument = createStandardPresetDocument({ layers: { L3: { coverageThreshold: 95 } } })`。`load` はこの document を返す。`validate` は空配列を返す。 | `const actual = await sut.execute('/tmp/phasegate.config.json')` | `actual.config.layers.L3.coverageThreshold === 95`。Preset値ではなく source 差分が優先されること。 |
| IT-CF-004 | `minimal Presetを読み込む場合` | `sourceDocument = createMinimalPresetDocument()`。`load` と `validate` を正常設定。 | `const actual = await sut.execute('/tmp/phasegate.config.json')` | `actual.config.harnesses.agentLessonCollection === false`。`cascadeUpdate === false`。`bundleSizeLimit === 0`。`deadCodeGC === false`。 |
| IT-CF-005 | `スキーマ検証でエラーが返る場合` | `load` は valid document を返す。`schemaValidator.validate.mockReturnValue([createHarnessError({ errorCode: 'L1-001' })])`。 | `const action = sut.execute('/tmp/phasegate.config.json')` | `await expect(action).rejects.toMatchObject({ name: 'ConfigValidationError', errorCode: 'L1-001' })`。Preset解決処理へ進まないこと。 |
| IT-CF-006 | `設定ファイルが存在しない場合` | `configRepository.load.mockRejectedValue(new ConfigNotFoundError('/tmp/missing.json'))`。 | `const action = sut.execute('/tmp/missing.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigNotFoundError)`。`schemaValidator.validate` が呼ばれないこと。 |
| IT-CF-007 | `project.presetが不正な場合` | `load` は `createInvalidPresetDocument()` を返す。`schemaValidator.validate.mockReturnValue([])`。 | `const action = sut.execute('/tmp/phasegate.config.json')` | `await expect(action).rejects.toMatchObject({ name: 'InvalidPresetError', errorCode: 'L1-002' })`。 |
| IT-CF-008 | `Preset定義が壊れている場合` | `load` は valid document。`validate` は空配列。`sut` 生成時に `presetDefinitions = createBrokenPresetDefinitions()` を渡す。 | `const action = sut.execute('/tmp/phasegate.config.json')` | `await expect(action).rejects.toMatchObject({ name: 'ConfigMergeError', errorCode: 'L1-008' })`。 |

### 3.2 ValidateConfigUseCase

`target('execute')` 配下は `describe('設定ドキュメントの妥当性結果をDTOで返す')` を親ふるまいとする。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-009 | `有効なドキュメントを渡した場合` | `document = createValidSourceDocument()`。`schemaValidator.validate.mockReturnValue([])`。 | `const actual = await sut.execute(document)` | `actual` が `{ valid: true, errors: [] }` と等価であること。 |
| IT-CF-010 | `standard Presetを含む完全なドキュメントを渡した場合` | `document = createStandardPresetDocument()`。`schemaValidator.validate.mockReturnValue([])`。 | `const actual = await sut.execute(document)` | `actual.valid === true`。Preset解決の副作用として `errors.length === 0`。 |
| IT-CF-011 | `スキーマエラーがある場合` | `errors = [createHarnessError({ path: '/project' }), createHarnessError({ path: '/layers/L1' })]`。`schemaValidator.validate.mockReturnValue(errors)`。 | `const actual = await sut.execute(createValidSourceDocument())` | `actual.valid === false`。`actual.errors` が `errors` と同一順で返ること。 |
| IT-CF-012 | `Preset解決が失敗する場合` | `document = createInvalidPresetDocument()`。`schemaValidator.validate.mockReturnValue([])`。 | `const actual = await sut.execute(document)` | `actual.valid === false`。`actual.errors` に `errorCode === 'L1-002'` 相当のPreset関連エラーが含まれること。throwしないこと。 |
| IT-CF-013 | `deep mergeが失敗する場合` | `document = createValidSourceDocument()`。`schemaValidator.validate.mockReturnValue([])`。壊れた presetDefinitions で SUT を生成。 | `const actual = await sut.execute(document)` | `actual.valid === false`。`actual.errors` に `errorCode === 'L1-008'` 相当のmergeエラーが含まれること。 |
| IT-CF-014 | `異常系を受けても例外を送出しない場合` | `documents = [createInvalidPresetDocument(), createValidSourceDocument()]`。1件目はPreset失敗、2件目はmerge失敗となるようにSUTまたは依存を差し替える。 | 各入力に対して `const actual = await sut.execute(document)` を順に呼ぶ | すべての呼び出しで throw されないこと。各 `actual.valid === false`。`actual.errors.length >= 1`。 |

### 3.3 EnableFeatureUseCase

`target('execute')` 配下は `describe('利用可能な機能を有効化して保存する')` を親ふるまいとする。正常系の共通Arrangeは次の通り。

```ts
const sourceDocument = createValidSourceDocument({
  harnesses: {
    agentLessonCollection: false,
    cascadeUpdate: false,
    bundleSizeLimit: 0,
    deadCodeGC: false,
  },
});

configRepository.load.mockResolvedValue({
  path: '/tmp/phasegate.config.json',
  document: sourceDocument,
});
schemaValidator.validate
  .mockReturnValueOnce([])
  .mockReturnValueOnce([]);
featureRegistryPort.listAvailable.mockResolvedValue(createAvailableFeatures());
configRepository.save.mockResolvedValue(undefined);
```

| ケースID | `context()` | Arrange差分 | Act | Assert |
|---|---|---|---|---|
| IT-CF-015 | `boolean機能を有効化する場合` | 共通Arrangeのまま。 | `const actual = await sut.execute('agentLessonCollection', '/tmp/phasegate.config.json')` | `actual` が `{ feature: 'agentLessonCollection', enabled: true, configPath: '/tmp/phasegate.config.json' }` を含むこと。`save` が1回呼ばれること。 |
| IT-CF-016 | `bundleSizeLimitを有効化する場合` | `sourceDocument.harnesses.bundleSizeLimit = 0` を明示。 | `const actual = await sut.execute('bundleSizeLimit', '/tmp/phasegate.config.json')` | `configRepository.save.mock.calls[0][1].harnesses.bundleSizeLimit === 500`。`actual.enabled === true`。 |
| IT-CF-017 | `保存前再検証を確認する場合` | 共通Arrangeのまま。 | `const actual = await sut.execute('agentLessonCollection', '/tmp/phasegate.config.json')` | `schemaValidator.validate` が2回呼ばれること。1回目は load 直後の raw document、2回目は更新後の `aggregate.toSourceDocument()`。 |
| IT-CF-018 | `保存時にsourceDocumentをそのまま渡す場合` | 共通Arrangeのまま。 | `const actual = await sut.execute('agentLessonCollection', '/tmp/phasegate.config.json')` | `configRepository.save` の第1引数が `/tmp/phasegate.config.json`。第2引数が更新済み sourceDocument で、resolved DTO ではないこと。 |
| IT-CF-019 | `未知の機能名を指定した場合` | `featureRegistryPort.listAvailable.mockResolvedValue(createAvailableFeatures())`。他は正常。 | `const action = sut.execute('unknownFeature', '/tmp/phasegate.config.json')` | `await expect(action).rejects.toMatchObject({ name: 'UnsupportedFeatureError', errorCode: 'L1-004' })`。エラーに利用可能機能一覧が含まれること。`save` は呼ばれないこと。 |
| IT-CF-020 | `保存前再検証で不整合が出る場合` | `schemaValidator.validate.mockReturnValueOnce([]).mockReturnValueOnce([createHarnessError({ errorCode: 'L1-001' })])`。 | `const action = sut.execute('agentLessonCollection', '/tmp/phasegate.config.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigValidationError)`。`configRepository.save` が呼ばれないこと。 |
| IT-CF-021 | `保存に失敗する場合` | `configRepository.save.mockRejectedValue(new ConfigPersistenceError('/tmp/phasegate.config.json'))`。 | `const action = sut.execute('agentLessonCollection', '/tmp/phasegate.config.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigPersistenceError)`。 |
| IT-CF-022 | `設定読込に失敗する場合` | `configRepository.load.mockRejectedValue(new ConfigNotFoundError('/tmp/missing.json'))`。 | `const action = sut.execute('agentLessonCollection', '/tmp/missing.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigNotFoundError)`。`featureRegistryPort.listAvailable` と `save` が呼ばれないこと。 |

### 3.4 DisableFeatureUseCase

`target('execute')` 配下は `describe('利用可能な機能を無効化して保存する')` を親ふるまいとする。正常系の共通Arrangeは `deadCodeGC: true`, `bundleSizeLimit: 500` を持つ document へ差し替える。

| ケースID | `context()` | Arrange差分 | Act | Assert |
|---|---|---|---|---|
| IT-CF-023 | `boolean機能を無効化する場合` | `sourceDocument.harnesses.deadCodeGC = true`。 | `const actual = await sut.execute('deadCodeGC', '/tmp/phasegate.config.json')` | `actual.feature === 'deadCodeGC'`。`actual.enabled === false`。`save` が1回呼ばれること。 |
| IT-CF-024 | `bundleSizeLimitを無効化する場合` | `sourceDocument.harnesses.bundleSizeLimit = 500`。 | `const actual = await sut.execute('bundleSizeLimit', '/tmp/phasegate.config.json')` | `configRepository.save.mock.calls[0][1].harnesses.bundleSizeLimit === 0`。 |
| IT-CF-025 | `無効化後に再検証する場合` | 正常Arrangeのまま。 | `const actual = await sut.execute('deadCodeGC', '/tmp/phasegate.config.json')` | `schemaValidator.validate` が2回呼ばれること。 |
| IT-CF-026 | `戻り値へconfigPathを含める場合` | 正常Arrangeのまま。 | `const actual = await sut.execute('deadCodeGC', '/tmp/phasegate.config.json')` | `actual.configPath === '/tmp/phasegate.config.json'`。 |
| IT-CF-027 | `未知の機能名を指定した場合` | `featureRegistryPort.listAvailable.mockResolvedValue(createAvailableFeatures())`。 | `const action = sut.execute('unknownFeature', '/tmp/phasegate.config.json')` | `await expect(action).rejects.toMatchObject({ name: 'UnsupportedFeatureError', errorCode: 'L1-004' })`。`save` は呼ばれないこと。 |
| IT-CF-028 | `再検証エラーが出た場合` | `schemaValidator.validate.mockReturnValueOnce([]).mockReturnValueOnce([createHarnessError({ errorCode: 'L1-001' })])`。 | `const action = sut.execute('deadCodeGC', '/tmp/phasegate.config.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigValidationError)`。`save` が呼ばれないこと。 |
| IT-CF-029 | `保存に失敗する場合` | `configRepository.save.mockRejectedValue(new ConfigPersistenceError('/tmp/phasegate.config.json'))`。 | `const action = sut.execute('deadCodeGC', '/tmp/phasegate.config.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigPersistenceError)`。 |

### 3.5 ListAvailableFeaturesUseCase

`target('execute')` 配下は `describe('利用可能機能の一覧と現在状態を返す')` を親ふるまいとする。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-030 | `strict Presetの設定を読む場合` | `sourceDocument = createStrictPresetDocument({ harnesses: { cascadeUpdate: false } })`。`load` はこの document を返す。`validate` は空配列。`featureRegistryPort.listAvailable` は4機能を返す。 | `const actual = await sut.execute('/tmp/phasegate.config.json')` | `actual.length === 4`。各 `name` が固定順。`agentLessonCollection === true`、`bundleSizeLimit === true`、`deadCodeGC === true`、`cascadeUpdate === false`。 |
| IT-CF-031 | `minimal Presetの設定を読む場合` | `sourceDocument = createMinimalPresetDocument()`。 | `const actual = await sut.execute('/tmp/phasegate.config.json')` | 全要素の `enabled === false`。 |
| IT-CF-032 | `strict Presetで一部だけ有効な場合` | `sourceDocument = createStrictPresetDocument({ harnesses: { cascadeUpdate: false } })`。 | `const actual = await sut.execute('/tmp/phasegate.config.json')` | `actual` から `name` ごとの真偽を連想配列化し、期待値と一致させる。 |
| IT-CF-033 | `スキーマ検証でエラーが出る場合` | `load` は valid document。`schemaValidator.validate.mockReturnValue([createHarnessError({ errorCode: 'L1-001' })])`。 | `const action = sut.execute('/tmp/phasegate.config.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigValidationError)`。 |
| IT-CF-034 | `設定ファイルが存在しない場合` | `configRepository.load.mockRejectedValue(new ConfigNotFoundError('/tmp/missing.json'))`。 | `const action = sut.execute('/tmp/missing.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigNotFoundError)`。 |

## 4. Adapter統合テスト詳細ロジック

### 4.1 FileSystemConfigRepository

`target('load')` と `target('save')` を分ける。一時ディレクトリの作成と `process.chdir()` の復元は各 `it` の Arrange / Assert 内で完結させる。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-035 | `configPathを指定した場合` | tmpDir配下に `phasegate.config.json` を生成し、有効JSONを書き込む。 | `const actual = await repository.load(configPath)` | `actual.path` が絶対パス。`actual.document` が元の JSON と深く等しい。 |
| IT-CF-036 | `configPathを省略した場合` | `tmpDir/phasegate.config.json` を作る。`tmpDir/sub/sub2` を作り、Arrange で `process.chdir(tmpDir/sub/sub2)`。 | `const actual = await repository.load()` | `actual.path` が `tmpDir/phasegate.config.json` の絶対パス。親方向探索が動くこと。Assert 後に元の cwd へ戻す。 |
| IT-CF-037 | `loadが返すpath形式を確認する場合` | IT-CF-035 と同様。 | `const actual = await repository.load(configPath)` | `path.isAbsolute(actual.path) === true`。 |
| IT-CF-038 | `対象ファイルが存在しない場合` | 存在しない絶対パスを渡す。 | `const action = repository.load('/nonexistent/path/phasegate.config.json')` | `await expect(action).rejects.toBeInstanceOf(ConfigNotFoundError)`。 |
| IT-CF-039 | `JSONが壊れている場合` | 壊れたJSONテキストを書いた `phasegate.config.json` を用意する。 | `const action = repository.load(configPath)` | `await expect(action).rejects.toBeInstanceOf(ConfigPersistenceError)`。 |
| IT-CF-040 | `新規保存する場合` | tmpDir配下の保存先パスと valid document を用意する。 | `await repository.save(configPath, document)` | `fs.readFile` で読み戻した文字列が `JSON.stringify(document, null, 2) + '\\n'` と一致する。 |
| IT-CF-041 | `既存ファイルを上書きする場合` | 旧JSONを書いたファイルを事前作成する。 | `await repository.save(existingPath, newDocument)` | 読み戻し結果が `newDocument` に更新される。旧内容が残らない。 |
| IT-CF-042 | `書込みに失敗する場合` | 読み取り専用ファイルまたは `fs.promises.writeFile` spy で `EACCES` を発生させる。 | `const action = repository.save(path, document)` | `await expect(action).rejects.toBeInstanceOf(ConfigPersistenceError)`。 |

### 4.2 AjvConfigSchemaValidator

このファイルはモック禁止。実スキーマと実AJVで検証する。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-043 | `有効なv2ドキュメントの場合` | `document = createValidSourceDocument()`。 | `const actual = validator.validate(document)` | `actual` が空配列。 |
| IT-CF-044 | `projectセクションが欠落している場合` | valid document から `project` を削除する。 | `const actual = validator.validate(document)` | `actual.length >= 1`。`required` 系の `HarnessError` が含まれる。 |
| IT-CF-045 | `bundleSizeLimitが負値の場合` | `document.harnesses.bundleSizeLimit = -1`。 | `const actual = validator.validate(document)` | `minimum` 相当の `HarnessError` が含まれる。 |
| IT-CF-046 | `project.presetが不正値の場合` | `document.project.preset = 'invalid' as never`。 | `const actual = validator.validate(document)` | `enum` 相当の `HarnessError` が含まれる。 |
| IT-CF-047 | `未知キーが混入している場合` | トップレベルへ `unknown = true` を追加する。 | `const actual = validator.validate(document)` | `additionalProperties` 相当の `HarnessError` が含まれる。 |
| IT-CF-048 | `AJV内部型を外に漏らさない場合` | 任意の不正 document を使う。 | `const actual = validator.validate(document)` | 各要素が `errorCode` / `message` / `path` などの `HarnessError` 形状のみを持つこと。`keyword` や `schemaPath` など AJV固有項目へ依存しないこと。 |
| IT-CF-049 | `planningMode.defaultが不正値の場合` | `document.planningMode.default = 'unknown' as never`。 | `const actual = validator.validate(document)` | `enum` 相当の `HarnessError` が含まれる。 |
| IT-CF-050 | `複数箇所が壊れている場合` | `project` 欠落と `bundleSizeLimit = -1` など複数不正を同時に入れる。 | `const actual = validator.validate(document)` | `actual.length >= 2`。複数エラーが一括返却される。 |

### 4.3 StaticFeatureRegistryAdapter

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-051 | `Wave 1対象機能を取得する場合` | adapter を素直に生成する。 | `const actual = adapter.listAvailable()` | `actual` が `['agentLessonCollection', 'cascadeUpdate', 'bundleSizeLimit', 'deadCodeGC']` と一致する。 |
| IT-CF-052 | `複数回呼び出す場合` | adapter を生成する。 | `const actual = [adapter.listAvailable(), adapter.listAvailable()]` | 1回目と2回目の並び順が完全一致する。 |
| IT-CF-053 | `返却値を書き換えようとする場合` | `const first = adapter.listAvailable() as string[]` を取得する。 | `first.splice(0, 1); const actual = adapter.listAvailable()` | `actual` が元の4件を保つこと。内部配列が破壊されないこと。 |

### 4.4 PresetDefinitionStore

公開API名は実装に合わせる。以下では仮に `store.load()` と記述する。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-054 | `全Presetを取得する場合` | store を生成する。 | `const actual = store.load()` | `actual` に `minimal` / `standard` / `strict` の3キーが存在する。 |
| IT-CF-055 | `各Presetの必須セクションを確認する場合` | store を生成する。 | `const actual = store.load()` | 各Presetに `layers` / `quickMode` / `harnesses` / `paths` / `reporting` が存在する。 |
| IT-CF-056 | `minimal Presetを確認する場合` | store を生成する。 | `const actual = store.load()` | `actual.minimal.layers.L3.enabled === false`。`actual.minimal.layers.L4.enabled === false`。 |
| IT-CF-057 | `strict PresetのL3閾値を確認する場合` | store を生成する。 | `const actual = store.load()` | `actual.strict.layers.L3.coverageThreshold === 95`。 |
| IT-CF-058 | `strict PresetのGSD機能を確認する場合` | store を生成する。 | `const actual = store.load()` | `agentLessonCollection === true`。`deadCodeGC === true`。`bundleSizeLimit === 500`。 |

### 4.5 EnableFeatureCommandHandler

`target('execute')` 配下は `describe('phasegate:enable CLI の引数を解釈して出力と終了コードを決める')` を親ふるまいとする。UseCaseはすべてスタブで差し替える。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-059 | `引数がない場合` | `createCliSpies()` を呼ぶ。UseCaseは呼ばれない前提。 | `await handler.execute([])` | `console.log` にUsage文字列が出る。`process.exit` は呼ばれないか、呼ぶ実装なら `0` を使わないことを確認する。 |
| IT-CF-060 | `--listを指定した場合` | `listUseCase.execute.mockResolvedValue([{ name: 'agentLessonCollection', enabled: false }, ...])`。 | `await handler.execute(['--list'])` | `console.log` の先頭に `Available features:` が出る。各行が出力される。`process.exit(0)`。 |
| IT-CF-061 | `--listで状態表示を確認する場合` | `listUseCase.execute.mockResolvedValue([{ name: 'agentLessonCollection', enabled: true }, { name: 'cascadeUpdate', enabled: false }, ...])`。 | `await handler.execute(['--list'])` | 出力行に `[enabled]` と `[disabled]` が期待通り含まれる。 |
| IT-CF-062 | `有効な機能名を指定した場合` | `enableUseCase.execute.mockResolvedValue({ feature: 'agentLessonCollection', enabled: true, configPath: '/path/to/phasegate.config.json' })`。 | `await handler.execute(['agentLessonCollection'])` | `console.log` に `Enabled feature: agentLessonCollection` と `Updated: /path/to/phasegate.config.json` が出る。`process.exit(0)`。 |
| IT-CF-063 | `未知機能を指定した場合` | `enableUseCase.execute.mockRejectedValue(new UnsupportedFeatureError('unknownFeature', createAvailableFeatures()))`。 | `await handler.execute(['unknownFeature'])` | `console.error` に `Unknown feature: unknownFeature`。利用可能一覧が出る。`process.exit(1)`。 |
| IT-CF-064 | `UseCaseが一般エラーを返す場合` | `enableUseCase.execute.mockRejectedValue(new Error('unexpected'))`。 | `await handler.execute(['agentLessonCollection'])` | `console.error` にエラーメッセージ。`process.exit(2)`。 |
| IT-CF-065 | `UnsupportedFeatureErrorの候補一覧表示を確認する場合` | IT-CF-063 と同じエラーを使う。 | `await handler.execute(['invalidName'])` | `Available features:` 行に4機能名が含まれる。 |
| IT-CF-066 | `ConfigPersistenceErrorが返る場合` | `enableUseCase.execute.mockRejectedValue(new ConfigPersistenceError('/path/to/phasegate.config.json'))`。 | `await handler.execute(['agentLessonCollection'])` | `process.exit(2)`。保存失敗を `console.error` へ出す。 |

### 4.6 DisableFeatureCommandHandler

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-067 | `--listを指定した場合` | `listUseCase.execute.mockResolvedValue([{ name: 'deadCodeGC', enabled: true }, ...])`。 | `await handler.execute(['--list'])` | `Available features:` が出力され、`process.exit(0)`。 |
| IT-CF-068 | `有効な機能名を指定した場合` | `disableUseCase.execute.mockResolvedValue({ feature: 'deadCodeGC', enabled: false, configPath: '/path/to/phasegate.config.json' })`。 | `await handler.execute(['deadCodeGC'])` | `Disabled feature: deadCodeGC` と `Updated: /path/to/phasegate.config.json` が出る。`process.exit(0)`。 |
| IT-CF-069 | `未知機能を指定した場合` | `disableUseCase.execute.mockRejectedValue(new UnsupportedFeatureError('unknownFeature', createAvailableFeatures()))`。 | `await handler.execute(['unknownFeature'])` | `Unknown feature: unknownFeature` と候補一覧が出る。`process.exit(1)`。 |
| IT-CF-070 | `一般エラーが返る場合` | `disableUseCase.execute.mockRejectedValue(new Error('unexpected'))`。 | `await handler.execute(['deadCodeGC'])` | `console.error` が呼ばれ、`process.exit(2)`。 |
| IT-CF-071 | `引数がない場合` | `createCliSpies()` を呼ぶ。 | `await handler.execute([])` | Usage文字列が `console.log` に出る。 |
| IT-CF-072 | `ConfigPersistenceErrorが返る場合` | `disableUseCase.execute.mockRejectedValue(new ConfigPersistenceError('/path/to/phasegate.config.json'))`。 | `await handler.execute(['deadCodeGC'])` | `process.exit(2)`。 |

### 4.7 ListAvailableFeaturesCommandHandler

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-073 | `一覧取得に成功した場合` | `listUseCase.execute.mockResolvedValue([{ name: 'agentLessonCollection', enabled: false }, ...])`。 | `await handler.execute()` | `console.log` の先頭に `Available features:` が出る。 |
| IT-CF-074 | `一覧の状態表示を確認する場合` | `listUseCase.execute.mockResolvedValue([{ name: 'agentLessonCollection', enabled: true }, { name: 'cascadeUpdate', enabled: false }, ...])`。 | `await handler.execute()` | 各行へ `<name> [enabled|disabled]` 形式で出力される。 |
| IT-CF-075 | `成功時の終了コードを確認する場合` | 正常な一覧を返す。 | `await handler.execute()` | `process.exit(0)`。 |
| IT-CF-076 | `一覧取得が失敗する場合` | `listUseCase.execute.mockRejectedValue(new Error('unexpected'))`。 | `await handler.execute()` | `console.error` が呼ばれ、`process.exit(2)`。 |

### 4.8 load-config ファサード

`target('loadConfig')` 配下は `describe('外部公開ファサードとしてHarnessConfigV2を返す')` を親ふるまいとする。ここでは実 `FileSystemConfigRepository`、実 `AjvConfigSchemaValidator`、実 `PresetDefinitionStore`、実 `PresetResolutionService` を組み合わせる。

| ケースID | `context()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-CF-077 | `有効な設定ファイルを指定した場合` | tmpDir に valid `phasegate.config.json` を書く。 | `const actual = await loadConfig(configPath)` | `actual.project.name` と `actual.project.preset` が入力と一致する。`actual.layers` と `actual.harnesses` が解決済み構造を持つ。 |
| IT-CF-078 | `存在しない設定ファイルを指定した場合` | 存在しない絶対パスを用意する。 | `const action = loadConfig(missingPath)` | `await expect(action).rejects.toBeInstanceOf(ConfigNotFoundError)`。 |
| IT-CF-079 | `スキーマ不正ファイルを指定した場合` | `project` を欠いた invalid JSON を tmpDir に書く。 | `const action = loadConfig(configPath)` | `await expect(action).rejects.toBeInstanceOf(ConfigValidationError)`。 |

## 5. モック戦略

| 対象 | 方針 |
|---|---|
| `ConfigRepositoryPort` | UseCaseテストではモック化する。Facade と `FileSystemConfigRepository` IT では実装を使う。 |
| `ConfigSchemaValidatorPort` | UseCaseテストではモック化する。`AjvConfigSchemaValidator` IT と `load-config` ファサードでは実装を使う。 |
| `FeatureRegistryPort` | UseCaseテストとCLIテストではモック化する。`StaticFeatureRegistryAdapter` IT では実装を使う。 |
| `PresetResolutionService` | Domainルールの中心なのでモックしない。UseCaseでは常に実体を使う。 |
| `FeatureRegistry` | `ensureAvailable` と固定順序のルールを通すため、UseCaseでは実体を使う。 |
| CLIの `console` / `process.exit` | 副作用観測のため `vi.spyOn` で差し替える。実プロセス終了は禁止。 |
| ファイルシステム | 原則は実FSを使う。IT-CF-042 のみ権限依存が不安定なら `writeFile` の失敗を spy で補助する。 |

補足:

- Domain集約や値オブジェクトのモックは行わない。
- `beforeEach` は `vi.restoreAllMocks()` や一時ディレクトリ後始末のみに使い、ケース固有の Arrange は各 `it` 内へ置く。
- 期待値の確認対象は DTO / 保存引数 / 標準出力 / 終了コードに限定し、内部実装の private 関数呼び出しには依存しない。

## 6. テスト実行コマンド

```bash
pnpm vitest scripts/harness/__tests__/config-foundation --run
```

```bash
pnpm vitest scripts/harness/__tests__/config-foundation/application/use-cases/load-resolved-config-use-case.test.ts --run
```

```bash
pnpm vitest scripts/harness/__tests__/config-foundation/presentation/cli/enable-feature-command-handler.test.ts --run
```

```bash
pnpm phasegate:check-ready
```
