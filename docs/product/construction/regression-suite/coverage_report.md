# テストカバレッジレポート: regression-suite

<!-- @coverage-gating: ungated-legacy -->
<!-- WI-258 / ADR-030 §Decision.3.②: 本レポートは attestation ゲート導入前の非ゲート ✅ を含む見える負債。各 ✅ に @attestation を付与して段階返済し、返済完了後にこのマーカーを除去すること。L2-016 は本マーカーがある間 warning で件数報告する。 -->

@story-id H14-01
@story-id H14-02
@story-id H14-03
@story-id H15-01
@story-id H15-02
> **作成日**: 2026-03-20
> **Unit ID**: regression-suite
> **Wave**: 3

---

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 25 | 0 | 100% |
| ドメインロジック（不変条件） | 12 | 0 | 100% |
| UseCase | 7 | 0 | 100% |
| Infrastructure Adapter | 7 | 0 | 100% |
| Presentation Handler（テストスイート統合フロー） | 4 | 0 | 100% |
| **総合** | **55** | **0** | **100%** |

### テストケース数内訳

| テスト種別 | ケース数 |
|----------|---------|
| ユニットテスト（unit_test_design.md） | 127件 |
| 統合テスト（it_test_design.md） | 68件 |
| **合計** | **195件** |

### 判定結果

- ✅ 100%: 全受け入れ基準・不変条件・UseCase・Infrastructure Adapter・統合フローが網羅されている。テストロジック設計（story-implementor）に進む条件を満たす。

---

## 2. 受け入れ基準カバレッジ

### H14-01: K1-K13回帰テスト整備

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H14-01-AC-1 | K1（4層防御）: L1-L4各レイヤーのバリデータ正常動作を検証する回帰テスト | IT-UC-RunKReq-001, IT-UC-RunKReq-002, IT-UC-RunKReq-003, IT-UC-RunKReq-004, IT-API-KReqInteg-001 | ✅ カバー済 |
| H14-01-AC-2 | K2（Phase Gate）: phase-gateの3層構造検証テスト | IT-UC-RunKReq-001, IT-API-KReqInteg-001, IT-REPO-SuiteRegistry-001 | ✅ カバー済 |
| H14-01-AC-3 | K3（Biome AST）: Biome AST解析（importグラフ + 循環依存）の回帰テスト | IT-UC-RunKReq-001, IT-REPO-ImportAnalyzer-001, IT-REPO-ImportAnalyzer-002, IT-REPO-ImportAnalyzer-003 | ✅ カバー済 |
| H14-01-AC-4 | K3.5〜K13: メタデータ強制・テスト品質・DDD・2Phase・DocSplit・Cascade・AgentLesson・Security・Drift・Consistency・Config回帰テスト | IT-UC-RunKReq-001, IT-UC-RunKReq-002, IT-API-KReqInteg-001, IT-REPO-SuiteRegistry-001 | ✅ カバー済 |
| H14-01-AC-5 | SuiteId k-requirements が StaticSuiteRegistryAdapter から取得できること | IT-REPO-SuiteRegistry-001, UT-RS-020〜023 | ✅ カバー済 |
| H14-01-AC-6 | TestRunnerPort（VitestTestRunnerAdapter）がKRequirementTest[]を実行してTestExecutionSummaryを返すこと | IT-REPO-VitestRunner-001, IT-REPO-VitestRunner-002, IT-REPO-VitestRunner-005 | ✅ カバー済 |
| H14-01-AC-7 | CoverageRate が CiGateConfig.coverageThreshold と照合されること | IT-UC-RunKReq-002, IT-UC-RunKReq-003, IT-API-KReqInteg-002, UT-RS-154 | ✅ カバー済 |
| H14-01-AC-8 | 全回帰テストのCIゲートへの組み込み（CiGateResultWriterPort経由で結果出力） | IT-UC-RunKReq-001, UT-RS-153, IT-REPO-CiGateWriter-001, IT-REPO-CiGateWriter-002 | ✅ カバー済 |

### H14-02: K14-K15回帰テスト + エージェント非依存ガード

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H14-02-AC-1 | K14回帰テスト: Phase Dependency Modelの3層構造・Level間依存強制の回帰テスト | IT-UC-RunK14K15-001, IT-UC-RunK14K15-002, IT-UC-RunK14K15-003 | ✅ カバー済 |
| H14-02-AC-2 | K15回帰テスト: plan文書なしのPhase 2移行拒否の回帰テスト | IT-UC-RunK14K15-001, IT-UC-RunK14K15-002, IT-UC-RunK14K15-003 | ✅ カバー済 |
| H14-02-AC-3 | エージェント非依存ガード: coreモジュールがエージェント固有APIをimportしていないことを検証 | IT-UC-AgentGuard-001, IT-UC-AgentGuard-002, IT-API-AgentInteg-001, IT-API-AgentInteg-002 | ✅ カバー済 |
| H14-02-AC-4 | エージェント非依存ガード: Adapterモジュールのみがエージェント固有APIを使用していること（allowedPaths許容） | IT-UC-AgentGuard-003, UT-RS-174 | ✅ カバー済 |

### H14-03: Go/No-Go Gate品質側3条件回帰テスト

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H14-03-AC-1 | GNG-4「yolo/skip-permissions不採用」の検証テスト | IT-UC-RunGng-001, IT-REPO-SuiteRegistry-002, UT-RS-055〜057 | ✅ カバー済 |
| H14-03-AC-2 | GNG-5「2-Phase Execution維持」の検証テスト | IT-UC-RunGng-001, IT-UC-RunGng-002 | ✅ カバー済 |
| H14-03-AC-3 | GNG-8「デフォルトOFF」の検証テスト | IT-UC-RunGng-001, IT-UC-RunGng-002 | ✅ カバー済 |
| H14-03-AC-4 | 全3条件のCIゲートへの組み込み | IT-UC-RunGng-003, IT-REPO-CiGateWriter-001 | ✅ カバー済 |

### H15-01: v0 143テスト仕様のv1再実装

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H15-01-AC-1 | v0テスト仕様の移行対象分析と移行対象リストの作成 | IT-UC-AnalyzeMig-001, IT-UC-AnalyzeMig-002, IT-UC-AnalyzeMig-003, UT-RS-160〜165 | ✅ カバー済 |
| H15-01-AC-2 | 各テスト仕様のv1コードベースでの再実装（migrate/migrateWithModification/skipの状態遷移） | UT-RS-003〜017, IT-UC-MigrateV0-001, IT-UC-MigrateV0-003, IT-UC-MigrateV0-004 | ✅ カバー済 |
| H15-01-AC-3 | Biome移行に伴う修正が必要なテストの特定と修正（BiomeModificationSpec生成） | UT-RS-007, UT-RS-118〜124, UT-RS-164, IT-UC-MigrateV0-003 | ✅ カバー済 |
| H15-01-AC-4 | 再実装された全テストが pnpm test で実行可能（confirmExecute=trueで全件MigrationMappingRepositoryPortに保存） | IT-UC-MigrateV0-001, IT-UC-MigrateV0-002, IT-API-V0MigInteg-002 | ✅ カバー済 |
| H15-01-AC-5 | v0テスト仕様とv1テスト実装の対応表の作成（v0_v1_test_mapping.md 永続化） | IT-REPO-MigrationRepo-001〜005, IT-API-V0MigInteg-003 | ✅ カバー済 |

### H15-02: v1再実装テストのCIゲート化

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H15-02-AC-1 | CIパイプラインにv1再実装テスト全件実行のステップを追加（v0-migrationスイートのrequiredSuiteIds追加） | IT-UC-ConfigCiGate-004, IT-API-CiGateInteg-002 | ✅ カバー済 |
| H15-02-AC-2 | 1件でもテスト失敗があればCIが失敗する設定（gateResult='no-go'） | IT-UC-RunKReq-003, IT-API-KReqInteg-002, IT-REPO-CiGateWriter-002 | ✅ カバー済 |
| H15-02-AC-3 | テスト実行結果のサマリー（通過数/失敗数/全体数）のCI出力への含有 | IT-REPO-CiGateWriter-001, IT-REPO-CiGateWriter-003, UT-RS-104〜113 | ✅ カバー済 |
| H15-02-AC-4 | テストカバレッジ90%閾値のv1再実装テストへの適用 | IT-UC-ConfigCiGate-001, IT-UC-ConfigCiGate-002, IT-API-CiGateInteg-001, UT-RS-091〜093 | ✅ カバー済 |

---

## 3. ドメインロジック（不変条件）カバレッジ

| INV ID | 不変条件内容 | 対応テストケースID | カバー状態 |
|--------|------------|-----------------|----------|
| INV-1 | V0TestMigration: migrate() は pending 状態でのみ呼び出し可能。二重移行は HarnessError を発生させる | UT-RS-003, UT-RS-004, UT-RS-005, UT-RS-006 | ✅ カバー済 |
| INV-2 | V0TestMigration: migrateWithModification() は pending 状態でのみ呼び出し可能 | UT-RS-007, UT-RS-008 | ✅ カバー済 |
| INV-3 | V0TestMigration: skip() は pending 状態でのみ呼び出し可能 | UT-RS-010, UT-RS-011, UT-RS-012, UT-RS-013 | ✅ カバー済 |
| INV-4 | V0TestMigration: migrated または modified のとき、v1TestPath は必須 | UT-RS-003, UT-RS-007, UT-RS-014, UT-RS-015, UT-RS-016 | ✅ カバー済 |
| INV-5 | V0TestMigration: modified のとき、biomeModificationSpec は必須 | UT-RS-007, UT-RS-009, UT-RS-015 | ✅ カバー済 |
| INV-6 | RegressionSuiteDefinition: testCases は1件以上（空スイート定義は不正） | UT-RS-032, UT-RS-033 | ✅ カバー済 |
| INV-7 | RegressionSuiteDefinition: suiteId は4種のいずれか | UT-RS-020〜024, UT-RS-026 | ✅ カバー済 |
| INV-8 | CiGateConfig: coverageThreshold は0超〜100以下 | UT-RS-089, UT-RS-090, UT-RS-091, UT-RS-092, UT-RS-093, UT-RS-095, IT-UC-ConfigCiGate-005 | ✅ カバー済 |
| INV-9 | TestExecutionSummary: passedCount + failedCount + skippedCount = totalCount | UT-RS-107, UT-RS-108, UT-RS-109 | ✅ カバー済 |
| INV-10 | AgentIndependenceTest: forbiddenPatterns は1件以上 | UT-RS-071, UT-RS-073 | ✅ カバー済 |
| INV-11 | KRequirementTest: K番号は K1〜K15 の範囲内（K3.5 を含む） | UT-RS-040〜048 | ✅ カバー済 |
| INV-12 | GngConditionTest: GNG番号は GNG-4/GNG-5/GNG-8 のいずれか | UT-RS-055〜061 | ✅ カバー済 |

---

## 4. UseCaseカバレッジ

| UseCase名 | 対応ストーリー | 正常系テスト | 異常系テスト | カバー状態 |
|----------|-------------|------------|------------|----------|
| RunKRequirementsRegressionUseCase | H14-01 | IT-UC-RunKReq-001〜004（4件） | IT-UC-RunKReq-005〜006（2件） | ✅ カバー済 |
| RunK14K15RegressionUseCase | H14-02 | IT-UC-RunK14K15-001〜003（3件） | なし | ✅ カバー済 |
| RunAgentIndependenceGuardUseCase | H14-02 | IT-UC-AgentGuard-001〜004（4件） | IT-UC-AgentGuard-005（1件） | ✅ カバー済 |
| RunGngGateRegressionUseCase | H14-03 | IT-UC-RunGng-001〜003（3件） | なし | ✅ カバー済 |
| AnalyzeV0MigrationUseCase | H15-01 | IT-UC-AnalyzeMig-001〜003（3件） | IT-UC-AnalyzeMig-004（1件） | ✅ カバー済 |
| MigrateV0TestsUseCase | H15-01 | IT-UC-MigrateV0-001〜004（4件） | IT-UC-MigrateV0-005（1件） | ✅ カバー済 |
| ConfigureCiGateUseCase | H15-02 | IT-UC-ConfigCiGate-001〜004（4件） | IT-UC-ConfigCiGate-005〜006（2件） | ✅ カバー済 |

**UseCase合計**: 7 UseCase / 正常系 25件 + 異常系 7件 = 32件

---

## 5. Infrastructure Adapterカバレッジ

| Adapter名 | 対応ポート | テストケース数 | 正常系 | 異常系 | カバー状態 |
|----------|----------|-------------|------|------|----------|
| VitestTestRunnerAdapter | TestRunnerPort | 5件（IT-REPO-VitestRunner-001〜005） | 5件 | 0件 | ✅ カバー済 |
| FileSystemV0SpecReaderAdapter | V0SpecReaderPort | 3件（IT-REPO-V0SpecReader-001〜003） | 2件 | 1件 | ✅ カバー済 |
| BiomeAstImportAnalyzerAdapter | ImportAnalyzerPort | 3件（IT-REPO-ImportAnalyzer-001〜003） | 3件 | 0件 | ✅ カバー済 |
| MarkdownMigrationMappingRepositoryAdapter | MigrationMappingRepositoryPort | 6件（IT-REPO-MigrationRepo-001〜006） | 5件 | 1件 | ✅ カバー済 |
| HarnessConfigQueryAdapter | ConfigQueryPort | 2件（IT-REPO-ConfigQuery-001〜002） | 2件 | 0件 | ✅ カバー済 |
| JsonCiGateResultWriterAdapter | CiGateResultWriterPort | 3件（IT-REPO-CiGateWriter-001〜003） | 3件 | 0件 | ✅ カバー済 |
| StaticSuiteRegistryAdapter | SuiteRegistryPort | 4件（IT-REPO-SuiteRegistry-001〜004） | 3件 | 1件 | ✅ カバー済 |

**Adapter合計**: 7 Adapter / 26件（正常系 23件 + 異常系 3件）

### 備考: HarnessConfigQueryAdapter の異常系

HarnessConfigQueryAdapter（ConfigQueryPort）に対して明示的な異常系テストケース（config読み込み失敗など）は設計されていない。ただし、ConfigQueryPort の失敗伝播は各UseCase（RunKRequirementsRegressionUseCase など）のモックを通じて間接的にカバーされている。将来の改善候補として記録する。

---

## 6. Presentation Handlerカバレッジ（テストスイート統合フロー）

regression-suite では通常の CLI Presentation 層に代わり、4種の Vitest 外部テストスイートファイルと Cross-Layer 統合テストがその役割を担う。

| 統合フロー名 | 対応ストーリー | テストケース数 | カバー状態 |
|------------|-------------|-------------|----------|
| k-requirements 実行統合フロー（H14-01） | H14-01 | 3件（IT-API-KReqInteg-001〜003） | ✅ カバー済 |
| agent-independence 実行統合フロー（H14-02） | H14-02 | 2件（IT-API-AgentInteg-001〜002） | ✅ カバー済 |
| v0 移行フロー統合（H15-01） | H15-01 | 3件（IT-API-V0MigInteg-001〜003） | ✅ カバー済 |
| CIゲート化統合フロー（H15-02） | H15-02 | 2件（IT-API-CiGateInteg-001〜002） | ✅ カバー済 |

**統合フロー合計**: 4フロー / 10件

### 備考: gng-gate 統合フロー

gng-gate の Cross-Layer 統合テストケース（IT-API-GngInteg-xxx 相当）は it_test_design.md に独立項目として設計されていないが、RunGngGateRegressionUseCase のテスト（IT-UC-RunGng-001〜003）がドメインサービスとのインタラクションを通じてレイヤー間連携を検証している。独立した統合テストシナリオの追加を次フェーズの改善候補として記録する。

---

## 7. 未カバー項目一覧

全受け入れ基準・不変条件・UseCase・Infrastructure Adapter・統合フローを網羅しており、**未カバー項目なし**。

ただし、以下を将来の改善候補として記録する（テストロジック設計フェーズで対応を検討）：

| 優先度 | 項目 | 内容 |
|------|------|------|
| Low | HarnessConfigQueryAdapter 異常系 | ConfigQueryPort の config 読み込み失敗シナリオの明示的テストケース追加 |
| Low | gng-gate 独立統合テスト | IT-API-GngInteg-xxx として gng-gate の Cross-Layer 統合フローを独立テストケースとして追加 |
| Low | VitestTestRunnerAdapter 異常系 | Vitest 実行エラー（タイムアウト・プロセス強制終了）のエラー伝播テスト |

---

## 8. 次のアクション

### 判定: ✅ 100% — テストロジック設計（story-implementor）に進む

全観点でカバレッジ 100% を達成。以下のアクションを推奨する：

1. **テストロジック設計（story-implementor）の開始**: unit_test_design.md および it_test_design.md に基づき、各テストケースの実装コードを設計する
2. **改善候補の取り込み検討**: 上記「未カバー項目一覧」の Low 優先度項目を、テストロジック設計フェーズで対応するか判断する
3. **Phase A/B段階性の考慮**: 実装順序として Phase A（H14-01〜H14-03）→ Phase B（H15-01〜H15-02）の内部マイルストーンを遵守する
