# ユニットテスト設計: biome-ast-engine

@story-id H01-01
@story-id H01-02
@story-id H01-03
@work-item-id WI-024
> **作成日**: 2026-03-13
> **フェーズ**: Phase 2（構築）
> **対応ストーリー**: H01-01, H01-02, H01-03
> **正規ソース**: `docs/product/construction/biome-ast-engine/domain_model.md`, `docs/product/construction/biome-ast-engine/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`
> **Phase 1計画書**: `docs/inception/biome-ast-engine/unit_test_design_plan.md`

---

## 1. 対象ドメインモデル

### 1.1 テスト対象サマリ

biome-ast-engineはステートレスな解析ドメインであり、集約・エンティティは存在しない。テスト対象は値オブジェクト13種、ドメインサービス3種、ドメインエラー7種である。

| 分類 | コンポーネント | テストケース数 |
|------|-------------|-------------|
| 値オブジェクト（13種） | RuleName, RuleType, LayerName, FilePath, RequiredInput, ImportEdge, ImportCycle, LayerBoundary, SourceModuleSnapshot, RuleDefinition, RuleViolation, ImportGraph, LintReport | 147 |
| ドメインサービス（3種） | RuleDefinitionRegistry, ImportGraphBuilder, LintRunner | 64 |
| **合計** | | **211** |

### 1.2 テスト対象外

- Rust/WASMプラグイン（H01スコープ外、pure TypeScript構成）
- Application層UseCase（別途IT設計）。ただしRegisterRuleCatalogUseCaseはQA-5回答に基づきUTに分類（Portモック不要、ドメインサービスのみ依存のため）。本UT設計ではRuleDefinitionRegistryのテスト（UT-BA-143〜160）で間接的にカバーする
- Infrastructure層アダプター（別途IT設計）
- Presentation層（別途IT設計）

### 1.3 QA回答の反映

| # | 質問 | 回答 | 反映先 |
|---|------|------|--------|
| QA-1 | `anyRatio()`で`typedNodeCount`が0の場合 | 0を返す（ゼロ除算はエラーにしない） | UT-BA-093 |
| QA-2 | `commentDensity()`で`logicalLineCount`が0の場合 | 0を返す（QA-1と同様） | UT-BA-095 |
| QA-3 | 自己循環（from === to）の扱い | ImportCycleとして報告する（メンバー1つ） | UT-BA-126 |
| QA-4 | `LintRunner.run()`への未知RuleNameの検証タイミング | run()メソッド冒頭でfail-fast（評価前に検証） | UT-BA-192 |

---

## 2. テストファイル構成

### 2.1 ディレクトリ配置

```
scripts/harness/__tests__/unit/biome-ast-engine/
├── value-objects/
│   ├── rule-name.test.ts
│   ├── rule-type.test.ts
│   ├── layer-name.test.ts
│   ├── file-path.test.ts
│   ├── required-input.test.ts
│   ├── import-edge.test.ts
│   ├── import-cycle.test.ts
│   ├── layer-boundary.test.ts
│   ├── source-module-snapshot.test.ts
│   ├── rule-definition.test.ts
│   ├── rule-violation.test.ts
│   ├── import-graph.test.ts
│   └── lint-report.test.ts
├── import-graph-builder.test.ts
├── lint-runner.test.ts
└── rule-definition-registry.test.ts
```

### 2.2 命名規約

- ファイル名: kebab-case（例: `rule-name.test.ts`）
- テストケース名: 日本語
- 実行結果変数: `actual`
- 構造: `target` / `describe` / `context` / `it`
- パターン: AAA（Arrange / Act / Assert）

### 2.3 テストダブル方針

ドメイン層テストではモック禁止。すべて実体の値オブジェクトとドメインサービスを使用する。

---

## 3. 値オブジェクトテストケース

### 3.1 RuleName（12ケース）

テストファイル: `value-objects/rule-name.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-001 | fromString | 定義済みルール名を受け取りRuleNameを生成する | "require-unit-comment"を指定した場合 | 対応するRuleNameが生成される |
| UT-BA-002 | fromString | 定義済みルール名を受け取りRuleNameを生成する | "require-layer-comment"を指定した場合 | 対応するRuleNameが生成される |
| UT-BA-003 | fromString | 定義済みルール名を受け取りRuleNameを生成する | "no-layer-violation"を指定した場合 | 対応するRuleNameが生成される |
| UT-BA-004 | fromString | 定義済みルール名を受け取りRuleNameを生成する | "enforce-folder-structure"を指定した場合 | 対応するRuleNameが生成される |
| UT-BA-005 | fromString | 定義済みルール名を受け取りRuleNameを生成する | "no-any-abuse"を指定した場合 | 対応するRuleNameが生成される |
| UT-BA-006 | fromString | 定義済みルール名を受け取りRuleNameを生成する | 未定義のルール名を指定した場合 | InvalidRuleNameErrorがスローされる |
| UT-BA-007 | equals | 同一ルール名の等価性を判定する | 同じルール名の場合 | trueを返す |
| UT-BA-008 | equals | 同一ルール名の等価性を判定する | 異なるルール名の場合 | falseを返す |
| UT-BA-009 | isMetadataRule | メタデータ関連ルールを判別する | require-unit-commentの場合 | trueを返す |
| UT-BA-010 | isMetadataRule | メタデータ関連ルールを判別する | no-layer-violationの場合 | falseを返す |
| UT-BA-011 | toString | ルール名の文字列表現を返す | require-unit-commentの場合 | "require-unit-comment"が返される |
| UT-BA-012 | isImportGraphRule | importグラフ依存ルールを判別する | no-layer-violationの場合 | trueを返す |

### 3.2 RuleType（8ケース）

テストファイル: `value-objects/rule-type.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-013 | fromString | ルール実行経路を生成する | "BiomeNative"を指定した場合 | BiomeNative型のRuleTypeが生成される |
| UT-BA-014 | fromString | ルール実行経路を生成する | "ExternalAnalyzer"を指定した場合 | ExternalAnalyzer型のRuleTypeが生成される |
| UT-BA-015 | fromString | ルール実行経路を生成する | "RustPlugin"を指定した場合 | InvalidRuleTypeErrorがスローされる |
| UT-BA-016 | fromString | ルール実行経路を生成する | 未定義の実行経路を指定した場合 | InvalidRuleTypeErrorがスローされる |
| UT-BA-017 | isBiomeNative | 型判別メソッドの動作を検証する | BiomeNative型の場合 | trueを返す |
| UT-BA-018 | isBiomeNative | 型判別メソッドの動作を検証する | ExternalAnalyzer型の場合 | falseを返す |
| UT-BA-019 | isExternalAnalyzer | 型判別メソッドの動作を検証する | ExternalAnalyzer型の場合 | trueを返す |
| UT-BA-020 | equals | 同一実行経路の等価性を判定する | 同じRuleTypeの場合 | trueを返す |

### 3.3 LayerName（10ケース）

テストファイル: `value-objects/layer-name.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-021 | fromString | 正規レイヤー名を生成する | "domain"を指定した場合 | 対応するLayerNameが生成される |
| UT-BA-022 | fromString | 正規レイヤー名を生成する | "application"を指定した場合 | 対応するLayerNameが生成される |
| UT-BA-023 | fromString | 正規レイヤー名を生成する | "infrastructure"を指定した場合 | 対応するLayerNameが生成される |
| UT-BA-024 | fromString | 正規レイヤー名を生成する | "presentation"を指定した場合 | 対応するLayerNameが生成される |
| UT-BA-025 | fromString | 正規レイヤー名を生成する | v0語彙"port"を指定した場合 | InvalidLayerNameErrorがスローされる |
| UT-BA-026 | fromString | 正規レイヤー名を生成する | v0語彙"usecase"を指定した場合 | InvalidLayerNameErrorがスローされる |
| UT-BA-027 | fromString | 正規レイヤー名を生成する | v0語彙"controller"を指定した場合 | InvalidLayerNameErrorがスローされる |
| UT-BA-028 | canDependOn | レイヤー依存方向を検証する | domainがapplicationに依存する場合 | falseを返す |
| UT-BA-029 | canDependOn | レイヤー依存方向を検証する | applicationがdomainに依存する場合 | trueを返す |
| UT-BA-030 | toPathSegment | レイヤー名をパスセグメントとして返す | domainの場合 | "domain"が返される |

### 3.4 FilePath（14ケース）

テストファイル: `value-objects/file-path.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-031 | fromWorkspaceRelative | プロジェクト相対パスを生成する | 正常な相対パスの場合 | FilePathが生成される |
| UT-BA-032 | fromWorkspaceRelative | プロジェクト相対パスを生成する | 空文字の場合 | InvalidFilePathErrorがスローされる |
| UT-BA-033 | fromWorkspaceRelative | プロジェクト相対パスを生成する | ".."始まりの場合 | InvalidFilePathErrorがスローされる |
| UT-BA-034 | fromWorkspaceRelative | プロジェクト相対パスを生成する | 絶対パスの場合 | InvalidFilePathErrorがスローされる |
| UT-BA-035 | fromWorkspaceRelative | プロジェクト相対パスを生成する | Windows drive letterの場合 | InvalidFilePathErrorがスローされる |
| UT-BA-036 | fromWorkspaceRelative | プロジェクト相対パスを生成する | "."のみの場合 | InvalidFilePathErrorがスローされる |
| UT-BA-037 | segments | パスセグメントを返す | 複数階層のパスの場合 | セグメント配列が正しく返される |
| UT-BA-038 | segments | パスセグメントを返す | 単一ファイル名の場合 | 1要素の配列が返される |
| UT-BA-039 | fileName | ファイル名を返す | 複数階層のパスの場合 | 末尾のファイル名が返される |
| UT-BA-040 | extension | 拡張子を返す | .tsファイルの場合 | "ts"が返される |
| UT-BA-041 | extension | 拡張子を返す | .test.tsファイルの場合 | "ts"が返される |
| UT-BA-042 | startsWith | パスが指定セグメントで始まるかを判定する | 一致するセグメントの場合 | trueを返す |
| UT-BA-043 | startsWith | パスが指定セグメントで始まるかを判定する | 一致しないセグメントの場合 | falseを返す |
| UT-BA-044 | parent | 親ディレクトリのパスを返す | 複数階層のパスの場合 | 親ディレクトリが返される |

### 3.5 RequiredInput（6ケース）

テストファイル: `value-objects/required-input.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-045 | fromString | ルール評価に必要な入力種別を生成する | "source-module-snapshots"を指定した場合 | 対応するRequiredInputが生成される |
| UT-BA-046 | fromString | ルール評価に必要な入力種別を生成する | "import-graph"を指定した場合 | 対応するRequiredInputが生成される |
| UT-BA-047 | fromString | ルール評価に必要な入力種別を生成する | "biome-diagnostics"を指定した場合 | 対応するRequiredInputが生成される |
| UT-BA-048 | fromString | ルール評価に必要な入力種別を生成する | "workspace-inventory"を指定した場合 | 対応するRequiredInputが生成される |
| UT-BA-049 | fromString | ルール評価に必要な入力種別を生成する | 未定義の入力種別を指定した場合 | エラーがスローされる |
| UT-BA-050 | equals | 同一入力種別の等価性を判定する | 同じ入力種別の場合 | trueを返す |

### 3.6 ImportEdge（8ケース）

テストファイル: `value-objects/import-edge.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-051 | create | import辺を生成する | 正常なfrom/toとimportKind"value"の場合 | value型のImportEdgeが生成される |
| UT-BA-052 | create | import辺を生成する | importKindが"type"の場合 | type型のImportEdgeが生成される |
| UT-BA-053 | create | import辺を生成する | importKindが"dynamic"の場合 | dynamic型のImportEdgeが生成される |
| UT-BA-054 | equals | 等価性を判定する | 同一属性のImportEdgeの場合 | trueを返す |
| UT-BA-055 | equals | 等価性を判定する | 異なる属性のImportEdgeの場合 | falseを返す |
| UT-BA-056 | isTypeOnly | type-only importを判別する | importKindが"type"の場合 | trueを返す |
| UT-BA-057 | isTypeOnly | type-only importを判別する | importKindが"value"の場合 | falseを返す |
| UT-BA-058 | touches | 指定ファイルがエッジに含まれるかを判定する | fromが一致する場合 | trueを返す |

### 3.7 ImportCycle（6ケース）

テストファイル: `value-objects/import-cycle.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-059 | create | 循環経路を生成する | 2ノード以上のパスの場合 | ImportCycleが生成される |
| UT-BA-060 | create | 循環経路を生成する | 1ノードのパスの場合 | InvalidImportCycleErrorがスローされる |
| UT-BA-061 | create | 循環経路を生成する | 空のパスの場合 | InvalidImportCycleErrorがスローされる |
| UT-BA-062 | includes | 指定ファイルが循環経路に含まれるかを判定する | 経路に含まれるファイルの場合 | trueを返す |
| UT-BA-063 | includes | 指定ファイルが循環経路に含まれるかを判定する | 経路に含まれないファイルの場合 | falseを返す |
| UT-BA-064 | firstEdge | 循環経路の最初のエッジを返す | 3ノードの循環の場合 | 最初の2ノードのタプルが返される |

### 3.8 LayerBoundary（10ケース）

テストファイル: `value-objects/layer-boundary.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-065 | create | レイヤー境界を生成する | 正常なsourceLayer/targetLayer/allowedの場合 | LayerBoundaryが生成される |
| UT-BA-066 | create | レイヤー境界を生成する | sourceLayerとtargetLayerが同一の場合 | LayerBoundaryが生成される |
| UT-BA-067 | standardMatrix | 正規依存行列を生成する | — | 横断契約に準拠した行列が返される |
| UT-BA-068 | standardMatrix | 正規依存行列を生成する | — | domainからの外向き依存がすべてallowed=falseである |
| UT-BA-069 | standardMatrix | 正規依存行列を生成する | — | applicationからdomainへの依存がallowed=trueである |
| UT-BA-070 | standardMatrix | 正規依存行列を生成する | — | infrastructureからdomainへの依存がallowed=trueである |
| UT-BA-071 | standardMatrix | 正規依存行列を生成する | — | infrastructureからpresentationへの依存がallowed=falseである |
| UT-BA-072 | allows | 依存方向の許可を判定する | 許可された依存方向の場合 | trueを返す |
| UT-BA-073 | allows | 依存方向の許可を判定する | 禁止された依存方向の場合 | falseを返す |
| UT-BA-074 | equals | 等価性を判定する | 同一属性のLayerBoundaryの場合 | trueを返す |

### 3.9 SourceModuleSnapshot（16ケース）

テストファイル: `value-objects/source-module-snapshot.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-075 | create | スナップショットを生成する | 正常な属性値の場合 | SourceModuleSnapshotが生成される |
| UT-BA-076 | create | スナップショットを生成する | anyTypeCountが負数の場合 | エラーがスローされる |
| UT-BA-077 | create | スナップショットを生成する | typedNodeCountが負数の場合 | エラーがスローされる |
| UT-BA-078 | create | スナップショットを生成する | commentLineCountが負数の場合 | エラーがスローされる |
| UT-BA-079 | create | スナップショットを生成する | logicalLineCountが負数の場合 | エラーがスローされる |
| UT-BA-080 | create | スナップショットを生成する | repeatedCommentBlocksが負数の場合 | エラーがスローされる |
| UT-BA-081 | create | スナップショットを生成する | declaredLayerが不正な値の場合 | エラーがスローされる |
| UT-BA-082 | create | スナップショットを生成する | declaredLayerがnullの場合 | SourceModuleSnapshotが生成される |
| UT-BA-083 | create | スナップショットを生成する | 件数系属性がすべて0の場合 | SourceModuleSnapshotが生成される |
| UT-BA-084 | hasUnitComment | @unitコメントの有無を返す | declaredUnitがnullの場合 | falseを返す |
| UT-BA-085 | hasUnitComment | @unitコメントの有無を返す | declaredUnitが設定されている場合 | trueを返す |
| UT-BA-086 | hasLayerComment | @layerコメントの有無を返す | declaredLayerがnullの場合 | falseを返す |
| UT-BA-087 | hasLayerComment | @layerコメントの有無を返す | declaredLayerが設定されている場合 | trueを返す |
| UT-BA-088 | anyRatio | any型の使用比率を返す | anyTypeCount=3, typedNodeCount=10の場合 | 0.3が返される |
| UT-BA-089 | commentDensity | コメント密度を返す | commentLineCount=5, logicalLineCount=20の場合 | 0.25が返される |
| UT-BA-090 | belongsToLayerDirectory | レイヤーディレクトリへの所属を判定する | filePathにdeclaredLayerと一致するセグメントがある場合 | trueを返す |
| UT-BA-193 | anyRatio | any型の使用比率を返す | typedNodeCount=0の場合 | 0が返される（ゼロ除算ガード） |
| UT-BA-194 | commentDensity | コメント密度を返す | logicalLineCount=0の場合 | 0が返される（ゼロ除算ガード） |

### 3.10 RuleDefinition（14ケース）

テストファイル: `value-objects/rule-definition.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-091 | create | ルール定義を生成する | 正常な属性値の場合 | RuleDefinitionが生成される |
| UT-BA-092 | create | ルール定義を生成する | errorCodeが"L1-001"の場合 | RuleDefinitionが生成される |
| UT-BA-093 | create | ルール定義を生成する | errorCodeが"L1-008"の場合 | RuleDefinitionが生成される |
| UT-BA-094 | create | ルール定義を生成する | errorCodeが"L1-000"の場合 | エラーがスローされる |
| UT-BA-095 | create | ルール定義を生成する | errorCodeが"L1-009"の場合 | エラーがスローされる |
| UT-BA-096 | create | ルール定義を生成する | errorCodeが"L2-001"の場合 | エラーがスローされる |
| UT-BA-097 | withSeverity | severityを変更した新しいRuleDefinitionを返す | "warning"に変更した場合 | severity="warning"の新インスタンスが返される |
| UT-BA-098 | withSeverity | severityを変更した新しいRuleDefinitionを返す | — | 元のインスタンスは変更されない |
| UT-BA-099 | disable | 無効化した新しいRuleDefinitionを返す | 有効なルールを無効化した場合 | enabled=falseの新インスタンスが返される |
| UT-BA-100 | disable | 無効化した新しいRuleDefinitionを返す | — | 元のインスタンスは変更されない |
| UT-BA-101 | usesInput | 必要な入力種別を判定する | requiredInputsに含まれるRequiredInputの場合 | trueを返す |
| UT-BA-102 | usesInput | 必要な入力種別を判定する | requiredInputsに含まれないRequiredInputの場合 | falseを返す |
| UT-BA-103 | isEnabled | 有効/無効を返す | enabled=trueの場合 | trueを返す |
| UT-BA-104 | equals | 等価性を判定する | 同一属性のRuleDefinitionの場合 | trueを返す |

### 3.11 RuleViolation（10ケース）

テストファイル: `value-objects/rule-violation.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-105 | create | 違反情報を生成する | 正常な属性値の場合 | RuleViolationが生成される |
| UT-BA-106 | create | 違反情報を生成する | lineが0の場合 | エラーがスローされる |
| UT-BA-107 | create | 違反情報を生成する | columnが0の場合 | エラーがスローされる |
| UT-BA-108 | create | 違反情報を生成する | messageが空文字の場合 | エラーがスローされる |
| UT-BA-109 | withFixExample | 修正例を追加した新インスタンスを返す | fixExampleを指定した場合 | fixExampleが設定された新インスタンスが返される |
| UT-BA-110 | toContract | 契約形式に変換する | fixExampleがある場合 | fix_exampleを含むオブジェクトが返される |
| UT-BA-111 | toContract | 契約形式に変換する | fixExampleがない場合 | fix_exampleを含まないオブジェクトが返される |
| UT-BA-112 | equals | 等価性を判定する | 同一属性のRuleViolationの場合 | trueを返す |
| UT-BA-113 | equals | 等価性を判定する | 異なる属性のRuleViolationの場合 | falseを返す |
| UT-BA-114 | create | 違反情報を生成する | line=1, column=1の最小許容値の場合 | RuleViolationが生成される |
| UT-BA-195 | create | 違反情報を生成する | severityが"error"の場合 | severity="error"のRuleViolationが生成される |
| UT-BA-196 | create | 違反情報を生成する | severityが"warning"の場合 | severity="warning"のRuleViolationが生成される |
| UT-BA-197 | create | 違反情報を生成する | severityが"info"（不正値）の場合 | エラーがスローされる |

### 3.12 ImportGraph（18ケース）

テストファイル: `value-objects/import-graph.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-115 | create | ImportGraphを生成する | 正常なノードとエッジの場合 | ImportGraphが生成される |
| UT-BA-116 | create | ImportGraphを生成する | rootNodesがnodesの部分集合でない場合 | エラーがスローされる |
| UT-BA-117 | create | ImportGraphを生成する | 重複ノードが含まれる場合 | 重複が除去されて生成される |
| UT-BA-118 | create | ImportGraphを生成する | 重複エッジが含まれる場合 | 重複が除去されて生成される |
| UT-BA-119 | create | ImportGraphを生成する | 空のノードとエッジの場合 | 空のImportGraphが生成される |
| UT-BA-120 | detectCycles | 循環依存を検出する | A→B→A の循環が存在する場合 | ImportCycleの配列が返される |
| UT-BA-121 | detectCycles | 循環依存を検出する | 循環が存在しない場合 | 空配列が返される |
| UT-BA-122 | detectCycles | 循環依存を検出する | A→B→C→Aの3ノード循環の場合 | 3ノードのImportCycleが返される |
| UT-BA-123 | findLayerViolations | レイヤー違反を検出する | 禁止方向のimportが存在する場合 | 違反エッジの配列が返される |
| UT-BA-124 | findLayerViolations | レイヤー違反を検出する | 許可方向のimportのみの場合 | 空配列が返される |
| UT-BA-125 | findGhostFiles | 未参照ファイルを検出する | importされていないファイルがある場合 | ゴーストファイルの配列が返される |
| UT-BA-126 | findGhostFiles | 未参照ファイルを検出する | ignorePatterns対象のファイルの場合 | 除外されて返されない |
| UT-BA-127 | findGhostFiles | 未参照ファイルを検出する | rootNodesに含まれるファイルの場合 | ゴーストファイルとして報告されない |
| UT-BA-128 | incomingCount | 被参照数を返す | 複数のファイルから参照されている場合 | 正しいカウントが返される |
| UT-BA-129 | incomingCount | 被参照数を返す | 参照されていないファイルの場合 | 0が返される |
| UT-BA-130 | outgoingEdgesOf | 指定ファイルからの出力エッジを返す | 出力エッジが存在する場合 | 対応するImportEdge配列が返される |
| UT-BA-131 | outgoingEdgesOf | 指定ファイルからの出力エッジを返す | 出力エッジが存在しない場合 | 空配列が返される |
| UT-BA-132 | detectCycles | 循環依存を検出する | 自己参照（from === to）のエッジがある場合 | 1メンバーのImportCycleとして報告される |

### 3.13 LintReport（10ケース）

テストファイル: `value-objects/lint-report.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-133 | create | レポートを生成する | 正常な属性値の場合 | LintReportが生成される |
| UT-BA-134 | create | レポートを生成する | durationMsが負数の場合 | エラーがスローされる |
| UT-BA-135 | create | レポートを生成する | scannedFilesが負数の場合 | エラーがスローされる |
| UT-BA-136 | create | レポートを生成する | durationMs=0, scannedFiles=0の最小許容値の場合 | LintReportが生成される |
| UT-BA-137 | hasErrors | エラーの存在を判定する | severity="error"の違反がある場合 | trueを返す |
| UT-BA-138 | hasErrors | エラーの存在を判定する | severity="warning"の違反のみの場合 | falseを返す |
| UT-BA-139 | errorCount | エラー件数を返す | error2件warning1件の場合 | 2が返される |
| UT-BA-140 | warningCount | warning件数を返す | error2件warning1件の場合 | 1が返される |
| UT-BA-141 | warningCount | warning件数を返す | warningの違反がない場合 | 0が返される |
| UT-BA-142 | violationCount | 全違反件数を返す | error2件warning1件の場合 | 3が返される |

---

## 4. ドメインサービステストケース

### 4.1 RuleDefinitionRegistry（18ケース）

テストファイル: `domain/rule-definition-registry.test.ts`

#### getAll

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-143 | getAll | 全ルール定義を返す | — | 8件のRuleDefinitionが返される |
| UT-BA-144 | getAll | 全ルール定義を返す | — | ルール名昇順でソートされている |
| UT-BA-145 | getAll | 全ルール定義を返す | — | 全ルールのerrorCodeが一意である |
| UT-BA-146 | getAll | 全ルール定義を返す | — | 全ルールのRuleTypeがBiomeNativeまたはExternalAnalyzerである |
| UT-BA-147 | getAll | 全ルール定義を返す | — | errorCodeがL1-001からL1-008の範囲内である |
| UT-BA-148 | getAll | 全ルール定義を返す | — | 各ルールのrequiredInputsが空でない |

#### resolveEnabled

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-149 | resolveEnabled | L1設定に基づき有効ルールを解決する | l1Enabled=falseの場合 | 全ルールがskippedRulesに含まれる |
| UT-BA-150 | resolveEnabled | L1設定に基づき有効ルールを解決する | l1Enabled=trueで設定なしの場合 | 8件全てがenabledRulesに含まれる |
| UT-BA-151 | resolveEnabled | L1設定に基づき有効ルールを解決する | 特定ルールが"off"の場合 | そのルールがskippedRulesに含まれる |
| UT-BA-152 | resolveEnabled | L1設定に基づき有効ルールを解決する | 特定ルールが"warning"の場合 | そのルールのseverityがwarningになる |
| UT-BA-153 | resolveEnabled | L1設定に基づき有効ルールを解決する | 特定ルールが"error"の場合 | そのルールのseverityがerrorになる |
| UT-BA-154 | resolveEnabled | L1設定に基づき有効ルールを解決する | 未定義のルール名が設定にある場合 | UnknownRuleNameErrorがスローされる |
| UT-BA-155 | resolveEnabled | L1設定に基づき有効ルールを解決する | 不正なseverity値が設定にある場合 | InvalidRuleSeverityErrorがスローされる |
| UT-BA-156 | resolveEnabled | L1設定に基づき有効ルールを解決する | enabledRulesとskippedRulesが排他的である場合 | 両方にルールが重複しない |

#### getByName

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-157 | getByName | 指定ルール名のRuleDefinitionを返す | 存在するルール名の場合 | 対応するRuleDefinitionが返される |
| UT-BA-158 | getByName | 指定ルール名のRuleDefinitionを返す | — | 返却されたRuleDefinitionのnameが指定したRuleNameと一致する |
| UT-BA-159 | getByName | 指定ルール名のRuleDefinitionを返す | 存在しないルール名の場合 | UnknownRuleNameErrorがスローされる |
| UT-BA-160 | getByName | 8ルール全てを個別取得できる | 8つの正規ルール名それぞれの場合 | 対応するRuleDefinitionが返される |

### 4.2 ImportGraphBuilder（10ケース）

テストファイル: `domain/import-graph-builder.test.ts`

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-161 | build | スナップショット群からImportGraphを構築する | 正常なスナップショット群の場合 | ノードとエッジが正しく構築される |
| UT-BA-162 | build | スナップショット群からImportGraphを構築する | isEntrypointCandidate=trueのファイルがある場合 | rootNodesに含まれる |
| UT-BA-163 | build | スナップショット群からImportGraphを構築する | index.tsファイルがある場合 | rootNodesに既定で含まれる |
| UT-BA-164 | build | スナップショット群からImportGraphを構築する | presentation/cli配下のファイルがある場合 | rootNodesに既定で含まれる |
| UT-BA-165 | build | スナップショット群からImportGraphを構築する | 重複importがある場合 | エッジが重複除去される |
| UT-BA-166 | build | スナップショット群からImportGraphを構築する | 空のスナップショット配列の場合 | 空のImportGraphが返される |
| UT-BA-167 | build | スナップショット群からImportGraphを構築する | 複数ファイルが相互参照している場合 | 双方向のエッジが構築される |
| UT-BA-168 | build | スナップショット群からImportGraphを構築する | type-only importのみの場合 | importKind="type"のエッジが構築される |
| UT-BA-169 | build | スナップショット群からImportGraphを構築する | importsが空のスナップショットの場合 | ノードのみが登録されエッジは空である |
| UT-BA-170 | build | スナップショット群からImportGraphを構築する | 自己参照importがある場合 | from===toのエッジが構築される |

### 4.3 LintRunner（22ケース）

テストファイル: `domain/lint-runner.test.ts`

#### 8ルール個別テスト（16ケース）

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-171 | run | require-unit-commentの違反判定を実行する | declaredUnitがnullの場合 | 違反が報告される |
| UT-BA-172 | run | require-unit-commentの違反判定を実行する | declaredUnitが設定されている場合 | 違反が報告されない |
| UT-BA-173 | run | require-layer-commentの違反判定を実行する | declaredLayerがnullの場合 | 違反が報告される |
| UT-BA-174 | run | require-layer-commentの違反判定を実行する | declaredLayerが設定されている場合 | 違反が報告されない |
| UT-BA-175 | run | no-layer-violationの違反判定を実行する | レイヤー違反importがある場合 | 違反が報告される |
| UT-BA-176 | run | no-layer-violationの違反判定を実行する | 正規の依存方向のみの場合 | 違反が報告されない |
| UT-BA-177 | run | enforce-folder-structureの違反判定を実行する | declaredLayerとディレクトリが不一致の場合 | 違反が報告される |
| UT-BA-178 | run | enforce-folder-structureの違反判定を実行する | declaredLayerとディレクトリが一致する場合 | 違反が報告されない |
| UT-BA-179 | run | no-any-abuseの違反判定を実行する | anyTypeCountが閾値超過の場合 | 違反が報告される |
| UT-BA-180 | run | no-any-abuseの違反判定を実行する | anyTypeCountが閾値内の場合 | 違反が報告されない |
| UT-BA-181 | run | no-code-duplicationの違反判定を実行する | 同一fingerprintがminOccurrences以上の場合 | 違反が報告される |
| UT-BA-182 | run | no-code-duplicationの違反判定を実行する | 重複がない場合 | 違反が報告されない |
| UT-BA-183 | run | no-ghost-fileの違反判定を実行する | importされていないファイルがある場合 | 違反が報告される |
| UT-BA-184 | run | no-ghost-fileの違反判定を実行する | 全ファイルが参照されている場合 | 違反が報告されない |
| UT-BA-185 | run | no-comment-floodの違反判定を実行する | commentDensityが閾値超過の場合 | 違反が報告される |
| UT-BA-186 | run | no-comment-floodの違反判定を実行する | commentDensityが閾値内の場合 | 違反が報告されない |

#### LintReport構築テスト（4ケース）

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-187 | run | LintReportを構築する | 違反ゼロのルールがある場合 | passedRulesに含まれる |
| UT-BA-188 | run | LintReportを構築する | — | passedRulesとskippedRulesが排他的である |
| UT-BA-189 | run | LintReportを構築する | — | 全violationsのruleNameがRuleDefinitionRegistryに登録済みである |
| UT-BA-190 | run | LintReportを構築する | durationMsが指定されている場合 | LintReportのdurationMsに正しく反映される |

#### 異常系テスト（2ケース）

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-191 | run | 不正な入力を検出する | 空のrules配列の場合 | 空のviolationsを持つLintReportが返される |
| UT-BA-192 | run | 不正な入力を検出する | rulesに未知のRuleNameが含まれる場合 | run()メソッド冒頭でUnknownRuleNameErrorがスローされる |

#### LintRunner分岐カバレッジ追加テスト（6ケース）

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-198 | run | no-layer-violationの循環依存検出を実行する | ImportGraphに循環依存が存在する場合 | L1-003の違反として報告される |
| UT-BA-199 | run | no-layer-violationの循環依存検出を実行する | ImportGraphに循環依存が存在しない場合 | 循環依存に関する違反が報告されない |
| UT-BA-200 | run | no-any-abuseのanyRatio閾値分岐を実行する | anyRatio()が閾値ちょうどの場合 | 違反が報告されない（閾値未超過） |
| UT-BA-201 | run | no-any-abuseのanyRatio閾値分岐を実行する | anyRatio()が閾値を0.01超過する場合 | L1-005の違反として報告される |
| UT-BA-202 | run | no-comment-floodのrepeatedCommentBlocks閾値分岐を実行する | repeatedCommentBlocksが閾値ちょうどの場合 | 違反が報告されない（閾値未超過） |
| UT-BA-203 | run | no-comment-floodのrepeatedCommentBlocks閾値分岐を実行する | repeatedCommentBlocksが閾値を1超過する場合 | L1-008の違反として報告される |

#### v0 ESLintパリティ回帰テスト（8ケース）

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-204 | run | v0 require-unit-commentパリティを検証する | v0 ESLint fixtureで@unitコメントが欠落したファイルの場合 | v0と同一の違反が検出される |
| UT-BA-205 | run | v0 require-unit-commentパリティを検証する | v0 ESLint fixtureで@unitコメントが存在するファイルの場合 | v0と同一の非違反結果が得られる |
| UT-BA-206 | run | v0 require-layer-commentパリティを検証する | v0 ESLint fixtureで@layerコメントが欠落したファイルの場合 | v0と同一の違反が検出される |
| UT-BA-207 | run | v0 require-layer-commentパリティを検証する | v0 ESLint fixtureで@layerコメントが存在するファイルの場合 | v0と同一の非違反結果が得られる |
| UT-BA-208 | run | v0 no-layer-violationパリティを検証する | v0 ESLint fixtureでレイヤー違反importがあるファイルの場合 | v0と同一の違反が検出される |
| UT-BA-209 | run | v0 no-layer-violationパリティを検証する | v0 ESLint fixtureで正規依存方向のみのファイルの場合 | v0と同一の非違反結果が得られる |
| UT-BA-210 | run | v0 enforce-folder-structureパリティを検証する | v0 ESLint fixtureで不正配置のファイルの場合 | v0と同一の違反が検出される |
| UT-BA-211 | run | v0 enforce-folder-structureパリティを検証する | v0 ESLint fixtureで正規配置のファイルの場合 | v0と同一の非違反結果が得られる |

#### WI-024 metadataTags回帰テスト

| ケースID | target | describe | context | it |
|---------|--------|----------|---------|-----|
| UT-BA-212 | parseUnitComment | ソースコードから@unitコメントを抽出する | カスタムタグ @module を指定した場合 | @moduleのみをunit metadataとして抽出する |
| UT-BA-213 | parseUnitComment | ソースコードから@unitコメントを抽出する | カスタムタグを指定しない場合 | @moduleは既定のunit metadataとして抽出されない |
| UT-BA-214 | parseLayerComment | ソースコードから@layerコメントを抽出する | カスタムタグ @tier を指定した場合 | @tierのみをlayer metadataとして抽出する |
| UT-BA-215 | parseLayerComment | ソースコードから@layerコメントを抽出する | カスタムタグを指定しない場合 | @tierは既定のlayer metadataとして抽出されない |
| UT-BA-216 | run | require-unit-commentの違反判定を実行する | metadataTags.unitがカスタム設定されている場合 | 違反メッセージに設定タグ名が使われる |
| UT-BA-217 | run | require-layer-commentの違反判定を実行する | metadataTags.layerがカスタム設定されている場合 | 違反メッセージに設定タグ名が使われる |
| UT-BA-218 | execute | architecture preset の metadataTags を architectureSpec として出力する | metadataTagsが指定された場合 | architectureSpecに透過される |
| UT-BA-219 | format | RuleViolationをHarnessError出力へ整形する | require-unit-commentがカスタムmetadata tag名を含む場合 | suggestionにも設定タグ名が使われる |
| UT-BA-220 | format | RuleViolationをHarnessError出力へ整形する | require-layer-commentがカスタムmetadata tag名を含む場合 | suggestionにも設定タグ名が使われる |

---

## 5. 境界値・異常系

### 5.1 境界値テスト一覧

以下の境界値テストは上記テストケースに含まれている。対応するケースIDを示す。

| 対象 | 境界値 | ケースID |
|------|--------|---------|
| RuleName | 8種の正規値 + 未定義文字列 | UT-BA-001〜UT-BA-006 |
| FilePath | 空文字、"."のみ、".."始まり、"/"始まり、正常相対パス | UT-BA-031〜UT-BA-036 |
| RuleViolation.line / column | 0（拒否）、1（最小許容値） | UT-BA-106, UT-BA-107, UT-BA-114 |
| LintReport.durationMs / scannedFiles | -1（拒否）、0（最小許容値） | UT-BA-134〜UT-BA-136 |
| ImportCycle.path | 0ノード（拒否）、1ノード（拒否）、2ノード（最小許容値） | UT-BA-059〜UT-BA-061 |
| SourceModuleSnapshot件数系 | -1（拒否）、0（最小許容値） | UT-BA-076〜UT-BA-080, UT-BA-083 |
| SourceModuleSnapshot.anyRatio() | typedNodeCount=0（ゼロ除算→0を返す） | UT-BA-088（QA-1反映）, UT-BA-193 |
| SourceModuleSnapshot.commentDensity() | logicalLineCount=0（ゼロ除算→0を返す） | UT-BA-089（QA-2反映）, UT-BA-194 |
| RuleViolation.severity | "error"/"warning"のみ許容、不正値拒否 | UT-BA-195, UT-BA-196, UT-BA-197 |
| LintRunner循環依存 | 循環ありで L1-003 報告 / 循環なしで報告なし | UT-BA-198, UT-BA-199 |
| LintRunner anyRatio閾値 | 閾値ちょうど（非違反）/ 閾値超過（L1-005） | UT-BA-200, UT-BA-201 |
| LintRunner repeatedCommentBlocks閾値 | 閾値ちょうど（非違反）/ 閾値超過（L1-008） | UT-BA-202, UT-BA-203 |
| RuleDefinition.errorCode | L1-000（拒否）、L1-001（最小）、L1-008（最大）、L1-009（拒否） | UT-BA-092〜UT-BA-096 |
| ImportGraph.rootNodes | nodesの部分集合でないrootNode（拒否） | UT-BA-116 |
| ImportGraph.detectCycles | 自己循環 from===to（QA-3: 1メンバーとして報告） | UT-BA-132 |
| LintRunner.run() | 未知RuleName（QA-4: fail-fast） | UT-BA-192 |

### 5.2 ドメインエラー検証対応表

| エラー型 | 送出元 | 検証ケースID |
|---------|--------|------------|
| InvalidRuleNameError | RuleName.fromString | UT-BA-006 |
| InvalidRuleTypeError | RuleType.fromString | UT-BA-015, UT-BA-016 |
| InvalidLayerNameError | LayerName.fromString | UT-BA-025, UT-BA-026, UT-BA-027 |
| InvalidFilePathError | FilePath.fromWorkspaceRelative | UT-BA-032, UT-BA-033, UT-BA-034, UT-BA-035, UT-BA-036 |
| InvalidImportCycleError | ImportCycle.create | UT-BA-060, UT-BA-061 |
| UnknownRuleNameError | RuleDefinitionRegistry.resolveEnabled, getByName, LintRunner.run | UT-BA-154, UT-BA-159, UT-BA-192 |
| InvalidRuleSeverityError | RuleDefinitionRegistry.resolveEnabled | UT-BA-155 |

---

## 6. テスト環境設定

### 6.1 テストフレームワーク

- **フレームワーク**: Vitest 3.0.0
- **設定ファイル**: `scripts/harness/__tests__/vitest.config.ts`（共有設定）
- **ヘルパー**: `scripts/harness/__tests__/helper/common-helper.ts`（`target`, `context` エイリアス定義済み）

### 6.2 テストダブル方針

| 層 | 方針 |
|----|------|
| Domain（本設計スコープ） | モック禁止。すべて実体のVO・ドメインサービスを使用する |

### 6.3 テスト構造規約

- **AAAパターン**: `// Arrange` / `// Act` / `// Assert` コメントで構造化する
- **実行結果**: `actual` 変数に代入する
- **describe/it構造**: `target` → `describe` → `context` → `it` の階層に従う
- **テストケース名**: 日本語で、実装の詳細に依存しない表現にする
- **ファイル名**: kebab-caseで統一する

### 6.4 結果比較方針

- 順序依存しない結果（循環検出等）はセット比較を採用する
- 値オブジェクトの等価性は `equals()` メソッドと `expect().toEqual()` の両方で確認する
- エラー送出は `expect(() => ...).toThrow(XxxError)` で型を明示する

### 6.5 テストケースサマリ

| テストファイル | ケース数 |
|--------------|---------|
| value-objects/rule-name.test.ts | 12 |
| value-objects/rule-type.test.ts | 8 |
| value-objects/layer-name.test.ts | 10 |
| value-objects/file-path.test.ts | 14 |
| value-objects/required-input.test.ts | 6 |
| value-objects/import-edge.test.ts | 8 |
| value-objects/import-cycle.test.ts | 6 |
| value-objects/layer-boundary.test.ts | 10 |
| value-objects/source-module-snapshot.test.ts | 18 |
| value-objects/rule-definition.test.ts | 14 |
| value-objects/rule-violation.test.ts | 13 |
| value-objects/import-graph.test.ts | 18 |
| value-objects/lint-report.test.ts | 10 |
| **値オブジェクト小計** | **147** |
| domain/rule-definition-registry.test.ts | 18 |
| domain/import-graph-builder.test.ts | 10 |
| domain/lint-runner.test.ts | 36 |
| **ドメインサービス小計** | **64** |
| **合計** | **211** |

## WI-212 Source Analyzer Capability Tests

<!-- @work-item-id WI-212 -->

- The TypeScript analyzer declares `typescript` as its supported language capability.
- Non-TypeScript language requests are refused by dispatch before the TypeScript analyzer attempts to parse the file.
