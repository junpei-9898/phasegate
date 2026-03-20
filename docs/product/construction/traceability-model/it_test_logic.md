# ITテストロジック設計: traceability-model

> **作成日**: 2026-03-14
> **対応ストーリー**: H03-01, H03-02, H03-03
> **前提ドキュメント**: `logical_design.md`、`it_test_design.md`、`coverage_report.md`、`testing-rules.md`

## 1. テストファイル構成

| ファイルパス | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/traceability-model/application/validate-implementation-metadata-usecase.test.ts` | `ValidateImplementationMetadataUseCase` | 5 |
| `scripts/harness/__tests__/traceability-model/application/validate-design-story-annotations-usecase.test.ts` | `ValidateDesignStoryAnnotationsUseCase` | 6 |
| `scripts/harness/__tests__/traceability-model/application/validate-test-story-metadata-usecase.test.ts` | `ValidateTestStoryMetadataUseCase` | 5 |
| `scripts/harness/__tests__/traceability-model/application/build-traceability-chain-usecase.test.ts` | `BuildTraceabilityChainUseCase` | 4 |
| `scripts/harness/__tests__/traceability-model/application/verify-traceability-coverage-usecase.test.ts` | `VerifyTraceabilityCoverageUseCase` | 5 |
| `scripts/harness/__tests__/traceability-model/application/resolve-legacy-story-id-usecase.test.ts` | `ResolveLegacyStoryIdUseCase` | 4 |
| `scripts/harness/__tests__/traceability-model/infrastructure/source-metadata-parser.test.ts` | `SourceMetadataParser` | 10 |
| `scripts/harness/__tests__/traceability-model/infrastructure/markdown-story-annotation-parser.test.ts` | `MarkdownStoryAnnotationParser` | 7 |
| `scripts/harness/__tests__/traceability-model/infrastructure/frontmatter-flag-parser.test.ts` | `FrontmatterFlagParser` | 5 |
| `scripts/harness/__tests__/traceability-model/infrastructure/story-catalog-parser.test.ts` | `StoryCatalogParser` | 6 |
| `scripts/harness/__tests__/traceability-model/infrastructure/markdown-story-catalog-gateway.test.ts` | `MarkdownStoryCatalogGateway` | 6 |
| `scripts/harness/__tests__/traceability-model/infrastructure/markdown-unit-definition-gateway.test.ts` | `MarkdownUnitDefinitionGateway` | 6 |
| `scripts/harness/__tests__/traceability-model/infrastructure/file-system-metadata-reader.test.ts` | `FileSystemMetadataReader` | 6 |
| `scripts/harness/__tests__/traceability-model/infrastructure/markdown-design-document-gateway.test.ts` | `MarkdownDesignDocumentGateway` | 7 |
| `scripts/harness/__tests__/traceability-model/infrastructure/file-system-inception-plan-gateway.test.ts` | `FileSystemInceptionPlanGateway` | 5 |
| `scripts/harness/__tests__/traceability-model/infrastructure/legacy-metadata-validator-adapter.test.ts` | `LegacyMetadataValidatorAdapter` | 5 |
| `scripts/harness/__tests__/traceability-model/integration/shared-kernel-story-id.integration.test.ts` | shared-kernel `StoryId` export | 3 |
| `scripts/harness/__tests__/traceability-model/integration/metadata-validator-adapter.integration.test.ts` | legacy adapter 連携 | 4 |
| `scripts/harness/__tests__/traceability-model/integration/traceability-chain.integration.test.ts` | 逆引きチェーン end-to-end | 5 |
| **合計** |  | **104** |

## 2. テストヘルパー・シードデータ

### 2.1 共通テスト骨格

すべての疑似コードは以下の骨格で統一する。

```ts
const target = describe;
const context = describe;

target('<対象クラス or 関数>', () => {
  describe('<対象メソッド or 関数名>', () => {
    context('<前提条件>', () => {
      it('<日本語の期待値>', async () => {
        // Arrange
        // Act
        const actual = ...
        // Assert
      });
    });
  });
});
```

### 2.2 共通ヘルパー

- `createProjectRelativePath(value: string)`: `ProjectRelativePath.create(value)` の薄いラッパー
- `createStoryId(value: string)`: `StoryId.parse(value)` の薄いラッパー
- `createMetadataTag(params)`: `MetadataTag` 生成ヘルパー
- `createStoryIdAnnotation(params)`: `StoryIdAnnotation` 生成ヘルパー
- `createDesignDocumentFlags(params)`: `DesignDocumentFlags` 生成ヘルパー
- `createValidationSuccess(params)`: `MetadataValidationResult.success(...)` を返す
- `createValidationFailure(params)`: `MetadataValidationResult.failure(...)` を返す
- `createTraceabilityChain(params)`: `TraceabilityChain` を最小リンク群で生成する
- `createTempTraceabilityFixture(builder)`: 一時ディレクトリ配下に fixture 構造を作る
- `writeFixtureFile(path, content)`: fixture ファイル書き込み共通化
- `cleanupTempDir(tempDir)`: `afterEach` 相当の削除処理

### 2.3 モック生成ヘルパー

- `createMetadataReaderPortStub()`
- `createDesignDocumentPortStub()`
- `createUnitDefinitionPortStub()`
- `createStoryCatalogPortStub()`
- `createInceptionPlanPortStub()`
- `createMetadataValidatorStub()`
- `createTraceabilityChainBuilderStub()`
- `createBuildTraceabilityChainUseCaseStub()`
- `createStoryIdAliasResolverStub()`

各スタブは `vi.fn()` を保持するだけの最小構成とし、各 `it` の `// Arrange` で戻り値や例外を個別に設定する。`beforeEach` による暗黙 Arrange は行わない。

### 2.4 シードデータ

| シード / fixture | 用途 |
|---|---|
| `fixtures/traceability-model/docs/product/user_stories.md` | 正規 `HXX-XX` と legacy `US-XXX` alias の両方を持つ story catalog |
| `fixtures/traceability-model/docs/product/construction/traceability-model/logical_design.md` | frontmatter なしの累積更新文書 |
| `fixtures/traceability-model/docs/product/construction/traceability-model/domain_model.md` | `traceability.initial_creation: true` 付き初回作成文書 |
| `fixtures/traceability-model/docs/product/units/traceability_model_unit.md` | `Unit ID: traceability-model` の unit 定義 |
| `fixtures/traceability-model/docs/inception/traceability-model/H03-01/it_test_design_plan.md` | `findPlanRoot()` / `exists()` 成功用 fixture |
| `fixtures/traceability-model/scripts/harness/sample-impl.ts` | `@unit` / `@layer` / `@story-id` または `@story` 付き TypeScript fixture |
| `fixtures/traceability-model/legacy/user_stories_with_alias.md` | alias map 検証専用 catalog 断片 |

### 2.5 共通検証ルール

- `actual` 以外の Act 結果変数は使わない
- `Arrange` では test case 固有条件だけを組み立てる
- `Assert` は「戻り値」「協調オブジェクト呼び出し」「エラー契約」の順で確認する
- ドメイン実体は実インスタンスを使い、Port だけをモックする
- 例外系は `await expect(...).rejects` 形式で記述する

## 3. UseCase統合テスト詳細ロジック

### 3.1 `validate-implementation-metadata-usecase.test.ts`

`target('ValidateImplementationMetadataUseCase') > describe('execute')`

#### IT-TM-001 複数ファイルのメタデータが全てvalidの場合に全結果がvalid=trueで返ること
- `context`: 2件の実装ファイルがあり、両方のタグ検証が成功する場合
- `Arrange`: `filePaths` に 2 つの `ProjectRelativePath` を用意する。`metadataReaderPort.readImplementationTags` を 2 回成功させ、1件目は `@unit` と `@layer`、2件目も同様のタグを返す。`validator.validateImplementation` は 2 回とも `createValidationSuccess({ warnings: [] })` を返す。`sut = new ValidateImplementationMetadataUseCase(metadataReaderPort, validator)` を生成する。
- `Act`: `const actual = await sut.execute(filePaths)`
- `Assert`: `actual` の長さが 2 件であること、各要素の `filePath` が入力順であること、各要素の `valid` が `true`、`errors` が空配列であること、`metadataReaderPort.readImplementationTags` が全ファイルに対して 1 回ずつ呼ばれることを確認する。

#### IT-TM-002 1件でもinvalidがある場合にそのファイルの結果がvalid=falseで返ること
- `context`: 2件のうち 2 件目だけタグ不備がある場合
- `Arrange`: 1件目のタグは正常、2件目のタグは `@layer` 欠落に相当する内容を返す。`validator.validateImplementation` は 1 回目に success、2 回目に `createValidationFailure({ errors: [L2-002] })` を返す。
- `Act`: `const actual = await sut.execute(filePaths)`
- `Assert`: `actual[0].valid === true`、`actual[1].valid === false`、`actual[1].errors[0].code === 'L2-002'` を確認する。

#### IT-TM-003 MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること
- `context`: 最初のファイル読み込みで Infrastructure 例外が発生する場合
- `Arrange`: `metadataReaderPort.readImplementationTags` を `mockRejectedValue(new Error('read failed'))` にする。`validator` は呼ばれない前提で `sut` を生成する。
- `Act`: `const actual = sut.execute(filePaths)`
- `Assert`: `await expect(actual).rejects.toThrow(MetadataReadApplicationError)`、`validator.validateImplementation` が呼ばれていないことを確認する。

#### IT-TM-004 結果がMetadataValidationOutput DTOに正しく整形されること
- `context`: validator が warning と error を含む結果値を返す場合
- `Arrange`: 1件の `filePath` を用意し、`metadataReaderPort.readImplementationTags` は tags を返す。`validator.validateImplementation` は `valid: false`、`errors: [{ code: 'L2-002', message: '...' }]`、`warnings: [{ code: 'L2-WARN', message: '...' }]` を含む結果値を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0]` の `filePath`、`valid`、`errors`、`warnings` が validator の返却内容と一致することを確認する。

#### IT-TM-005 空のfilePathsが渡された場合に空配列が返ること
- `context`: 入力ファイル配列が空の場合
- `Arrange`: `filePaths = []`、`sut` を通常生成する。
- `Act`: `const actual = await sut.execute([])`
- `Assert`: `actual` が空配列であること、`metadataReaderPort.readImplementationTags` と `validator.validateImplementation` が一度も呼ばれないことを確認する。

### 3.2 `validate-design-story-annotations-usecase.test.ts`

`target('ValidateDesignStoryAnnotationsUseCase') > describe('execute')`

#### IT-TM-006 frontmatter initial_creation: trueの文書で@story-id欠落が許容されること
- `context`: 初回作成文書で注釈が 0 件の場合
- `Arrange`: `designDocumentPort.readFrontmatterFlags` は `createDesignDocumentFlags({ initialCreation: true })` を返す。`readStoryAnnotations` は空配列を返す。`validator.validateDesignDocument` は success を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].valid === true`、`designDocumentPort.readFrontmatterFlags` と `readStoryAnnotations` が同一 `filePath` に対して呼ばれることを確認する。

#### IT-TM-007 frontmatter未設定の文書で@story-id欠落がエラーとなること
- `context`: 累積更新文書で注釈が 0 件の場合
- `Arrange`: `readFrontmatterFlags` は `initialCreation: false` を返す。`readStoryAnnotations` は空配列を返す。`validator.validateDesignDocument` は `L2-002` を含む failure を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].valid === false`、`actual[0].errors[0].code === 'L2-002'` を確認する。

#### IT-TM-008 @story-idが存在し独立行かつcatalog存在時にvalid=trueで返ること
- `context`: 独立行の `@story-id H03-01` が 1 件あり catalog にも存在する場合
- `Arrange`: `readFrontmatterFlags` は `initialCreation: false`、`readStoryAnnotations` は `standaloneLine: true` の annotation を返す。`validator.validateDesignDocument` は success を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].valid === true`、`actual[0].errors` が空であることを確認する。

#### IT-TM-009 @story-idが独立行でない場合にvalid=falseで返ること
- `context`: `@story-id` 行の末尾に本文が続く場合
- `Arrange`: `readStoryAnnotations` は `standaloneLine: false` の annotation を返す。`validator.validateDesignDocument` は failure を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].valid === false`、`actual[0].errors` に独立行違反のエラーが含まれることを確認する。

#### IT-TM-010 DesignDocumentPortの読み込み失敗時にDesignDocumentReadApplicationErrorが発生すること
- `context`: frontmatter 読み込み時に例外が発生する場合
- `Arrange`: `designDocumentPort.readFrontmatterFlags` を reject させる。`sut` を生成する。
- `Act`: `const actual = sut.execute([filePath])`
- `Assert`: `await expect(actual).rejects.toThrow(DesignDocumentReadApplicationError)`、`validator.validateDesignDocument` が呼ばれていないことを確認する。

#### IT-TM-011 複数ファイルに対して各ファイルごとにfrontmatterフラグとannotationsが独立に評価されること
- `context`: 1件目は初回作成、2件目は累積更新で有効 annotation を持つ場合
- `Arrange`: 1件目 `readFrontmatterFlags => initialCreation: true`、`readStoryAnnotations => []`。2件目 `readFrontmatterFlags => initialCreation: false`、`readStoryAnnotations => [annotation]`。validator は 1 件目も 2 件目も success を返す。
- `Act`: `const actual = await sut.execute([filePath1, filePath2])`
- `Assert`: 両方 `valid === true` であること、各ファイルに対する flag と annotation の読取呼び出しが混線しないことを確認する。

### 3.3 `validate-test-story-metadata-usecase.test.ts`

`target('ValidateTestStoryMetadataUseCase') > describe('execute')`

#### IT-TM-012 @storyタグが存在し正規StoryIdとして解決可能な場合にvalid=trueで返ること
- `context`: テストファイルに `@story H03-01` が 1 件ある場合
- `Arrange`: `metadataReaderPort.readTestTags` は `@story H03-01` の `MetadataTag` を返す。`validator.validateTest` は success を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].valid === true`、`validator.validateTest` が返却タグで呼ばれていることを確認する。

#### IT-TM-013 @storyタグが欠落している場合にエラーを返すこと
- `context`: テストファイルに `@story` が存在しない場合
- `Arrange`: `readTestTags` は空配列を返す。`validator.validateTest` は failure を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].valid === false`、`actual[0].errors[0].code === 'L2-002'` を確認する。

#### IT-TM-014 @storyタグの値が正規StoryId形式でない場合にエラーを返すこと
- `context`: `@story US-001` のように正規形式外の値が与えられる場合
- `Arrange`: `readTestTags` は不正値入り tag を返す。`validator.validateTest` は形式不正の failure を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].errors.length > 0`、`actual[0].valid === false` を確認する。

#### IT-TM-015 MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること
- `context`: テストタグ読取で I/O 例外が発生する場合
- `Arrange`: `metadataReaderPort.readTestTags` を reject させる。
- `Act`: `const actual = sut.execute([filePath])`
- `Assert`: `await expect(actual).rejects.toThrow(MetadataReadApplicationError)` を確認する。

#### IT-TM-016 結果がMetadataValidationOutput DTOに正しく整形されること
- `context`: validator が warning を返す場合
- `Arrange`: `readTestTags` は有効 tag を返す。`validator.validateTest` は `valid: true`、`warnings` 付き success を返す。
- `Act`: `const actual = await sut.execute([filePath])`
- `Assert`: `actual[0].warnings` が validator の warning と一致すること、`valid === true` を確認する。

### 3.4 `build-traceability-chain-usecase.test.ts`

`target('BuildTraceabilityChainUseCase') > describe('execute')`

#### IT-TM-017 builderの結果がTraceabilityChainOutput DTOに正しく写像されること
- `context`: builder が完全な `TraceabilityChain` を返す場合
- `Arrange`: `origin` を用意し、`builder.build` は `implementation-to-unit`、`unit-to-design`、`design-to-story`、`story-to-plan` を持つ chain を返す。
- `Act`: `const actual = await sut.execute(origin)`
- `Assert`: `actual.origin`、`actual.links`、`actual.brokenLinks` が chain の内容と一致し、DTO へ欠落なく写像されることを確認する。

#### IT-TM-018 complete判定がchain.isComplete()に基づくこと
- `context`: すべての link が `resolved: true` の場合
- `Arrange`: `chain.isComplete()` が `true` を返す chain を `builder.build` から返す。
- `Act`: `const actual = await sut.execute(origin)`
- `Assert`: `actual.complete === true` を確認する。

#### IT-TM-019 broken linkを含むチェーンでcomplete=falseが返ること
- `context`: 1 本以上 `resolved: false` の link がある場合
- `Arrange`: `brokenLinks` を 1 件含む chain を返す。
- `Act`: `const actual = await sut.execute(origin)`
- `Assert`: `actual.complete === false`、`actual.brokenLinks.length > 0` を確認する。

#### IT-TM-020 起点ファイル不正時にTraceabilityChainBuildErrorが発生すること
- `context`: `builder.build()` が `ProjectRelativePathError` を送出する場合
- `Arrange`: `builder.build` を reject ではなく throw するよう設定し、`invalidOrigin` を与える。
- `Act`: `const actual = sut.execute(invalidOrigin)`
- `Assert`: `await expect(actual).rejects.toThrow(TraceabilityChainBuildError)` を確認する。

### 3.5 `verify-traceability-coverage-usecase.test.ts`

`target('VerifyTraceabilityCoverageUseCase') > describe('execute')`

#### IT-TM-021 全チェーンが完全な場合にincompleteChains=0で返ること
- `context`: 2件の対象ファイルすべてが complete な chain を返す場合
- `Arrange`: `buildTraceabilityChainUseCase.execute` を 2 回 success させ、両方 `complete: true` の DTO を返す。
- `Act`: `const actual = await sut.execute(filePaths)`
- `Assert`: `actual.incompleteChains === 0`、`actual.completeChains === 2`、`actual.totalFiles === 2` を確認する。

#### IT-TM-022 brokenLinkを含むチェーンがincompleteとして集計されること
- `context`: 3件中 1 件だけ `complete: false` の場合
- `Arrange`: 2 回は complete、1 回は broken link 1 件付き incomplete を返す。
- `Act`: `const actual = await sut.execute(filePaths)`
- `Assert`: `actual.completeChains === 2`、`actual.incompleteChains === 1`、`actual.results[2].brokenLinks.length > 0` を確認する。

#### IT-TM-023 totalFilesが入力ファイル数と一致すること
- `context`: 5件の入力をそのまま処理する場合
- `Arrange`: 5件分の DTO を返すように `buildTraceabilityChainUseCase.execute` を設定する。
- `Act`: `const actual = await sut.execute(filePaths)`
- `Assert`: `actual.totalFiles === 5` を確認し、`execute` が 5 回呼ばれたことも確認する。

#### IT-TM-024 BuildTraceabilityChainUseCaseがエラーを投げた場合にTraceabilityCoverageApplicationErrorが発生すること
- `context`: 途中の 1 件で chain 構築例外が発生する場合
- `Arrange`: `buildTraceabilityChainUseCase.execute` の 2 回目を reject させる。
- `Act`: `const actual = sut.execute(filePaths)`
- `Assert`: `await expect(actual).rejects.toThrow(TraceabilityCoverageApplicationError)` を確認する。

#### IT-TM-025 空のfilePathsが渡された場合にtotalFiles=0で返ること
- `context`: 入力配列が空の場合
- `Arrange`: `filePaths = []`
- `Act`: `const actual = await sut.execute([])`
- `Assert`: `actual.totalFiles === 0`、`actual.completeChains === 0`、`actual.incompleteChains === 0`、`actual.results` が空配列であることを確認する。

### 3.6 `resolve-legacy-story-id-usecase.test.ts`

`target('ResolveLegacyStoryIdUseCase') > describe('execute')`

#### IT-TM-026 legacy形式の入力が正規StoryIdに解決されること
- `context`: `US-001` が alias map 上 `H03-01` に対応している場合
- `Arrange`: `resolver.isLegacyFormat` は `true`、`resolver.resolve` は `StoryId.parse('H03-01')` を返す。
- `Act`: `const actual = await sut.execute('US-001')`
- `Assert`: `actual?.toString() === 'H03-01'`、`resolver.resolve` が `US-001` で呼ばれることを確認する。

#### IT-TM-027 非legacy形式の入力がnullを返すこと
- `context`: すでに `H03-01` が入力される場合
- `Arrange`: `resolver.isLegacyFormat` は `false` を返す。
- `Act`: `const actual = await sut.execute('H03-01')`
- `Assert`: `actual === null`、`resolver.resolve` が呼ばれないことを確認する。

#### IT-TM-028 alias mapに存在しないlegacy IDがnullを返すこと
- `context`: `US-999` が legacy 形式だが alias 未登録の場合
- `Arrange`: `resolver.isLegacyFormat` は `true`、`resolver.resolve` は `null` を返す。
- `Act`: `const actual = await sut.execute('US-999')`
- `Assert`: `actual === null` を確認する。

#### IT-TM-029 空文字列が渡された場合にnullを返すこと
- `context`: 入力が空文字列の場合
- `Arrange`: `resolver.isLegacyFormat` は `false` を返す。
- `Act`: `const actual = await sut.execute('')`
- `Assert`: `actual === null`、`resolver.resolve` が呼ばれないことを確認する。

## 4. Adapter統合テスト詳細ロジック

### 4.1 Parser詳細ロジック

#### 4.1.1 `source-metadata-parser.test.ts`

`target('SourceMetadataParser') > describe('parseImplementationTags / parseTestTags')`

#### IT-TM-030 TypeScriptの行コメントから@unitタグを抽出できること
- `context`: `// @unit traceability-model` を含む TypeScript 文字列を渡す場合
- `Arrange`: `content` に 1 行コメントの `@unit` を含め、`filePath` を用意する。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual[0].type === '@unit'`、`actual[0].value === 'traceability-model'` を確認する。

#### IT-TM-031 TypeScriptの行コメントから@layerタグを抽出できること
- `context`: `// @layer domain` を含む場合
- `Arrange`: `content` に `@layer domain` を含める。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual` に `@layer` タグが 1 件含まれることを確認する。

#### IT-TM-032 JSDocコメントからタグを抽出できること
- `context`: `/** @unit traceability-model */` を含む場合
- `Arrange`: JSDoc 形式コメントを含む `content` を作る。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual` が `@unit` を抽出し、行番号も JSDoc の開始行に一致することを確認する。

#### IT-TM-033 対象外のコメント形式が無視されること
- `context`: 非 JSDoc ブロックコメントや本文文字列に `@unit` が含まれる場合
- `Arrange`: `/* @unit invalid */` と `const s = "@unit x"` を含む `content` を作る。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual` が空配列であることを確認する。

#### IT-TM-034 行番号が正しく保持されること
- `context`: 3 行目に `// @unit traceability-model` がある場合
- `Arrange`: 改行数を調整した `content` を作る。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual[0].lineNumber === 3` を確認する。

#### IT-TM-035 実装ファイルから@unit、@layer、@story-idの3タグが同時に抽出できること
- `context`: 3 種の許容タグがすべて存在する場合
- `Arrange`: `@unit`、`@layer`、`@story-id` を別行に配置する。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual.length === 3`、各 `type` が 1 回ずつ現れることを確認する。

#### IT-TM-036 テストファイルから@storyタグを抽出できること
- `context`: テストコード文字列に `// @story H03-01` がある場合
- `Arrange`: `content` に `@story` コメントを含める。
- `Act`: `const actual = parser.parseTestTags(content, filePath)`
- `Assert`: `actual[0].type === '@story'`、`actual[0].value === 'H03-01'` を確認する。

#### IT-TM-037 実装ファイル解析で@storyタグが無視されること
- `context`: 実装ファイルに `@story` が誤って書かれている場合
- `Arrange`: `content` に `@story H03-01` を含める。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual` に `@story` が含まれないことを確認する。

#### IT-TM-038 テストファイル解析で@unitタグが無視されること
- `context`: テストファイルに `@unit` が混在している場合
- `Arrange`: `content` に `@unit traceability-model` を含める。
- `Act`: `const actual = parser.parseTestTags(content, filePath)`
- `Assert`: `actual` に `@unit` が含まれないことを確認する。

#### IT-TM-039 タグなしファイルで空配列が返ること
- `context`: 許容タグを一切含まない場合
- `Arrange`: 通常の TypeScript 関数だけを持つ `content` を作る。
- `Act`: `const actual = parser.parseImplementationTags(content, filePath)`
- `Assert`: `actual` が空配列であることを確認する。

#### 4.1.2 `markdown-story-annotation-parser.test.ts`

`target('MarkdownStoryAnnotationParser') > describe('parse')`

#### IT-TM-040 @story-id H03-01形式の独立行が抽出されること
- `context`: 独立行で `@story-id H03-01` が書かれている場合
- `Arrange`: 該当行と次行見出しを含む Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual[0].storyId.toString() === 'H03-01'`、`actual[0].standaloneLine === true` を確認する。

#### IT-TM-041 次行のcontextLineが保持されること
- `context`: `@story-id` 行の次に `## 2.2 値オブジェクト群` がある場合
- `Arrange`: 2 行連続の Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual[0].contextLine === '## 2.2 値オブジェクト群'` を確認する。

#### IT-TM-042 行末に他文字がある場合にstandaloneLine=falseとなること
- `context`: `@story-id H03-01 追加内容` のように追記がある場合
- `Arrange`: 該当行を含む Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual[0].standaloneLine === false` を確認する。

#### IT-TM-043 複数の@story-id注釈が全て抽出されること
- `context`: 3 つの `@story-id` 行が存在する場合
- `Arrange`: 3 ケース分の注釈を含む Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.length === 3`、抽出順が出現順であることを確認する。

#### IT-TM-044 @story-id行の前後空白が除去されて判定されること
- `context`: 行頭・行末に空白を含む場合
- `Arrange`: `'  @story-id H03-01  '` を含む Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual[0].storyId.toString() === 'H03-01'`、`standaloneLine === true` を確認する。

#### IT-TM-045 行番号が正しく保持されること
- `context`: 5 行目に `@story-id` がある場合
- `Arrange`: ダミー行を 4 行入れた Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual[0].lineNumber === 5` を確認する。

#### IT-TM-046 @story-id注釈がない場合に空配列が返ること
- `context`: 注釈を含まない設計文書の場合
- `Arrange`: 通常の見出しと本文だけの Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual` が空配列であることを確認する。

#### 4.1.3 `frontmatter-flag-parser.test.ts`

`target('FrontmatterFlagParser') > describe('parse')`

#### IT-TM-047 traceability.initial_creation: trueが正しく抽出されること
- `context`: frontmatter に `initial_creation: true` がある場合
- `Arrange`: YAML frontmatter を含む Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.allowsStoryIdOmission() === true`、`actual.requiresStoryIdAnnotation() === false` を確認する。

#### IT-TM-048 frontmatterがない場合にinitialCreation=falseが返ること
- `context`: frontmatter 自体がない場合
- `Arrange`: 本文だけの Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.requiresStoryIdAnnotation() === true` を確認する。

#### IT-TM-049 traceability.initial_creation: falseの場合にannotationRequired=trueが返ること
- `context`: frontmatter に明示的な false がある場合
- `Arrange`: `initial_creation: false` を含める。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.requiresStoryIdAnnotation() === true` を確認する。

#### IT-TM-050 YAMLパース失敗時に例外が伝播すること
- `context`: frontmatter YAML が壊れている場合
- `Arrange`: 不正な YAML を含む Markdown を作る。
- `Act`: `const actual = () => parser.parse(content)`
- `Assert`: `expect(actual).toThrow()` で parser が握り潰さないことを確認する。

#### IT-TM-051 traceabilityキーが存在しない場合にinitialCreation=falseが返ること
- `context`: frontmatter はあるが `traceability` キーがない場合
- `Arrange`: `title: test` だけの YAML を含める。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.requiresStoryIdAnnotation() === true` を確認する。

#### 4.1.4 `story-catalog-parser.test.ts`

`target('StoryCatalogParser') > describe('parse')`

#### IT-TM-052 HXX-XX行が正規IDとして収集されること
- `context`: catalog に `H03-01` と `H03-02` が含まれる場合
- `Arrange`: Markdown 表または箇条書きで 2 つの正規 ID を含む文字列を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.storyIds.length === 2`、各 `StoryId` が期待値であることを確認する。

#### IT-TM-053 旧US行がalias mapに格納されること
- `context`: `US-001 -> H03-01` の記述がある場合
- `Arrange`: alias を含む catalog 断片を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.aliasMap.get('US-001')?.toString() === 'H03-01'` を確認する。

#### IT-TM-054 表形式のcatalogから正規IDとaliasが抽出できること
- `context`: Markdown テーブルに正規 ID 列と旧 US 列がある場合
- `Arrange`: テーブル形式文字列を用意する。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `storyIds` と `aliasMap` の両方が期待件数になることを確認する。

#### IT-TM-055 見出し形式のcatalogから正規IDが抽出できること
- `context`: `### H03-01: タイトル` の形式を使う場合
- `Arrange`: 見出し形式の文字列を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.storyIds[0].toString() === 'H03-01'` を確認する。

#### IT-TM-056 HXX-XX形式でない行が無視されること
- `context`: 正規表現に一致しない `H3-1` や `story-1` が混在する場合
- `Arrange`: ノイズ行を含む文字列を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: 不正な ID が `storyIds` に含まれないことを確認する。

#### IT-TM-057 空のcatalogで空結果が返ること
- `context`: StoryId も alias もない場合
- `Arrange`: 見出しだけの空 Markdown を作る。
- `Act`: `const actual = parser.parse(content)`
- `Assert`: `actual.storyIds.length === 0`、`actual.aliasMap.size === 0` を確認する。

### 4.2 Gateway詳細ロジック

#### 4.2.1 `markdown-story-catalog-gateway.test.ts`

`target('MarkdownStoryCatalogGateway') > describe('getAllStoryIds / getAliasMap / exists')`

#### IT-TM-058 user_stories.mdからStoryId一覧が取得できること
- `context`: fixture の `user_stories.md` が存在する場合
- `Arrange`: 一時ディレクトリへ `docs/product/user_stories.md` を作成し gateway を生成する。
- `Act`: `const actual = await gateway.getAllStoryIds()`
- `Assert`: `actual.length > 0`、すべて `HXX-XX` 形式の `StoryId` であることを確認する。

#### IT-TM-059 getAliasMapからlegacy alias mapが取得できること
- `context`: catalog に旧 US 列がある場合
- `Arrange`: alias 付き fixture を書き込む。
- `Act`: `const actual = await gateway.getAliasMap()`
- `Assert`: `actual.has('US-001') === true`、`actual.get('US-001')?.toString() === 'H03-01'` を確認する。

#### IT-TM-060 存在するStoryIdに対してexists()がtrueを返すこと
- `context`: catalog に `H03-01` が存在する場合
- `Arrange`: 通常 fixture を用意する。
- `Act`: `const actual = await gateway.exists(createStoryId('H03-01'))`
- `Assert`: `actual === true` を確認する。

#### IT-TM-061 キャッシュが効いていること（2回目呼び出しでファイル再読み込みなし）
- `context`: 同一 gateway に対して `getAllStoryIds()` を 2 回呼ぶ場合
- `Arrange`: `fs.readFileSync` 相当を `vi.spyOn` し、fixture を用意する。
- `Act`: 1 回目 `await gateway.getAllStoryIds()` の後に 2 回目 `const actual = await gateway.getAllStoryIds()` を実行する。
- `Assert`: `actual.length > 0` を確認しつつ、ファイル読取回数が 1 回のままであることを確認する。

#### IT-TM-062 ファイルが存在しない場合にエラーとなること
- `context`: `user_stories.md` が配置されていない場合
- `Arrange`: catalog を作らず gateway を生成する。
- `Act`: `const actual = gateway.getAllStoryIds()`
- `Assert`: `await expect(actual).rejects.toThrow()` を確認する。

#### IT-TM-063 存在しないStoryIdに対してexists()がfalseを返すこと
- `context`: catalog に `H99-99` が存在しない場合
- `Arrange`: 通常 fixture を用意する。
- `Act`: `const actual = await gateway.exists(createStoryId('H99-99'))`
- `Assert`: `actual === false` を確認する。

#### 4.2.2 `markdown-unit-definition-gateway.test.ts`

`target('MarkdownUnitDefinitionGateway') > describe('getAllUnitNames / exists / findConstructionRoot')`

#### IT-TM-064 unit定義ファイルからunit名一覧が取得できること
- `context`: `traceability_model_unit.md` が存在する場合
- `Arrange`: `docs/product/units/traceability_model_unit.md` を作成し gateway を生成する。
- `Act`: `const actual = await gateway.getAllUnitNames()`
- `Assert`: `actual` に `'traceability-model'` が含まれることを確認する。

#### IT-TM-065 存在するunit名に対してexists()がtrueを返すこと
- `context`: 登録済み unit 名を問い合わせる場合
- `Arrange`: 通常 fixture を用意する。
- `Act`: `const actual = await gateway.exists('traceability-model')`
- `Assert`: `actual === true` を確認する。

#### IT-TM-066 存在しないunit名に対してexists()がfalseを返すこと
- `context`: 未登録 unit 名を問い合わせる場合
- `Arrange`: 通常 fixture を用意する。
- `Act`: `const actual = await gateway.exists('unknown-unit')`
- `Assert`: `actual === false` を確認する。

#### IT-TM-067 findConstructionRootが正しい相対パスを返すこと
- `context`: `docs/product/construction/traceability-model` が存在する場合
- `Arrange`: construction ディレクトリと対象 `.md` を作る。
- `Act`: `const actual = await gateway.findConstructionRoot('traceability-model')`
- `Assert`: `actual?.toString() === 'docs/product/construction/traceability-model'` を確認する。

#### IT-TM-068 construction配下にディレクトリがないunit名でnullが返ること
- `context`: unit 定義はあるが construction ディレクトリがない場合
- `Arrange`: unit 定義だけを作成し、construction は作らない。
- `Act`: `const actual = await gateway.findConstructionRoot('nonexistent')`
- `Assert`: `actual === null` を確認する。

#### IT-TM-069 Unit ID:行のunit名抽出が正しく動作すること
- `context`: `Unit ID: traceability-model` を含む unit 定義を読む場合
- `Arrange`: 該当行を持つ unit 定義ファイルを作る。
- `Act`: `const actual = await gateway.getAllUnitNames()`
- `Assert`: 抽出された unit 名が `traceability-model` だけであることを確認する。

#### 4.2.3 `file-system-metadata-reader.test.ts`

`target('FileSystemMetadataReader') > describe('readImplementationTags / readTestTags')`

#### IT-TM-070 .tsファイルからタグが読み取れること
- `context`: `.ts` 実装ファイルに `@unit` と `@layer` がある場合
- `Arrange`: `.ts` fixture を作成し reader を生成する。
- `Act`: `const actual = await reader.readImplementationTags(filePath)`
- `Assert`: `actual.length >= 2`、`@unit` と `@layer` が含まれることを確認する。

#### IT-TM-071 .tsxファイルからタグが読み取れること
- `context`: `.tsx` ファイルを読む場合
- `Arrange`: JSX を含む `.tsx` fixture を作成する。
- `Act`: `const actual = await reader.readImplementationTags(filePath)`
- `Assert`: `@unit` が抽出されることを確認する。

#### IT-TM-072 .mtsファイルからタグが読み取れること
- `context`: `.mts` ファイルを読む場合
- `Arrange`: `.mts` fixture を作る。
- `Act`: `const actual = await reader.readImplementationTags(filePath)`
- `Assert`: `@unit` が抽出されることを確認する。

#### IT-TM-073 .ctsファイルからタグが読み取れること
- `context`: `.cts` ファイルを読む場合
- `Arrange`: `.cts` fixture を作る。
- `Act`: `const actual = await reader.readImplementationTags(filePath)`
- `Assert`: `@unit` が抽出されることを確認する。

#### IT-TM-074 存在しないファイルでMetadataReadInfrastructureErrorが発生すること
- `context`: 指定パスのファイルが存在しない場合
- `Arrange`: 未作成パスを `ProjectRelativePath` 化する。
- `Act`: `const actual = reader.readImplementationTags(filePath)`
- `Assert`: `await expect(actual).rejects.toThrow(MetadataReadInfrastructureError)` を確認する。

#### IT-TM-075 readTestTagsで@storyタグが読み取れること
- `context`: テストファイルに `@story H03-01` がある場合
- `Arrange`: `.ts` テスト fixture を作る。
- `Act`: `const actual = await reader.readTestTags(filePath)`
- `Assert`: `actual[0].type === '@story'`、`actual[0].value === 'H03-01'` を確認する。

#### 4.2.4 `markdown-design-document-gateway.test.ts`

`target('MarkdownDesignDocumentGateway') > describe('listByUnit / readStoryAnnotations / readFrontmatterFlags')`

#### IT-TM-076 construction/{unit}/配下の.mdファイルが列挙されること
- `context`: construction 配下に 3 つの `.md` がある場合
- `Arrange`: `logical_design.md`、`domain_model.md`、`it_test_design.md` を作る。
- `Act`: `const actual = await gateway.listByUnit('traceability-model')`
- `Assert`: `actual.length === 3`、すべて `.md` の `ProjectRelativePath` であることを確認する。

#### IT-TM-077 readStoryAnnotationsが@story-id注釈を返すこと
- `context`: 設計文書に `@story-id H03-01` がある場合
- `Arrange`: annotation を含む Markdown を作る。
- `Act`: `const actual = await gateway.readStoryAnnotations(filePath)`
- `Assert`: `actual.length > 0`、`actual[0].storyId.toString() === 'H03-01'` を確認する。

#### IT-TM-078 readFrontmatterFlagsがfrontmatterフラグを返すこと
- `context`: frontmatter に `initial_creation: true` がある場合
- `Arrange`: frontmatter 付き Markdown を作る。
- `Act`: `const actual = await gateway.readFrontmatterFlags(filePath)`
- `Assert`: `actual.allowsStoryIdOmission() === true` を確認する。

#### IT-TM-079 readStoryAnnotationsとreadFrontmatterFlagsが同一キャッシュから供給されること
- `context`: 同一ファイルに対して annotation と frontmatter を連続読取する場合
- `Arrange`: `fs.readFileSync` を spy し、対象 Markdown を作る。
- `Act`: 先に `await gateway.readStoryAnnotations(filePath)`、続いて `const actual = await gateway.readFrontmatterFlags(filePath)` を実行する。
- `Assert`: `actual` が期待 flags を返しつつ、ファイル読取回数が 1 回であることを確認する。

#### IT-TM-080 存在しないunit名で空配列が返ること
- `context`: 指定 unit の construction ディレクトリが存在しない場合
- `Arrange`: 対象 unit のディレクトリを作らない。
- `Act`: `const actual = await gateway.listByUnit('nonexistent')`
- `Assert`: `actual` が空配列であることを確認する。

#### IT-TM-081 .md以外のファイルが除外されること
- `context`: `.md` と `.txt` が混在している場合
- `Arrange`: 同一ディレクトリに `.md` と `.txt` を作る。
- `Act`: `const actual = await gateway.listByUnit('traceability-model')`
- `Assert`: `actual` に `.txt` が含まれないことを確認する。

#### IT-TM-082 サブディレクトリ内の.mdファイルが列挙されないこと
- `context`: `construction/{unit}/sub/inner.md` が存在する場合
- `Arrange`: 直下 `.md` とサブディレクトリ配下 `.md` を両方作る。
- `Act`: `const actual = await gateway.listByUnit('traceability-model')`
- `Assert`: 直下ファイルだけが返り、`sub/inner.md` が含まれないことを確認する。

#### 4.2.5 `file-system-inception-plan-gateway.test.ts`

`target('FileSystemInceptionPlanGateway') > describe('exists / findPlanRoot')`

#### IT-TM-083 docs/inception/{unit}/{storyId}/の存在チェックが正しく動作すること
- `context`: 対象 story ディレクトリ配下に `*_plan.md` が存在する場合
- `Arrange`: `docs/inception/traceability-model/H03-01/it_test_design_plan.md` を作る。
- `Act`: `const actual = await gateway.exists('traceability-model', createStoryId('H03-01'))`
- `Assert`: `actual === true` を確認する。

#### IT-TM-084 *_plan.mdが存在しない場合にexists()がfalseを返すこと
- `context`: story ディレクトリはあるが `*_plan.md` がない場合
- `Arrange`: 空ディレクトリだけを作る。
- `Act`: `const actual = await gateway.exists('traceability-model', createStoryId('H03-01'))`
- `Assert`: `actual === false` を確認する。

#### IT-TM-085 ディレクトリ自体が存在しない場合にexists()がfalseを返すこと
- `context`: 対象 story ディレクトリが存在しない場合
- `Arrange`: 一切 fixture を作らない。
- `Act`: `const actual = await gateway.exists('traceability-model', createStoryId('H99-99'))`
- `Assert`: `actual === false` を確認する。

#### IT-TM-086 findPlanRootがディレクトリ存在時に相対パスを返すこと
- `context`: plan ディレクトリが存在する場合
- `Arrange`: `docs/inception/traceability-model/H03-01/` を作る。
- `Act`: `const actual = await gateway.findPlanRoot('traceability-model', createStoryId('H03-01'))`
- `Assert`: `actual?.toString() === 'docs/inception/traceability-model/H03-01'` を確認する。

#### IT-TM-087 findPlanRootがディレクトリ不存在時にnullを返すこと
- `context`: plan ディレクトリがない場合
- `Arrange`: 対象ディレクトリを作らない。
- `Act`: `const actual = await gateway.findPlanRoot('traceability-model', createStoryId('H99-99'))`
- `Assert`: `actual === null` を確認する。

### 4.3 Adapter詳細ロジック

#### 4.3.1 `legacy-metadata-validator-adapter.test.ts`

`target('LegacyMetadataValidatorAdapter') > describe('runMetadataCheck')`

#### IT-TM-088 既存runMetadataCheck()の入出力契約が維持されること
- `context`: 実装・設計・テストの各 UseCase が成功結果を返す場合
- `Arrange`: 3 つの UseCase モックを生成し、いずれも空エラーの `MetadataValidationOutput[]` を返す。adapter を生成する。
- `Act`: `const actual = await adapter.runMetadataCheck(files)`
- `Assert`: `actual.errors` が既存 `HarnessError[]` 契約に沿う配列であり、正常時は空配列であることを確認する。

#### IT-TM-089 内部で新UseCaseが呼び出されること
- `context`: 入力ファイルに実装ファイルが含まれる場合
- `Arrange`: 実装ファイルパスを 1 件渡し、`validateImplementationMetadataUseCase.execute` を success にする。
- `Act`: `const actual = await adapter.runMetadataCheck(files)`
- `Assert`: `validateImplementationMetadataUseCase.execute` が呼ばれること、`actual.errors.length === 0` を確認する。

#### IT-TM-090 v0 @layer usecaseがL2-002として報告されること
- `context`: `@layer usecase` を含む legacy 語彙エラーが UseCase から返る場合
- `Arrange`: UseCase モックが `errors: [{ code: 'L2-002', message: 'legacy layer' }]` を返すようにする。
- `Act`: `const actual = await adapter.runMetadataCheck(files)`
- `Assert`: `actual.errors[0].code === 'L2-002'`、message も引き継がれることを確認する。

#### IT-TM-091 旧HarnessError形式から統合契約上のHarnessErrorへ変換されること
- `context`: UseCase の DTO エラーを adapter が集約する場合
- `Arrange`: 1 件の invalid DTO を返すように UseCase を設定する。
- `Act`: `const actual = await adapter.runMetadataCheck(files)`
- `Assert`: 各 error が `code`、`message`、`filePath`、`line`、`fixExample` など統合契約で必要なプロパティを持つことを確認する。

#### IT-TM-092 入力ファイルが空の場合に空結果が返ること
- `context`: 入力ファイル配列が空の場合
- `Arrange`: `files = []`
- `Act`: `const actual = await adapter.runMetadataCheck([])`
- `Assert`: `actual.errors.length === 0`、各 UseCase が呼ばれないことを確認する。

### 4.4 統合テスト詳細ロジック

#### 4.4.1 `shared-kernel-story-id.integration.test.ts`

`target('shared-kernel/story-id') > describe('export contract')`

#### IT-TM-093 shared-kernel/story-id.tsがStoryIdだけを再エクスポートしていること
- `context`: shared-kernel 側の公開面を module import で検査する場合
- `Arrange`: `import * as sharedKernelStoryId from 'scripts/harness/shared-kernel/story-id'`
- `Act`: `const actual = Object.keys(sharedKernelStoryId)`
- `Assert`: `actual` が `['StoryId']` だけ、または `StoryId` を唯一の実質公開メンバーとして持つことを確認する。

#### IT-TM-094 shared-kernel経由のStoryIdがtraceability-model内部のStoryIdと同一であること
- `context`: 2 つの import 元から `StoryId.parse('H03-01')` する場合
- `Arrange`: shared-kernel 側と内部モジュール側から `StoryId` を import する。
- `Act`: `const actual = { fromShared: sharedStoryId.parse('H03-01'), fromInternal: internalStoryId.parse('H03-01') }`
- `Assert`: コンストラクタ参照または `instanceof` と `equals()` の結果が一致し、同一挙動を持つことを確認する。

#### IT-TM-095 shared-kernelからlegacy resolverが公開されていないこと
- `context`: export 面に `StoryIdAliasResolver` を混入させていないことを確認する場合
- `Arrange`: shared-kernel モジュールを import する。
- `Act`: `const actual = 'StoryIdAliasResolver' in sharedKernelStoryId`
- `Assert`: `actual === false` を確認する。

#### 4.4.2 `metadata-validator-adapter.integration.test.ts`

`target('LegacyMetadataValidatorAdapter integration') > describe('runMetadataCheck')`

#### IT-TM-096 LegacyMetadataValidatorAdapterが既存validators/metadata.tsの入口から新UseCaseを呼び出せること
- `context`: 実 fixture を組み合わせた adapter 全体を既存入口シグネチャで呼ぶ場合
- `Arrange`: temp fixture に `user_stories.md`、unit 定義、実装ファイルを作る。実 `MetadataValidator`、実 `UseCase`、実 `Gateway` で adapter を組み立てる。
- `Act`: `const actual = await runMetadataCheck(files)` を既存入口から実行する。
- `Assert`: `actual` が `HarnessError[]` 契約を返し、呼び出しが成功することを確認する。

#### IT-TM-097 実装ファイルのメタデータ検証が新UseCase経由で正常に動作すること
- `context`: 実装ファイルに `@unit traceability-model` と `@layer domain` がある場合
- `Arrange`: 正常な `.ts` fixture を作成し、catalog と unit 定義も揃える。
- `Act`: `const actual = await runMetadataCheck([filePath])`
- `Assert`: `actual.errors.length === 0` を確認する。

#### IT-TM-098 メタデータ欠落ファイルでL2-002エラーが報告されること
- `context`: 実装ファイルにメタデータコメントがない場合
- `Arrange`: コメントなし `.ts` fixture を作成する。
- `Act`: `const actual = await runMetadataCheck([filePath])`
- `Assert`: `actual.errors[0].code === 'L2-002'`、対象 `filePath` が紐付くことを確認する。

#### IT-TM-099 既存metadata.tsの呼び出しが新旧で同一結果を返すこと
- `context`: 同一 fixture に対して旧入口 facade と adapter 入口の両方を呼ぶ場合
- `Arrange`: 比較用 fixture を作成し、新旧呼び出し関数を取得する。
- `Act`: `const actual = { legacy: await legacyRun(files), modern: await adapterRun(files) }`
- `Assert`: `legacy.errors.length === modern.errors.length`、各 index の `code` と `filePath` が一致することを確認する。

#### 4.4.3 `traceability-chain.integration.test.ts`

`target('Traceability chain integration') > describe('BuildTraceabilityChainUseCase / VerifyTraceabilityCoverageUseCase')`

#### IT-TM-100 実装ファイルから設計文書を経由してinception planまでの完全チェーンが構築できること
- `context`: implementation -> construction -> story -> inception の最小 fixture が完全に揃っている場合
- `Arrange`: 実装ファイルに `@unit traceability-model`、設計文書に `@story-id H03-01`、catalog に `H03-01`、inception に `H03-01/*_plan.md` を作る。実 `BuildTraceabilityChainUseCase` を生成する。
- `Act`: `const actual = await buildTraceabilityChainUseCase.execute(implFilePath)`
- `Assert`: `actual.complete === true`、`actual.links.length === 4`、`actual.brokenLinks.length === 0` を確認する。

#### IT-TM-101 設計文書が欠落している場合にbroken linkが検出されること
- `context`: implementation と catalog はあるが construction 文書がない場合
- `Arrange`: 実装ファイルだけ作成し、construction 配下は空にする。
- `Act`: `const actual = await buildTraceabilityChainUseCase.execute(implFilePath)`
- `Assert`: `actual.complete === false`、`actual.brokenLinks` に `unit-to-design` が含まれることを確認する。

#### IT-TM-102 @story-id注釈が欠落している場合にbroken linkが検出されること
- `context`: 設計文書は存在するが `@story-id` がない場合
- `Arrange`: frontmatter なしで本文だけの `logical_design.md` を配置する。
- `Act`: `const actual = await buildTraceabilityChainUseCase.execute(implFilePath)`
- `Assert`: `actual.complete === false`、`actual.brokenLinks` に `design-to-story` が含まれることを確認する。

#### IT-TM-103 inception planが欠落している場合にbroken linkが検出されること
- `context`: story catalog までは存在するが inception plan がない場合
- `Arrange`: 実装ファイル、設計文書、catalog を作り、`docs/inception/traceability-model/H03-01` は作らない。
- `Act`: `const actual = await buildTraceabilityChainUseCase.execute(implFilePath)`
- `Assert`: `actual.complete === false`、`actual.brokenLinks` に `story-to-plan` が含まれることを確認する。

#### IT-TM-104 VerifyTraceabilityCoverageUseCaseで複数ファイルのカバレッジが集計できること
- `context`: 完全チェーン 2 件、不完全チェーン 1 件を同時集計する場合
- `Arrange`: 完全 fixture 2 セットと、不完全 fixture 1 セットを作成し、実 `VerifyTraceabilityCoverageUseCase` を組み立てる。
- `Act`: `const actual = await verifyTraceabilityCoverageUseCase.execute(filePaths)`
- `Assert`: `actual.totalFiles === 3`、`actual.completeChains === 2`、`actual.incompleteChains === 1`、`actual.results.length === 3` を確認する。

## 5. モック戦略

### 5.1 モック使用境界

- Port はモック可: `MetadataReaderPort`、`DesignDocumentPort`、`UnitDefinitionPort`、`StoryCatalogPort`、`InceptionPlanPort`
- UseCase 境界の協調オブジェクトはモック可: `MetadataValidator`、`TraceabilityChainBuilder`、`StoryIdAliasResolver`、`BuildTraceabilityChainUseCase`
- ドメイン実体はモック禁止: `StoryId`、`ProjectRelativePath`、`MetadataTag`、`StoryIdAnnotation`、`TraceabilityChain`
- Parser / Gateway / Integration では原則として実ファイルと実オブジェクトを使う

### 5.2 モックルール

- `vi.mock()` より `vi.fn()` を保持した手製スタブを優先する
- 各 `it` 内で戻り値を設定し、`beforeEach` での暗黙設定は行わない
- 呼び出し回数だけでなく引数も `toHaveBeenCalledWith` で検証する
- validation 系の戻り値は `MetadataValidationResult.success/failure` から実値を作る
- chain 系の戻り値は `TraceabilityChain` の実インスタンスを返し DTO 写像の精度を落とさない

### 5.3 fixture 戦略

- Parser テスト: 文字列 fixture を直接渡す
- Gateway テスト: 一時ディレクトリに最小構造を書き込む
- Adapter テスト: UseCase はモック、入出力契約変換だけを検証する
- Integration テスト: UseCase / Gateway / Parser / ドメインサービスを実体で組み合わせる

### 5.4 coverage_report.md を踏まえた設計上の注意

- `fix_example` の明示 assert は将来追加候補だが、本書では `it_test_design.md` の既存ケースに限定して扱う
- `broken link総数` の集計は `VerifyTraceabilityCoverageUseCase` 実装時に拡張余地があるが、新規ケースは追加しない
- `nyquist-validation` 連携ケースは未設計のため、本書にも含めない

## 6. テスト実行コマンド

```bash
pnpm test
```

```bash
pnpm test -- scripts/harness/__tests__/traceability-model
```

```bash
pnpm test -- scripts/harness/__tests__/traceability-model/application/validate-implementation-metadata-usecase.test.ts
```

```bash
pnpm test -- scripts/harness/__tests__/traceability-model/integration/traceability-chain.integration.test.ts
```
