# テストカバレッジ計画: validator-system

> **Unit ID**: validator-system
> **作成日**: 2026-03-19
> **フェーズ**: Phase 1（計画）
> **対象Wave**: Wave 2（品質検証レイヤー）

---

## 1. スコープ

### 対象Unit

`validator-system` — L2-L4バリデータを集約管理するUnit。harness-api・quick-mode等のConsumerがValidatorId指定で任意のバリデータを選択実行できる統一インターフェースを提供する。

### 検証対象テスト設計文書一覧

| 文書 | パス | 目的 |
|------|------|------|
| 受け入れ基準 | `docs/product/units/validator_system_unit.md` | ストーリーH08-01〜H08-06の機能要件・AC |
| ドメインモデル設計 | `docs/product/construction/validator-system/domain_model.md` | 集約境界・VO・ドメインサービス・ポート・不変条件 |
| 論理設計 | `docs/product/construction/validator-system/logical_design.md` | 4層アーキテクチャ・UseCase詳細・ポートIF |
| ユニットテスト設計 | `docs/product/construction/validator-system/unit_test_design.md` | VO・ドメインサービスのテストケース（UT-VID-001〜UT-BND-017） |
| ITテスト設計 | `docs/product/construction/validator-system/it_test_design.md` | UseCase・Adapter・CLIハンドラーのテストケース |
| 統合契約（参考） | `docs/product/units/integration_contract.md` | Shared Kernel・HarnessError型・HarnessConfigV2型 |

---

## 2. 受け入れ基準一覧（ストーリーから抽出）

### H08-01: L2 test-qualityバリデータ

| AC番号 | 受け入れ基準 |
|--------|------------|
| H08-01-AC-1 | AAAパターン（Arrange/Act/Assert）構造の検証が機能する |
| H08-01-AC-2 | テスト変数の`actual`命名規約の検証が機能する |
| H08-01-AC-3 | single-act（1テストケース1アクション）の検証が機能する |
| H08-01-AC-4 | no-domain-mock（ドメイン層のモック禁止）の検証が機能する |
| H08-01-AC-5 | E2E seed patternの検証が機能する |
| H08-01-AC-6 | describe/it命名規約の検証が機能する |
| H08-01-AC-7 | 各ルール違反時のHarnessError（L2-003）に`fix_example`が含まれる |

### H08-02: L3 security+performanceバリデータ

| AC番号 | 受け入れ基準 |
|--------|------------|
| H08-02-AC-1 | ハードコードされた秘密情報（APIキー、パスワード等）が検出される |
| H08-02-AC-2 | SQLインジェクションパターンが検出される |
| H08-02-AC-3 | ループ内awaitが検出される |
| H08-02-AC-4 | N+1クエリパターンが検出される |
| H08-02-AC-5 | bundleSizeLimit（strictプリセットのみ）の検証が機能する |
| H08-02-AC-6 | 各ルール違反時のHarnessError（L3-001/L3-002）に`adr_ref` + `fix_example`が含まれる |

### H08-03: L3 coverageバリデータ

| AC番号 | 受け入れ基準 |
|--------|------------|
| H08-03-AC-1 | phasegate.config.jsonのcoverageThresholdを読み取り閾値検証を実行する |
| H08-03-AC-2 | standardプリセット（90%）での閾値検証が機能する |
| H08-03-AC-3 | strictプリセット（95%）での閾値検証が機能する |
| H08-03-AC-4 | 閾値未達時のHarnessError（L3-003）に現在のカバレッジ値と不足分が含まれる |

### H08-04: L4 drift-detectバリデータ

| AC番号 | 受け入れ基準 |
|--------|------------|
| H08-04-AC-1 | 設計→コード方向の乖離（設計に存在するがコードに未実装）が検出される |
| H08-04-AC-2 | コード→設計方向の乖離（コードに存在するが設計に未定義）が検出される |
| H08-04-AC-3 | @unitメタデータで参照されるUnitが設計文書に存在することが検証される |
| H08-04-AC-4 | 設計文書の@story-id HXX-XXに対応するinception文書の存在が検証される |
| H08-04-AC-5 | 乖離検出時のHarnessError（L4-001）に乖離の方向・対象要素・推奨アクションが含まれる |

### H08-05: L4 consistency-checkバリデータ

| AC番号 | 受け入れ基準 |
|--------|------------|
| H08-05-AC-1 | 文書間のレイヤー整合性（domain_model.md ⇔ logical_design.md ⇔ 実装コード）が検証される |
| H08-05-AC-2 | 設計文書間の用語不一致（エンティティ名、VO名等）が検出される |
| H08-05-AC-3 | 検出時のHarnessError（L4-002）に`adr_ref` + `fix_example` + 不整合箇所の詳細が含まれる |
| H08-05-AC-4 | 検証対象ペア（domain_model↔logical_design, logical_design↔実装コード）が設定可能 |

### H08-06: L4 dead-codeバリデータ

| AC番号 | 受け入れ基準 |
|--------|------------|
| H08-06-AC-1 | 未使用エクスポート（exportされているが他ファイルからimportされていない）が検出される |
| H08-06-AC-2 | 到達不能コード（条件分岐で到達し得ないブロック）が検出される |
| H08-06-AC-3 | 検出時のHarnessError（L4-003）に`adr_ref` + `fix_example` + 対象ファイルパス・行番号が含まれる |
| H08-06-AC-4 | strictプリセットでのみ有効（deadCodeGC機能としてphasegate.config.jsonで制御） |

---

## 3. ドメインモデル概要

### 集約境界の決定

`domain_model.md §2` の判断に従い、**集約なし（ValidatorDefinition VOパターン）** を採用。

理由:
- enabled状態はHarnessConfigV2から導出される外部依存値であり独立ライフサイクルを持たない
- biome-ast-engineのRuleDefinition VOパターンの先例に従う
- ValidatorRegistry（ドメインサービス）がカタログ管理を担当

### 値オブジェクト（8種）

| VO名 | 主な不変条件 |
|------|------------|
| ValidatorId | `L{n}-{nnn}` 形式、有効範囲L2-001〜L4-003（10種のみ） |
| ValidatorDefinition | validatorId.getLayer() と layer フィールドが一致。rules空配列不可 |
| ValidationRule | ruleName単位の等価性 |
| ValidationResult | passed=trueならerrors=[]（INV-5）。durationMs>=0（INV-7）。skipped=trueならpassed=true（INV-8） |
| LayerConfig | enabled=falseの全バリデータはスキップ（INV-8）。thresholdsキーはバリデータ固有閾値名（INV-9） |
| DriftReport | direction は "design→code" または "code→design" のみ（INV-10） |
| ConsistencyReport | mismatchPairs + checkTargets の値等価性 |
| DeadCodeReport | unusedExports + unreachableCode + gcRecommended の値等価性 |

### ドメインサービス（5種）

| サービス名 | 責務 | 使用ポート |
|-----------|------|----------|
| ValidatorRegistry | 全10定義のカタログ管理・選択実行 | なし |
| ValidatorExecutionService | 順次実行・ValidationResult[]集約 | ValidatorConfigPort + 各バリデータPortすべて |
| DriftDetectionService | 設計⇔コード双方向乖離検出（L4-001） | DesignDocumentPort, SourceCodeAnalyzerPort |
| ConsistencyCheckService | 文書間整合性検証（L4-002） | DesignDocumentPort, AdrReferencePort |
| DeadCodeDetectionService | 未使用コード検出（L4-003） | SourceAnalysisPort |

---

## 4. UseCase概要

| UseCase | 対応ストーリー | 実行フェーズ | 主な責務 |
|---------|-------------|------------|---------|
| RunL2ValidatorsUseCase | H08-01 | Pre-commit | L2-001〜L2-003の3バリデータを実行し ValidationResultContract[]を返す |
| RunL3ValidatorsUseCase | H08-02/H08-03 | CI | L3-001〜L3-004の4バリデータを実行（preset連動でstrictOnly制御） |
| RunL4ValidatorsUseCase | H08-04/H08-05/H08-06 | Scheduled | L4-001〜L4-003の3バリデータを実行（strictMode制御） |
| RunQuickModeUseCase | H08-04 | Pre-commit | RelaxationProfileに基づく緩和実行（L4常にスキップ） |
| AggregateValidationResultsUseCase | H08-05 | 任意 | ValidationResultContract[]を集約し AggregatedValidationReportを生成 |
| RunFullValidationUseCase | H08-06 | CI/Scheduled | L2+L3+L4を統合実行し統合レポートを返す |

---

## 5. Engineering Perspective レビュー観点

### ケント・ベック視点（TDD適切性）

検証するポイント:
1. テストケースがRed-Green-Refactorサイクルを想定した粒度か（VO単位・サービス単位での細かいステップ）
2. YAGNIに反する過剰テスト（存在しないシナリオや未実装部分のテスト）はないか
3. 小さなステップで実装可能なケース設計か（1テストケース1検証観点）

注目ポイント:
- UT-VID（23ケース）: ValidatorIdの形式検証が網羅的だが、L2-004等の「存在しない有効値」境界の重複テストがないか
- UT-VES-007/UT-VES-008: エラーハンドリングの2ケースが同一Port例外に対して異なる期待結果を持つ設計の妥当性

### マーティン・ファウラー視点（テスト設計スメル）

検証するポイント:
1. テストケースが長すぎる・複雑すぎる設計（Test Method Too Long）
2. テスト間の依存関係が生じる設計
3. セットアップが過剰で本質が見えにくい設計

注目ポイント:
- IT-UC-RunL2〜RunFull系の入力DTOがケースによって非常に長い（JSON形式のモック設定記述）
- IT-UC-Agg系（H08-05）が入力DTOにresults配列を直接埋め込んでいる設計がモック不使用のため複雑になる可能性

### アンクル・ボブ視点（SOLID・責務分離）

検証するポイント:
1. ユニットテストとITテストの責務が適切に分離されているか（SRP）
2. テスト対象のインターフェース設計がDIPに沿っているか
3. 各テストケースが単一の振る舞いをテストしているか

注目ポイント:
- UT-VES系はPortをモックしているが、ドメインサービス間（ValidatorExecutionService → DriftDetectionService等）の依存をテストするケースがUT/ITどちらに配置されるべきかの境界
- IT-REPO-HCAdapter系: Infrastructure Adapterのテストがファイルシステム依存を直接使用している設計の妥当性

### エリック・エヴァンス視点（ドメイン表現）

検証するポイント:
1. テストケース名・シナリオにユビキタス言語（ドメイン用語）が使われているか
2. テスト対象の集約境界が適切か（集約をまたぐテストがユニットテストに混入していないか）
3. ドメインの不変条件テストとアプリケーション層テストが混在していないか

注目ポイント:
- UT-VRS系（ValidationResult）: INV-5〜INV-8の不変条件テストがドメイン内に正しく配置されているか
- DriftReport・ConsistencyReport系: L4系VOのドメイン概念（乖離・整合性）がテスト名に反映されているか

---

## 6. 評価方法

カバレッジ分析は以下の対応マトリクスで実施する:

| 評価軸 | 判定基準 |
|--------|---------|
| 受け入れ基準カバレッジ | 全H08-01〜H08-06のACに1対1以上のテストケースが存在する |
| ドメインロジックカバレッジ | 全不変条件（INV-1〜INV-10）に対するテストが存在する |
| UseCaseカバレッジ | 全6UseCaseの正常系・異常系がカバーされている |
| APIカバレッジ | 全CLIハンドラー（RunValidators/RunQuickMode/Report）のテストが存在する |
| Engineering Perspective | 4視点全ての評価が実施されている |
