# テストカバレッジレポート: adr-foundation

> 判定対象:
> - `docs/product/units/adr_foundation_unit.md`
> - `docs/product/construction/adr-foundation/domain_model.md`
> - `docs/product/construction/adr-foundation/logical_design.md`
> - `docs/product/construction/adr-foundation/unit_test_design.md`
> - `docs/product/construction/adr-foundation/it_test_design.md`
>
> 注記:
> - `adr_foundation_unit.md` には AC 固有IDがないため、本レポートの `AC ID` 列は元文書に存在するストーリーID（`H05-01`〜`H05-03`）をそのまま使用する
> - 本UnitのpresentationはCLIであり、HTTP APIエンドポイントは論理設計に定義されていないため、APIカバレッジは評価対象外とする

## 1. サマリー
| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 22 | 1 | 95.7% |
| ドメインロジック | 39 | 0 | 100.0% |
| UseCase | 6 | 2 | 75.0% |
| **総合** | **67** | **3** | **95.7%** |

### 判定結果

全体としては高い網羅率だが、実装開始前に補完すべき未カバー項目が3件ある。特に `CreateAdrTemplateUseCase` と `ChangeAdrStatusUseCase` の異常系、および `docs/ADR/template.md` の実体配置保証は追加設計が必要。

## 2. 受け入れ基準カバレッジ詳細
| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|---------------|----------|
| H05-01 | `docs/ADR/` に ADRテンプレートファイルを作成する | IT-AF-010, IT-AF-011, IT-AF-095, IT-AF-096（内容生成は検証しているが `docs/ADR/template.md` の実体配置は未検証） | 未カバー |
| H05-01 | テンプレート構造が Title / Status / Context / Decision / Result / Alternatives を持つ | IT-AF-010, IT-AF-011, IT-AF-012, IT-AF-081, IT-AF-082 | カバー |
| H05-01 | YAMLフロントマターに `title`, `status`, `date`, `adr_id` を含み機械可読である | IT-AF-011, IT-AF-069, IT-AF-074, IT-AF-076 | カバー |
| H05-01 | archgateパターンを機械可読な形式で定義できる | UT-AF-090〜111, IT-AF-070, IT-AF-075, IT-AF-076 | カバー |
| H05-01 | ADRテンプレートのフロントマターに `archgate` オプショナル項目を追加できる | UT-AF-070, UT-AF-075〜078, IT-AF-012 | カバー |
| H05-02 | ADR「パッケージ分離（Quality Harness / Orchestration）」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「ESLint→Biome全面移行」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「K1-K13全て品質ハーネス側帰属」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「FUSE Hooks Engineはv1スコープ外」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「HarnessErrorにfix_example必須化」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「Quick Mode適用条件の厳格定義」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「設定ファイル分離（harness.config.json / orchestration.config.json）」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「Nyquist統合（GSD-2 Truths/Artifacts検証パターン）」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「成果物駆動の状態導出」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「スタック検出（バリデータ無限ループ防止）」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | ADR「L0→4層一時定義→5層復帰パス」を作成する | IT-AF-015, IT-AF-090, IT-AF-094 | カバー |
| H05-02 | 各ADRがH05-01テンプレート構造に準拠する | IT-AF-015, IT-AF-019, IT-AF-077〜083, IT-AF-085〜089 | カバー |
| H05-02 | §12でDecided済みのものは `Accepted`、検討中は `Proposed` である | IT-AF-092, IT-AF-094 | カバー |
| H05-02 | 各ADRのフロントマターが機械的に解析可能である | IT-AF-069〜076, IT-AF-077, IT-AF-083 | カバー |
| H05-03 | 全ADRのフロントマターで `status` を必須化する | UT-AF-128, IT-AF-030, IT-AF-034 | カバー |
| H05-03 | `status` が `Proposed / Accepted / Deprecated / Superseded` のいずれかであることを検証する | UT-AF-050〜055, IT-AF-008, IT-AF-098, IT-AF-106 | カバー |
| H05-03 | `Superseded` 状態のADRには `superseded_by` を含める | UT-AF-067, UT-AF-129, IT-AF-031 | カバー |
| H05-03 | フロントマターバリデーションの自動テストを持つ | IT-AF-029〜037, IT-AF-116〜121 | カバー |

## 3. ドメインロジックカバレッジ詳細

カウント根拠は、ADR集約の不変条件8件、値オブジェクト制約28件、`AdrValidationService` の検証ルール3件の合計39件。

### 集約
| 対象 | 不変条件・ルール | 対応テストケース | カバー状態 |
|------|----------------|---------------|----------|
| ADR | INV-1 `AdrId` は3桁数字で一意 | UT-AF-001, UT-AF-007, UT-AF-018 | カバー |
| ADR | INV-2 `AdrStatus` は4つの有効値のみ | UT-AF-001, UT-AF-009〜017, UT-AF-022〜025 | カバー |
| ADR | INV-3 `Superseded` の場合は `superseded_by` 必須 | UT-AF-017, UT-AF-067, UT-AF-129 | カバー |
| ADR | INV-4 許可された状態遷移のみ実行できる | UT-AF-009〜025 | カバー |
| ADR | INV-5 `archgate.error_code` は `L{n}-{nnn}` 形式 | UT-AF-005, UT-AF-028, UT-AF-030, UT-AF-131, UT-AF-138 | カバー |
| ADR | INV-6 外部公開参照は `ADR-{NNN}` 形式 | UT-AF-037, UT-AF-046, UT-AF-113 | カバー |
| ADR | INV-7 `archgate.enforced_by` の組は重複不可 | UT-AF-006, UT-AF-031, UT-AF-103, UT-AF-132, UT-AF-139 | カバー |
| ADR | INV-8 本文は `Context / Decision / Consequences` 必須、`Alternatives` 任意 | UT-AF-004, UT-AF-026, UT-AF-027, UT-AF-080〜088 | カバー |

### エンティティ

該当なし。`adr-foundation` は `ADR` 単一集約で設計されており、集約内の独立エンティティは定義されていない。

### 値オブジェクト
| 対象 | 制約・ルール | 対応テストケース | カバー状態 |
|------|-------------|---------------|----------|
| AdrId | 3桁数字、`ADR-` 接頭辞正規化、数値変換、等価性、比較 | UT-AF-038〜049 | カバー |
| AdrStatus | 4状態の生成、遷移判定、等価性、Superseded判定 | UT-AF-050〜063 | カバー |
| AdrFrontmatter | 必須項目、日付形式、`superseded_by` 条件、archgate整合、イミュータブル遷移 | UT-AF-064〜079 | カバー |
| AdrBody | 必須3セクション、`alternatives` 任意、等価性 | UT-AF-080〜089 | カバー |
| ArchgateEntry | `validator_id` 形式、`error_code` 形式、一致判定、等価性 | UT-AF-090〜099 | カバー |
| ArchgateMapping | 1件以上必須、重複禁止、検索、存在判定、プリミティブ変換 | UT-AF-100〜111 | カバー |
| SupersededByRef | 有効なAdrId保持、`ADR-{NNN}` 変換、等価性 | UT-AF-112〜116 | カバー |
| AdrFilePath | `docs/ADR/{NNN}-{slug}.md` 形式、`template.md` 除外、AdrId抽出、等価性 | UT-AF-117〜126 | カバー |

補足: `AdrValidationService` の `validateFrontmatter`, `validateBody`, `validateArchgate` は UT-AF-127〜139 で全て検証されている。

## 4. UseCaseカバレッジ詳細
| UseCase名 | 正常系 | 異常系 | カバー状態 |
|----------|-------|-------|----------|
| GetAdrByRefUseCase | IT-AF-001, IT-AF-002, IT-AF-004 | IT-AF-003 | カバー |
| ListAdrsUseCase | IT-AF-005〜007, IT-AF-009 | IT-AF-008 | カバー |
| CreateAdrTemplateUseCase | IT-AF-010〜013 | IT-AF-014（`TemplateOutputConflictError` は未検証） | 部分 |
| SeedInitialAdrsUseCase | IT-AF-015〜017, IT-AF-020 | IT-AF-018, IT-AF-019 | カバー |
| ChangeAdrStatusUseCase | IT-AF-021〜024, IT-AF-028 | IT-AF-025〜027（`supersede` 時の `supersededBy` 未指定は未検証） | 部分 |
| ValidateAdrFrontmatterUseCase | IT-AF-029, IT-AF-031 | IT-AF-030, IT-AF-032 | カバー |
| ValidateAllAdrsUseCase | IT-AF-033, IT-AF-036, IT-AF-037 | IT-AF-034, IT-AF-035 | カバー |
| SearchArchgateMappingsUseCase | IT-AF-038〜040, IT-AF-042 | IT-AF-041 | カバー |

## 5. 未カバー項目一覧

1. `H05-01` の「`docs/ADR/` に ADRテンプレートファイルを作成する」を直接保証するテストがない。既存ケースはテンプレート内容生成のみを検証しており、`docs/ADR/template.md` の実体配置までは担保していない。
2. `CreateAdrTemplateUseCase` の論理設計で定義されている `TemplateOutputConflictError` の異常系テストがない。
3. `ChangeAdrStatusUseCase` の `action=supersede` で `supersededBy` が未指定の場合の異常系テストがない。

## 6. 推奨追加ケース

1. `create-adr-template-use-case.test.ts` に、推奨出力先が既存ファイルと競合した場合に `TemplateOutputConflictError` を返すケースを追加する。
2. `change-adr-status-use-case.test.ts` に、`supersede` 実行時に `supersededBy` が欠落している場合の入力検証ケースを追加する。
3. `infrastructure` または `presentation` レベルで、`docs/ADR/template.md` が実体として存在し、frontmatterを機械可読に保ったまま参照テンプレートとして扱われることを確認するスモークケースを追加する。

## 7. 次のアクション

1. `it_test_design.md` に上記3ケースを追記し、UseCaseカバレッジの部分状態を解消する。
2. 追記後に本レポートのサマリー値を再計算し、総合カバレッジを更新する。
3. 実装フェーズでは、追加ケースが `TemplateOutputConflictError` と `supersededBy` 入力欠落を確実に検出するよう、テストロジック設計にも反映する。
