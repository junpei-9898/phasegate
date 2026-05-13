# テストカバレッジレポート: biome-ast-engine

@story-id H01-01
@story-id H01-02
@story-id H01-03
## 1. サマリー

集計基準:
- 受け入れ基準: `biome_ast_engine_unit.md` の機能要件 15項目
- ドメインロジック: `domain_model.md` / `logical_design.md` に定義された不変条件・主要ビジネスルール 26項目
- UseCase: 6 UseCase × 正常系/異常系 = 12項目
- `一部カバー` は未カバー項目数に含めて集計

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 14 | 1 | 93% |
| ドメインロジック | 26 | 0 | 100% |
| UseCase | 12 | 0 | 100% |
| **総合** | **52** | **1** | **98%** |

### 判定結果

前回レポート（74%）から大幅に改善し、98%に到達した。v0パリティ回帰テスト（UT-BA-204〜211）、CI統合テスト（IT-BA-141〜146）、`RegisterRuleCatalogUseCase` 直接テスト（IT-BA-137〜140）、`LintRunner` 分岐網羅（UT-BA-198〜203）、`SourceModuleSnapshot` ゼロ除算ガード（UT-BA-193〜194）、`RuleViolation.severity` enum制約（UT-BA-195〜197）、UseCase異常系（IT-BA-133〜136）がすべて追加設計済みとなった。残る未カバー1項目はK3.5水準の精度維持を定量的に証明するテストケースであり、パリティ回帰で間接的にカバーされているが専用テストとしては未設計である。APIカバレッジはHTTPエンドポイントが存在しないため対象外。

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| 3.1-1 | `require-unit-comment` が `// @unit` 欠落を検出できる | UT-BA-171〜172, UT-BA-204〜205, IT-BA-097〜100 | カバー |
| 3.1-2 | `require-layer-comment` が `// @layer` 欠落を検出できる | UT-BA-173〜174, UT-BA-206〜207, IT-BA-101〜104 | カバー |
| 3.1-3 | `no-layer-violation` がレイヤー違反 import と循環依存を検出できる | UT-BA-120〜124, UT-BA-132, UT-BA-175〜176, UT-BA-198〜199, IT-BA-009〜016 | カバー |
| 3.1-4 | `enforce-folder-structure` が不正配置を検出できる | UT-BA-177〜178, UT-BA-210〜211 | カバー |
| 3.1-5 | v0 ESLint ルールと同等のテストケースでパリティ保証する | UT-BA-204〜211 | カバー |
| 3.1-6 | `@unit/@layer` 付与漏れ検出精度を K3.5 水準で維持する | UT-BA-171〜174, UT-BA-204〜207, IT-BA-097〜104 | 一部カバー |
| 3.2-1 | `no-any-abuse` が `any` 型の過剰使用を検出できる | UT-BA-179〜180, UT-BA-200〜201, IT-BA-050 | カバー |
| 3.2-2 | `no-code-duplication` が構造重複を検出できる | UT-BA-181〜182, IT-BA-055 | カバー |
| 3.2-3 | `no-ghost-file` が未参照ファイルを検出できる | UT-BA-125〜127, UT-BA-183〜184 | カバー |
| 3.2-4 | `no-comment-flood` が過剰コメントを検出できる | UT-BA-185〜186, UT-BA-202〜203, IT-BA-052〜053, IT-BA-105〜110 | カバー |
| 3.2-5 | L1-005〜L1-008 の HarnessError コードと統一フォーマットを定義できる | UT-BA-145〜147, IT-BA-027〜032, IT-BA-089〜090 | カバー |
| 3.3-1 | CIパイプラインで Biome lint + format を実行する | IT-BA-141〜143, IT-BA-146 | カバー |
| 3.3-2 | CIで8ルールすべてを実行する | IT-BA-017〜026, IT-BA-111〜118, IT-BA-144 | カバー |
| 3.3-3 | ESLint 設定ファイル・依存を完全除去できる | IT-BA-033〜040, IT-BA-077〜082 | カバー |
| 3.3-4 | CI失敗時の出力が HarnessError 形式に準拠する | IT-BA-027〜032, IT-BA-111〜116, IT-BA-127〜130, IT-BA-145 | カバー |

## 3. ドメインロジックカバレッジ詳細

### 集約

該当なし。`domain_model.md` で「集約なし」と定義されており、集約単位の不変条件テストも不要。

### エンティティ

該当なし。状態遷移を持つエンティティは定義されていない。

### 値オブジェクト

| 項目 | 内容 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| VO-01 | `RuleName` が定義済み8ルール名のみを受け付ける | UT-BA-001〜012, UT-BA-157〜160 | カバー |
| VO-02 | `RuleType` が `BiomeNative/ExternalAnalyzer` のみを受け付ける | UT-BA-013〜020 | カバー |
| VO-03 | `LayerName` が4層語彙のみを受け付け、v0語彙を拒否する | UT-BA-021〜027 | カバー |
| VO-04 | `LayerName.canDependOn()` が依存方向を守る | UT-BA-028〜029 | カバー |
| VO-05 | `FilePath` がワークスペース相対パス制約を守る | UT-BA-031〜044 | カバー |
| VO-06 | `RequiredInput` が定義済み入力種別のみを受け付ける | UT-BA-045〜050 | カバー |
| VO-07 | `ImportEdge` が import kind と type-only 判定を保持する | UT-BA-051〜058 | カバー |
| VO-08 | `ImportCycle` が循環経路の生成制約を守る | UT-BA-059〜064 | カバー |
| VO-09 | `LayerBoundary` が正規依存行列を表現できる | UT-BA-065〜074 | カバー |
| VO-10 | `SourceModuleSnapshot` が件数系属性と metadata null 許容を正しく扱う | UT-BA-075〜087, UT-BA-090 | カバー |
| VO-11 | `SourceModuleSnapshot.anyRatio()` が通常計算を返す | UT-BA-088 | カバー |
| VO-12 | `SourceModuleSnapshot.anyRatio()` が `typedNodeCount=0` でも 0 を返す | UT-BA-193 | カバー |
| VO-13 | `SourceModuleSnapshot.commentDensity()` が通常計算を返す | UT-BA-089 | カバー |
| VO-14 | `SourceModuleSnapshot.commentDensity()` が `logicalLineCount=0` でも 0 を返す | UT-BA-194 | カバー |
| VO-15 | `RuleDefinition` が errorCode 範囲・immutability・requiredInputs を守る | UT-BA-091〜104 | カバー |
| VO-16 | `RuleViolation` が行/列/メッセージ必須と contract 変換を守る | UT-BA-105〜114 | カバー |
| VO-17 | `RuleViolation` の `severity` が `error/warning` のみである | UT-BA-195〜197 | カバー |
| VO-18 | `ImportGraph` が graph 妥当性、循環、レイヤー違反、ghost file を判定できる | UT-BA-115〜132 | カバー |
| VO-19 | `LintReport` が数値不変条件と件数集計を守る | UT-BA-133〜142 | カバー |

### ドメインサービス

| 項目 | 内容 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| SV-01 | `RuleDefinitionRegistry.getAll()/getByName()` が 8件一意・昇順・取得可能を保証する | UT-BA-143〜148, UT-BA-157〜160 | カバー |
| SV-02 | `RuleDefinitionRegistry.resolveEnabled()` が `off/error/warning` と L1 disable を解決する | UT-BA-149〜156 | カバー |
| SV-03 | `ImportGraphBuilder.build()` が rootNodes 補完と重複除去を行う | UT-BA-161〜170 | カバー |
| SV-04 | `LintRunner.run()` が metadata / folder / duplication / ghost / bookkeeping を評価する | UT-BA-171〜192 | カバー |
| SV-05 | `LintRunner.run()` が循環依存を `no-layer-violation` 違反として報告する | UT-BA-198〜199 | カバー |
| SV-06 | `LintRunner.run()` が `anyRatio()` 超過で `no-any-abuse` 違反を報告する | UT-BA-200〜201 | カバー |
| SV-07 | `LintRunner.run()` が `repeatedCommentBlocks` 超過で `no-comment-flood` 違反を報告する | UT-BA-202〜203 | カバー |

## 4. UseCaseカバレッジ詳細

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|----------|------|------|----------|
| `RegisterRuleCatalogUseCase` | IT-BA-137〜139 | IT-BA-140 | カバー |
| `ResolveEnabledRulesUseCase` | IT-BA-001〜006 | IT-BA-007〜008 | カバー |
| `AnalyzeImportGraphUseCase` | IT-BA-009〜014, IT-BA-016 | IT-BA-015, IT-BA-133 | カバー |
| `ExecuteLintUseCase` | IT-BA-017〜022, IT-BA-024〜026 | IT-BA-023, IT-BA-134〜135 | カバー |
| `BuildHarnessErrorPayloadUseCase` | IT-BA-027〜032 | IT-BA-136 | カバー |
| `VerifyEslintRemovalUseCase` | IT-BA-033〜038 | IT-BA-039〜040 | カバー |

補足:
- UseCase集計は「正常系/異常系」を別項目として数え、12項目中12項目をカバーと判定した
- `RegisterRuleCatalogUseCase` はQA-5によりUTに分類されていたが、IT-BA-137〜140としてUseCase経路の直接テストが追加された
- `AnalyzeImportGraphUseCase` は `InvalidFilePathError`（IT-BA-015）に加え `InvalidImportGraphError`（IT-BA-133）が追加設計済み
- `ExecuteLintUseCase` は `BiomeExecutionFailedError`（IT-BA-023）に加え `UnknownRuleNameError`（IT-BA-134）と `InvalidImportGraphError`（IT-BA-135）が追加設計済み
- `BuildHarnessErrorPayloadUseCase` は `ViolationFormattingFailedError`（IT-BA-136）が追加設計済み

## 5. 未カバー項目一覧

- K3.5水準の`@unit/@layer`付与漏れ検出精度を定量的に証明する専用テストケースが未設計。v0パリティ回帰テスト（UT-BA-204〜207）で間接的にカバーされているが、精度水準を明示的に計測・断言するケースは存在しない

## 6. 前回レポートからの改善点

前回レポート（74%、未カバー14項目）で指摘された全12種の不足が以下のとおり解消された。

| 前回の指摘 | 対応テストケース | 状態 |
|-----------|----------------|------|
| v0 ESLint 4ルールとのパリティ回帰ケース未設計 | UT-BA-204〜211（LintRunner v0パリティ回帰テスト 8ケース） | 解消 |
| K3.5水準の精度確認ケース不足 | UT-BA-204〜207で間接カバー | 一部解消 |
| CIパイプラインでのBiome lint + format実行確認未設計 | IT-BA-141〜143, IT-BA-146（CI統合テスト） | 解消 |
| CI上で8ルール有効化状態の統合確認未設計 | IT-BA-144 | 解消 |
| `RegisterRuleCatalogUseCase` の直接テスト不在 | IT-BA-137〜140 | 解消 |
| `BuildHarnessErrorPayloadUseCase` の異常系未設計 | IT-BA-136（ViolationFormattingFailedError） | 解消 |
| `AnalyzeImportGraphUseCase` の `InvalidImportGraphError` 未設計 | IT-BA-133 | 解消 |
| `ExecuteLintUseCase` の `UnknownRuleNameError` / `InvalidImportGraphError` 未設計 | IT-BA-134〜135 | 解消 |
| `SourceModuleSnapshot.anyRatio()` の `typedNodeCount=0` ケース未設計 | UT-BA-193 | 解消 |
| `SourceModuleSnapshot.commentDensity()` の `logicalLineCount=0` ケース未設計 | UT-BA-194 | 解消 |
| `RuleViolation.severity` の enum 制約検証未設計 | UT-BA-195〜197 | 解消 |
| `LintRunner` の循環依存違反化・anyRatio閾値分岐・repeatedCommentBlocks閾値分岐未設計 | UT-BA-198〜203 | 解消 |

## 7. テストケース数サマリー

| 設計文書 | ケース数 |
|---------|---------|
| unit_test_design.md（UT） | 211 |
| it_test_design.md（IT） | 142 |
| **合計** | **353** |

## 8. 次のアクション

1. K3.5水準の精度維持を定量的に証明する専用テストケースの設計を検討する（現在はパリティ回帰で間接カバー）
2. 本レポートの98%カバレッジを維持しつつ、実装フェーズに移行する

## WI-165: Coverage Refresh For WI-117..148

@work-item-id WI-165

Biome AST coverage is evaluated as source-fact production for upper validators. WI-161 source facts, WI-119/WI-121 semantic scans, and L4-003 import/export graph behavior are consumed by validator-system; this Unit should prove AST/source snapshots are stable and should not duplicate validator policy. K3.5 legacy wording is retained as history, while current coverage maps to `@unit`/`@layer` metadata, source fact extraction, and graph inputs.
