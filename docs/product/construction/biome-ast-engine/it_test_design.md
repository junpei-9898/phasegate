# ITテスト設計: biome-ast-engine

> **作成日**: 2026-03-13
> **対応ストーリー**: H01-01, H01-02, H01-03
> **正規ソース**: `docs/product/construction/biome-ast-engine/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`
> **Phase 1計画**: `docs/inception/biome-ast-engine/it_test_design_plan.md`

---

## 1. 対象コンポーネント

### スコープ

- 対象Unit: biome-ast-engine
- 論理設計に定義されたApplication層（UseCase 5種）、Infrastructure層（Adapter 6種 + Mapper 3種 + Parser 3種）、Presentation層（CLI Handler 1種 + Parser 1種 + Presenter 1種）をITテストの対象とする
- Port（外部依存）のみモック使用可。ドメイン実体（VO/サービス）はモック禁止
- v1はpure TypeScript構成。Rust/WASMプラグインは一切使用しない

### QA回答による分類変更

| QA# | 決定事項 |
|-----|---------|
| QA-1 | Biome CLIはCIで必須。conditional skipは不採用。テスト失敗はCI環境のセットアップ不備として扱う |
| QA-2 | TypeScriptバージョンはpackage.jsonのdevDependencies（`^5.0.0`）で固定 |
| QA-3 | fixture workspaceを使用（`__tests__/biome-ast-engine/fixtures/workspace/`）。実プロジェクトディレクトリは使用しない |
| QA-4 | HarnessConfigProviderPortスタブでHarnessConfigV2既定値を返す。config-foundation実装完了後に実アダプターテスト追加 |
| QA-5 | RegisterRuleCatalogUseCaseはUTに分類（Portモック不要、ドメインサービスのみ依存） |

### テスト対象コンポーネント一覧

| 層 | コンポーネント | IT対象 |
|----|-------------|--------|
| Application | RegisterRuleCatalogUseCase | **UTに移動（QA-5）** |
| Application | ResolveEnabledRulesUseCase | Yes |
| Application | AnalyzeImportGraphUseCase | Yes |
| Application | ExecuteLintUseCase | Yes |
| Application | BuildHarnessErrorPayloadUseCase | Yes |
| Application | VerifyEslintRemovalUseCase | Yes |
| Infrastructure | BiomeCliExecutorAdapter | Yes |
| Infrastructure | TypeScriptSourceModuleAnalyzerAdapter | Yes |
| Infrastructure | NodeWorkspaceFileAdapter | Yes |
| Infrastructure | HarnessConfigProviderAdapter | Yes |
| Infrastructure | HarnessErrorFormatterAdapter | Yes |
| Infrastructure | WorkspaceInventoryAdapter | Yes |
| Infrastructure | BiomeDiagnosticMapper | Yes |
| Infrastructure | RuleViolationCodeMapper | Yes |
| Infrastructure | SourceModuleSnapshotMapper | Yes |
| Infrastructure | UnitCommentParser | Yes |
| Infrastructure | LayerCommentParser | Yes |
| Infrastructure | CommentDensityParser | Yes |
| Presentation | HarnessLintCommandHandler | Yes |
| Presentation | LintCommandParser | Yes |
| Presentation | LintCliPresenter | Yes |

### errorCode対応表（logical_design.md Section 2.2.10が正）

> **注意**: integration_contract.md Section 9ではL1-006=no-ghost-file, L1-007=no-comment-flood, L1-008=no-code-duplicationとなっているが、logical_design.mdのerrorCode対応表（Section 2.2.10）を正とする。実装時にintegration_contract.mdとの不整合を修正する必要がある。

| code | rule |
|------|------|
| `L1-001` | `require-unit-comment` |
| `L1-002` | `require-layer-comment` |
| `L1-003` | `no-layer-violation` |
| `L1-004` | `enforce-folder-structure` |
| `L1-005` | `no-any-abuse` |
| `L1-006` | `no-code-duplication` |
| `L1-007` | `no-ghost-file` |
| `L1-008` | `no-comment-flood` |

---

## 2. テストファイル構成

```
scripts/harness/__tests__/biome-ast-engine/
├── application/
│   ├── resolve-enabled-rules-usecase.test.ts
│   ├── analyze-import-graph-usecase.test.ts
│   ├── execute-lint-usecase.test.ts
│   ├── build-harness-error-payload-usecase.test.ts
│   ├── verify-eslint-removal-usecase.test.ts
│   └── register-rule-catalog-usecase.test.ts
├── infrastructure/
│   ├── biome-cli-executor-adapter.test.ts
│   ├── typescript-source-module-analyzer-adapter.test.ts
│   ├── node-workspace-file-adapter.test.ts
│   ├── harness-config-provider-adapter.test.ts
│   ├── harness-error-formatter-adapter.test.ts
│   ├── workspace-inventory-adapter.test.ts
│   ├── biome-diagnostic-mapper.test.ts
│   ├── rule-violation-code-mapper.test.ts
│   ├── source-module-snapshot-mapper.test.ts
│   ├── unit-comment-parser.test.ts
│   ├── layer-comment-parser.test.ts
│   └── comment-density-parser.test.ts
├── integration/
│   └── ci-pipeline-smoke.test.ts
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

### ファイル命名規約

- ファイル名: kebab-case統一
- テストファイル: `{コンポーネント名}.test.ts`
- fixtureファイル: 目的別サブディレクトリに最小限のファイルを配置

---

## 3. UseCaseテストケース

> RegisterRuleCatalogUseCaseはQA-5回答によりUTに分類されていたが、coverage_report.mdの指摘に基づきUseCase経路の直接テストをIT 5.5節に追加した。
> 5 UseCase + RegisterRuleCatalogUseCase直接テスト + CI統合テスト, 合計54ケース。

### 3.1 ResolveEnabledRulesUseCase (8ケース)

**テストファイル**: `application/resolve-enabled-rules-usecase.test.ts`

**テストダブル方針**:
- `RuleConfigProviderPort`: vi.fn()でスタブ化
- `RuleDefinitionRegistry`: 実体を使用（モック禁止）

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-001 | execute | L1設定に基づき有効ルールを解決する | L1 enabled=trueかつ全ルールがerrorの場合 | 8件のenabledRulesが返される |
| IT-BA-002 | execute | L1設定に基づき有効ルールを解決する | L1 enabled=falseの場合 | 全ルールがskippedRulesに含まれる |
| IT-BA-003 | execute | L1設定に基づき有効ルールを解決する | 特定ルールがoffの場合 | そのルールがskippedRulesに含まれる |
| IT-BA-004 | execute | L1設定に基づき有効ルールを解決する | 特定ルールがwarningの場合 | そのルールのseverityがwarningで返される |
| IT-BA-005 | execute | L1設定に基づき有効ルールを解決する | overrideRulesで上書きした場合 | 上書き後の設定が反映される |
| IT-BA-006 | execute | L1設定に基づき有効ルールを解決する | overrideRulesとPort設定が競合した場合 | overrideRulesが優先される |
| IT-BA-007 | execute | L1設定に基づき有効ルールを解決する | 不正なルール名がある場合 | UnknownRuleNameErrorがスローされる |
| IT-BA-008 | execute | L1設定に基づき有効ルールを解決する | 不正なseverity値がある場合 | InvalidRuleSeverityErrorがスローされる |

### 3.2 AnalyzeImportGraphUseCase (8ケース)

**テストファイル**: `application/analyze-import-graph-usecase.test.ts`

**テストダブル方針**:
- `WorkspaceFilePort`: vi.fn()でスタブ化
- `SourceModuleAnalyzerPort`: vi.fn()でスタブ化
- `ImportGraphBuilder`: 実体を使用（モック禁止）

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-009 | execute | 対象ファイルを解析しImportGraphを返す | targetsを指定しない場合 | 全ファイルが解析対象になる |
| IT-BA-010 | execute | 対象ファイルを解析しImportGraphを返す | targetsを指定した場合 | 指定ファイルのみが解析対象になる |
| IT-BA-011 | execute | 対象ファイルを解析しImportGraphを返す | 正常解析の場合 | snapshots配列が返される |
| IT-BA-012 | execute | 対象ファイルを解析しImportGraphを返す | 正常解析の場合 | importGraphが返される |
| IT-BA-013 | execute | 対象ファイルを解析しImportGraphを返す | 正常解析の場合 | files配列が返される |
| IT-BA-014 | execute | 対象ファイルを解析しImportGraphを返す | import関係を持つファイル群の場合 | importGraphのedgesにimport関係が含まれる |
| IT-BA-015 | execute | 対象ファイルを解析しImportGraphを返す | ファイルが存在しない場合 | InvalidFilePathErrorがスローされる |
| IT-BA-016 | execute | 対象ファイルを解析しImportGraphを返す | index.tsが含まれる場合 | rootNodesにindex.tsが含まれる |
| IT-BA-133 | execute | 対象ファイルを解析しImportGraphを返す | 不正なimportグラフ構造が生成される場合 | InvalidImportGraphErrorがスローされる |

### 3.3 ExecuteLintUseCase (10ケース)

**テストファイル**: `application/execute-lint-usecase.test.ts`

**テストダブル方針**:
- `ResolveEnabledRulesUseCase`: vi.fn()でスタブ化（UseCase間依存）
- `AnalyzeImportGraphUseCase`: vi.fn()でスタブ化（UseCase間依存）
- `BiomeExecutorPort`: vi.fn()でスタブ化
- `ClockPort`: 固定値を返すスタブで時間依存を除去
- `LintRunner`: 実体を使用（モック禁止）
- `RuleDefinitionRegistry`: 実体を使用（モック禁止）

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-017 | execute | 設定解決からLintReport生成まで一括実行する | 正常実行の場合 | LintReportが返される |
| IT-BA-018 | execute | 設定解決からLintReport生成まで一括実行する | 正常実行の場合 | checkedFilesが返される |
| IT-BA-019 | execute | 設定解決からLintReport生成まで一括実行する | ClockPortを固定した場合 | durationMsが正しく計算される |
| IT-BA-020 | execute | 設定解決からLintReport生成まで一括実行する | includeBiomeNative=trueの場合 | BiomeExecutorPort.executeCheckが呼ばれる |
| IT-BA-021 | execute | 設定解決からLintReport生成まで一括実行する | includeBiomeNative=falseの場合 | BiomeExecutorPort.executeCheckが呼ばれない |
| IT-BA-022 | execute | 設定解決からLintReport生成まで一括実行する | includeBiomeNativeを指定しない場合 | BiomeExecutorPort.executeCheckが呼ばれる |
| IT-BA-023 | execute | 設定解決からLintReport生成まで一括実行する | BiomeCLI実行失敗の場合 | BiomeExecutionFailedErrorがスローされる |
| IT-BA-024 | execute | 設定解決からLintReport生成まで一括実行する | targetsを指定した場合 | 指定ファイルのみがcheckedFilesに含まれる |
| IT-BA-025 | execute | 設定解決からLintReport生成まで一括実行する | 違反がある場合 | report.hasErrors()がtrueを返す |
| IT-BA-026 | execute | 設定解決からLintReport生成まで一括実行する | 違反がない場合 | report.hasErrors()がfalseを返す |
| IT-BA-134 | execute | 設定解決からLintReport生成まで一括実行する | 未知のルール名が設定に含まれる場合 | UnknownRuleNameErrorがスローされる |
| IT-BA-135 | execute | 設定解決からLintReport生成まで一括実行する | 不正なimportグラフが構築される場合 | InvalidImportGraphErrorがスローされる |

### 3.4 BuildHarnessErrorPayloadUseCase (6ケース)

**テストファイル**: `application/build-harness-error-payload-usecase.test.ts`

**テストダブル方針**:
- `ViolationFormatterPort`: vi.fn()でスタブ化

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-027 | execute | RuleViolationをHarnessError形式に変換する | 違反がある場合 | L1-001〜L1-008のcodeが割り当てられる |
| IT-BA-028 | execute | RuleViolationをHarnessError形式に変換する | 違反が空の場合 | 空配列が返される |
| IT-BA-029 | execute | RuleViolationをHarnessError形式に変換する | fixExampleがある場合 | fix_exampleが出力に含まれる |
| IT-BA-030 | execute | RuleViolationをHarnessError形式に変換する | fixExampleがない場合 | fix_exampleが出力に含まれない |
| IT-BA-031 | execute | RuleViolationをHarnessError形式に変換する | adr_refがある場合 | adr_refが出力に含まれる |
| IT-BA-032 | execute | RuleViolationをHarnessError形式に変換する | 複数違反がある場合 | 全違反が変換される |
| IT-BA-136 | execute | RuleViolationをHarnessError形式に変換する | ViolationFormatterPortがエラーを返す場合 | ViolationFormattingFailedErrorがスローされる |

### 3.5 VerifyEslintRemovalUseCase (8ケース)

**テストファイル**: `application/verify-eslint-removal-usecase.test.ts`

**テストダブル方針**:
- `WorkspaceInventoryPort`: vi.fn()でスタブ化

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-033 | execute | ESLint資産の残存を検査する | 設定ファイルが残存している場合 | hasLegacyArtifacts=trueが返される |
| IT-BA-034 | execute | ESLint資産の残存を検査する | 設定ファイルが残存している場合 | configFilesに残存ファイル名が含まれる |
| IT-BA-035 | execute | ESLint資産の残存を検査する | package依存が残存している場合 | hasLegacyArtifacts=trueが返される |
| IT-BA-036 | execute | ESLint資産の残存を検査する | package依存が残存している場合 | packageDependenciesに依存名が含まれる |
| IT-BA-037 | execute | ESLint資産の残存を検査する | 残存がない場合 | hasLegacyArtifacts=falseが返される |
| IT-BA-038 | execute | ESLint資産の残存を検査する | 残存がない場合 | configFilesとpackageDependenciesが空配列で返される |
| IT-BA-039 | execute | ESLint資産の残存を検査する | failOnLegacyArtifacts=trueで残存ありの場合 | LegacyEslintArtifactDetectedErrorがスローされる |
| IT-BA-040 | execute | ESLint資産の残存を検査する | failOnLegacyArtifacts=falseで残存ありの場合 | エラーはスローされずDTOが返される |

---

## 4. Infrastructureテストケース

> 6 Adapter + 3 Mapper + 3 Parser, 合計66ケース。

### 4.1 BiomeCliExecutorAdapter (6ケース)

**テストファイル**: `infrastructure/biome-cli-executor-adapter.test.ts`

**テスト方針**:
- fixtureファイルと実Biome CLIを使用して統合検証する
- Biome CLIはCI必須（QA-1）。conditional skipは採用しない
- `biome check --reporter json` をサブプロセスで実行する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-041 | executeCheck | Biome CLIをサブプロセスで実行する | 正常なTSファイルの場合 | エラーなく完了する |
| IT-BA-042 | executeCheck | Biome CLIをサブプロセスで実行する | Biome診断エラーがある場合 | BiomeExecutionFailedErrorがスローされる |
| IT-BA-043 | executeCheck | Biome CLIをサブプロセスで実行する | CLIが見つからない場合 | BiomeExecutionFailedErrorがスローされる |
| IT-BA-044 | executeCheck | Biome CLIをサブプロセスで実行する | 非0終了コードの場合 | BiomeExecutionFailedErrorがスローされる |
| IT-BA-045 | executeCheck | Biome CLIをサブプロセスで実行する | JSON出力が不正な場合 | BiomeExecutionFailedErrorがスローされる |
| IT-BA-046 | executeCheck | Biome CLIをサブプロセスで実行する | 複数ファイルを指定した場合 | 全ファイルが検査対象となる |

### 4.2 TypeScriptSourceModuleAnalyzerAdapter (10ケース)

**テストファイル**: `infrastructure/typescript-source-module-analyzer-adapter.test.ts`

**テスト方針**:
- TypeScript Compiler APIでfixture TSファイルを一括解析する
- TypeScriptバージョンはpackage.jsonのdevDependencies `^5.0.0` で固定（QA-2）
- コメント解析はunit-comment-parser, layer-comment-parser, comment-density-parserに委譲

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-047 | analyzeMany | TSファイル群をAST解析する | import宣言があるファイルの場合 | imports配列が正しく抽出される |
| IT-BA-048 | analyzeMany | TSファイル群をAST解析する | @unitコメントがあるファイルの場合 | declaredUnitが正しく抽出される |
| IT-BA-049 | analyzeMany | TSファイル群をAST解析する | @layerコメントがあるファイルの場合 | declaredLayerが正しく抽出される |
| IT-BA-050 | analyzeMany | TSファイル群をAST解析する | any型を含むファイルの場合 | anyTypeCountが正しくカウントされる |
| IT-BA-051 | analyzeMany | TSファイル群をAST解析する | 型注釈を持つファイルの場合 | typedNodeCountが正しくカウントされる |
| IT-BA-052 | analyzeMany | TSファイル群をAST解析する | コメントが多いファイルの場合 | commentLineCount/logicalLineCountが正しくカウントされる |
| IT-BA-053 | analyzeMany | TSファイル群をAST解析する | 重複コメントブロックがあるファイルの場合 | repeatedCommentBlocksが正しくカウントされる |
| IT-BA-054 | analyzeMany | TSファイル群をAST解析する | export宣言があるファイルの場合 | exportedSymbolsが正しく抽出される |
| IT-BA-055 | analyzeMany | TSファイル群をAST解析する | 構造フィンガープリントが生成可能なファイルの場合 | duplicationFingerprintsが抽出される |
| IT-BA-056 | analyzeMany | TSファイル群をAST解析する | index.tsの場合 | isEntrypointCandidateがtrueで返される |

### 4.3 NodeWorkspaceFileAdapter (8ケース)

**テストファイル**: `infrastructure/node-workspace-file-adapter.test.ts`

**テスト方針**:
- fixture workspace（`__tests__/biome-ast-engine/fixtures/workspace/`）を使用（QA-3）
- 一時ディレクトリ（fs.mkdtempSync()）を使用し、テスト終了時にcleanupする

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-057 | listSourceFiles | ソースファイルを列挙する | targetsを指定しない場合 | 配下の.ts/.tsx/.mts/.ctsが返される |
| IT-BA-058 | listSourceFiles | ソースファイルを列挙する | node_modules/dist/coverage等がある場合 | 除外される |
| IT-BA-059 | listSourceFiles | ソースファイルを列挙する | __fixtures__がある場合 | 除外される |
| IT-BA-060 | listSourceFiles | ソースファイルを列挙する | targetsを指定した場合 | 指定パスに一致するファイルのみ返される |
| IT-BA-061 | listSourceFiles | ソースファイルを列挙する | 返却されるファイルパスの場合 | プロジェクト相対パスのFilePath形式で返される |
| IT-BA-062 | readText | ファイル内容を読み取る | 存在するファイルの場合 | ファイル内容が文字列で返される |
| IT-BA-063 | readText | ファイル内容を読み取る | 存在しないファイルの場合 | エラーがスローされる |
| IT-BA-064 | exists | ファイルの存在を確認する | 存在するファイルの場合 | trueが返される |

### 4.4 HarnessConfigProviderAdapter (6ケース)

**テストファイル**: `infrastructure/harness-config-provider-adapter.test.ts`

**テスト方針**:
- HarnessConfigProviderPortスタブでHarnessConfigV2既定値を返す（QA-4）
- config-foundation実装完了後に実アダプターへの差し替えテストを追加する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-065 | getL1Config | L1設定を取得する | 正常なphasegate.config.jsonがある場合 | enabled/rulesが返される |
| IT-BA-066 | getL1Config | L1設定を取得する | layers.L1が未定義の場合 | 既定値{ enabled: true, rules: {} }が返される |
| IT-BA-067 | getL1Config | L1設定を取得する | phasegate.config.jsonが存在しない場合 | 既定値が返される |
| IT-BA-068 | getL1Config | L1設定を取得する | L1.rulesに8ルール全てが定義されている場合 | 全ルール設定が返される |
| IT-BA-069 | getL1Config | L1設定を取得する | L1.rulesが部分的に定義されている場合 | 定義済みルールの設定のみ返される |
| IT-BA-070 | getL1Config | L1設定を取得する | L1.enabledがfalseの場合 | enabled=falseが返される |

### 4.5 HarnessErrorFormatterAdapter (6ケース)

**テストファイル**: `infrastructure/harness-error-formatter-adapter.test.ts`

**テスト方針**:
- RuleViolation実体をドメインVOで構築し、変換結果を検証する
- errorCodeの対応はlogical_design.md Section 2.2.10を正とする

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-071 | format | RuleViolationをHarnessError互換形式に変換する | require-unit-commentの違反がある場合 | code=L1-001が設定される |
| IT-BA-072 | format | RuleViolationをHarnessError互換形式に変換する | 8ルール各々の違反がある場合 | 対応するL1-001〜L1-008のcodeが設定される |
| IT-BA-073 | format | RuleViolationをHarnessError互換形式に変換する | fixExampleがある場合 | fix_exampleが出力に含まれる |
| IT-BA-074 | format | RuleViolationをHarnessError互換形式に変換する | fixExampleがない場合 | fix_exampleが出力に含まれない |
| IT-BA-075 | format | RuleViolationをHarnessError互換形式に変換する | suggestionが標準値の場合 | 標準suggestionが出力に含まれる |
| IT-BA-076 | format | RuleViolationをHarnessError互換形式に変換する | severityがwarningの場合 | severity=warningが出力に設定される |

### 4.6 WorkspaceInventoryAdapter (6ケース)

**テストファイル**: `infrastructure/workspace-inventory-adapter.test.ts`

**テスト方針**:
- fixture workspace内のeslint-legacy/配下を使用して検証する
- 一時ディレクトリ（fs.mkdtempSync()）を使用し、テスト終了時にcleanupする

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-077 | findLegacyEslintArtifacts | ESLint残存を検出する | .eslintrc.cjsが存在する場合 | configFilesに含まれる |
| IT-BA-078 | findLegacyEslintArtifacts | ESLint残存を検出する | eslint.config.jsが存在する場合 | configFilesに含まれる |
| IT-BA-079 | findLegacyEslintArtifacts | ESLint残存を検出する | package.jsonにeslint依存がある場合 | packageDependenciesに含まれる |
| IT-BA-080 | findLegacyEslintArtifacts | ESLint残存を検出する | package.jsonに@typescript-eslint依存がある場合 | packageDependenciesに含まれる |
| IT-BA-081 | findLegacyEslintArtifacts | ESLint残存を検出する | ESLint関連が一切ない場合 | 空の結果が返される |
| IT-BA-082 | findLegacyEslintArtifacts | ESLint残存を検出する | 複数のESLint設定ファイルと依存が残存している場合 | 全てが検出される |

### 4.7 BiomeDiagnosticMapper (6ケース)

**テストファイル**: `infrastructure/biome-diagnostic-mapper.test.ts`

**テスト方針**:
- fixture `biome-json-report.json` を使用してBiome JSON出力の変換を検証する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-083 | map | Biome JSON診断をRuleViolationに変換する | 正常なBiome JSON出力の場合 | RuleViolation配列が返される |
| IT-BA-084 | map | Biome JSON診断をRuleViolationに変換する | 複数診断を含むJSON出力の場合 | 全診断がRuleViolationに変換される |
| IT-BA-085 | map | Biome JSON診断をRuleViolationに変換する | 不正なJSON構造の場合 | エラーがスローされる |
| IT-BA-086 | map | Biome JSON診断をRuleViolationに変換する | 診断が空の場合 | 空配列が返される |
| IT-BA-087 | map | Biome JSON診断をRuleViolationに変換する | filePath/line/columnが含まれる診断の場合 | RuleViolationの位置情報が正しく設定される |
| IT-BA-088 | map | Biome JSON診断をRuleViolationに変換する | severity情報が含まれる診断の場合 | RuleViolationのseverityが正しく設定される |

### 4.8 RuleViolationCodeMapper (4ケース)

**テストファイル**: `infrastructure/rule-violation-code-mapper.test.ts`

**テスト方針**:
- 8ルール名とL1コードの対応表を検証する
- logical_design.md Section 2.2.10のerrorCode対応を正とする

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-089 | toErrorCode | ルール名をL1コードに変換する | require-unit-commentの場合 | L1-001が返される |
| IT-BA-090 | toErrorCode | ルール名をL1コードに変換する | 8ルール各々の場合 | L1-001〜L1-008が正しく返される |
| IT-BA-091 | toErrorCode | ルール名をL1コードに変換する | 未定義ルール名の場合 | エラーがスローされる |
| IT-BA-092 | toErrorCode | ルール名をL1コードに変換する | 空文字の場合 | エラーがスローされる |

### 4.9 SourceModuleSnapshotMapper (4ケース)

**テストファイル**: `infrastructure/source-module-snapshot-mapper.test.ts`

**テスト方針**:
- AST抽出結果からSourceModuleSnapshot VOへの正規化を検証する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-093 | map | AST抽出結果をSourceModuleSnapshotに変換する | 全属性が揃った抽出結果の場合 | 全フィールドが正しく設定されたSourceModuleSnapshotが返される |
| IT-BA-094 | map | AST抽出結果をSourceModuleSnapshotに変換する | declaredUnit/declaredLayerがnullの場合 | null値が保持されたSourceModuleSnapshotが返される |
| IT-BA-095 | map | AST抽出結果をSourceModuleSnapshotに変換する | 数値属性が0の場合 | 0値が正しく設定される |
| IT-BA-096 | map | AST抽出結果をSourceModuleSnapshotに変換する | 不正なdeclaredLayerが含まれる場合 | InvalidLayerNameErrorがスローされる |

### 4.10 UnitCommentParser (4ケース)

**テストファイル**: `infrastructure/unit-comment-parser.test.ts`

**テスト方針**:
- fixtureソースコードから`// @unit {unit}`の抽出を検証する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-097 | parse | ソースコードから@unitを抽出する | 正規コメント `// @unit biome-ast-engine` がある場合 | "biome-ast-engine"が抽出される |
| IT-BA-098 | parse | ソースコードから@unitを抽出する | @unitコメントがない場合 | nullが返される |
| IT-BA-099 | parse | ソースコードから@unitを抽出する | 不正なフォーマット `// @unit` の場合 | nullが返される |
| IT-BA-100 | parse | ソースコードから@unitを抽出する | 複数の@unitコメントがある場合 | 最初の値が抽出される |

### 4.11 LayerCommentParser (4ケース)

**テストファイル**: `infrastructure/layer-comment-parser.test.ts`

**テスト方針**:
- fixtureソースコードから`// @layer {layer}`の抽出を検証する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-101 | parse | ソースコードから@layerを抽出する | 正規コメント `// @layer domain` がある場合 | "domain"が抽出される |
| IT-BA-102 | parse | ソースコードから@layerを抽出する | @layerコメントがない場合 | nullが返される |
| IT-BA-103 | parse | ソースコードから@layerを抽出する | 不正なフォーマット `// @layer` の場合 | nullが返される |
| IT-BA-104 | parse | ソースコードから@layerを抽出する | v0語彙（port/usecase/controller）が指定された場合 | nullが返される |

### 4.12 CommentDensityParser (6ケース)

**テストファイル**: `infrastructure/comment-density-parser.test.ts`

**テスト方針**:
- fixtureソースコードからコメント密度と重複コメントブロック数を算出する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-105 | parse | コメント密度と重複ブロックを算出する | コメントが多いソースの場合 | 正しいcommentLineCountが返される |
| IT-BA-106 | parse | コメント密度と重複ブロックを算出する | コメントが多いソースの場合 | 正しいlogicalLineCountが返される |
| IT-BA-107 | parse | コメント密度と重複ブロックを算出する | 同一コメントが反復している場合 | repeatedCommentBlocksが正しく算出される |
| IT-BA-108 | parse | コメント密度と重複ブロックを算出する | コメントがないソースの場合 | commentLineCount=0が返される |
| IT-BA-109 | parse | コメント密度と重複ブロックを算出する | ブロックコメント（/* */）がある場合 | ブロックコメントの行数がカウントされる |
| IT-BA-110 | parse | コメント密度と重複ブロックを算出する | 空ファイルの場合 | commentLineCount=0, logicalLineCount=0が返される |

---

## 5. Presentationテストケース

> 3コンポーネント, 合計22ケース。

### 5.1 HarnessLintCommandHandler (10ケース)

**テストファイル**: `presentation/harness-lint-command-handler.test.ts`

**テスト方針**:
- UseCaseはvi.fn()でモック化し、CLIの入出力変換に集中する
- stdout/stderrをキャプチャして出力内容を検証する
- 終了コード（0/1/2）を分岐ごとに固定する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-111 | execute | phasegate:lintコマンドを実行する | 違反なし・ESLint残存なしの場合 | 終了コード0が返される |
| IT-BA-112 | execute | phasegate:lintコマンドを実行する | ルール違反がある場合 | 終了コード1が返される |
| IT-BA-113 | execute | phasegate:lintコマンドを実行する | ESLint残存がある場合 | 終了コード1が返される |
| IT-BA-114 | execute | phasegate:lintコマンドを実行する | 設定読取失敗の場合 | 終了コード2が返される |
| IT-BA-115 | execute | phasegate:lintコマンドを実行する | BiomeCLI実行失敗の場合 | 終了コード2が返される |
| IT-BA-116 | execute | phasegate:lintコマンドを実行する | --jsonフラグが指定された場合 | HarnessApiResponse形式のJSONが出力される |
| IT-BA-117 | execute | phasegate:lintコマンドを実行する | --targetフラグが指定された場合 | 対象ファイルが限定される |
| IT-BA-118 | execute | phasegate:lintコマンドを実行する | --skip-eslint-removal-checkが指定された場合 | VerifyEslintRemovalUseCaseが呼ばれない |
| IT-BA-119 | execute | phasegate:lintコマンドを実行する | 不正フラグが指定された場合 | Usageが出力され終了コード2が返される |
| IT-BA-120 | execute | phasegate:lintコマンドを実行する | 不正フラグが指定された場合 | UseCaseが呼び出されない |

### 5.2 LintCommandParser (6ケース)

**テストファイル**: `presentation/lint-command-parser.test.ts`

**テスト方針**:
- process.argvからの引数解釈を検証する
- 不正フラグはUsageエラーを返す

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-121 | parse | CLI引数を解釈する | 引数なしの場合 | 既定値（全体検査、テキスト出力、ESLint検査あり）が返される |
| IT-BA-122 | parse | CLI引数を解釈する | --jsonフラグが指定された場合 | json=trueが返される |
| IT-BA-123 | parse | CLI引数を解釈する | --target path1 path2が指定された場合 | targetsにpath1/path2が含まれる |
| IT-BA-124 | parse | CLI引数を解釈する | --skip-eslint-removal-checkが指定された場合 | skipEslintRemovalCheck=trueが返される |
| IT-BA-125 | parse | CLI引数を解釈する | 不正なフラグが指定された場合 | Usageエラーが返される |
| IT-BA-126 | parse | CLI引数を解釈する | 複数フラグを組み合わせた場合 | 全フラグが正しく解釈される |

### 5.3 LintCliPresenter (6ケース)

**テストファイル**: `presentation/lint-cli-presenter.test.ts`

**テスト方針**:
- `--json` 指定時はHarnessApiResponse envelopeの属性単位で比較する（snapshotは使わない）
- テキスト出力時は文字列に含まれるべきキーワードで検証する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-127 | format | 実行結果を出力文字列に変換する | テキスト出力で違反ありの場合 | 違反件数と代表違反が含まれる |
| IT-BA-128 | format | 実行結果を出力文字列に変換する | テキスト出力で違反なしの場合 | 成功メッセージが含まれる |
| IT-BA-129 | format | 実行結果を出力文字列に変換する | JSON出力の場合 | HarnessApiResponse envelopeが出力される |
| IT-BA-130 | format | 実行結果を出力文字列に変換する | JSON出力の場合 | status/errors/summary/dataの各属性が正しく設定される |
| IT-BA-131 | format | 実行結果を出力文字列に変換する | ESLint残存結果が含まれる場合 | 残存ファイル情報が出力に含まれる |
| IT-BA-132 | format | 実行結果を出力文字列に変換する | スキップルールがある場合 | スキップルール一覧が出力に含まれる |

---

## 5.5 RegisterRuleCatalogUseCase直接テスト (4ケース)

> QA-5によりUTに分類されているが、coverage_report.mdにて「UseCase単位の直接テストが存在しない」と指摘されたため、UseCase経路の自己診断としてITにも追加する。

**テストファイル**: `application/register-rule-catalog-usecase.test.ts`

**テストダブル方針**:
- `RuleDefinitionRegistry`: 実体を使用（モック禁止）
- Portモック不要（ドメインサービスのみ依存）

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-137 | execute | ルールカタログを登録する | 正常実行の場合 | 8件のRuleDefinitionが登録される |
| IT-BA-138 | execute | ルールカタログを登録する | 正常実行の場合 | 全ルールのerrorCodeが一意である |
| IT-BA-139 | execute | ルールカタログを登録する | 正常実行の場合 | ルール名昇順でソートされている |
| IT-BA-140 | execute | ルールカタログを登録する | 未知のルール名が混入した場合 | UnknownRuleNameErrorがスローされる |

## 5.6 CI統合テスト (6ケース)

> coverage_report.mdにて「CIパイプラインでのBiome lint + format実行確認」「CI上で8ルール有効化状態の統合確認」が未設計と指摘されたため追加する。

**テストファイル**: `integration/ci-pipeline-smoke.test.ts`

**テスト方針**:
- `phasegate:lint --json` コマンドをサブプロセスで実行し、出力のHarnessError形式準拠を検証する
- fixture workspaceを使用し、実Biome CLI + 実TypeScript Compiler APIで統合検証する
- CIパイプライン（aidlc-gate.yml相当）のlint + format実行フローを模擬する

| ID | target | describe | context | it |
|----|--------|----------|---------|-----|
| IT-BA-141 | phasegate:lint | CIパイプラインでBiome lint + formatを実行する | 正常なワークスペースの場合 | 終了コード0で完了する |
| IT-BA-142 | phasegate:lint | CIパイプラインでBiome lint + formatを実行する | 違反があるワークスペースの場合 | 終了コード1で完了しHarnessError形式のエラーが出力される |
| IT-BA-143 | phasegate:lint --json | CIパイプラインでJSON形式の出力を確認する | 正常実行の場合 | HarnessApiResponse envelopeが出力される |
| IT-BA-144 | phasegate:lint | CI上で8ルールすべてが有効化された状態を確認する | L1 enabled=trueで全ルールerrorの場合 | 8ルール全てがcheckedRulesに含まれる |
| IT-BA-145 | phasegate:lint | CI失敗時の出力がHarnessError形式に準拠する | ルール違反が検出された場合 | 出力にcode/severity/message/suggestionが含まれる |
| IT-BA-146 | phasegate:lint | CI上でBiome format checkを実行する | フォーマット不備があるファイルの場合 | フォーマット違反が報告される |

---

## 6. テスト環境設定

### 6.1 テストフレームワーク

| 項目 | 設定 |
|------|------|
| フレームワーク | Vitest 3.0.0 |
| 共有設定 | `scripts/harness/__tests__/vitest.config.ts` |
| ヘルパー | `scripts/harness/__tests__/helper/common-helper.ts`（target/contextエイリアス定義済み） |

### 6.2 外部依存

| 依存 | バージョン | 用途 | CI要件 |
|------|----------|------|--------|
| Biome CLI | package.json固定 | BiomeCliExecutorAdapter統合テスト | **必須**（QA-1） |
| TypeScript | `^5.0.0`（devDependencies） | TypeScriptSourceModuleAnalyzerAdapter統合テスト | 必須（QA-2） |

### 6.3 Fixture方針

| カテゴリ | 配置先 | 用途 |
|---------|--------|------|
| Application fixture | `fixtures/application/` | メタデータ欠落、レイヤー違反import、コメント過剰、重複コード等 |
| Infrastructure fixture | `fixtures/infrastructure/` | Biome JSON出力サンプル、ESLint依存package.json |
| Workspace fixture | `fixtures/workspace/` | ファイル列挙テスト、ESLint残存検出テスト |

- Fixture TSファイルは `__tests__/biome-ast-engine/fixtures/` に配置する（QA-3）
- 各テスト目的に応じた最小限のfixtureを用意する
- ESLint残存検出テスト用に `.eslintrc.cjs`, `eslint.config.js`, `package-with-eslint.json` を用意する
- Biome CLI統合テスト用に `biome-json-report.json`（正常JSON出力サンプル）を用意する
- 実プロジェクトディレクトリは使用しない

### 6.4 テストダブル方針

| 対象 | 方針 |
|------|------|
| Port（外部依存） | モック使用可。vi.fn()でスタブ化する |
| ドメイン実体（VO/サービス） | モック禁止。実体を使用する |
| RuleDefinitionRegistry | モック禁止。実体を使用する |
| ImportGraphBuilder | モック禁止。実体を使用する |
| LintRunner | モック禁止。実体を使用する |
| ClockPort | 固定値を返すスタブで時間依存を除去する |
| HarnessConfigProviderPort | スタブでHarnessConfigV2既定値を返す（QA-4） |
| Biome CLI | fixtureファイル + 実Biome CLI実行で検証（QA-1） |
| TypeScript Compiler API | fixture TSファイルで検証（QA-2） |
| ファイルシステム | fixture workspaceで検証。一時ディレクトリはfs.mkdtempSync() + cleanup |
| stdout/stderr | キャプチャして検証 |
| UseCase（Presentation層テスト） | vi.fn()でモック化し、CLIの入出力変換に集中する |

### 6.5 共通テスト構造規約

| 規約 | 内容 |
|------|------|
| AAAパターン | Arrange / Act / Assert のコメントで構造化する |
| テストケース名 | 全て日本語で記述する |
| 実行結果変数名 | `actual` に代入する（`result` は使用しない） |
| describe/it構造 | `target` / `describe` / `context` / `it` パターンに従う |
| ファイル名 | kebab-caseで統一する |
| テストケース名 | 実装の詳細を含めない |
| `--json`出力検証 | HarnessApiResponse envelopeの属性単位で比較する（snapshotは使わない） |

### 6.6 ケース数サマリー

| 層 | コンポーネント数 | ケース数 |
|----|---------------|---------|
| Application（UseCase） | 5 | 44 |
| Application（RegisterRuleCatalogUseCase直接テスト） | 1 | 4 |
| Infrastructure（Adapter） | 6 | 42 |
| Infrastructure（Mapper/Parser） | 6 | 24 |
| Presentation | 3 | 22 |
| CI統合テスト | 1 | 6 |
| **合計** | **22** | **142** |

> Phase 1計画の132ケースに対し、QA-5によるUT移動で-4、coverage_report.md指摘対応で+14（UseCase異常系+4, RegisterRuleCatalogUseCase+4, CI統合+6）、合計142ケースとなる。

### 6.7 前提条件

- `target` / `context` ヘルパーが `scripts/harness/__tests__/helper/common-helper.ts` に定義済みであること
- Biome CLIがテスト実行環境にインストール済みであること（Infrastructure層テスト）
- TypeScript Compiler APIが利用可能であること（Infrastructure層テスト）
- fixture workspaceが `__tests__/biome-ast-engine/fixtures/` に整備済みであること
- config-foundationの公開インターフェース（HarnessConfigV2型）がWave 1開始前に確定していること

### 6.8 リスク

| リスク | 影響 | 対策 |
|-------|------|------|
| Biome CLIのバージョンアップにより出力JSON構造が変更される | BiomeCliExecutorAdapter, BiomeDiagnosticMapperのテストが壊れる | Biomeバージョンをpackage.jsonで固定し、fixture JSONを対応バージョンで生成する |
| TypeScript Compiler APIの内部構造変更 | TypeScriptSourceModuleAnalyzerAdapterのテストが壊れる | TypeScriptバージョンをdevDependenciesで固定し、fixture TSファイルを対応バージョンで検証する |
| config-foundation Unitの実装遅延 | HarnessConfigProviderAdapterのテストが実行不可 | Port経由のインターフェースを使い、テスト時はスタブで既定値を返す（QA-4） |
| L1-006/L1-007/L1-008のルール名対応がintegration_contract.mdとlogical_design.mdで異なる | テストコードと契約文書の不整合 | logical_design.md Section 2.2.10のerrorCode対応表を正とする。実装時にintegration_contract.mdを修正する |
| ExecuteLintUseCaseの統合テストが複数のPort依存により複雑化する | テストのメンテナンスコスト増大 | 各Portのモックをファクトリ関数で共通化し、最小限のスタブで検証する |
