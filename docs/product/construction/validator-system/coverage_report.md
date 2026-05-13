# テストカバレッジレポート: validator-system

@story-id H08-01
@story-id H08-02
@story-id H08-03
@story-id H08-04
@story-id H08-05
@story-id H08-06
> **Unit ID**: validator-system
> **作成日**: 2026-03-19
> **フェーズ**: Phase 2（カバレッジ分析） + Phase 3（自己レビュー済み）
> **対象Wave**: Wave 2（品質検証レイヤー）
> **インプット**:
> - `docs/product/units/validator_system_unit.md`
> - `docs/product/construction/validator-system/domain_model.md`
> - `docs/product/construction/validator-system/logical_design.md`
> - `docs/product/construction/validator-system/unit_test_design.md`
> - `docs/product/construction/validator-system/it_test_design.md`

---

## 1. サマリー

### カバレッジ率テーブル

| 評価軸 | テストケース総数 | カバー済み | 未カバー | カバレッジ率 | 判定 |
|--------|--------------|-----------|---------|------------|------|
| 受け入れ基準（AC） | 24件 | 22件 | 2件 | 91.7% | **警告** |
| ドメイン不変条件（INV） | 10件（INV-1〜INV-10） | 10件 | 0件 | 100% | **合格** |
| VO生成・メソッドテスト | 74ケース | 74ケース | 0件 | 100% | **合格** |
| ドメインサービステスト | 46ケース | 42ケース | 4件 | 91.3% | **警告** |
| UseCase（正常系） | 29ケース | 29ケース | 0件 | 100% | **合格** |
| UseCase（異常系） | 14ケース | 14ケース | 0件 | 100% | **合格** |
| Infrastructure Adapter | 35ケース | 35ケース | 0件 | 100% | **合格** |
| CLIハンドラー | 22ケース | 22ケース | 0件 | 100% | **合格** |
| 境界値・異常系（BND） | 17ケース | 17ケース | 0件 | 100% | **合格** |

### 判定結果

**総合判定: 警告（WARNING）** — 受け入れ基準2件（H08-01-AC-4のno-domain-mock、H08-01-AC-5のE2E seed pattern）と、ドメインサービスのValidatorExecutionServiceにおける`executeWithRelaxation()`の異常系4ケースが未カバー。

**ドメインサービス未カバー4件の内訳**:
- UT-VES-013（相当）: `executeWithRelaxation()`でPort例外発生時のfail変換 — 設計書に記述なし
- UT-VES-014（相当）: `executeWithRelaxation()`でrelaxationProfile不変条件違反時のエラー — 設計書に記述なし
- IT-UC-RunL3で閾値未達時のUseCase判定 — ドメインサービスではなくUseCase層だが、ValidatorExecutionServiceのカバレッジ未達として計上
- `executeWithRelaxation()`の「空緩和プロファイル = 通常execute()と同一結果」の確認（UT-VES-012）は正常系として設計済み。異常系2件が未カバー

---

## 2. 受け入れ基準カバレッジ詳細

### H08-01: L2 test-qualityバリデータ

| AC番号 | 受け入れ基準 | 対応テストケース | カバー状況 |
|--------|------------|----------------|----------|
| H08-01-AC-1 | AAAパターン構造の検証 | IT-REPO-TestQuality-001（正常）、IT-REPO-TestQuality-003（違反検出） | **カバー済み** |
| H08-01-AC-2 | `actual`命名規約の検証 | IT-REPO-TestQuality-002（actual→result違反検出） | **カバー済み** |
| H08-01-AC-3 | single-actの検証 | IT-REPO-TestQuality-003（single-act違反） | **カバー済み** |
| H08-01-AC-4 | no-domain-mockの検証 | 対応テストケースが存在しない | **未カバー** |
| H08-01-AC-5 | E2E seed patternの検証 | 対応テストケースが存在しない | **未カバー** |
| H08-01-AC-6 | describe/it命名規約の検証 | IT-REPO-TestQuality-004（英語テスト名違反） | **カバー済み** |
| H08-01-AC-7 | 違反時HarnessErrorに`fix_example`を含める | IT-REPO-TestQuality-002〜004の違反系（errors[]の構造確認） | **カバー済み（間接的）** |

**備考**: H08-01-AC-7はfindingsの`fix_example`フィールド存在を明示的にアサートするケースがなく間接的カバーに留まる。

### H08-02: L3 security+performanceバリデータ

| AC番号 | 受け入れ基準 | 対応テストケース | カバー状況 |
|--------|------------|----------------|----------|
| H08-02-AC-1 | ハードコード秘密情報の検出 | IT-REPO-Security-002（APIキー検出） | **カバー済み** |
| H08-02-AC-2 | SQLインジェクションパターン検出 | IT-REPO-Security-003（SQLi検出） | **カバー済み** |
| H08-02-AC-3 | ループ内await検出 | IT-REPO-Perf-002（ループ内await） | **カバー済み** |
| H08-02-AC-4 | N+1クエリパターン検出 | 直接対応するテストケースなし（IT-REPO-Perf-002はloop-awaitのみ） | **部分的カバー** |
| H08-02-AC-5 | bundleSizeLimit（strictのみ）の検証 | IT-REPO-Perf-003（strictOnly=false時スキップ） | **カバー済み** |
| H08-02-AC-6 | HarnessErrorに`adr_ref`+`fix_example`を含める | IT-REPO-Security-002〜003、IT-REPO-Perf-002（暗黙的） | **カバー済み（間接的）** |

### H08-03: L3 coverageバリデータ

| AC番号 | 受け入れ基準 | 対応テストケース | カバー状況 |
|--------|------------|----------------|----------|
| H08-03-AC-1 | coverageThreshold読み取りと閾値検証 | IT-REPO-HCAdapter-002（L3 thresholds取得）、IT-REPO-Coverage-001〜002 | **カバー済み** |
| H08-03-AC-2 | standard（90%）の閾値検証 | IT-REPO-HCAdapter-002（preset=standard, coverageThreshold=90） | **カバー済み** |
| H08-03-AC-3 | strict（95%）の閾値検証 | IT-REPO-HCAdapter-004（preset=strict, strictOnly=true）で設定取得はカバー。95%の閾値値テストは間接的 | **部分的カバー** |
| H08-03-AC-4 | 閾値未達HarnessErrorに現在値と不足分を含める | 直接的な閾値未達検証ケース（UseCase層での数値比較）なし | **未カバー（潜在的）** |

**備考**: H08-03-AC-4はRunL3ValidatorsUseCase内での閾値比較ロジック（90%未満の場合のHarnessError生成）に対応するテストケースがIT-UCレベルにない。

### H08-04: L4 drift-detectバリデータ

| AC番号 | 受け入れ基準 | 対応テストケース | カバー状況 |
|--------|------------|----------------|----------|
| H08-04-AC-1 | 設計→コード乖離検出 | UT-DDS-001、IT-UC-RunL4-004 | **カバー済み** |
| H08-04-AC-2 | コード→設計乖離検出 | UT-DDS-002、UT-DDS-004 | **カバー済み** |
| H08-04-AC-3 | @unitメタデータ参照Unitの設計文書存在検証 | IT-REPO-Meta-001〜004（関連）、直接UT/ITケースは限定的 | **部分的カバー** |
| H08-04-AC-4 | inception文書の存在検証 | IT-REPO-PhaseGate-001〜003（Phase Gate前提条件） | **カバー済み** |
| H08-04-AC-5 | HarnessErrorに方向・対象要素・推奨アクションを含める | UT-DRP-004〜005（DriftReport.toHarnessError()） | **カバー済み** |

### H08-05: L4 consistency-checkバリデータ

| AC番号 | 受け入れ基準 | 対応テストケース | カバー状況 |
|--------|------------|----------------|----------|
| H08-05-AC-1 | 文書間レイヤー整合性検証 | UT-CCS-001〜002、IT-UC-RunL4-003 | **カバー済み** |
| H08-05-AC-2 | 設計文書間の用語不一致検出 | UT-CCS-002（layer記述不整合） | **カバー済み** |
| H08-05-AC-3 | HarnessErrorに`adr_ref`+`fix_example`+不整合箇所を含める | UT-CSR-006（toHarnessErrors）、IT-REPO-AdrRef-001〜004 | **カバー済み** |
| H08-05-AC-4 | 検証対象ペアの設定可能性 | IT-UC-RunL4-003（targetUnits指定） | **カバー済み** |

### H08-06: L4 dead-codeバリデータ

| AC番号 | 受け入れ基準 | 対応テストケース | カバー状況 |
|--------|------------|----------------|----------|
| H08-06-AC-1 | 未使用エクスポート検出 | UT-DCD-001、IT-REPO-ImportGraph-001〜002 | **カバー済み** |
| H08-06-AC-2 | 到達不能コード検出 | UT-DCD-002 | **カバー済み** |
| H08-06-AC-3 | HarnessErrorに`adr_ref`+`fix_example`+ファイルパス・行番号を含める | UT-DCR-006（toHarnessErrors）、UT-DCR-002（unreachableCode.range） | **カバー済み** |
| H08-06-AC-4 | strictプリセット限定（deadCodeGC制御） | UT-DCD-004〜005（gcRecommended制御）、IT-UC-RunL4-002（strictOnly=false時スキップ） | **カバー済み** |

---

## 3. ドメインロジックカバレッジ詳細

### 不変条件カバレッジ（INV-1〜INV-10）

| 不変条件 | 内容 | 対応テストケース | カバー状況 |
|---------|------|----------------|----------|
| INV-1 | ValidatorIdは `L{n}-{nnn}` 形式 | UT-VID-005〜UT-VID-012（形式違反）、UT-VID-001〜004（正常形式） | **カバー済み** |
| INV-2 | 有効範囲はL2-001〜L4-005の15バリデータのみ | UT-VID-006〜007（L0/L5無効）、未登録ID無効、L4-004/L4-005有効境界 | **カバー済み** |
| INV-3 | externalPolicyRef持ちバリデータのポリシー解決はRegistry経由 | UT-VDF-004〜005（requiresExternalPolicy）、UT-VRG-004（getDefinition）  | **カバー済み** |
| INV-4 | strictOnly=trueはstrictプリセット未設定時スキップ | UT-VES-002〜003（strictOnly制御）、IT-UC-RunL3-002〜003 | **カバー済み** |
| INV-5 | passed=trueの場合errors[]は空配列 | UT-VRS-005（矛盾状態のエラー）、UT-VRS-001（pass正常系） | **カバー済み** |
| INV-6 | HarnessError.codeにはValidatorId相当のErrorCodeを使用 | UT-DRP-004（code:"L4-001"）、UT-CSR-006（code:"L4-002"）、UT-DCR-006（code:"L4-003"） | **カバー済み** |
| INV-7 | durationMs >= 0 | UT-VRS-004（durationMs:0境界値）、UT-VRS-006（-1エラー）、UT-BND-005〜006 | **カバー済み** |
| INV-8 | enabled=falseバリデータはスキップ。skipped=trueならpassed=true、errors=[] | UT-VRS-003（skip()ファクトリ）、UT-VRS-007（不変条件確認）、UT-VES-001、UT-LCF-007 | **カバー済み** |
| INV-9 | thresholdsキーはバリデータ固有閾値名 | UT-LCF-003（coverageThreshold:90）、UT-LCF-008〜009（getThreshold） | **カバー済み** |
| INV-10 | DriftReport.directionは2値のみ | UT-DRP-001〜003（direction検証）、UT-BND-015（無効値エラー） | **カバー済み** |

### ビジネスルールカバレッジ

| ビジネスルール | 説明 | カバー状況 |
|------------|------|----------|
| ValidatorDefinition.rules最低1件 | 空配列不可 | UT-VDF-002（空配列エラー）、UT-BND-012 — **カバー済み** |
| 重複ValidatorId登録禁止 | Registryに同一IDを2件以上登録するとエラー | UT-VRG-002 — **カバー済み** |
| ValidatorId前方一致大文字強制 | 小文字"l2-001"は無効 | UT-VID-005 — **カバー済み** |
| executer順序保証 | 結果順序は入力順序と一致 | UT-VES-005〜006 — **カバー済み** |
| 個別バリデータ例外のfail変換 | 1バリデータの例外が全体を止めない | UT-VES-007 — **カバー済み** |

---

## 4. UseCaseカバレッジ詳細

### RunL2ValidatorsUseCase（H08-01）

| 観点 | ケース数 | カバー済み | 評価 |
|------|---------|----------|------|
| 正常系（全L2実行・部分実行・fail返却・skip返却） | 4件 | 4件 | **合格** |
| 異常系（無効ID・Port例外・空targetPaths） | 3件 | 3件 | **合格** |

### RunL3ValidatorsUseCase（H08-02/H08-03）

| 観点 | ケース数 | カバー済み | 評価 |
|------|---------|----------|------|
| 正常系（全L3実行・strictOnly制御・coverageReportPath） | 5件 | 5件 | **合格** |
| 異常系（カバレッジレポート不在） | 1件 | 1件 | **合格** |

**未カバー**: L3-003閾値未達（overallCoverage < threshold）のUseCase層での判定ロジックに対するテストケースが不足。IT-UC-RunL3でのcoverage閾値比較ケース（「coverageが90%未満の場合passed=false」）が存在しない。

### RunL4ValidatorsUseCase（H08-03）

| 観点 | ケース数 | カバー済み | 評価 |
|------|---------|----------|------|
| 正常系（全L4実行・strictMode制御・targetUnits指定・fail返却） | 4件 | 4件 | **合格** |
| 異常系（DesignDocumentReadError・SourceCodeAnalysisError） | 2件 | 2件 | **合格** |

### RunQuickModeUseCase（H08-04）

| 観点 | ケース数 | カバー済み | 評価 |
|------|---------|----------|------|
| 正常系（maintained指定・L4スキップ・twoPhaseRequired=false） | 3件 | 3件 | **合格** |
| 異常系（L4=true違反・null profile） | 2件 | 2件 | **合格** |

### AggregateValidationResultsUseCase（H08-05）

| 観点 | ケース数 | カバー済み | 評価 |
|------|---------|----------|------|
| 正常系（全pass・部分fail・skip集計・failOnWarning・レイヤー別集計・空配列・重複排除・freeze確認） | 8件 | 8件 | **合格** |

**強み**: このUseCaseのテストケースが最も充実しており、`Object.isFrozen`の検証（IT-UC-Agg-008）など堅牢性の確認も含まれる。

### RunFullValidationUseCase（H08-06）

| 観点 | ケース数 | カバー済み | 評価 |
|------|---------|----------|------|
| 正常系（全L2+L3+L4・includeL4=false・L2fail時） | 3件 | 3件 | **合格** |
| 異常系（L2例外・L3例外伝播） | 2件 | 2件 | **合格** |

---

## 5. APIカバレッジ詳細

### CLIハンドラーカバレッジ

| ハンドラー | 正常系 | バリデーション | 異常系（終了コード） | 総数 | 評価 |
|----------|------|--------------|-------------------|------|------|
| RunValidatorsHandler | 5件 | 2件 | 3件（0/1/2） | 10件 | **合格** |
| RunQuickModeHandler | 2件 | 2件 | 3件（0/1/2） | 7件 | **合格** |
| ReportValidationResultsHandler | 3件 | 2件 | — | 5件 | **合格** |

### 出力フォーマットカバレッジ

| フォーマット | テストケース | カバー状況 |
|------------|------------|----------|
| human（開発者向けコンソール） | IT-API-RunValidators-001、IT-API-RunQuick-001、IT-API-Report-001 | **カバー済み** |
| ci（CI/GitHub Actions向けJSON） | IT-API-RunValidators-003、IT-API-RunQuick-002、IT-API-Report-002 | **カバー済み** |
| agent（AIエージェント向け詳細テキスト） | IT-API-RunValidators-004 | **カバー済み（RunValidatorsのみ）** |

**ギャップ**: RunQuickModeHandlerとReportValidationResultsHandlerの`--format agent`に対するテストケースが不在。

### 終了コード体系

| 終了コード | 意味 | テストケース |
|----------|------|------------|
| 0 | 全バリデータpass | IT-API-RunValidators-008、IT-API-RunQuick-005 |
| 1 | 1件以上fail | IT-API-RunValidators-009、IT-API-RunQuick-006 |
| 2 | 実行エラー・I/O失敗 | IT-API-RunValidators-010、IT-API-RunQuick-007 |

---

## 6. Engineering Perspective 評価

### ケント・ベック視点: TDD適切性

| 観点 | 評価 | 詳細 |
|------|------|------|
| テスト粒度（Red-Green-Refactorサイクル適合性） | GOOD | VOテスト（UT-VID-001〜UT-DCR-007）はメソッド単位・不変条件単位で細かく分割されており、小さなステップで実装可能な設計になっている |
| YAGNIチェック（過剰テストなし） | WARNING | UT-VID-008〜012でL2-004/L2-000/空文字/桁数不足/桁数超過の計5ケースが設計されているが、これらはINV-1の正規表現検証1ケースで実質カバーできる範囲。境界値重複の可能性あり（後述） |
| 小ステップ実装可能性 | GOOD | UT-VRG-001〜015（ValidatorRegistry）は初期化→検索→レイヤー別取得→選択→存在確認と段階的に実装可能なケース構成 |
| ドメインサービスの分割粒度 | GOOD | ValidatorExecutionServiceをスキップ制御・順序・エラーハンドリング・時間計測・緩和実行の5グループに分類しており、TDDサイクルごとに機能を積み上げやすい |

**特記**: UT-VID-008（L2-004）とUT-BND-003（L4-004）は有効範囲超過という同一観点を2箇所でテストしている。これはBND系がVIDの重複テストになっており、YAGNI観点から1つに統合すべき候補。

### マーティン・ファウラー視点: テスト設計スメル

| スメル | 検出状況 | 対象テストケース | 推奨対応 |
|--------|---------|----------------|---------|
| Test Method Too Long（長大なセットアップ） | 検出あり | IT-UC-RunQuick-001: `relaxationProfile`の入力DTOが1ケースに全フィールドをインライン記述しており、設計書上の記述が非常に長い | seeding patternを使用しフィクスチャとして外部化することを推奨 |
| Duplicate Assertion（重複確認） | 軽微に検出 | UT-VID-001〜004は全て「生成成功」が期待結果で実質同一。4ケースを「有効な各レイヤー代表値で生成成功する」1グループに整理可能 | `it.each`相当のパラメタライズドテストへの統合を推奨 |
| Magic Number（テスト名・入力値の意味不明化） | 軽微に検出 | IT-UC-Agg-005の入力DTOに直接 `errors:[{code:"L2-002"}]` 等を埋め込んでいる。ケース名には現れない数値・文字列が多い | 定数またはビルダーパターンによるテストデータ構築を推奨 |
| Test Interdependency（テスト間依存） | 検出なし | UT系・IT-UC系・IT-REPO系の全グループがモックを明示的に定義しており、テスト間依存は設計上排除されている | — |
| Missing Negative（ハッピーパス偏重） | 一部検出 | IT-REPO-DesignDoc-003のキャッシュテストは「2回目がキャッシュから返る」ことを確認しているが、キャッシュ破損・TTL失効等の異常系がない | キャッシュ無効化ケースの追加を推奨 |

### アンクル・ボブ視点: SOLID・責務分離

| 原則 | 評価 | 詳細 |
|------|------|------|
| SRP（UT/IT責務分離） | GOOD | VO・ドメインサービスはUT（unit_test_design.md）、UseCase/Adapter/CLIはIT（it_test_design.md）に明確に分離されている。ドメイン不変条件はUT層でのみ検証し、IT層は「Portが呼ばれるか」「結果が正しく変換されるか」に集中している |
| DIP（インターフェース経由の依存） | GOOD | UT-DDS系・UT-CCS系・UT-DCD系はPort実装をモックし、ドメインサービスが具体的なインフラ技術に依存していないことをテスト設計が担保している。`it_test_design.md §6`の「biome-ast-engineはShared Kernel経由でvi.mock」という方針もDIPを遵守している |
| 責務混在の有無 | WARNING | UT-VES-007/UT-VES-008：個別バリデータの例外をfail変換するか（-007）vs `ValidatorExecutionError`としてスローするか（-008）という2ケースが存在するが、この2ケースは同一の「Port実装がエラーをthrowする」前提に対して異なる挙動を期待している。エラーの「種類」によって挙動が変わる設計であれば明示的なシナリオ差分の記述が必要 |
| ISP（インターフェース分離） | GOOD | 12ポートが各バリデータの責務ごとに独立定義されており、ValidatorExecutionServiceが全ポートを受け取るコンストラクタ設計（11依存）は凝集度上やや高いが、UseCaseテストではPort単位でモックできる設計になっている |
| OCP（拡張への開放） | GOOD | ValidatorRegistryに新しいValidatorDefinitionを追加するだけでConsumerのコードを変更せずに新バリデータを追加できる設計が、UT-VRG-001〜015のテストケースから確認できる |

**特記**: ValidatorExecutionServiceが11個の依存をコンストラクタで受け取る設計は、Unit Test粒度では全モックが必要になり、セットアップコードが肥大化するリスクがある。コンストラクタインジェクションの代替として、実行時のポート解決（ValidatorId→Port マッピング）を戦略パターンで実装し、テスト時はポートマップをオーバーライドする設計を検討すると、テストセットアップが簡略化できる。

### エリック・エヴァンス視点: ドメイン表現

| 観点 | 評価 | 詳細 |
|------|------|------|
| ユビキタス言語の使用 | GOOD | UT-DDS（DriftDetectionService）、UT-CCS（ConsistencyCheckService）、UT-DCD（DeadCodeDetectionService）というケースIDの略称にドメインサービス名が反映されている。ITテスト設計のシナリオ記述も「乖離検出」「整合性検証」「未使用エクスポート」等のユビキタス言語で記述されている |
| 集約境界の適切性 | GOOD | domain_model.md §2の「集約なし（VOパターン）」決定に従い、ValidatorDefinition VOの生成・等価性テストのみUT層で検証。集約ライフサイクルテスト（永続化・状態遷移）が存在せず、適切な設計判断が反映されている |
| ドメイン不変条件とアプリケーション層テストの分離 | GOOD | ValidationResultの不変条件（INV-5〜INV-8）はUT-VRS-005〜007でドメイン層テストとして独立。IT層（IT-UC系）では「UseCaseからskipped=trueが返る」という**アプリケーション観点**のテストになっており、混在していない |
| 乖離・整合性ドメインの概念表現 | WARNING | UT-DDS-001〜004のケースはDriftReportの`direction`フィールドで方向を区別しているが、ケース名が「設計文書に存在するがコードに存在しない要素あり」という実装観点の記述になっている。「設計先行乖離の検出」「実装先行乖離の検出」等のユビキタス言語への置き換えが望ましい |
| L4バリデータドメインモデルの表現 | WARNING | DeadCodeDetectionService（UT-DCD）の`gcRecommended`フラグは「strictプリセット時のGC推奨」という概念だが、テストケース名が「`strictOnly: true` の設定 + デッドコードあり」という技術的記述になっており、ドメイン言語（「厳格プリセット適用時にGC推奨が設定される」等）での表現に改善余地がある |

### Engineering Perspective 総合判定

**判定: GOOD（改善推奨あり）**

**根拠**:

1. **良好な点**: ドメインモデルの4層防御（L2-L4）、VOパターンへの集約降格、ポートインターフェースによるDIP遵守がテスト設計に適切に反映されている。不変条件（INV-1〜INV-10）の全カバーと、UseCaseの正常系・異常系分離は高水準のテスト設計と評価できる。

2. **改善推奨（BLOCKではなく推奨）**:
   - **UT-VID境界値重複**: UT-VID-008〜012のパターン検証5ケースとUT-BND-003〜004が重複。パラメタライズドテストへの統合で保守性向上
   - **UT-VES-007/008の曖昧さ**: 同一前提（Port例外）で異なる期待結果を持つ2ケースの分岐条件の明示化が必要
   - **ValidatorExecutionService 11依存のセットアップ複雑度**: テスト実装時にセットアップが肥大化するリスクへの設計上の対処
   - **テストケース名のユビキタス言語化**: UT-DDS・UT-DCD系のケース名を実装観点からドメイン観点へ改善

---

## 7. 未カバー項目一覧（優先度付き）

| 優先度 | 未カバー項目 | 関連AC | 理由・影響 |
|--------|-----------|--------|----------|
| P1 (High) | no-domain-mock検証（H08-01-AC-4） | H08-01-AC-4 | L2-003の6ルールのうち1ルールが完全未テスト。「ドメイン層のモック禁止」はharness品質の核心ルール |
| P1 (High) | E2E seed pattern検証（H08-01-AC-5） | H08-01-AC-5 | L2-003の6ルールのうち1ルールが完全未テスト |
| P1 (High) | L3-003 coverageThreshold未達時のUseCase層判定ロジック | H08-03-AC-4 | RunL3ValidatorsUseCaseがoveral Coverage < thresholdの場合にpassed=falseを返す挙動のITテストがない |
| P2 (Medium) | N+1クエリパターン検出（H08-02-AC-4） | H08-02-AC-4 | IT-REPO-Perf系のテストがloop-awaitのみでN+1検出テストが未記述 |
| P2 (Medium) | strictプリセット95%閾値の明示テスト（H08-03-AC-3） | H08-03-AC-3 | preset=strict時のcoverageThreshold=95が適切にLayerConfigに設定されることの明示テストがない |
| P2 (Medium) | UT-VES-011/012の`executeWithRelaxation()`異常系 | — | executeWithRelaxation()は正常系のみでPort例外・プロファイル不正の異常系テストが設計されていない |
| P3 (Low) | agent形式のRunQuickMode/ReportHandlerテスト | — | RunValidatorsHandlerのみagentフォーマットがテストされ、他2ハンドラーのagentフォーマットが未テスト |
| P3 (Low) | MarkdownDesignDocumentAdapterのキャッシュ無効化ケース | — | IT-REPO-DesignDoc-003でキャッシュ有効を確認しているがキャッシュ破損等の異常系なし |
| P3 (Low) | HarnessError.fix_example/adr_refフィールドの明示的アサーション | H08-01-AC-7, H08-02-AC-6 | 違反系テストでerrors[]の存在は確認されるが`fix_example`の内容が含まれているかの明示的検証なし |

---

## 8. 推奨追加ケース

### 優先度P1: 即時追加推奨

**1. no-domain-mock検証ケース（IT-REPO-TestQuality-006）**

```
シナリオ: ドメインクラス（HarnessError等）をvitest.fn()でモックしているテストファイルはL2-003エラーが返る
入力: targetPaths: ["tests/domain-mocked.test.ts"]
事前データ: ファイル内容: `vi.mock('scripts/harness/shared-kernel/harness-error', () => ({ HarnessError: vi.fn() }))`
期待結果: results[0].passed=false, violations にL2-003エラー（suggestion: "no-domain-mock違反"相当）
```

**2. E2E seed pattern検証ケース（IT-REPO-TestQuality-007）**

```
シナリオ: E2EテストでDB直接生成（seed patternを使わず）しているファイルはL2-003エラーが返る
入力: targetPaths: ["tests/e2e/setup-without-seed.test.ts"]
事前データ: E2E用テストファイルにseed helperを使わない直接データ生成コードが含まれる
期待結果: results[0].passed=false, violations にL2-003エラー
```

**3. coverageThreshold未達UseCase判定ケース（IT-UC-RunL3-007）**

```
シナリオ: overallCoverageが90%未満の場合、L3-003がpassed=falseを返す
入力: { targetPaths: ["src/"] }
モック設定: ValidatorConfigPort: L3 LayerConfig(enabled=true, thresholds:{coverageThreshold:90})。
          CoverageReportPort: { overallCoverage: 85, perFileCoverage: [...] }を返す
期待結果: L3-003のValidationResultContract.passed=false。
          errors[0].code="L3-003"。errors[0].message に現在のカバレッジ値(85%)と不足分(5%)が含まれる
```

### 優先度P2: 追加推奨

**4. N+1クエリパターン検出ケース（IT-REPO-Perf-004）**

```
シナリオ: forEachループ内でDB呼び出しを繰り返すパターンを含むファイルはL3-002エラーが返る
入力: targetPaths: ["src/n-plus-one.ts"], thresholds: {}
事前データ: biome-ast-engine: N+1パターン違反を返す
期待結果: { passed: false, findings: [{ code:"L3-002", message: "N+1 query pattern" }] }
```

**5. executeWithRelaxation()異常系ケース（UT-VES-013〜014）**

```
UT-VES-013:
シナリオ: executeWithRelaxation()でPort実装がエラーをthrowした場合、ValidationResult.fail()に変換される
前提: 緩和プロファイルのmaintainedバリデータのPortがエラーをthrow
期待: 個別エラーがfail変換されて返る（他バリデータに影響なし）

UT-VES-014:
シナリオ: executeWithRelaxation()のprofile.l4.all=trueの場合、InvariantViolationErrorがスローされる
前提: ValidatorRelaxationProfile.l4.all=true（不変条件違反）
期待: InvalidRelaxationProfileError（またはInvariantViolationError）
```

**6. strictプリセット95%閾値の明示ケース（IT-REPO-HCAdapter-009）**

```
シナリオ: preset="strict"の場合、L3のcoverageThresholdが95にマッピングされる
操作: getLayerConfig("L3")
事前データ: phasegate.config.json: preset="strict"
期待結果: LayerConfig.thresholds.coverageThreshold === 95
```

---

## 9. 次のアクション

| アクション | 担当フェーズ | 優先度 | 対応文書 |
|-----------|-----------|--------|---------|
| no-domain-mock / E2E seed pattern のInfrastructure Adapterテストケース追加 | story-implementor（H08-01実装） | P1 | `it_test_design.md` §3 BiomeAstTestQualityAnalyzerAdapterに追記 |
| L3-003 coverageThreshold未達UseCaseテストケース追加 | story-implementor（H08-03実装） | P1 | `it_test_design.md` §2 RunL3ValidatorsUseCaseに追記 |
| executeWithRelaxation()異常系テストケース追加 | story-implementor（H08-04実装） | P2 | `unit_test_design.md` §3 ValidatorExecutionServiceに追記 |
| N+1クエリテストケース追加 | story-implementor（H08-02実装） | P2 | `it_test_design.md` §3 AstPerformanceScannerAdapterに追記 |
| UT-VID境界値重複ケースのパラメタライズドテスト整理 | story-implementor（任意フェーズ） | P3 | `unit_test_design.md` §2 ValidatorId境界値テスト整理 |
| UT-DDS/UT-DCD系テストケース名のユビキタス言語化 | story-implementor（任意フェーズ） | P3 | `unit_test_design.md` §3 DriftDetectionService・DeadCodeDetectionServiceのケース名を改訂 |
| HarnessError.fix_example/adr_refの明示アサーション追加 | story-implementor（H08-01/02実装） | P3 | `it_test_design.md` 各Adapterテストに`violations[0].fix_example`のアサーション追加 |

## WI-143: Doctor Drift Check

@work-item-id WI-143

The validator surface receives WI-first enforcement through `phasegate doctor` rather than a new L2/L3 validator. Unit tests cover the red finding for zero WI directories plus ad-hoc plans, the `phase-gate` relaxed-gate message, and the non-finding path when a WI directory exists.

## WI-108: CI Check Layer Visibility

@work-item-id WI-108

`phasegate:ci-check --json` exposes L2/L3/L4 validator result items, including disabled L4 validators as `skipped: true`. This ensures validator-system output can prove the public full-CI contract did not silently collapse to L3-only execution.
<!-- @work-item-id WI-132, WI-133, WI-136, WI-137, WI-138 -->
## G4 Contract Traceability Coverage

| WI | Evidence |
|---|---|
| WI-132 | `contract-traceability-coverage-service.test.ts` required behavior and Port adapter contract cases; `run-l2-validators-usecase.test.ts` L2-015 fail mapping |
| WI-137 | Error contract shape, exit-code, and error-path cases in `contract-traceability-coverage-service.test.ts` |
| WI-136 | State machine docs/code mismatch, terminal transition, and missing transition cases in `contract-traceability-coverage-service.test.ts` |
| WI-133 | Boundary case coverage checks in `contract-traceability-coverage-service.test.ts` |
| WI-138 | Traceability graph completeness checks in `contract-traceability-coverage-service.test.ts` |
