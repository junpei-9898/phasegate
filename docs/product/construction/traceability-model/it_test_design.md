# ITテスト設計: traceability-model

@story-id H03-01
@story-id H03-02
@story-id H03-03
@work-item-id WI-106
@work-item-id WI-126
filesystem gateway は WI description、product construction docs、implementation files、test files を走査し、`@work-item-id WI-XXX` evidence を status input に集約する。apply mode は `description.md` の YAML frontmatter 内 `status:` 行だけを書き換え、本文を保持する。
> **作成日**: 2026-03-13
> **対応ストーリー**: H03-01, H03-02, H03-03
> **前提ドキュメント**: `logical_design.md`、`it_test_design_plan.md`、`integration_contract.md`、`testing-rules.md`

---

## 1. 対象コンポーネント

### 1.1 スコープ

- 対象Unit: traceability-model
- 対象層: Application層（UseCase）、Infrastructure層（Parser / Gateway / Adapter）、Integration（統合テスト）
- **Presentation層は対象外**: 論理設計 §6 で明示的に除外。CLI/CI/Hookのプレゼンテーション責務は harness-api / validator-system / nyquist-validation 側アダプターが担う

### 1.2 対象コンポーネント一覧

| 層 | 分類 | コンポーネント | テストファイル |
|----|------|-------------|-------------|
| application | UseCase | ValidateImplementationMetadataUseCase | validate-implementation-metadata-usecase.test.ts |
| application | UseCase | ValidateDesignStoryAnnotationsUseCase | validate-design-story-annotations-usecase.test.ts |
| application | UseCase | ValidateTestStoryMetadataUseCase | validate-test-story-metadata-usecase.test.ts |
| application | UseCase | BuildTraceabilityChainUseCase | build-traceability-chain-usecase.test.ts |
| application | UseCase | VerifyTraceabilityCoverageUseCase | verify-traceability-coverage-usecase.test.ts |
| application | UseCase | ResolveLegacyStoryIdUseCase | resolve-legacy-story-id-usecase.test.ts |
| infrastructure | Parser | SourceMetadataParser | source-metadata-parser.test.ts |
| infrastructure | Parser | MarkdownStoryAnnotationParser | markdown-story-annotation-parser.test.ts |
| infrastructure | Parser | FrontmatterFlagParser | frontmatter-flag-parser.test.ts |
| infrastructure | Parser | StoryCatalogParser | story-catalog-parser.test.ts |
| infrastructure | Gateway | MarkdownStoryCatalogGateway | markdown-story-catalog-gateway.test.ts |
| infrastructure | Gateway | MarkdownUnitDefinitionGateway | markdown-unit-definition-gateway.test.ts |
| infrastructure | Gateway | FileSystemMetadataReader | file-system-metadata-reader.test.ts |
| infrastructure | Gateway | MarkdownDesignDocumentGateway | markdown-design-document-gateway.test.ts |
| infrastructure | Gateway | FileSystemInceptionPlanGateway | file-system-inception-plan-gateway.test.ts |
| infrastructure | Gateway | FileSystemWorkItemIdentityGateway | file-system-work-item-identity-gateway.test.ts |
| infrastructure | Adapter | LegacyMetadataValidatorAdapter | legacy-metadata-validator-adapter.test.ts |
| integration | 統合 | shared-kernel StoryId export | shared-kernel-story-id.integration.test.ts |
| integration | 統合 | legacy adapter連携 | metadata-validator-adapter.integration.test.ts |
| integration | 統合 | 逆引きチェーン end-to-end | traceability-chain.integration.test.ts |

---

## 2. テストファイル構成

### 2.1 ディレクトリ配置

```text
scripts/harness/__tests__/unit/traceability-model/
├── application/
│   ├── validate-implementation-metadata-usecase.test.ts
│   ├── validate-design-story-annotations-usecase.test.ts
│   ├── validate-test-story-metadata-usecase.test.ts
│   ├── build-traceability-chain-usecase.test.ts
│   ├── verify-traceability-coverage-usecase.test.ts
│   └── resolve-legacy-story-id-usecase.test.ts
├── infrastructure/
│   ├── source-metadata-parser.test.ts
│   ├── markdown-story-annotation-parser.test.ts
│   ├── frontmatter-flag-parser.test.ts
│   ├── story-catalog-parser.test.ts
│   ├── markdown-story-catalog-gateway.test.ts
│   ├── markdown-unit-definition-gateway.test.ts
│   ├── file-system-metadata-reader.test.ts
│   ├── markdown-design-document-gateway.test.ts
│   ├── file-system-inception-plan-gateway.test.ts
│   └── legacy-metadata-validator-adapter.test.ts
└── integration/
    ├── shared-kernel-story-id.integration.test.ts
    ├── metadata-validator-adapter.integration.test.ts
    └── traceability-chain.integration.test.ts
```

### 2.2 フィクスチャ配置

```text
scripts/harness/__tests__/fixtures/harness-api/
├── docs/
│   ├── product/
│   │   ├── user_stories.md                          # 正規ID + 旧US alias付き
│   │   ├── construction/
│   │   │   └── traceability-model/
│   │   │       ├── logical_design.md                # frontmatterなし（累積更新）
│   │   │       └── domain_model.md                  # frontmatter initial_creation: true
│   │   └── units/
│   │       └── traceability_model_unit.md
│   └── inception/
│       └── traceability-model/
│           └── H03-01/
│               └── it_test_design_plan.md
├── scripts/
│   └── harness/
│       └── sample-impl.ts                           # @unit/@layer/@story付きTypeScript
└── legacy/
    └── user_stories_with_alias.md                   # 旧US列を含むcatalog断片
```

### 2.3 テスト規約

- **AAAパターン**: Arrange / Act / Assert を明示コメントで記述
- **Actは1回**: 結果は必ず `actual` に代入
- **テストケース名は日本語**: 仕様書としての表現力を重視
- **describe/it構造**: target / describe / context / it パターン
- **ファイル名**: kebab-case
- **モック方針**: Port（外部依存）のみモック使用可。ドメイン実体（StoryId、MetadataTag、TraceabilityChain等）はモック禁止
- **一時ディレクトリ**: `fs.mkdtempSync()` で生成し、テスト後にクリーンアップ

---

## 3. UseCaseテストケース

### 3.1 ValidateImplementationMetadataUseCase

**テストファイル**: `application/validate-implementation-metadata-usecase.test.ts`

**モック対象**: MetadataReaderPort、MetadataValidator（コンストラクタ注入。MetadataValidatorはドメインサービスだが、内部でStoryCatalogPort経由の外部I/Oに依存する。ValidateImplementationMetadataUseCaseから見ると「管理下にない外部依存を内包する協調オブジェクト」であり、UseCase境界ではモック化が妥当）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-001 | 複数ファイルのメタデータが全てvalidの場合に全結果がvalid=trueで返ること | 正常系・複数ファイル全valid | Arrange: MetadataReaderPortが各ファイルのタグを返すモック、MetadataValidatorがsuccess結果を返すモック。Act: execute(filePaths)。Assert: actual全要素のvalid===true |
| IT-TM-002 | 1件でもinvalidがある場合にそのファイルの結果がvalid=falseで返ること | 異常系・部分invalid | Arrange: 2ファイル中1つでValidatorがfailure返却。Act: execute(filePaths)。Assert: actual[1].valid===false、actual[0].valid===true |
| IT-TM-003 | MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること | 例外伝播 | Arrange: MetadataReaderPortがreject。Act: execute(filePaths)。Assert: MetadataReadApplicationErrorがthrow |
| IT-TM-004 | 結果がMetadataValidationOutput DTOに正しく整形されること | DTO写像 | Arrange: Validatorがerrors/warnings付きで返却。Act: execute(filePaths)。Assert: actual[0]のfilePath、valid、errors、warningsが期待値と一致 |
| IT-TM-005 | 空のfilePathsが渡された場合に空配列が返ること | 境界値 | Arrange: 空配列。Act: execute([])。Assert: actual.length===0 |

### 3.2 ValidateDesignStoryAnnotationsUseCase

**テストファイル**: `application/validate-design-story-annotations-usecase.test.ts`

**モック対象**: DesignDocumentPort、MetadataValidator

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-006 | frontmatter initial_creation: trueの文書で@story-id欠落が許容されること | 初回作成免除 | Arrange: readFrontmatterFlagsがinitialCreation=trueを返却、readStoryAnnotationsが空配列。Act: execute(filePaths)。Assert: actual[0].valid===true |
| IT-TM-007 | frontmatter未設定の文書で@story-id欠落がエラーとなること | 累積更新必須 | Arrange: readFrontmatterFlagsがinitialCreation=falseを返却、readStoryAnnotationsが空配列、Validatorがfailure。Act: execute(filePaths)。Assert: actual[0].valid===false |
| IT-TM-008 | @story-idが存在し独立行かつcatalog存在時にvalid=trueで返ること | 正常系 | Arrange: annotations=[StoryIdAnnotation(standaloneLine=true)]、Validatorがsuccess。Act: execute(filePaths)。Assert: actual[0].valid===true |
| IT-TM-009 | @story-idが独立行でない場合にvalid=falseで返ること | standaloneLine=false | Arrange: annotations=[StoryIdAnnotation(standaloneLine=false)]、Validatorがfailure。Act: execute(filePaths)。Assert: actual[0].valid===false |
| IT-TM-010 | DesignDocumentPortの読み込み失敗時にDesignDocumentReadApplicationErrorが発生すること | 例外伝播 | Arrange: DesignDocumentPortがreject。Act: execute(filePaths)。Assert: DesignDocumentReadApplicationErrorがthrow |
| IT-TM-011 | 複数ファイルに対して各ファイルごとにfrontmatterフラグとannotationsが独立に評価されること | 複数ファイル独立評価 | Arrange: 2ファイル、1つはinitialCreation=true、もう1つはfalse+annotations付き。Act: execute(filePaths)。Assert: 各actualが独立した判定結果 |

### 3.3 ValidateTestStoryMetadataUseCase

**テストファイル**: `application/validate-test-story-metadata-usecase.test.ts`

**モック対象**: MetadataReaderPort、MetadataValidator

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-012 | @storyタグが存在し正規StoryIdとして解決可能な場合にvalid=trueで返ること | 正常系 | Arrange: readTestTagsが@story付きタグ返却、Validatorがsuccess。Act: execute(filePaths)。Assert: actual[0].valid===true |
| IT-TM-013 | @storyタグが欠落している場合にエラーを返すこと | 必須欠落 | Arrange: readTestTagsが空タグ返却、Validatorがfailure。Act: execute(filePaths)。Assert: actual[0].valid===false |
| IT-TM-014 | @storyタグの値が正規StoryId形式でない場合にエラーを返すこと | 形式不正 | Arrange: readTestTagsが不正値タグ返却、Validatorがfailure。Act: execute(filePaths)。Assert: actual[0].errors.length>0 |
| IT-TM-015 | MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること | 例外伝播 | Arrange: MetadataReaderPortがreject。Act: execute(filePaths)。Assert: MetadataReadApplicationErrorがthrow |
| IT-TM-016 | 結果がMetadataValidationOutput DTOに正しく整形されること | DTO写像 | Arrange: Validatorがwarnings付きで返却。Act: execute(filePaths)。Assert: actual[0].warningsが期待値と一致 |

### 3.4 BuildTraceabilityChainUseCase

**テストファイル**: `application/build-traceability-chain-usecase.test.ts`

**モック対象**: TraceabilityChainBuilder（コンストラクタ注入。Builderは4つのPortに依存するため、UseCase境界ではモック化が妥当）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-017 | builderの結果がTraceabilityChainOutput DTOに正しく写像されること | DTO写像 | Arrange: builderが完全チェーン返却。Act: execute(origin)。Assert: actual.origin、actual.links、actual.brokenLinksが期待値と一致 |
| IT-TM-018 | complete判定がchain.isComplete()に基づくこと | complete=true | Arrange: builderが全link resolved=trueのチェーン返却。Act: execute(origin)。Assert: actual.complete===true |
| IT-TM-019 | broken linkを含むチェーンでcomplete=falseが返ること | complete=false | Arrange: builderがresolved=falseのlink含むチェーン返却。Act: execute(origin)。Assert: actual.complete===false、actual.brokenLinks.length>0 |
| IT-TM-020 | 起点ファイル不正時にTraceabilityChainBuildErrorが発生すること | 例外伝播 | Arrange: builderがProjectRelativePathError投げる。Act: execute(invalidOrigin)。Assert: TraceabilityChainBuildErrorがthrow |

### 3.5 VerifyTraceabilityCoverageUseCase

**テストファイル**: `application/verify-traceability-coverage-usecase.test.ts`

**モック対象**: BuildTraceabilityChainUseCase（コンストラクタ注入される協調オブジェクト。VerifyTraceabilityCoverageUseCaseから見たBuildTraceabilityChainUseCaseは、自身が自由に制御できない外部依存であり、その内部実装（4つのPort経由のファイルI/O）はVerifyTraceabilityCoverageUseCaseの関心外である。テスト規約の「管理下にない外部依存」に該当し、モック化は妥当）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-021 | 全チェーンが完全な場合にincompleteChains=0で返ること | 正常系・全完全 | Arrange: BuildTraceabilityChainUseCaseが全ファイルでcomplete=trueのDTO返却。Act: execute(filePaths)。Assert: actual.incompleteChains===0、actual.completeChains===filePaths.length |
| IT-TM-022 | brokenLinkを含むチェーンがincompleteとして集計されること | 部分不完全 | Arrange: 3ファイル中1つでcomplete=false返却。Act: execute(filePaths)。Assert: actual.incompleteChains===1、actual.completeChains===2 |
| IT-TM-023 | totalFilesが入力ファイル数と一致すること | 集計正確性 | Arrange: 5ファイル分のモック。Act: execute(filePaths)。Assert: actual.totalFiles===5 |
| IT-TM-024 | BuildTraceabilityChainUseCaseがエラーを投げた場合にTraceabilityCoverageApplicationErrorが発生すること | 例外伝播 | Arrange: BuildTraceabilityChainUseCaseがTraceabilityChainBuildError投げる。Act: execute(filePaths)。Assert: TraceabilityCoverageApplicationErrorがthrow |
| IT-TM-025 | 空のfilePathsが渡された場合にtotalFiles=0で返ること | 境界値 | Arrange: 空配列。Act: execute([])。Assert: actual.totalFiles===0、actual.completeChains===0、actual.incompleteChains===0 |

### 3.6 ResolveLegacyStoryIdUseCase

**テストファイル**: `application/resolve-legacy-story-id-usecase.test.ts`

**モック対象**: StoryIdAliasResolver（コンストラクタ注入。ResolverはStoryCatalogPortに依存するため、UseCase境界ではモック化が妥当）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-026 | legacy形式の入力が正規StoryIdに解決されること | 正常系 | Arrange: resolverがisLegacyFormat=true、resolve=StoryId("H03-01")返却。Act: execute("US-001")。Assert: actual.equals(StoryId.parse("H03-01")) |
| IT-TM-027 | 非legacy形式の入力がnullを返すこと | 非対象入力 | Arrange: resolverがisLegacyFormat=false。Act: execute("H03-01")。Assert: actual===null |
| IT-TM-028 | alias mapに存在しないlegacy IDがnullを返すこと | 未登録alias | Arrange: resolverがisLegacyFormat=true、resolve=null返却。Act: execute("US-999")。Assert: actual===null |
| IT-TM-029 | 空文字列が渡された場合にnullを返すこと | 境界値 | Arrange: resolverがisLegacyFormat=false。Act: execute("")。Assert: actual===null |

---

## 4. Infrastructureテストケース

### 4.1 SourceMetadataParser

**テストファイル**: `infrastructure/source-metadata-parser.test.ts`

**モック対象**: なし（純粋パーサー。ファイル内容は文字列fixtureとして直接渡す）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-030 | TypeScriptの行コメントから@unitタグを抽出できること | 行コメント抽出 | Arrange: `// @unit traceability-model`を含む文字列。Act: parseImplementationTags(content, filePath)。Assert: actual[0].type==="@unit"、actual[0].value==="traceability-model" |
| IT-TM-031 | TypeScriptの行コメントから@layerタグを抽出できること | @layer抽出 | Arrange: `// @layer domain`を含む文字列。Act: parseImplementationTags(content, filePath)。Assert: @layerタグが抽出される |
| IT-TM-032 | JSDocコメントからタグを抽出できること | JSDoc形式 | Arrange: `/** @unit traceability-model */`を含む文字列。Act: parseImplementationTags(content, filePath)。Assert: @unitタグが抽出される |
| IT-TM-033 | 対象外のコメント形式が無視されること | ノイズ除去 | Arrange: `/* @unit invalid */`（非JSDoc）やMarkdown内`@unit`を含む文字列。Act: parseImplementationTags(content, filePath)。Assert: actual.length===0 |
| IT-TM-034 | 行番号が正しく保持されること | 行番号精度 | Arrange: 3行目に`// @unit`がある文字列。Act: parseImplementationTags(content, filePath)。Assert: actual[0].lineNumber===3 |
| IT-TM-035 | 実装ファイルから@unit、@layer、@story-idの3タグが同時に抽出できること | 複数タグ同時抽出 | Arrange: 3タグを含む文字列。Act: parseImplementationTags(content, filePath)。Assert: actual.length===3、各タグ種別が正しい |
| IT-TM-036 | テストファイルから@storyタグを抽出できること | テストファイル用タグ | Arrange: `// @story H03-01`を含む文字列。Act: parseTestTags(content, filePath)。Assert: actual[0].type==="@story" |
| IT-TM-037 | 実装ファイル解析で@storyタグが無視されること | 許容タグ分離 | Arrange: `// @story H03-01`を含む文字列。Act: parseImplementationTags(content, filePath)。Assert: @storyタグが結果に含まれない |
| IT-TM-038 | テストファイル解析で@unitタグが無視されること | 許容タグ分離（逆方向） | Arrange: `// @unit traceability-model`を含む文字列。Act: parseTestTags(content, filePath)。Assert: @unitタグが結果に含まれない |
| IT-TM-039 | タグなしファイルで空配列が返ること | タグなし | Arrange: コメントなしのTypeScript文字列。Act: parseImplementationTags(content, filePath)。Assert: actual.length===0 |

### 4.2 MarkdownStoryAnnotationParser

**テストファイル**: `infrastructure/markdown-story-annotation-parser.test.ts`

**モック対象**: なし

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-040 | @story-id H03-01形式の独立行が抽出されること | 正常抽出 | Arrange: `@story-id H03-01`を独立行に含むMarkdown。Act: parse(content)。Assert: actual[0].storyId.toString()==="H03-01"、actual[0].standaloneLine===true |
| IT-TM-041 | 次行のcontextLineが保持されること | contextLine取得 | Arrange: `@story-id H03-01`の次行に`## 2.2 値オブジェクト群`。Act: parse(content)。Assert: actual[0].contextLine==="## 2.2 値オブジェクト群" |
| IT-TM-042 | 行末に他文字がある場合にstandaloneLine=falseとなること | 非独立行 | Arrange: `@story-id HXX-XX 追加内容`。Act: parse(content)。Assert: actual[0].standaloneLine===false |
| IT-TM-043 | 複数の@story-id注釈が全て抽出されること | 複数注釈 | Arrange: 3つの@story-id行を含むMarkdown。Act: parse(content)。Assert: actual.length===3 |
| IT-TM-044 | @story-id行の前後空白が除去されて判定されること | 前後空白 | Arrange: `  @story-id HXX-XX  `。Act: parse(content)。Assert: actual[0].standaloneLine===true |
| IT-TM-045 | 行番号が正しく保持されること | 行番号精度 | Arrange: 5行目に@story-id。Act: parse(content)。Assert: actual[0].lineNumber===5 |
| IT-TM-046 | @story-id注釈がない場合に空配列が返ること | 注釈なし | Arrange: @story-idを含まないMarkdown。Act: parse(content)。Assert: actual.length===0 |

### 4.3 FrontmatterFlagParser

**テストファイル**: `infrastructure/frontmatter-flag-parser.test.ts`

**モック対象**: なし

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-047 | traceability.initial_creation: trueが正しく抽出されること | 正常抽出 | Arrange: `---\ntraceability:\n  initial_creation: true\n---`。Act: parse(content)。Assert: actual.requiresStoryIdAnnotation()===false |
| IT-TM-048 | frontmatterがない場合にinitialCreation=falseが返ること | frontmatterなし | Arrange: frontmatterなしのMarkdown。Act: parse(content)。Assert: actual.requiresStoryIdAnnotation()===true |
| IT-TM-049 | traceability.initial_creation: falseの場合にannotationRequired=trueが返ること | 明示false | Arrange: `initial_creation: false`。Act: parse(content)。Assert: actual.requiresStoryIdAnnotation()===true |
| IT-TM-050 | YAMLパース失敗時に例外が伝播すること | YAML不正 | Arrange: `---\ninvalid: yaml: :\n---`。Act: parse(content)。Assert: 例外がthrow |
| IT-TM-051 | traceabilityキーが存在しない場合にinitialCreation=falseが返ること | キー欠落 | Arrange: `---\ntitle: test\n---`。Act: parse(content)。Assert: actual.requiresStoryIdAnnotation()===true |

### 4.4 StoryCatalogParser

**テストファイル**: `infrastructure/story-catalog-parser.test.ts`

**モック対象**: なし

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-052 | HXX-XX行が正規IDとして収集されること | 正規ID抽出 | Arrange: `H03-01`、`H03-02`を含むMarkdown表。Act: parse(content)。Assert: actual.storyIds.length===2 |
| IT-TM-053 | 旧US行がalias mapに格納されること | alias抽出 | Arrange: `旧US: US-001 → H03-01`形式を含むMarkdown。Act: parse(content)。Assert: actual.aliasMap.get("US-001").toString()==="H03-01" |
| IT-TM-054 | 表形式のcatalogから正規IDとaliasが抽出できること | 表形式対応 | Arrange: Markdownテーブル形式のcatalog。Act: parse(content)。Assert: storyIdsとaliasMapが正しく抽出 |
| IT-TM-055 | 見出し形式のcatalogから正規IDが抽出できること | 見出し形式対応 | Arrange: `### H03-01: タイトル`形式。Act: parse(content)。Assert: actual.storyIds[0].toString()==="H03-01" |
| IT-TM-056 | HXX-XX形式でない行が無視されること | ノイズ除去 | Arrange: `HXX-XX`以外のテキストを含むMarkdown。Act: parse(content)。Assert: 不正形式が結果に含まれない |
| IT-TM-057 | 空のcatalogで空結果が返ること | 空入力 | Arrange: StoryIDを含まないMarkdown。Act: parse(content)。Assert: actual.storyIds.length===0、actual.aliasMap.size===0 |

### 4.5 MarkdownStoryCatalogGateway

**テストファイル**: `infrastructure/markdown-story-catalog-gateway.test.ts`

**モック対象**: なし（ファイルシステムfixture使用。一時ディレクトリ + テスト用Markdownファイル）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-058 | user_stories.mdからStoryId一覧が取得できること | 正常読み取り | Arrange: fixtureにuser_stories.md配置。Act: getAllStoryIds()。Assert: actual.length>0、H形式のStoryId |
| IT-TM-059 | getAliasMapからlegacy alias mapが取得できること | alias取得 | Arrange: 旧US列付きfixture。Act: getAliasMap()。Assert: actual.has("US-001") |
| IT-TM-060 | 存在するStoryIdに対してexists()がtrueを返すこと | exists正常 | Arrange: fixtureにH03-01含むcatalog。Act: exists(StoryId.parse("H03-01"))。Assert: actual===true |
| IT-TM-061 | キャッシュが効いていること（2回目呼び出しでファイル再読み込みなし） | キャッシュ検証 | Arrange: fixture配置、1回目getAllStoryIds()呼出。Act: 2回目getAllStoryIds()。Assert: ファイル読み込みが1回のみ |
| IT-TM-062 | ファイルが存在しない場合にエラーとなること | ファイル不在 | Arrange: 存在しないパス。Act: getAllStoryIds()。Assert: エラーがthrow |
| IT-TM-063 | 存在しないStoryIdに対してexists()がfalseを返すこと | exists不在 | Arrange: fixtureにH03-01含むcatalog。Act: exists(StoryId.parse("H99-99"))。Assert: actual===false |

### 4.6 MarkdownUnitDefinitionGateway

**テストファイル**: `infrastructure/markdown-unit-definition-gateway.test.ts`

**モック対象**: なし（ファイルシステムfixture使用）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-064 | unit定義ファイルからunit名一覧が取得できること | 正常読み取り | Arrange: units/配下にtraceability_model_unit.md配置。Act: getAllUnitNames()。Assert: actual.includes("traceability-model") |
| IT-TM-065 | 存在するunit名に対してexists()がtrueを返すこと | exists正常 | Arrange: fixture配置。Act: exists("traceability-model")。Assert: actual===true |
| IT-TM-066 | 存在しないunit名に対してexists()がfalseを返すこと | exists不在 | Arrange: fixture配置。Act: exists("unknown-unit")。Assert: actual===false |
| IT-TM-067 | findConstructionRootが正しい相対パスを返すこと | constructionRoot解決 | Arrange: construction/traceability-model/配置。Act: findConstructionRoot("traceability-model")。Assert: actual.toString()==="docs/product/construction/traceability-model" |
| IT-TM-068 | construction配下にディレクトリがないunit名でnullが返ること | constructionRoot不在 | Arrange: constructionディレクトリ未作成。Act: findConstructionRoot("nonexistent")。Assert: actual===null |
| IT-TM-069 | Unit ID:行のunit名抽出が正しく動作すること | パース精度 | Arrange: `Unit ID: traceability-model`を含むunit定義。Act: getAllUnitNames()。Assert: 正しいunit名が抽出される |

### 4.7 FileSystemMetadataReader

**テストファイル**: `infrastructure/file-system-metadata-reader.test.ts`

**モック対象**: なし（ファイルシステムfixture使用）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-070 | .tsファイルからタグが読み取れること | TypeScript対応 | Arrange: @unit/@layer付き.tsファイル配置。Act: readImplementationTags(filePath)。Assert: actual.length>=2 |
| IT-TM-071 | .tsxファイルからタグが読み取れること | TSX対応 | Arrange: @unit付き.tsxファイル配置。Act: readImplementationTags(filePath)。Assert: @unitタグ抽出 |
| IT-TM-072 | .mtsファイルからタグが読み取れること | MTS対応 | Arrange: @unit付き.mtsファイル配置。Act: readImplementationTags(filePath)。Assert: @unitタグ抽出 |
| IT-TM-073 | .ctsファイルからタグが読み取れること | CTS対応 | Arrange: @unit付き.ctsファイル配置。Act: readImplementationTags(filePath)。Assert: @unitタグ抽出 |
| IT-TM-074 | 存在しないファイルでMetadataReadInfrastructureErrorが発生すること | ファイル不在 | Arrange: 存在しないパス。Act: readImplementationTags(filePath)。Assert: MetadataReadInfrastructureErrorがthrow |
| IT-TM-075 | readTestTagsで@storyタグが読み取れること | テストタグ読み取り | Arrange: `// @story H03-01`付き.tsファイル配置。Act: readTestTags(filePath)。Assert: actual[0].type==="@story" |

### 4.8 MarkdownDesignDocumentGateway

**テストファイル**: `infrastructure/markdown-design-document-gateway.test.ts`

**モック対象**: なし（ファイルシステムfixture使用）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-076 | construction/{unit}/配下の.mdファイルが列挙されること | 正常列挙 | Arrange: construction/traceability-model/配下に3つの.md配置。Act: listByUnit("traceability-model")。Assert: actual.length===3 |
| IT-TM-077 | readStoryAnnotationsが@story-id注釈を返すこと | annotation読み取り | Arrange: @story-id付きMarkdown配置。Act: readStoryAnnotations(filePath)。Assert: actual.length>0 |
| IT-TM-078 | readFrontmatterFlagsがfrontmatterフラグを返すこと | frontmatter読み取り | Arrange: initial_creation: true付きMarkdown配置。Act: readFrontmatterFlags(filePath)。Assert: actual.allowsStoryIdOmission()===true |
| IT-TM-079 | readStoryAnnotationsとreadFrontmatterFlagsが同一キャッシュから供給されること | キャッシュ共有 | Arrange: fixture配置、readStoryAnnotations呼出。Act: readFrontmatterFlags(同filePath)。Assert: ファイル読み込みが1回のみ |
| IT-TM-080 | 存在しないunit名で空配列が返ること | unit不在 | Arrange: fixture未配置。Act: listByUnit("nonexistent")。Assert: actual.length===0 |
| IT-TM-081 | .md以外のファイルが除外されること | 拡張子フィルタ | Arrange: .mdと.txtを混在配置。Act: listByUnit("traceability-model")。Assert: .txtが結果に含まれない |
| IT-TM-082 | サブディレクトリ内の.mdファイルが列挙されないこと | 深度制限 | Arrange: construction/{unit}/sub/配下に.md配置。Act: listByUnit(unit)。Assert: サブディレクトリのファイルが含まれないか、含まれるかを仕様に基づき検証 |
| IT-TM-108 | readWorkItemFrontmatterが有効なWI frontmatterを返すこと | H03-05 WI frontmatter読み取り | Arrange: `id: WI-001` / `type: story` 付きMarkdown配置。Act: readWorkItemFrontmatter(filePath)。Assert: actual.id==="WI-001" |
| IT-TM-109 | readWorkItemFrontmatterがfrontmatter不在でnullを返すこと | H03-05 後方互換 | Arrange: frontmatterなしMarkdown配置。Act: readWorkItemFrontmatter(filePath)。Assert: actual===null |
| IT-TM-110 | readWorkItemFrontmatterがinvalid frontmatterで例外を返すこと | H03-05 malformed検出 | Arrange: `type: broken` 付きMarkdown配置。Act: readWorkItemFrontmatter(filePath)。Assert: WorkItemFrontmatterValidationErrorがthrow |

### 4.9 FileSystemInceptionPlanGateway

**テストファイル**: `infrastructure/file-system-inception-plan-gateway.test.ts`

**モック対象**: なし（ファイルシステムfixture使用）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-083 | docs/inception/{unit}/{storyId}/の存在チェックが正しく動作すること | exists正常 | Arrange: inception/traceability-model/H03-01/配下に*_plan.md配置。Act: exists("traceability-model", StoryId.parse("H03-01"))。Assert: actual===true |
| IT-TM-084 | *_plan.mdが存在しない場合にexists()がfalseを返すこと | plan不在 | Arrange: ディレクトリのみ存在、*_plan.mdなし。Act: exists("traceability-model", StoryId.parse("H03-01"))。Assert: actual===false |
| IT-TM-085 | ディレクトリ自体が存在しない場合にexists()がfalseを返すこと | ディレクトリ不在 | Arrange: inception/配下にディレクトリなし。Act: exists("traceability-model", StoryId.parse("H99-99"))。Assert: actual===false |
| IT-TM-086 | findPlanRootがディレクトリ存在時に相対パスを返すこと | findPlanRoot正常 | Arrange: inception/traceability-model/H03-01/配置。Act: findPlanRoot("traceability-model", StoryId.parse("H03-01"))。Assert: actual.toString()==="docs/inception/traceability-model/H03-01" |
| IT-TM-087 | findPlanRootがディレクトリ不存在時にnullを返すこと | findPlanRoot不在 | Arrange: ディレクトリなし。Act: findPlanRoot("traceability-model", StoryId.parse("H99-99"))。Assert: actual===null |

### 4.10 LegacyMetadataValidatorAdapter

**テストファイル**: `infrastructure/legacy-metadata-validator-adapter.test.ts`

**モック対象**: ValidateImplementationMetadataUseCase、ValidateDesignStoryAnnotationsUseCase、ValidateTestStoryMetadataUseCase（コンストラクタ注入。AdapterはUseCase群に委譲するため、Adapter境界ではモック化が妥当）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-088 | 既存runMetadataCheck()の入出力契約が維持されること | 契約互換 | Arrange: UseCaseモックが正常結果返却。Act: runMetadataCheck(files)。Assert: actual.errorsが既存HarnessError形式 |
| IT-TM-089 | 内部で新UseCaseが呼び出されること | 委譲検証 | Arrange: UseCaseモック。Act: runMetadataCheck(files)。Assert: ValidateImplementationMetadataUseCaseが呼び出される |
| IT-TM-090 | v0 @layer usecaseがL2-002として報告されること | legacy語彙変換 | Arrange: UseCaseモックがlegacy語彙エラー返却。Act: runMetadataCheck(files)。Assert: actual.errors[0].code==="L2-002" |
| IT-TM-091 | 旧HarnessError形式から統合契約上のHarnessErrorへ変換されること | エラー変換 | Arrange: UseCaseモックがfailure返却。Act: runMetadataCheck(files)。Assert: actual.errors[0]がHarnessError型に準拠 |
| IT-TM-092 | 入力ファイルが空の場合に空結果が返ること | 境界値 | Arrange: 空配列。Act: runMetadataCheck([])。Assert: actual.errors.length===0 |

---

## 5. 統合テストケース

### 5.1 shared-kernel StoryId export

**テストファイル**: `integration/shared-kernel-story-id.integration.test.ts`

**モック対象**: なし（実モジュール参照）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-093 | shared-kernel/story-id.tsがStoryIdだけを再エクスポートしていること | export面検証 | Arrange: shared-kernel/story-id.tsをimport。Act: exportされたメンバー一覧を取得。Assert: StoryIdのみが公開されている |
| IT-TM-094 | shared-kernel経由のStoryIdがtraceability-model内部のStoryIdと同一であること | 同一性検証 | Arrange: 両パスからStoryIdをimport。Act: StoryId.parse("H03-01")を両方で実行。Assert: 同一のインスタンス挙動 |
| IT-TM-095 | shared-kernelからlegacy resolverが公開されていないこと | 非公開検証 | Arrange: shared-kernel/story-id.tsをimport。Act: StoryIdAliasResolver相当のexportを確認。Assert: 存在しない |

### 5.2 legacy adapter連携

**テストファイル**: `integration/metadata-validator-adapter.integration.test.ts`

**モック対象**: なし（実UseCase + 実Infrastructure。ただしファイルシステムはfixture使用）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-096 | LegacyMetadataValidatorAdapterが既存validators/metadata.tsの入口から新UseCaseを呼び出せること | 入口互換 | Arrange: fixture配置、Adapter + UseCase + Infrastructure組み立て。Act: 既存入口の呼び出しシグネチャで実行。Assert: 結果がHarnessError形式で返却 |
| IT-TM-097 | 実装ファイルのメタデータ検証が新UseCase経由で正常に動作すること | 実装検証パス | Arrange: @unit/@layer付きfixtureファイル。Act: runMetadataCheck([fixture])。Assert: actual.errors.length===0 |
| IT-TM-098 | メタデータ欠落ファイルでL2-002エラーが報告されること | 実装検証失敗 | Arrange: メタデータなしfixtureファイル。Act: runMetadataCheck([fixture])。Assert: actual.errors[0].code==="L2-002" |
| IT-TM-099 | 既存metadata.tsの呼び出しが新旧で同一結果を返すこと | 回帰互換 | Arrange: 同一fixtureに対して旧パスと新Adapter両方を実行。Act: 両方の結果を比較。Assert: エラー数とコードが一致 |

### 5.3 逆引きチェーン end-to-end

**テストファイル**: `integration/traceability-chain.integration.test.ts`

**モック対象**: なし（実UseCase + 実Infrastructure + 実ファイルシステムfixture）

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-100 | 実装ファイルから設計文書を経由してinception planまでの完全チェーンが構築できること | 完全チェーン | Arrange: implementation(@unit付き) → construction(設計文書@story-id付き) → user_stories.md → inception/{unit}/{storyId}/ の最小fixture構造を配置。Act: BuildTraceabilityChainUseCase.execute(implFilePath)。Assert: actual.complete===true、actual.links.length===4 |
| IT-TM-101 | 設計文書が欠落している場合にbroken linkが検出されること | construction欠落 | Arrange: implementation配置、construction配下を空に。Act: execute(implFilePath)。Assert: actual.complete===false、brokenLinksにunit-to-design含む |
| IT-TM-102 | @story-id注釈が欠落している場合にbroken linkが検出されること | annotation欠落 | Arrange: 設計文書を@story-idなしで配置。Act: execute(implFilePath)。Assert: actual.complete===false、brokenLinksにdesign-to-story含む |
| IT-TM-103 | inception planが欠落している場合にbroken linkが検出されること | plan欠落 | Arrange: 全てを配置しinceptionディレクトリのみ削除。Act: execute(implFilePath)。Assert: actual.complete===false、brokenLinksにstory-to-plan含む |
| IT-TM-104 | VerifyTraceabilityCoverageUseCaseで複数ファイルのカバレッジが集計できること | カバレッジ集計 | Arrange: 完全チェーン2ファイル + 不完全チェーン1ファイルのfixture。Act: VerifyTraceabilityCoverageUseCase.execute(filePaths)。Assert: actual.totalFiles===3、actual.completeChains===2、actual.incompleteChains===1 |

---

## 6. テスト環境設定

### 6.1 テストフレームワーク

- **フレームワーク**: Vitest 3.0.0
- **設定ファイル**: 共有 `scripts/harness/__tests__/vitest.config.ts`

### 6.2 フィクスチャ方針

| 種別 | 配置先 | 用途 |
|------|--------|------|
| 静的fixture | `scripts/harness/__tests__/fixtures/harness-api/` | 設計文書、catalog、unit定義の最小構造 |
| 一時ディレクトリ | `fs.mkdtempSync()` + afterEach cleanup | Gateway/AdapterのファイルI/Oテスト |
| 初回設計文書fixture | frontmatter `initial_creation: true` 付き | DesignDocumentFlags検証 |
| 累積更新fixture | frontmatter なし | @story-id必須検証 |
| legacy alias fixture | `旧US` 列を含む `user_stories.md` 断片 | StoryIdAliasResolver / StoryCatalogParser検証 |

### 6.3 モック方針まとめ

| 対象 | モック可否 | 理由 |
|------|----------|------|
| ドメイン実体（StoryId, MetadataTag, TraceabilityChain等） | 禁止 | テスト規約: 管理下にある依存はモックしない |
| Port（StoryCatalogPort, UnitDefinitionPort, MetadataReaderPort, DesignDocumentPort, InceptionPlanPort） | 使用可 | テスト規約: 管理下にない外部依存のみモック可 |
| MetadataValidator（UseCase内） | 使用可 | ドメインサービスだが内部でStoryCatalogPort経由の外部I/Oに依存。UseCase境界から見て「管理下にない外部依存を内包する協調オブジェクト」（testing-rules.md §6準拠） |
| TraceabilityChainBuilder（UseCase内） | 使用可 | 4つのPort経由で外部I/Oに依存。UseCase境界から見て管理下にない外部依存 |
| StoryIdAliasResolver（UseCase内） | 使用可 | StoryCatalogPort経由で外部I/Oに依存。UseCase境界から見て管理下にない外部依存 |
| BuildTraceabilityChainUseCase（VerifyTraceabilityCoverageUseCase内） | 使用可 | コンストラクタ注入される協調オブジェクト。内部実装（4つのPort経由ファイルI/O）はVerifyTraceabilityCoverageUseCaseの関心外。テスト規約の「管理下にない外部依存」に該当 |

### 6.4 前提条件

- HarnessError型は harness-error Unit から提供される型定義が利用可能であること（`integration_contract.md` §2.1 HarnessErrorContract準拠）
- エラーコード L2-002 は `integration_contract.md` §9 のエラーコード対応表に準拠すること
- 既存 `scripts/harness/validators/metadata.ts` の入出力契約が参照可能であること
- `scripts/harness/core/metadata-parser.ts` は SourceMetadataParser への薄い委譲ラッパーであり、本IT設計の個別テスト対象からは除外する。委譲先の SourceMetadataParser テストおよび LegacyMetadataValidatorAdapter の統合テストで間接カバーされる

### 6.5 テストケース総数

| 分類 | ケース数 |
|------|---------|
| Application層（UseCase） | 29件（IT-TM-001 〜 IT-TM-029） |
| Infrastructure層（Parser） | 28件（IT-TM-030 〜 IT-TM-057） |
| Infrastructure層（Gateway/Adapter） | 35件（IT-TM-058 〜 IT-TM-092） |
| Integration（統合テスト） | 12件（IT-TM-093 〜 IT-TM-104） |
| **合計** | **104件** |

---

## 7. カバレッジ補完追記

`coverage_report.md` §5-§6 の未カバー項目に対応する追補ケース。既存ケースは変更せず、追加分のみを末尾に記載する。

### 7.1 Application / Integration 追補ケース

| ケースID | テストケース名 | 検証内容 | AAA概要 |
|----------|-------------|---------|---------|
| IT-TM-105 | nyquist-validation連携で@storyメタデータを入力にストーリー-テスト間トレーサビリティが検証できること | `// @story H03-03` を持つテストfixtureを nyquist-validation 側入力アダプターへ渡し、story-test traceability が成立することを検証する | Arrange: `@story H03-03` 付きテストファイル、`product/user_stories.md`、対応するinception fixture、nyquist-validation連携アダプターを実体で組み立てる。Act: 連携エントリポイントを実行する。Assert: actual.valid===true かつ traceability links に story-to-test 対応の解決結果が含まれる |
| IT-TM-106 | VerifyTraceabilityCoverageUseCaseでbrokenLinks総数が明示集計されること | `logical_design.md §4.6` の集計要件として `completeChains / incompleteChains / brokenLinks` の3指標を同時に検証する | Arrange: 完全チェーン1件、不完全チェーン2件、broken link合計3件となるfixtureを配置。Act: VerifyTraceabilityCoverageUseCase.execute(filePaths)。Assert: actual.completeChains===1、actual.incompleteChains===2、actual.brokenLinks===3 |
