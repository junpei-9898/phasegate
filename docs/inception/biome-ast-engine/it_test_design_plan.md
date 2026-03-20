# ITテスト設計計画: biome-ast-engine

> **作成日**: 2026-03-13
> **対応ストーリー**: H01-01, H01-02, H01-03
> **正規ソース**: `docs/product/construction/biome-ast-engine/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. スコープ

- 対象Unit: biome-ast-engine
- 論理設計に定義されたApplication層（UseCase 6種）、Infrastructure層（Adapter 6種 + Mapper 3種 + Parser 3種）、Presentation層（CLI Handler 1種 + Parser 1種 + Presenter 1種）をITテストの対象とする
- Port（外部依存）のみモック使用可。ドメイン実体はモック禁止
- v1はpure TypeScript構成。Rust/WASMプラグインは一切使用しない

### テスト対象コンポーネント一覧

| 層 | コンポーネント |
|----|-------------|
| Application | RegisterRuleCatalogUseCase, ResolveEnabledRulesUseCase, AnalyzeImportGraphUseCase, ExecuteLintUseCase, BuildHarnessErrorPayloadUseCase, VerifyEslintRemovalUseCase |
| Infrastructure | BiomeCliExecutorAdapter, TypeScriptSourceModuleAnalyzerAdapter, NodeWorkspaceFileAdapter, HarnessConfigProviderAdapter, HarnessErrorFormatterAdapter, WorkspaceInventoryAdapter, BiomeDiagnosticMapper, RuleViolationCodeMapper, SourceModuleSnapshotMapper, UnitCommentParser, LayerCommentParser, CommentDensityParser |
| Presentation | HarnessLintCommandHandler, LintCommandParser, LintCliPresenter |

---

## 2. テスト対象分析

### Application層（UseCase）

| UseCase名 | 依存Port数 | テストケース概算 |
|-----------|----------|---------------|
| RegisterRuleCatalogUseCase | 0（RuleDefinitionRegistryのみ） | 4 |
| ResolveEnabledRulesUseCase | 1（RuleConfigProviderPort） | 8 |
| AnalyzeImportGraphUseCase | 2（WorkspaceFilePort, SourceModuleAnalyzerPort） | 8 |
| ExecuteLintUseCase | 3（BiomeExecutorPort + 上記UseCase依存 + ClockPort） | 10 |
| BuildHarnessErrorPayloadUseCase | 1（ViolationFormatterPort） | 6 |
| VerifyEslintRemovalUseCase | 1（WorkspaceInventoryPort） | 8 |

**Application層合計**: 約44ケース

### Infrastructure層（Adapter）

| Adapter名 | 操作数 | テストケース概算 |
|-----------|-------|---------------|
| BiomeCliExecutorAdapter | 1（executeCheck） | 6 |
| TypeScriptSourceModuleAnalyzerAdapter | 1（analyzeMany） | 10 |
| NodeWorkspaceFileAdapter | 3（listSourceFiles, readText, exists） | 8 |
| HarnessConfigProviderAdapter | 1（getL1Config） | 6 |
| HarnessErrorFormatterAdapter | 1（format） | 6 |
| WorkspaceInventoryAdapter | 1（findLegacyEslintArtifacts） | 6 |

**Adapter合計**: 約42ケース

### Infrastructure層（Mapper / Parser）

| コンポーネント名 | 操作数 | テストケース概算 |
|----------------|-------|---------------|
| BiomeDiagnosticMapper | 1 | 4 |
| RuleViolationCodeMapper | 1 | 4 |
| SourceModuleSnapshotMapper | 1 | 4 |
| UnitCommentParser | 1 | 4 |
| LayerCommentParser | 1 | 4 |
| CommentDensityParser | 1 | 4 |

**Mapper/Parser合計**: 約24ケース

### Presentation層（CLI/Controller）

| コマンド/エンドポイント | メソッド | テストケース概算 |
|---------------------|--------|---------------|
| HarnessLintCommandHandler（`harness:lint`） | execute | 10 |
| LintCommandParser | parse | 6 |
| LintCliPresenter | format | 6 |

**Presentation層合計**: 約22ケース

---

## 3. テスト方針

### 3.1 テストダブル方針

| 対象 | 方針 |
|------|------|
| Port（外部依存） | モック使用可。vi.fn()でスタブ化する |
| ドメイン実体（VO/サービス） | モック禁止。実体を使用する |
| Biome CLI | fixtureファイル + 実Biome CLI実行で検証 |
| TypeScript Compiler API | fixture TSファイルで検証 |
| ファイルシステム | fixture workspaceディレクトリで検証。一時ディレクトリはfs.mkdtempSync() + cleanup |
| stdout/stderr | キャプチャして検証 |

### 3.2 Application層テスト方針

- **Port（外部依存）のみモック使用可。ドメイン実体はモック禁止**
- RuleDefinitionRegistry, ImportGraphBuilder, LintRunner はモックせず実体を使用する
- ClockPort は固定値を返すスタブで時間依存を除去する

#### UseCase別テスト設計概要

##### RegisterRuleCatalogUseCase

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | 8ルールの正規カタログを返す | — | 8件のRuleDefinitionが返される |
| execute | 8ルールの正規カタログを返す | — | 全ルールのerrorCodeがL1-001〜L1-008に含まれる |

##### ResolveEnabledRulesUseCase

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | L1設定に基づき有効ルールを解決する | L1 enabled=falseの場合 | 全ルールがskippedRulesに含まれる |
| execute | L1設定に基づき有効ルールを解決する | 特定ルールがoffの場合 | そのルールがskippedRulesに含まれる |
| execute | L1設定に基づき有効ルールを解決する | 特定ルールがwarningの場合 | そのルールのseverityがwarningで返される |
| execute | L1設定に基づき有効ルールを解決する | overrideRulesで上書きした場合 | 上書き後の設定が反映される |
| execute | L1設定に基づき有効ルールを解決する | 不正なルール名がある場合 | UnknownRuleNameErrorがスローされる |
| execute | L1設定に基づき有効ルールを解決する | 不正なseverity値がある場合 | InvalidRuleSeverityErrorがスローされる |

##### AnalyzeImportGraphUseCase

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | 対象ファイルを解析しImportGraphを返す | targetsを指定しない場合 | 全ファイルが解析対象になる |
| execute | 対象ファイルを解析しImportGraphを返す | targetsを指定した場合 | 指定ファイルのみが解析対象になる |
| execute | 対象ファイルを解析しImportGraphを返す | 正常解析の場合 | snapshots, importGraph, filesが返される |
| execute | 対象ファイルを解析しImportGraphを返す | ファイルが存在しない場合 | InvalidFilePathErrorがスローされる |

##### ExecuteLintUseCase

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | 設定解決からLintReport生成まで一括実行する | 正常実行の場合 | LintReportとcheckedFilesが返される |
| execute | 設定解決からLintReport生成まで一括実行する | ClockPortを固定した場合 | durationMsが正しく計算される |
| execute | 設定解決からLintReport生成まで一括実行する | includeBiomeNative=trueの場合 | BiomeExecutorPort.executeCheckが呼ばれる |
| execute | 設定解決からLintReport生成まで一括実行する | includeBiomeNative=falseの場合 | BiomeExecutorPort.executeCheckが呼ばれない |
| execute | 設定解決からLintReport生成まで一括実行する | BiomeCLI実行失敗の場合 | BiomeExecutionFailedErrorがスローされる |
| execute | 設定解決からLintReport生成まで一括実行する | targetsを指定した場合 | 指定ファイルのみがcheckedFilesに含まれる |

##### BuildHarnessErrorPayloadUseCase

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | RuleViolationをHarnessError形式に変換する | 違反がある場合 | L1-001〜L1-008のコードが割り当てられる |
| execute | RuleViolationをHarnessError形式に変換する | 違反が空の場合 | 空配列が返される |
| execute | RuleViolationをHarnessError形式に変換する | fixExampleがある場合 | fix_exampleが出力に含まれる |
| execute | RuleViolationをHarnessError形式に変換する | fixExampleがない場合 | fix_exampleが出力に含まれない |

##### VerifyEslintRemovalUseCase

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | ESLint資産の残存を検査する | 設定ファイルが残存している場合 | hasLegacyArtifacts=trueが返される |
| execute | ESLint資産の残存を検査する | package依存が残存している場合 | hasLegacyArtifacts=trueが返される |
| execute | ESLint資産の残存を検査する | 残存がない場合 | hasLegacyArtifacts=falseが返される |
| execute | ESLint資産の残存を検査する | failOnLegacyArtifacts=trueで残存ありの場合 | LegacyEslintArtifactDetectedErrorがスローされる |
| execute | ESLint資産の残存を検査する | failOnLegacyArtifacts=falseで残存ありの場合 | エラーはスローされずDTOが返される |

### 3.3 Infrastructure層テスト方針

- fixtureファイルと実Biome CLI / TypeScript Compiler APIを使用して統合検証する
- ファイルシステムテストでは一時ディレクトリ（fs.mkdtempSync()）を使用し、テスト終了時にcleanupする

#### Adapter別テスト設計概要

##### BiomeCliExecutorAdapter

| target | describe | context | it |
|--------|----------|---------|-----|
| executeCheck | Biome CLIをサブプロセスで実行する | 正常なTSファイルの場合 | エラーなく完了する |
| executeCheck | Biome CLIをサブプロセスで実行する | Biome診断エラーがある場合 | BiomeExecutionFailedErrorがスローされる |
| executeCheck | Biome CLIをサブプロセスで実行する | CLIが見つからない場合 | BiomeExecutionFailedErrorがスローされる |

##### TypeScriptSourceModuleAnalyzerAdapter

| target | describe | context | it |
|--------|----------|---------|-----|
| analyzeMany | TSファイル群をAST解析する | import宣言があるファイルの場合 | imports配列が正しく抽出される |
| analyzeMany | TSファイル群をAST解析する | @unit/@layerコメントがあるファイルの場合 | declaredUnit/declaredLayerが正しく抽出される |
| analyzeMany | TSファイル群をAST解析する | any型を含むファイルの場合 | anyTypeCountが正しくカウントされる |
| analyzeMany | TSファイル群をAST解析する | コメントが多いファイルの場合 | commentLineCount/logicalLineCountが正しくカウントされる |
| analyzeMany | TSファイル群をAST解析する | 重複コメントブロックがあるファイルの場合 | repeatedCommentBlocksが正しくカウントされる |
| analyzeMany | TSファイル群をAST解析する | export宣言があるファイルの場合 | exportedSymbolsが正しく抽出される |
| analyzeMany | TSファイル群をAST解析する | 構造フィンガープリントが生成可能なファイルの場合 | duplicationFingerprintsが抽出される |

##### NodeWorkspaceFileAdapter

| target | describe | context | it |
|--------|----------|---------|-----|
| listSourceFiles | ソースファイルを列挙する | targetsを指定しない場合 | scripts/harness/配下の.ts/.tsx/.mts/.ctsが返される |
| listSourceFiles | ソースファイルを列挙する | node_modules/dist/coverage等がある場合 | 除外される |
| listSourceFiles | ソースファイルを列挙する | targetsを指定した場合 | 指定パスに一致するファイルのみ返される |
| readText | ファイル内容を読み取る | 存在するファイルの場合 | ファイル内容が返される |
| exists | ファイルの存在を確認する | 存在するファイルの場合 | trueが返される |

##### HarnessConfigProviderAdapter

| target | describe | context | it |
|--------|----------|---------|-----|
| getL1Config | L1設定を取得する | 正常なharness.config.jsonがある場合 | enabled/rulesが返される |
| getL1Config | L1設定を取得する | layers.L1が未定義の場合 | 既定値{ enabled: true, rules: {} }が返される |
| getL1Config | L1設定を取得する | harness.config.jsonが存在しない場合 | 既定値が返される |

##### HarnessErrorFormatterAdapter

| target | describe | context | it |
|--------|----------|---------|-----|
| format | RuleViolationをHarnessError互換形式に変換する | 8ルールの違反がある場合 | 対応するL1-001〜L1-008のcodeが設定される |
| format | RuleViolationをHarnessError互換形式に変換する | fixExampleがある場合 | fix_exampleが出力に含まれる |
| format | RuleViolationをHarnessError互換形式に変換する | suggestionが標準値の場合 | 標準suggestionが出力に含まれる |

##### WorkspaceInventoryAdapter

| target | describe | context | it |
|--------|----------|---------|-----|
| findLegacyEslintArtifacts | ESLint残存を検出する | .eslintrc.cjsが存在する場合 | configFilesに含まれる |
| findLegacyEslintArtifacts | ESLint残存を検出する | eslint.config.jsが存在する場合 | configFilesに含まれる |
| findLegacyEslintArtifacts | ESLint残存を検出する | package.jsonにeslint依存がある場合 | packageDependenciesに含まれる |
| findLegacyEslintArtifacts | ESLint残存を検出する | package.jsonに@typescript-eslint依存がある場合 | packageDependenciesに含まれる |
| findLegacyEslintArtifacts | ESLint残存を検出する | ESLint関連が一切ない場合 | 空の結果が返される |

#### Mapper / Parser テスト設計概要

##### BiomeDiagnosticMapper

| target | describe | context | it |
|--------|----------|---------|-----|
| map | Biome JSON診断をRuleViolationに変換する | 正常なBiome JSON出力の場合 | RuleViolation配列が返される |
| map | Biome JSON診断をRuleViolationに変換する | 不正なJSON構造の場合 | エラーがスローされる |

##### RuleViolationCodeMapper

| target | describe | context | it |
|--------|----------|---------|-----|
| toErrorCode | ルール名をL1コードに変換する | 8ルール各々の場合 | L1-001〜L1-008が返される |
| toErrorCode | ルール名をL1コードに変換する | 未定義ルール名の場合 | エラーがスローされる |

##### UnitCommentParser / LayerCommentParser

| target | describe | context | it |
|--------|----------|---------|-----|
| parse | ソースコードから@unit/@layerを抽出する | 正規コメントがある場合 | 値が抽出される |
| parse | ソースコードから@unit/@layerを抽出する | コメントがない場合 | nullが返される |
| parse | ソースコードから@unit/@layerを抽出する | 不正なフォーマットの場合 | nullが返される |

##### CommentDensityParser

| target | describe | context | it |
|--------|----------|---------|-----|
| parse | コメント密度と重複ブロックを算出する | コメントが多いソースの場合 | 正しいcommentLineCount/logicalLineCountが返される |
| parse | コメント密度と重複ブロックを算出する | 同一コメントが反復している場合 | repeatedCommentBlocksが正しく算出される |

### 3.4 Presentation層テスト方針

- stdout/stderrをキャプチャして出力内容を検証する
- 終了コード（0/1/2）を分岐ごとに固定する
- UseCaseはモック化し、CLIの入出力変換に集中する
- `--json` 指定時はHarnessApiResponse envelopeの属性単位で比較する（snapshotは使わない）

#### HarnessLintCommandHandler テスト設計概要

| target | describe | context | it |
|--------|----------|---------|-----|
| execute | harness:lintコマンドを実行する | 違反なし・ESLint残存なしの場合 | 終了コード0が返される |
| execute | harness:lintコマンドを実行する | ルール違反がある場合 | 終了コード1が返される |
| execute | harness:lintコマンドを実行する | ESLint残存がある場合 | 終了コード1が返される |
| execute | harness:lintコマンドを実行する | 設定読取失敗の場合 | 終了コード2が返される |
| execute | harness:lintコマンドを実行する | --jsonフラグが指定された場合 | HarnessApiResponse形式のJSONが出力される |
| execute | harness:lintコマンドを実行する | --targetフラグが指定された場合 | 対象ファイルが限定される |
| execute | harness:lintコマンドを実行する | --skip-eslint-removal-checkが指定された場合 | VerifyEslintRemovalUseCaseが呼ばれない |
| execute | harness:lintコマンドを実行する | 不正フラグが指定された場合 | Usageが出力され終了コード2が返される |
| execute | harness:lintコマンドを実行する | 不正フラグが指定された場合 | UseCaseが呼び出されない |

#### LintCommandParser テスト設計概要

| target | describe | context | it |
|--------|----------|---------|-----|
| parse | CLI引数を解釈する | 引数なしの場合 | 既定値（全体検査、テキスト出力、ESLint検査あり）が返される |
| parse | CLI引数を解釈する | --jsonフラグが指定された場合 | json=trueが返される |
| parse | CLI引数を解釈する | --target path1 path2が指定された場合 | targetsにpath1/path2が含まれる |
| parse | CLI引数を解釈する | --skip-eslint-removal-checkが指定された場合 | skipEslintRemovalCheck=trueが返される |
| parse | CLI引数を解釈する | 不正なフラグが指定された場合 | Usageエラーが返される |
| parse | CLI引数を解釈する | 複数フラグを組み合わせた場合 | 全フラグが正しく解釈される |

#### LintCliPresenter テスト設計概要

| target | describe | context | it |
|--------|----------|---------|-----|
| format | 実行結果を出力文字列に変換する | テキスト出力で違反ありの場合 | 違反件数と代表違反が含まれる |
| format | 実行結果を出力文字列に変換する | テキスト出力で違反なしの場合 | 成功メッセージが含まれる |
| format | 実行結果を出力文字列に変換する | JSON出力の場合 | HarnessApiResponse envelopeが出力される |
| format | 実行結果を出力文字列に変換する | JSON出力でstatus/errors/summary/dataが含まれる場合 | 各属性が正しく設定される |
| format | 実行結果を出力文字列に変換する | ESLint残存結果が含まれる場合 | 残存ファイル情報が出力に含まれる |
| format | 実行結果を出力文字列に変換する | スキップルールがある場合 | スキップルール一覧が出力に含まれる |

### 3.5 共通テスト構造規約

- **AAAパターン**: Arrange / Act / Assert のコメントで構造化する
- **テストケース名は日本語**: 仕様書として読める表現にする
- **実行結果はactualに代入する**
- **describe/it構造**: `target` / `describe` / `context` / `it` パターンに従う
- **ファイル名**: kebab-caseで統一
- **実装の詳細をテストケース名に含めない**

### 3.6 テストファイル配置

```
scripts/harness/__tests__/biome-ast-engine/
├── application/
│   ├── register-rule-catalog-usecase.test.ts
│   ├── resolve-enabled-rules-usecase.test.ts
│   ├── analyze-import-graph-usecase.test.ts
│   ├── execute-lint-usecase.test.ts
│   ├── build-harness-error-payload-usecase.test.ts
│   └── verify-eslint-removal-usecase.test.ts
├── infrastructure/
│   ├── biome-cli-executor-adapter.test.ts
│   ├── typescript-source-module-analyzer-adapter.test.ts
│   ├── node-workspace-file-adapter.test.ts
│   ├── harness-config-provider-adapter.test.ts
│   ├── harness-error-formatter-adapter.test.ts
│   └── workspace-inventory-adapter.test.ts
├── presentation/
│   ├── harness-lint-command-handler.test.ts
│   ├── lint-command-parser.test.ts
│   └── lint-cli-presenter.test.ts
└── fixtures/
    ├── application/
    │   ├── comment-flood/noisy-comments.ts
    │   ├── duplication/duplicate-a.ts
    │   ├── duplication/duplicate-b.ts
    │   ├── layer-violation/invalid-domain-import.ts
    │   ├── layer-violation/valid-application-service.ts
    │   └── metadata/
    │       ├── missing-layer.ts
    │       └── missing-unit.ts
    ├── infrastructure/
    │   ├── biome-json-report.json
    │   └── package-with-eslint.json
    └── workspace/
        ├── biome-ast-engine/
        │   ├── application/execute-lint-usecase.ts
        │   ├── domain/rule-definition.ts
        │   ├── infrastructure/biome-cli-executor-adapter.ts
        │   └── presentation/harness-lint-command-handler.ts
        └── eslint-legacy/
            ├── .eslintrc.cjs
            └── eslint.config.js
```

### 3.7 Fixture方針

- Fixture TSファイルは `__tests__/biome-ast-engine/fixtures/` に配置する
- 各テスト目的に応じた最小限のfixture（metadata欠落、レイヤー違反import、コメント過剰、重複コード等）を用意する
- ESLint残存検出テスト用に `.eslintrc.cjs`, `eslint.config.js`, `package-with-eslint.json` を用意する
- Biome CLI統合テスト用に `biome-json-report.json`（正常JSON出力サンプル）を用意する

---

## 4. QA（不明点・確認事項）

| # | 質問 | 影響範囲 |
|---|------|---------|
| QA-1 | BiomeCliExecutorAdapter統合テストでBiome CLIバイナリの存在前提をどう扱うか（CIにBiome必須 or conditional skip） | BiomeCliExecutorAdapter テスト |

[Answer] CIにBiome必須とする。環境契約§7でBiome CLIはCIパイプラインの必須ステップとして定義済み。conditional skipは採用しない。テストが失敗した場合はCI環境のセットアップ不備として扱う。

| QA-2 | TypeScriptSourceModuleAnalyzerAdapterで使用するTypeScript Compiler APIのバージョンをテスト環境でどう固定するか | TypeScriptSourceModuleAnalyzerAdapter テスト |

[Answer] package.jsonのdevDependenciesの`typescript`バージョン（`^5.0.0`）で固定する。テスト時のCompiler API挙動はこのバージョンに依存する。バージョン変更時はテストの再検証を行う。

| QA-3 | NodeWorkspaceFileAdapterのlistSourceFilesで実際のプロジェクトディレクトリを使うか、fixture workspaceを使うか | NodeWorkspaceFileAdapter テスト |

[Answer] fixture workspaceを使用する。`__tests__/biome-ast-engine/fixtures/workspace/` に最小限のTypeScriptファイル構成を用意する。実際のプロジェクトディレクトリはファイル数・構成の変動が大きく、テストの安定性を損なう。

| QA-4 | HarnessConfigProviderAdapterが参照するconfig-foundationの公開ファサードが未実装の場合、テストでどうスタブ化するか | HarnessConfigProviderAdapter テスト |

[Answer] HarnessConfigProviderPort（Port interface）に対するスタブを用意する。テストではPort経由でHarnessConfigV2の既定値を返すスタブを注入する。config-foundation実装完了後に実アダプターへの差し替えテストを追加する。

| QA-5 | RegisterRuleCatalogUseCaseはドメインサービスのみに依存しPortモックが不要だが、UTとITのどちらに分類するか | テスト分類 |

[Answer] UTに分類する。Portモックが不要でドメインサービスのみに依存するため、ドメイン層のテストとして扱う。ITはPort/Infrastructure境界を越える統合を検証するものであり、ドメインサービスのみの組み合わせはUTの範囲。

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワーク: Vitest 3.0.0（共有設定 `scripts/harness/__tests__/vitest.config.ts`）
- `target` / `context` ヘルパーが `scripts/harness/__tests__/helper/common-helper.ts` に定義済みであること
- Biome CLIがテスト実行環境にインストール済みであること（Infrastructure層テスト）
- TypeScript Compiler APIが利用可能であること（Infrastructure層テスト）
- fixture workspaceが `__tests__/biome-ast-engine/fixtures/` に整備済みであること
- config-foundationの公開インターフェース（HarnessConfigV2型）がWave 1開始前に確定していること

### リスク

| リスク | 影響 | 対策 |
|-------|------|------|
| Biome CLIのバージョンアップにより出力JSON構造が変更される | BiomeCliExecutorAdapter, BiomeDiagnosticMapperのテストが壊れる | Biomeバージョンをpackage.jsonで固定し、fixture JSONを対応バージョンで生成する |
| TypeScript Compiler APIの内部構造変更 | TypeScriptSourceModuleAnalyzerAdapterのテストが壊れる | TypeScriptバージョンをdevDependenciesで固定し、fixture TSファイルを対応バージョンで検証する |
| config-foundation Unitの実装遅延 | HarnessConfigProviderAdapterのテストが実行不可 | Port経由のインターフェースを使い、テスト時はスタブで既定値を返す |
| CI環境でBiome CLIが利用できない | BiomeCliExecutorAdapterのテストがスキップされる | CI設定でBiome CLIのインストールステップを追加する |
| ExecuteLintUseCaseの統合テストが複数のPort依存により複雑化する | テストのメンテナンスコストが増大する | 各Portのモックをファクトリ関数で共通化し、最小限のスタブで検証する |
| L1-006/L1-007/L1-008のルール名対応がintegration_contract.mdとlogical_design.mdで異なる | integration_contract.mdではL1-006=no-ghost-file, L1-007=no-comment-flood, L1-008=no-code-duplicationだが、logical_design.mdではL1-006=no-code-duplication, L1-007=no-ghost-file, L1-008=no-comment-floodとなっている。テスト計画はlogical_design.mdに従う | 実装時にintegration_contract.mdとの不整合を確認し、どちらかの文書を修正する必要がある。テストコードではlogical_design.mdのerrorCode対応表（Section 2.2.10）を正とする |
