# ITテスト設計計画: traceability-model

## 1. スコープ

- 対象Unit: traceability-model
- 論理設計に定義されたApplication層（UseCase）とInfrastructure層（Parser/Gateway/Adapter）を対象とする
- traceability-modelは**Presentation層を持たない**（論理設計§6で明示的に除外）
- テストファイル配置先:
  - Application層: `scripts/harness/__tests__/traceability-model/application/`
  - Infrastructure層: `scripts/harness/__tests__/traceability-model/infrastructure/`
  - Integration: `scripts/harness/__tests__/traceability-model/integration/`

### テスト対象コンポーネント一覧

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
| infrastructure | Adapter | LegacyMetadataValidatorAdapter | legacy-metadata-validator-adapter.test.ts |
| integration | 統合 | shared-kernel StoryId export | shared-kernel-story-id.integration.test.ts |
| integration | 統合 | legacy adapter連携 | metadata-validator-adapter.integration.test.ts |
| integration | 統合 | 逆引きチェーン end-to-end | traceability-chain.integration.test.ts |

---

## 2. テスト対象分析

### Application層（UseCase）

| UseCase名 | 依存Port数 | テストケース概算 |
|-----------|----------|---------------|
| ValidateImplementationMetadataUseCase | 2（MetadataReaderPort, MetadataValidator） | 5 |
| ValidateDesignStoryAnnotationsUseCase | 2（DesignDocumentPort, MetadataValidator） | 6 |
| ValidateTestStoryMetadataUseCase | 2（MetadataReaderPort, MetadataValidator） | 5 |
| BuildTraceabilityChainUseCase | 1（TraceabilityChainBuilder） | 4 |
| VerifyTraceabilityCoverageUseCase | 1（BuildTraceabilityChainUseCase） | 5 |
| ResolveLegacyStoryIdUseCase | 1（StoryIdAliasResolver） | 4 |

### Infrastructure層（Parser）

| Parser名 | 操作数 | テストケース概算 |
|----------|-------|---------------|
| SourceMetadataParser | 2（実装ファイル抽出、テストファイル抽出） | 10 |
| MarkdownStoryAnnotationParser | 1（@story-id独立行抽出） | 7 |
| FrontmatterFlagParser | 1（frontmatterフラグ抽出） | 5 |
| StoryCatalogParser | 2（正規ID一覧抽出、alias map抽出） | 6 |

### Infrastructure層（Gateway/Adapter）

| Gateway/Adapter名 | 操作数 | テストケース概算 |
|-------------------|-------|---------------|
| MarkdownStoryCatalogGateway | 3（getAllStoryIds, getAliasMap, exists） | 6 |
| MarkdownUnitDefinitionGateway | 3（getAllUnitNames, exists, findConstructionRoot） | 6 |
| FileSystemMetadataReader | 2（readImplementationTags, readTestTags） | 6 |
| MarkdownDesignDocumentGateway | 3（listByUnit, readStoryAnnotations, readFrontmatterFlags） | 7 |
| FileSystemInceptionPlanGateway | 2（exists, findPlanRoot） | 5 |
| LegacyMetadataValidatorAdapter | 1（runMetadataCheck互換） | 5 |

### Integration（統合テスト）

| テスト名 | 検証内容 | テストケース概算 |
|---------|---------|---------------|
| shared-kernel-story-id.integration | StoryIdのみが再エクスポートされること | 3 |
| metadata-validator-adapter.integration | 既存入口から新UseCaseが呼び出せること | 4 |
| traceability-chain.integration | 実装→設計→計画のチェーン構築 end-to-end | 5 |

---

## 3. テスト方針

### モック方針

- **Port（外部依存）のみモック使用可**: StoryCatalogPort、UnitDefinitionPort、MetadataReaderPort、DesignDocumentPort、InceptionPlanPort
- **ドメイン実体はモック禁止**: StoryId、MetadataTag、TraceabilityChain等の値オブジェクトおよびドメインサービスは実体を使用する
- **UseCase間依存**: VerifyTraceabilityCoverageUseCaseのテストではBuildTraceabilityChainUseCaseをモック化する。テスト規約の「管理下にない外部依存のみモック可」との関係について: Application層のUseCaseは独立した責務単位であり、UseCase境界はPort相当の依存方向を持つ。VerifyTraceabilityCoverageUseCaseから見たBuildTraceabilityChainUseCaseは、自身が自由に制御できない外部依存（コンストラクタ注入される協調オブジェクト）であり、その内部実装（4つのPort経由のファイルI/O）はVerifyTraceabilityCoverageUseCaseの関心外である。したがってテスト規約の「管理下にない外部依存」に該当し、モック化は妥当である

### Presentation層について

- traceability-modelは**Presentation層を持たない**（論理設計§6で明示的に除外）
- CLI/CI/Hookのプレゼンテーション責務はharness-api / validator-system / nyquist-validation側アダプターが担う
- 本計画にPresentation/CLIテストは含めない

### 外部依存

- traceability-modelの外部依存はファイルI/Oのみであり、Infrastructure層で閉じている
- Infrastructure層のテストではファイルシステムfixture（一時ディレクトリ + テスト用Markdownファイル）を使用する

### テスト規約の適用

- **AAAパターン**: Arrange / Act / Assert を明示コメントで記述。Actは1回、結果は`actual`に代入
- **テストケース名は日本語**: 仕様書としての表現力を重視
- **describe/it構造**: target/describe/context/itパターンを使用
- **ファイル名**: kebab-case

### フィクスチャ方針

- `scripts/harness/__tests__/fixtures/traceability-model/` を新設
- `docs/product/construction/`と`docs/inception/`の最小構造を再現
- 初回設計文書fixture（frontmatter `initial_creation: true`あり）と累積更新fixture（frontmatterなし）を用意
- legacy alias fixtureでは`旧US`列を含む`user_stories.md`断片を保持
- 一時ディレクトリは`fs.mkdtempSync()`で生成し、テスト後にクリーンアップ

---

## 4. テスト対象別の重点テストケース

### Application層

#### ValidateImplementationMetadataUseCase

- 複数ファイルのメタデータを検証し、全validの場合に全結果がvalid=trueで返ること
- 1件でもinvalidがある場合にそのファイルの結果がvalid=falseで返ること
- MetadataReaderPortの読み込み失敗時にMetadataReadApplicationErrorが発生すること
- 結果がMetadataValidationOutput DTOに正しく整形されること

#### ValidateDesignStoryAnnotationsUseCase

- frontmatter `initial_creation: true`の文書で`@story-id`欠落が許容されること
- frontmatter未設定の文書で`@story-id`欠落がエラーとなること
- `@story-id`が存在し独立行かつcatalog存在時にvalid=trueで返ること
- DesignDocumentPortの読み込み失敗時にDesignDocumentReadApplicationErrorが発生すること

#### ValidateTestStoryMetadataUseCase

- `@story`タグが存在し正規StoryIdとして解決可能な場合にvalid=trueで返ること
- `@story`タグが欠落している場合にエラーを返すこと

#### BuildTraceabilityChainUseCase

- builderの結果がTraceabilityChainOutput DTOに正しく写像されること
- complete判定がchain.isComplete()に基づくこと
- 起点ファイル不正時にTraceabilityChainBuildErrorが発生すること

#### VerifyTraceabilityCoverageUseCase

- 全チェーンが完全な場合にincompleteChains=0で返ること
- brokenLinkを含むチェーンがincompleteとして集計されること

#### ResolveLegacyStoryIdUseCase

- legacy形式の入力が正規StoryIdに解決されること
- 非legacy形式の入力がnullを返すこと

### Infrastructure層

#### SourceMetadataParser

- TypeScriptの行コメントから`@unit`、`@layer`、`@story`を抽出できること
- JSDocコメントからタグを抽出できること
- 対象外のコメント形式が無視されること
- 行番号が正しく保持されること
- 実装ファイルとテストファイルで許容タグが分かれること

#### MarkdownStoryAnnotationParser

- `@story-id H03-01`形式の独立行が抽出されること
- 次行のcontextLineが保持されること
- 行末に他文字がある場合にstandaloneLine=falseとなること

#### FrontmatterFlagParser

- `traceability.initial_creation: true`が正しく抽出されること
- frontmatterがない場合にinitialCreation=falseが返ること
- YAMLパース失敗時に例外が伝播すること

#### StoryCatalogParser

- `HXX-XX`行が正規IDとして収集されること
- `旧US`行/列がalias mapに格納されること
- 表形式・見出し形式の両方から抽出できること

#### MarkdownStoryCatalogGateway

- `user_stories.md`からStoryId一覧が取得できること
- キャッシュが効いていること（2回目呼び出しでファイル再読み込みなし）
- ファイルが存在しない場合にエラーとなること

#### FileSystemMetadataReader

- 対象拡張子（.ts, .tsx, .js, .jsx, .mts, .cts）のファイルからタグが読み取れること
- 存在しないファイルでMetadataReadInfrastructureErrorが発生すること

#### MarkdownDesignDocumentGateway

- construction/{unit}/配下の.mdファイルが列挙されること
- readStoryAnnotationsとreadFrontmatterFlagsが同一キャッシュから供給されること

#### FileSystemInceptionPlanGateway

- `docs/inception/{unit}/{storyId}/`の存在チェックが正しく動作すること
- `*_plan.md`が存在しない場合にexists()がfalseを返すこと

#### LegacyMetadataValidatorAdapter

- 既存`runMetadataCheck()`の入出力契約が維持されること
- 内部で新UseCaseが呼び出されること
- v0 `@layer usecase`がL2-002として報告されること

### Integration（統合テスト）

- `shared-kernel/story-id.ts`がStoryIdだけを再エクスポートし、legacy resolverを公開しないこと
- LegacyMetadataValidatorAdapterが既存`scripts/harness/validators/metadata.ts`の入口から新UseCaseを呼び出せること
- 実ファイルfixtureを用いてimplementation→construction→story→inceptionのチェーンが構築できること

---

## 5. QA（不明点・確認事項）

なし。logical_design.mdの記述で十分なテスト設計が可能。

---

## 6. 前提条件・リスク

### 前提条件

- テストフレームワーク: Vitest 3.0.0
- Infrastructure層のテストではファイルシステムfixtureを使用する（`fs.mkdtempSync()` + cleanup）
- HarnessError型はharness-error Unitから提供される型定義が利用可能であること
- 既存`scripts/harness/validators/metadata.ts`の入出力契約が参照可能であること
- `scripts/harness/core/metadata-parser.ts`はSourceMetadataParserへの薄いラッパー（委譲のみ）であるため、本IT計画の個別テスト対象からは除外する。委譲先であるSourceMetadataParserのInfrastructure層テストおよびLegacyMetadataValidatorAdapterの統合テストで間接的にカバーされる

### リスク

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| 既存metadata.tsの入出力契約が不明確な場合 | LegacyMetadataValidatorAdapterのテストが書けない | 既存コードの振る舞いを先に調査・文書化 |
| user_stories.mdの形式が多様な場合 | StoryCatalogParserのフィクスチャが不足する | 表形式・見出し形式の両方をフィクスチャに用意（論理設計§5.4で方針明記済み） |
| Infrastructure層のファイルI/Oテストが遅い場合 | テスト実行時間が増大する | 一時ディレクトリの最小構造fixtureで軽量化 |
| 既存テスト（metadata-parser.ts等）との回帰 | 移行時に既存テストが壊れる | LegacyMetadataValidatorAdapterの統合テストで既存契約維持を保証 |

### テストケース総数概算

- Application層（UseCase）: 29件
- Infrastructure層（Parser）: 28件
- Infrastructure層（Gateway/Adapter）: 35件
- Integration（統合テスト）: 12件
- **合計: 約104件**
