# ユニットテスト設計計画: biome-ast-engine

> **作成日**: 2026-03-13
> **対応ストーリー**: H01-01, H01-02, H01-03
> **正規ソース**: `docs/product/construction/biome-ast-engine/domain_model.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. スコープ

- 対象Unit: biome-ast-engine
- ドメインモデルに定義された値オブジェクト（13種）、ドメインサービス（3種）、ドメインエラー（7種）をユニットテストの対象とする
- 集約は存在しない（ステートレス解析ドメイン）
- Rust/WASMプラグインは対象外（pure TypeScript構成）

### テスト対象コンポーネント一覧

| 分類 | コンポーネント |
|------|-------------|
| 値オブジェクト | RuleName, RuleType, LayerName, FilePath, RequiredInput, ImportEdge, ImportCycle, LayerBoundary, SourceModuleSnapshot, RuleDefinition, RuleViolation, ImportGraph, LintReport |
| ドメインサービス | RuleDefinitionRegistry, ImportGraphBuilder, LintRunner |

---

## 2. テスト対象分析

### 集約

集約なし。biome-ast-engineはステートレスな解析ドメインであり、独立ライフサイクルを持つ集約は存在しない。

### エンティティ

エンティティなし。すべての概念は不変値オブジェクトとして設計されている。

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| RuleName | 2（許容値8種、未定義拒否） | 12 |
| RuleType | 2（BiomeNative/ExternalAnalyzer許容、RustPlugin拒否） | 8 |
| LayerName | 2（4層語彙許容、v0語彙拒否） | 10 |
| FilePath | 4（空文字、..始まり、絶対パス、Windows drive letter拒否） | 14 |
| RequiredInput | 1（4種の許容値） | 6 |
| ImportEdge | 2（from/to必須、importKind 3値） | 8 |
| ImportCycle | 1（2ノード未満拒否） | 6 |
| LayerBoundary | 2（sourceLayer/targetLayer必須、standardMatrix生成） | 10 |
| SourceModuleSnapshot | 4（件数系0以上、declaredLayerの正規値、hasUnitComment/hasLayerComment/anyRatio/commentDensity/belongsToLayerDirectory） | 16 |
| RuleDefinition | 4（errorCode範囲、enabled/disabled、withSeverity、usesInput） | 14 |
| RuleViolation | 3（line>=1、column>=1、message空不可） | 10 |
| ImportGraph | 5（rootNodes部分集合、重複除去、detectCycles、findLayerViolations、findGhostFiles） | 18 |
| LintReport | 3（durationMs>=0、scannedFiles>=0、hasErrors/errorCount/warningCount/violationCount） | 10 |

**値オブジェクト合計**: 約142ケース

### ドメインサービス

| サービス名 | メソッド数 | テストケース概算 |
|-----------|----------|---------------|
| RuleDefinitionRegistry | 3（getAll, resolveEnabled, getByName） | 18 |
| ImportGraphBuilder | 1（build） | 10 |
| LintRunner | 1（run） | 22 |

**ドメインサービス合計**: 約50ケース

---

## 3. テスト方針

### 3.1 正常系/異常系のバランス

- 値オブジェクトの生成テスト: 正常系1〜2ケース + 異常系（制約違反ごとに1ケース）
- ドメインサービス: 正常系を中心に、各ルールの違反/非違反の最小2ケース
- エラー型: 各ドメインエラーが適切に送出されることを異常系で確認

### 3.2 境界値テストの対象

| 対象 | 境界値 |
|------|--------|
| RuleName | 8種の正規値 + 未定義文字列 |
| FilePath | 空文字、`.`のみ、`..`始まり、`/`始まり、正常相対パス |
| RuleViolation.line / column | 0（拒否）、1（最小許容値） |
| LintReport.durationMs / scannedFiles | -1（拒否）、0（最小許容値） |
| ImportCycle.path | 1ノード（拒否）、2ノード（最小許容値） |
| SourceModuleSnapshot.anyTypeCount等 | -1（拒否）、0（最小許容値） |
| RuleDefinition.errorCode | L1-000（拒否）、L1-001（最小）、L1-008（最大）、L1-009（拒否） |
| ImportGraph.rootNodes | nodes外のrootNode（拒否） |

### 3.3 テスト構造規約

- **ドメイン実体のモック禁止**: 値オブジェクト・ドメインサービスの実体を使用する。モックは使わない
- **AAAパターン**: Arrange / Act / Assert のコメントで構造化する
- **テストケース名は日本語**: 仕様書として読める表現にする
- **実行結果はactualに代入する**
- **describe/it構造**: `target` / `describe` / `context` / `it` パターンに従う
- **ファイル名**: kebab-caseで統一（例: `rule-name.test.ts`）
- **実装の詳細をテストケース名に含めない**

### 3.4 テストファイル配置

```
scripts/harness/__tests__/biome-ast-engine/domain/
├── value-objects/
│   ├── rule-name.test.ts
│   ├── rule-type.test.ts
│   ├── layer-name.test.ts
│   ├── file-path.test.ts
│   ├── import-graph.test.ts
│   ├── import-edge.test.ts
│   ├── import-cycle.test.ts
│   ├── layer-boundary.test.ts
│   ├── lint-report.test.ts
│   ├── required-input.test.ts
│   ├── rule-definition.test.ts
│   ├── rule-violation.test.ts
│   └── source-module-snapshot.test.ts
├── import-graph-builder.test.ts
├── lint-runner.test.ts
└── rule-definition-registry.test.ts
```

### 3.5 値オブジェクト別テスト設計概要

#### RuleName

| target | describe | context | it |
|--------|----------|---------|-----|
| fromString | 定義済みルール名を受け取りRuleNameを生成する | 正規の8ルール名を指定した場合 | 対応するRuleNameが生成される |
| fromString | 定義済みルール名を受け取りRuleNameを生成する | 未定義のルール名を指定した場合 | InvalidRuleNameErrorがスローされる |
| equals | 同一ルール名の等価性を判定する | 同じルール名の場合 | trueを返す |
| equals | 同一ルール名の等価性を判定する | 異なるルール名の場合 | falseを返す |
| isMetadataRule | メタデータ関連ルールを判別する | require-unit-commentの場合 | trueを返す |
| isMetadataRule | メタデータ関連ルールを判別する | no-layer-violationの場合 | falseを返す |
| toString | ルール名の文字列表現を返す | require-unit-commentの場合 | "require-unit-comment"が返される |
| isImportGraphRule | importグラフ依存ルールを判別する | no-layer-violationの場合 | trueを返す |
| isImportGraphRule | importグラフ依存ルールを判別する | no-any-abuseの場合 | falseを返す |

#### RuleType

| target | describe | context | it |
|--------|----------|---------|-----|
| fromString | ルール実行経路を生成する | BiomeNativeを指定した場合 | BiomeNative型のRuleTypeが生成される |
| fromString | ルール実行経路を生成する | ExternalAnalyzerを指定した場合 | ExternalAnalyzer型のRuleTypeが生成される |
| fromString | ルール実行経路を生成する | RustPluginを指定した場合 | InvalidRuleTypeErrorがスローされる |
| isBiomeNative | 型判別メソッドの動作を検証する | BiomeNative型の場合 | trueを返す |
| isExternalAnalyzer | 型判別メソッドの動作を検証する | ExternalAnalyzer型の場合 | trueを返す |

#### LayerName

| target | describe | context | it |
|--------|----------|---------|-----|
| fromString | 正規レイヤー名を生成する | domain/application/infrastructure/presentationの場合 | 対応するLayerNameが生成される |
| fromString | 正規レイヤー名を生成する | v0語彙（port/usecase/controller）の場合 | InvalidLayerNameErrorがスローされる |
| canDependOn | レイヤー依存方向を検証する | domainがapplicationに依存する場合 | falseを返す（domainは外部に依存しない） |
| canDependOn | レイヤー依存方向を検証する | applicationがdomainに依存する場合 | trueを返す |
| canDependOn | レイヤー依存方向を検証する | infrastructureがdomainに依存する場合 | trueを返す |
| canDependOn | レイヤー依存方向を検証する | infrastructureがpresentationに依存する場合 | falseを返す |
| toPathSegment | レイヤー名をパスセグメントとして返す | domainの場合 | "domain"が返される |

#### FilePath

| target | describe | context | it |
|--------|----------|---------|-----|
| fromWorkspaceRelative | プロジェクト相対パスを生成する | 正常な相対パスの場合 | FilePathが生成される |
| fromWorkspaceRelative | プロジェクト相対パスを生成する | 空文字の場合 | InvalidFilePathErrorがスローされる |
| fromWorkspaceRelative | プロジェクト相対パスを生成する | ..始まりの場合 | InvalidFilePathErrorがスローされる |
| fromWorkspaceRelative | プロジェクト相対パスを生成する | 絶対パスの場合 | InvalidFilePathErrorがスローされる |
| fromWorkspaceRelative | プロジェクト相対パスを生成する | Windows drive letterの場合 | InvalidFilePathErrorがスローされる |
| segments | パスセグメントを返す | 複数階層のパスの場合 | セグメント配列が正しく返される |
| fileName | ファイル名を返す | パスの場合 | 末尾のファイル名が返される |
| extension | 拡張子を返す | .tsファイルの場合 | tsが返される |
| startsWith | パスが指定セグメントで始まるかを判定する | 一致するセグメントの場合 | trueを返す |
| startsWith | パスが指定セグメントで始まるかを判定する | 一致しないセグメントの場合 | falseを返す |
| parent | 親ディレクトリのパスを返す | 複数階層のパスの場合 | 親ディレクトリが返される |

#### ImportGraph

| target | describe | context | it |
|--------|----------|---------|-----|
| create | ImportGraphを生成する | 正常なノードとエッジの場合 | ImportGraphが生成される |
| create | ImportGraphを生成する | rootNodesがnodesの部分集合でない場合 | エラーがスローされる |
| create | ImportGraphを生成する | 重複ノードが含まれる場合 | 重複が除去されて生成される |
| detectCycles | 循環依存を検出する | 循環が存在する場合 | ImportCycleの配列が返される |
| detectCycles | 循環依存を検出する | 循環が存在しない場合 | 空配列が返される |
| findLayerViolations | レイヤー違反を検出する | 禁止方向のimportが存在する場合 | 違反エッジの配列が返される |
| findLayerViolations | レイヤー違反を検出する | 許可方向のimportのみの場合 | 空配列が返される |
| findGhostFiles | 未参照ファイルを検出する | importされていないファイルがある場合 | ゴーストファイルの配列が返される |
| findGhostFiles | 未参照ファイルを検出する | ignorePatterns対象のファイルの場合 | 除外されて返されない |
| incomingCount | 被参照数を返す | 複数のファイルから参照されている場合 | 正しいカウントが返される |
| outgoingEdgesOf | 指定ファイルからの出力エッジを返す | 出力エッジが存在する場合 | 対応するImportEdge配列が返される |
| outgoingEdgesOf | 指定ファイルからの出力エッジを返す | 出力エッジが存在しない場合 | 空配列が返される |

#### SourceModuleSnapshot

| target | describe | context | it |
|--------|----------|---------|-----|
| create | スナップショットを生成する | 正常な属性値の場合 | SourceModuleSnapshotが生成される |
| create | スナップショットを生成する | 件数系属性が負数の場合 | エラーがスローされる |
| create | スナップショットを生成する | declaredLayerが不正な値の場合 | エラーがスローされる |
| hasUnitComment | @unitコメントの有無を返す | declaredUnitがnullの場合 | falseを返す |
| hasUnitComment | @unitコメントの有無を返す | declaredUnitが設定されている場合 | trueを返す |
| hasLayerComment | @layerコメントの有無を返す | declaredLayerがnullの場合 | falseを返す |
| anyRatio | any型の使用比率を返す | anyTypeCountとtypedNodeCountが設定されている場合 | 正しい比率が返される |
| commentDensity | コメント密度を返す | commentLineCountとlogicalLineCountが設定されている場合 | 正しい密度が返される |

#### RuleDefinition

| target | describe | context | it |
|--------|----------|---------|-----|
| create | ルール定義を生成する | 正常な属性値の場合 | RuleDefinitionが生成される |
| create | ルール定義を生成する | errorCodeがL1-001〜L1-008の範囲外の場合 | エラーがスローされる |
| withSeverity | severityを変更した新しいRuleDefinitionを返す | warningに変更した場合 | severity=warningの新インスタンスが返される |
| disable | 無効化した新しいRuleDefinitionを返す | 有効なルールを無効化した場合 | enabled=falseの新インスタンスが返される |
| usesInput | 必要な入力種別を判定する | 対応するRequiredInputの場合 | trueを返す |
| isEnabled | 有効/無効を返す | enabled=trueの場合 | trueを返す |
| equals | 等価性を判定する | 同一属性のRuleDefinitionの場合 | trueを返す |

#### RuleViolation

| target | describe | context | it |
|--------|----------|---------|-----|
| create | 違反情報を生成する | 正常な属性値の場合 | RuleViolationが生成される |
| create | 違反情報を生成する | lineが0の場合 | エラーがスローされる |
| create | 違反情報を生成する | columnが0の場合 | エラーがスローされる |
| create | 違反情報を生成する | messageが空文字の場合 | エラーがスローされる |
| withFixExample | 修正例を追加した新インスタンスを返す | fixExampleを指定した場合 | fixExampleが設定された新インスタンスが返される |
| toContract | 契約形式に変換する | fixExampleがある場合 | fix_exampleを含むオブジェクトが返される |
| equals | 等価性を判定する | 同一属性のRuleViolationの場合 | trueを返す |
| equals | 等価性を判定する | 異なる属性のRuleViolationの場合 | falseを返す |
| toContract | 契約形式に変換する | fixExampleがない場合 | fix_exampleを含まないオブジェクトが返される |

#### LintReport

| target | describe | context | it |
|--------|----------|---------|-----|
| create | レポートを生成する | 正常な属性値の場合 | LintReportが生成される |
| create | レポートを生成する | durationMsが負数の場合 | エラーがスローされる |
| create | レポートを生成する | scannedFilesが負数の場合 | エラーがスローされる |
| hasErrors | エラーの存在を判定する | severity=errorの違反がある場合 | trueを返す |
| hasErrors | エラーの存在を判定する | severity=warningの違反のみの場合 | falseを返す |
| errorCount | エラー件数を返す | error2件warning1件の場合 | 2が返される |
| warningCount | warning件数を返す | error2件warning1件の場合 | 1が返される |
| warningCount | warning件数を返す | warningの違反がない場合 | 0が返される |
| violationCount | 全違反件数を返す | error2件warning1件の場合 | 3が返される |

#### RequiredInput

| target | describe | context | it |
|--------|----------|---------|-----|
| fromString | ルール評価に必要な入力種別を生成する | "source-module-snapshots"を指定した場合 | 対応するRequiredInputが生成される |
| fromString | ルール評価に必要な入力種別を生成する | "import-graph"を指定した場合 | 対応するRequiredInputが生成される |
| fromString | ルール評価に必要な入力種別を生成する | "biome-diagnostics"を指定した場合 | 対応するRequiredInputが生成される |
| fromString | ルール評価に必要な入力種別を生成する | "workspace-inventory"を指定した場合 | 対応するRequiredInputが生成される |
| fromString | ルール評価に必要な入力種別を生成する | 未定義の入力種別を指定した場合 | エラーがスローされる |
| equals | 同一入力種別の等価性を判定する | 同じ入力種別の場合 | trueを返す |

#### ImportEdge

| target | describe | context | it |
|--------|----------|---------|-----|
| create | import辺を生成する | 正常なfrom/to/importKindの場合 | ImportEdgeが生成される |
| create | import辺を生成する | importKindが"value"の場合 | value型のImportEdgeが生成される |
| create | import辺を生成する | importKindが"type"の場合 | type型のImportEdgeが生成される |
| create | import辺を生成する | importKindが"dynamic"の場合 | dynamic型のImportEdgeが生成される |
| equals | 等価性を判定する | 同一属性のImportEdgeの場合 | trueを返す |
| equals | 等価性を判定する | 異なる属性のImportEdgeの場合 | falseを返す |
| isTypeOnly | type-only importを判別する | importKindが"type"の場合 | trueを返す |
| isTypeOnly | type-only importを判別する | importKindが"value"の場合 | falseを返す |
| touches | 指定ファイルがエッジに含まれるかを判定する | fromが一致する場合 | trueを返す |
| touches | 指定ファイルがエッジに含まれるかを判定する | toが一致する場合 | trueを返す |
| touches | 指定ファイルがエッジに含まれるかを判定する | from/toどちらにも一致しない場合 | falseを返す |

#### ImportCycle

| target | describe | context | it |
|--------|----------|---------|-----|
| create | 循環経路を生成する | 2ノード以上のパスの場合 | ImportCycleが生成される |
| create | 循環経路を生成する | 1ノードのパスの場合 | InvalidImportCycleErrorがスローされる |
| create | 循環経路を生成する | 空のパスの場合 | InvalidImportCycleErrorがスローされる |
| includes | 指定ファイルが循環経路に含まれるかを判定する | 経路に含まれるファイルの場合 | trueを返す |
| includes | 指定ファイルが循環経路に含まれるかを判定する | 経路に含まれないファイルの場合 | falseを返す |
| firstEdge | 循環経路の最初のエッジを返す | 3ノードの循環の場合 | 最初の2ノードのタプルが返される |

### 3.6 ドメインサービス別テスト設計概要

#### RuleDefinitionRegistry

| target | describe | context | it |
|--------|----------|---------|-----|
| getAll | 全ルール定義を返す | — | 8件のRuleDefinitionが返される |
| getAll | 全ルール定義を返す | — | ルール名昇順でソートされている |
| getAll | 全ルール定義を返す | — | 全ルールのerrorCodeが一意である |
| resolveEnabled | L1設定に基づき有効ルールを解決する | l1Enabled=falseの場合 | 全ルールがskippedRulesに含まれる |
| resolveEnabled | L1設定に基づき有効ルールを解決する | 全ルールがerrorの場合 | 8件全てがenabledRulesに含まれる |
| resolveEnabled | L1設定に基づき有効ルールを解決する | 特定ルールがoffの場合 | そのルールがskippedRulesに含まれる |
| resolveEnabled | L1設定に基づき有効ルールを解決する | 特定ルールがwarningの場合 | そのルールのseverityがwarningになる |
| resolveEnabled | L1設定に基づき有効ルールを解決する | 未定義のルール名が設定にある場合 | UnknownRuleNameErrorがスローされる |
| resolveEnabled | L1設定に基づき有効ルールを解決する | 不正なseverity値が設定にある場合 | InvalidRuleSeverityErrorがスローされる |
| getByName | 指定ルール名のRuleDefinitionを返す | 存在するルール名の場合 | 対応するRuleDefinitionが返される |
| getByName | 指定ルール名のRuleDefinitionを返す | 存在しないルール名の場合 | UnknownRuleNameErrorがスローされる |

#### ImportGraphBuilder

| target | describe | context | it |
|--------|----------|---------|-----|
| build | スナップショット群からImportGraphを構築する | 正常なスナップショット群の場合 | ノードとエッジが正しく構築される |
| build | スナップショット群からImportGraphを構築する | isEntrypointCandidate=trueのファイルがある場合 | rootNodesに含まれる |
| build | スナップショット群からImportGraphを構築する | index.tsファイルがある場合 | rootNodesに既定で含まれる |
| build | スナップショット群からImportGraphを構築する | presentation/cli配下のファイルがある場合 | rootNodesに既定で含まれる |
| build | スナップショット群からImportGraphを構築する | 重複importがある場合 | エッジが重複除去される |
| build | スナップショット群からImportGraphを構築する | 空のスナップショット配列の場合 | 空のImportGraphが返される |

#### LintRunner

| target | describe | context | it |
|--------|----------|---------|-----|
| run | 8ルールの違反判定を実行する | require-unit-comment: declaredUnitがnullの場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | require-unit-comment: declaredUnitが設定されている場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | require-layer-comment: declaredLayerがnullの場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | require-layer-comment: declaredLayerが設定されている場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | no-layer-violation: レイヤー違反importがある場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | no-layer-violation: 正規の依存方向のみの場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | enforce-folder-structure: declaredLayerとディレクトリが不一致の場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | enforce-folder-structure: declaredLayerとディレクトリが一致する場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | no-any-abuse: anyTypeCountが閾値超過の場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | no-any-abuse: anyTypeCountが閾値内の場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | no-code-duplication: 同一fingerprintがminOccurrences以上の場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | no-code-duplication: 重複がない場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | no-ghost-file: importされていないファイルがある場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | no-ghost-file: 全ファイルが参照されている場合 | 違反が報告されない |
| run | 8ルールの違反判定を実行する | no-comment-flood: commentDensityが閾値超過の場合 | 違反が報告される |
| run | 8ルールの違反判定を実行する | no-comment-flood: commentDensityが閾値内の場合 | 違反が報告されない |
| run | LintReportを構築する | 違反ゼロのルールがある場合 | passedRulesに含まれる |
| run | LintReportを構築する | — | passedRulesとskippedRulesが排他的である |
| run | LintReportを構築する | — | 全violationsのruleNameがRuleDefinitionRegistryに登録済みである |

---

## 4. QA（不明点・確認事項）

| # | 質問 | 影響範囲 |
|---|------|---------|
| QA-1 | SourceModuleSnapshot.anyRatio()でtypedNodeCountが0の場合、ゼロ除算をどう扱うか（0を返す or エラー） | SourceModuleSnapshot テスト |

[Answer] 0を返す。空ファイルやtype-onlyファイルは正当なケースであり、エラーにすべきでない。`typedNodeCount === 0` の場合は `anyRatio() === 0` とする。テストにはゼロ除算ケースを含める。

| QA-2 | SourceModuleSnapshot.commentDensity()でlogicalLineCountが0の場合、ゼロ除算をどう扱うか | SourceModuleSnapshot テスト |

[Answer] 0を返す。QA-1と同じ理由。`logicalLineCount === 0` の場合は `commentDensity() === 0` とする。

| QA-3 | ImportGraph.detectCycles()の自己循環（from === to）は単独でImportCycleとして報告するか | ImportGraph / ImportEdge テスト |

[Answer] 報告する。自己循環はimportの構造的な問題を示す可能性があり、検出すべきである。`ImportCycle` のメンバーが1つのケースとしてテストに含める。

| QA-4 | LintRunner.run()に未知のRuleNameが渡された場合のUnknownRuleNameErrorは、ルール評価前に検証するか評価中に検証するか | LintRunner テスト |

[Answer] ルール評価前（run()メソッドの冒頭）に検証する。Fail-fast原則に従い、不正な入力は早期に検出する。テストではrun()呼び出し直後にエラーがthrowされることを検証する。

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワーク: Vitest 3.0.0（共有設定 `scripts/harness/__tests__/vitest.config.ts`）
- `target` / `context` ヘルパーが `scripts/harness/__tests__/helper/common-helper.ts` に定義済みであること
- domain層テストではモック不使用。すべて実体の値オブジェクトとドメインサービスを使用する
- Shared Kernel型（HarnessError、HarnessConfigV2）のインターフェースがWave 1開始前に確定していること

### リスク

| リスク | 影響 | 対策 |
|-------|------|------|
| domain_model.mdのOpen Questions（OQ-1, OQ-2）が未解決のまま実装に入る | RuleDefinition.configの型テスト、ImportGraphBuilderの対象範囲テストが不安定になる | 論理設計で決定済みの仕様（Record<string, unknown>、targets引数）に従い、OQ解決時に追加テストを検討する |
| LintRunnerの8ルール評価ロジックが複雑で、テストケースの網羅に漏れが生じる | 特定ルールの境界条件テスト不足 | 各ルールごとに最低「違反する」「違反しない」の2ケースを必須とし、回帰テストとして固定する |
| ImportGraph.detectCycles()のアルゴリズム選択がテストの前提に影響する | 循環検出の結果順序がテストで固定しにくい | 結果の順序に依存しないテスト（セット比較）を採用する |
