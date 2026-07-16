# テストカバレッジレポート: regression-suite

<!-- WI-275: 本レポートは attestation ゲート返済済み（旧 coverage-gating マーカー除去）。各カバー主張に @attestation <story-id> を付与し、L2-016 が形状を、L3-007 が requirement-test-matrix 上での実在（story-id 解決 かつ testReferences>=1）を fail-closed で検証する。カバー印は「実在し pass するテストによる裏付け」を意味する。 -->

@story-id H14-01
@story-id H14-02
@story-id H14-03
@story-id H15-01
@story-id H15-02
> **作成日**: 2026-03-20
> **Unit ID**: regression-suite
> **Wave**: 3

> **2026-07-15 反ロンダリング訂正（WI-270）**: 本レポートの旧「カバー印 100%（55/55）」は、実在しないテストケース ID を カバー印 の根拠に引用した水増し（laundering）であった。特に Infrastructure Adapter（`IT-REPO-*`）7 種・統合フロー（`IT-API-*`）4 種の cited ID は 1 件も実テストツリーに存在しない。全 cited ID を `grep -rlF` で照合し、不在 ID を除去、実在 ID が 0 の行を ❌ へ格下げした。詳細は末尾「訂正履歴」を参照。

> **2026-07-16 実テスト追加による誠実な昇格（WI-277）**: WI-270 が ❌ に格下げした 13 行（Infrastructure Adapter 7 種・統合フロー 4 種・H14-01-AC-6・H15-01-AC-5）に対し、**実 adapter を実 FS/実データで叩く統合テスト**と**composition-root 経由の実配線フローテスト**を新規追加した。捏造 prefix `IT-REPO-*` / `IT-API-*` は再利用せず、新規 prefix `IT-ADP-*`（実 FS adapter 統合）/ `IT-FLOW-*`（実配線 cross-layer）で採番。13 行全てを実在し pass するテスト + `<!-- @attestation <story-id> -->` へ昇格した。詳細は末尾「訂正履歴」を参照。

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

> **再計算（2026-07-16, WI-277）**: 分子=カバー印 行数（AC 25 + INV 12 + UseCase 7 + Adapter 7 + Flow 4 = 55）、分母=55。WI-270 で ❌ だった Adapter 7 種・Flow 4 種・H14-01-AC-6・H15-01-AC-5 は、新規追加の `IT-ADP-*` / `IT-FLOW-*` テスト（実在し pass）で裏付けられ カバー へ昇格。これらは WI-270 が「1 件も実在しない」と断じた捏造 `IT-REPO-*` / `IT-API-*` とは別物の実テストである。

### 判定結果

- カバー 100%: WI-277 の実テスト追加後の実カバレッジ。ドメインロジック（12/12）・UseCase（7/7）・受け入れ基準（25/25）・Infrastructure Adapter（7/7）・統合フロー（4/4）の全項目が、実在し pass するテストで裏付けられている。Adapter テストは `mkdtemp` の実一時ディレクトリ・実ファイルを相手に検証し（FS I/O をモックしない）、Flow テストは `buildRegressionSuite(baseDir)` で全 adapter を実体配線して cross-layer を通す。

> **注記（実装スタブの残ギャップ）**: `MarkdownMigrationMappingRepositoryAdapter.findAll()` / `findById()` は現状 `[]` / `null` を返すスタブであり、H15-01-AC-5 の「対応表の永続化」は `save()` の実 FS 書き込み（`IT-ADP-MigrationRepo-*` / `IT-FLOW-V0Mig-002`）で裏付けている（読み戻し API は未実装のため未検証）。また実 composition-root の永続化ファイル名は `migration-mappings.md` であり設計文書の `v0_v1_test_mapping.md` とは異なる。これらは実ソースのスタブ/命名ギャップであり本 WI のスコープ外（テストは実挙動に忠実）。

---

## 2. 受け入れ基準カバレッジ

### H14-01: K1-K13回帰テスト整備

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H14-01-AC-1 | K1（4層防御）: L1-L4各レイヤーのバリデータ正常動作を検証する回帰テスト | IT-UC-RunKReq-001, IT-UC-RunKReq-002, IT-UC-RunKReq-003, IT-UC-RunKReq-004 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-2 | K2（Phase Gate）: phase-gateの3層構造検証テスト | IT-UC-RunKReq-001 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-3 | K3（Biome AST）: Biome AST解析（importグラフ + 循環依存）の回帰テスト | IT-UC-RunKReq-001 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-4 | K3.5〜K13: メタデータ強制・テスト品質・DDD・2Phase・DocSplit・Cascade・AgentLesson・Security・Drift・Consistency・Config回帰テスト | IT-UC-RunKReq-001, IT-UC-RunKReq-002 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-5 | SuiteId k-requirements が StaticSuiteRegistryAdapter から取得できること | UT-RS-020〜023 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-6 | TestRunnerPort（VitestTestRunnerAdapter）がKRequirementTest[]を実行してTestExecutionSummaryを返すこと | IT-ADP-VitestRunner-001, IT-ADP-VitestRunner-002, IT-ADP-VitestRunner-003, IT-FLOW-KReq-001, IT-FLOW-KReq-002 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-7 | CoverageRate が CiGateConfig.coverageThreshold と照合されること | IT-UC-RunKReq-002, IT-UC-RunKReq-003, UT-RS-154 | ✅ カバー済 <!-- @attestation H14-01 --> |
| H14-01-AC-8 | 全回帰テストのCIゲートへの組み込み（CiGateResultWriterPort経由で結果出力） | IT-UC-RunKReq-001, UT-RS-153 | ✅ カバー済 <!-- @attestation H14-01 --> |

### H14-02: K14-K15回帰テスト + エージェント非依存ガード

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H14-02-AC-1 | K14回帰テスト: Phase Dependency Modelの3層構造・Level間依存強制の回帰テスト | IT-UC-RunK14K15-001, IT-UC-RunK14K15-002, IT-UC-RunK14K15-003 | ✅ カバー済 <!-- @attestation H14-02 --> |
| H14-02-AC-2 | K15回帰テスト: plan文書なしのPhase 2移行拒否の回帰テスト | IT-UC-RunK14K15-001, IT-UC-RunK14K15-002, IT-UC-RunK14K15-003 | ✅ カバー済 <!-- @attestation H14-02 --> |
| H14-02-AC-3 | エージェント非依存ガード: coreモジュールがエージェント固有APIをimportしていないことを検証 | IT-UC-AgentGuard-001, IT-UC-AgentGuard-002 | ✅ カバー済 <!-- @attestation H14-02 --> |
| H14-02-AC-4 | エージェント非依存ガード: Adapterモジュールのみがエージェント固有APIを使用していること（allowedPaths許容） | IT-UC-AgentGuard-003 | ✅ カバー済 <!-- @attestation H14-02 --> |

### H14-03: Go/No-Go Gate品質側3条件回帰テスト

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H14-03-AC-1 | GNG-4「yolo/skip-permissions不採用」の検証テスト | IT-UC-RunGng-001, UT-RS-055〜057 | ✅ カバー済 <!-- @attestation H14-03 --> |
| H14-03-AC-2 | GNG-5「2-Phase Execution維持」の検証テスト | IT-UC-RunGng-001, IT-UC-RunGng-002 | ✅ カバー済 <!-- @attestation H14-03 --> |
| H14-03-AC-3 | GNG-8「デフォルトOFF」の検証テスト | IT-UC-RunGng-001, IT-UC-RunGng-002 | ✅ カバー済 <!-- @attestation H14-03 --> |
| H14-03-AC-4 | 全3条件のCIゲートへの組み込み | IT-UC-RunGng-003 | ✅ カバー済 <!-- @attestation H14-03 --> |

### H15-01: v0 143テスト仕様のv1再実装

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H15-01-AC-1 | v0テスト仕様の移行対象分析と移行対象リストの作成 | IT-UC-AnalyzeMig-001, IT-UC-AnalyzeMig-002, IT-UC-AnalyzeMig-003 | ✅ カバー済 <!-- @attestation H15-01 --> |
| H15-01-AC-2 | 各テスト仕様のv1コードベースでの再実装（migrate/migrateWithModification/skipの状態遷移） | UT-RS-003〜017, IT-UC-MigrateV0-001, IT-UC-MigrateV0-003, IT-UC-MigrateV0-004 | ✅ カバー済 <!-- @attestation H15-01 --> |
| H15-01-AC-3 | Biome移行に伴う修正が必要なテストの特定と修正（BiomeModificationSpec生成） | UT-RS-007, UT-RS-118〜124, IT-UC-MigrateV0-003 | ✅ カバー済 <!-- @attestation H15-01 --> |
| H15-01-AC-4 | 再実装された全テストが pnpm test で実行可能（confirmExecute=trueで全件MigrationMappingRepositoryPortに保存） | IT-UC-MigrateV0-001, IT-UC-MigrateV0-002 | ✅ カバー済 <!-- @attestation H15-01 --> |
| H15-01-AC-5 | v0テスト仕様とv1テスト実装の対応表の作成（Markdown テーブル永続化） | IT-ADP-MigrationRepo-001, IT-ADP-MigrationRepo-002, IT-ADP-MigrationRepo-004, IT-FLOW-V0Mig-002 | ✅ カバー済 <!-- @attestation H15-01 -->（永続化=`save()` 実 FS 書き込みを検証。読み戻し `findAll/findById` はスタブ・§1 注記参照） |

### H15-02: v1再実装テストのCIゲート化

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H15-02-AC-1 | CIパイプラインにv1再実装テスト全件実行のステップを追加（v0-migrationスイートのrequiredSuiteIds追加） | IT-UC-ConfigCiGate-004 | ✅ カバー済 <!-- @attestation H15-02 --> |
| H15-02-AC-2 | 1件でもテスト失敗があればCIが失敗する設定（gateResult='no-go'） | IT-UC-RunKReq-003 | ✅ カバー済 <!-- @attestation H15-02 --> |
| H15-02-AC-3 | テスト実行結果のサマリー（通過数/失敗数/全体数）のCI出力への含有 | UT-RS-104〜113 | ✅ カバー済 <!-- @attestation H15-02 --> |
| H15-02-AC-4 | テストカバレッジ90%閾値のv1再実装テストへの適用 | IT-UC-ConfigCiGate-001, IT-UC-ConfigCiGate-002, UT-RS-091〜093 | ✅ カバー済 <!-- @attestation H15-02 --> |

> **AC 訂正（2026-07-15, WI-270）**: 上記 カバー印 行から、実在しない `IT-API-KReqInteg-*` / `IT-API-AgentInteg-*` / `IT-API-V0MigInteg-*` / `IT-API-CiGateInteg-*` および `IT-REPO-SuiteRegistry-*` / `IT-REPO-ImportAnalyzer-*` / `IT-REPO-VitestRunner-*` / `IT-REPO-CiGateWriter-*` / `IT-REPO-MigrationRepo-*` と、存在しない `UT-RS-160〜165` / `UT-RS-174` を除去した。残る `IT-UC-*` / `UT-RS-*`（実在）で AC の主要根拠が保たれる行は カバー印 を維持。唯一の根拠が不在だった H14-01-AC-6・H15-01-AC-5 は ❌ とした。

---

## 3. ドメインロジック（不変条件）カバレッジ

| INV ID | 不変条件内容 | 対応テストケースID | カバー状態 |
|--------|------------|-----------------|----------|
| INV-1 | V0TestMigration: migrate() は pending 状態でのみ呼び出し可能。二重移行は HarnessError を発生させる | UT-RS-003, UT-RS-004, UT-RS-005, UT-RS-006 | ✅ カバー済 <!-- @attestation H15-01 --> |
| INV-2 | V0TestMigration: migrateWithModification() は pending 状態でのみ呼び出し可能 | UT-RS-007, UT-RS-008 | ✅ カバー済 <!-- @attestation H15-01 --> |
| INV-3 | V0TestMigration: skip() は pending 状態でのみ呼び出し可能 | UT-RS-010, UT-RS-011, UT-RS-012, UT-RS-013 | ✅ カバー済 <!-- @attestation H15-01 --> |
| INV-4 | V0TestMigration: migrated または modified のとき、v1TestPath は必須 | UT-RS-003, UT-RS-007, UT-RS-014, UT-RS-015, UT-RS-016 | ✅ カバー済 <!-- @attestation H15-01 --> |
| INV-5 | V0TestMigration: modified のとき、biomeModificationSpec は必須 | UT-RS-007, UT-RS-009, UT-RS-015 | ✅ カバー済 <!-- @attestation H15-01 --> |
| INV-6 | RegressionSuiteDefinition: testCases は1件以上（空スイート定義は不正） | UT-RS-032, UT-RS-033 | ✅ カバー済 <!-- @attestation H14-01 --> |
| INV-7 | RegressionSuiteDefinition: suiteId は4種のいずれか | UT-RS-020〜024, UT-RS-026 | ✅ カバー済 <!-- @attestation H14-01 --> |
| INV-8 | CiGateConfig: coverageThreshold は0超〜100以下 | UT-RS-089, UT-RS-090, UT-RS-091, UT-RS-092, UT-RS-093, UT-RS-095, IT-UC-ConfigCiGate-005 | ✅ カバー済 <!-- @attestation H15-02 --> |
| INV-9 | TestExecutionSummary: passedCount + failedCount + skippedCount = totalCount | UT-RS-107, UT-RS-108, UT-RS-109 | ✅ カバー済 <!-- @attestation H15-02 --> |
| INV-10 | AgentIndependenceTest: forbiddenPatterns は1件以上 | UT-RS-071, UT-RS-073 | ✅ カバー済 <!-- @attestation H14-02 --> |
| INV-11 | KRequirementTest: K番号は K1〜K15 の範囲内（K3.5 を含む） | UT-RS-040〜048 | ✅ カバー済 <!-- @attestation H14-01 --> |
| INV-12 | GngConditionTest: GNG番号は GNG-4/GNG-5/GNG-8 のいずれか | UT-RS-055〜061 | ✅ カバー済 <!-- @attestation H14-03 --> |

> 不変条件は全て実在する `UT-RS-*` / `IT-UC-*` テストで裏付けられており、訂正後も 12/12 を維持する。

---

## 4. UseCaseカバレッジ

| UseCase名 | 対応ストーリー | 正常系テスト | 異常系テスト | カバー状態 |
|----------|-------------|------------|------------|----------|
| RunKRequirementsRegressionUseCase | H14-01 | IT-UC-RunKReq-001〜004（4件） | IT-UC-RunKReq-005, IT-UC-RunKReq-006（2件） | ✅ カバー済 <!-- @attestation H14-01 --> |
| RunK14K15RegressionUseCase | H14-02 | IT-UC-RunK14K15-001〜003（3件） | なし | ✅ カバー済 <!-- @attestation H14-02 --> |
| RunAgentIndependenceGuardUseCase | H14-02 | IT-UC-AgentGuard-001〜004（4件） | IT-UC-AgentGuard-005（1件） | ✅ カバー済 <!-- @attestation H14-02 --> |
| RunGngGateRegressionUseCase | H14-03 | IT-UC-RunGng-001〜003（3件） | なし | ✅ カバー済 <!-- @attestation H14-03 --> |
| AnalyzeV0MigrationUseCase | H15-01 | IT-UC-AnalyzeMig-001〜003（3件） | IT-UC-AnalyzeMig-004（1件） | ✅ カバー済 <!-- @attestation H15-01 --> |
| MigrateV0TestsUseCase | H15-01 | IT-UC-MigrateV0-001〜004（4件） | IT-UC-MigrateV0-005（1件） | ✅ カバー済 <!-- @attestation H15-01 --> |
| ConfigureCiGateUseCase | H15-02 | IT-UC-ConfigCiGate-001〜004（4件） | IT-UC-ConfigCiGate-005, IT-UC-ConfigCiGate-006（2件） | ✅ カバー済 <!-- @attestation H15-02 --> |

> UseCase の `IT-UC-*` テストは全て実在し pass する。訂正後も 7/7 を維持する。

---

## 5. Infrastructure Adapterカバレッジ

> **訂正（2026-07-15, WI-270）**: 下記 7 adapter に対して引用されていた `IT-REPO-*` 連番 ID（`VitestRunner-001〜005` / `V0SpecReader-001〜003` / `ImportAnalyzer-001〜003` / `MigrationRepo-001〜006` / `ConfigQuery-001〜002` / `CiGateWriter-001〜003` / `SuiteRegistry-001〜004`）は、**prefix ごと実テストツリーに 1 件も存在しない**（`grep -rlF "IT-REPO-" scripts/harness/__tests__/` は該当スイートで 0 件）。全て ❌ へ格下げする。

> **昇格（2026-07-16, WI-277）**: 下記 7 adapter に対し、`scripts/harness/__tests__/integration/regression-suite/*.integration.test.ts` に**実 adapter を実 FS/実データで叩く統合テスト**（新規 prefix `IT-ADP-*`）を追加した。捏造 `IT-REPO-*` は再利用しない。全て カバー へ昇格。

| Adapter名 | 対応ポート | 実テスト | カバー状態 |
|----------|----------|---------|----------|
| VitestTestRunnerAdapter | TestRunnerPort | IT-ADP-VitestRunner-001〜003 | ✅ カバー済 <!-- @attestation H14-01 --> |
| FileSystemV0SpecReaderAdapter | V0SpecReaderPort | IT-ADP-V0SpecReader-001〜003 | ✅ カバー済 <!-- @attestation H15-01 --> |
| BiomeAstImportAnalyzerAdapter | ImportAnalyzerPort | IT-ADP-ImportAnalyzer-001〜003 | ✅ カバー済 <!-- @attestation H14-02 --> |
| MarkdownMigrationMappingRepositoryAdapter | MigrationMappingRepositoryPort | IT-ADP-MigrationRepo-001〜004 | ✅ カバー済 <!-- @attestation H15-01 -->（`save()` 実 FS 書き込みを検証。`findAll/findById` はスタブで未検証・§1 注記参照） |
| HarnessConfigQueryAdapter | ConfigQueryPort | IT-ADP-ConfigQuery-001, IT-ADP-ConfigQuery-002 | ✅ カバー済 <!-- @attestation H15-02 --> |
| JsonCiGateResultWriterAdapter | CiGateResultWriterPort | IT-ADP-CiGateWriter-001〜003 | ✅ カバー済 <!-- @attestation H15-02 --> |
| StaticSuiteRegistryAdapter | SuiteRegistryPort | IT-ADP-SuiteRegistry-001〜004 | ✅ カバー済 <!-- @attestation H14-01 --> |

**Infrastructure Adapter カバレッジ: 7/7（100%）**（WI-277 で実 `IT-ADP-*` 統合テスト追加により昇格。旧「7/7 100%（26件）」の捏造 `IT-REPO-*` とは別物）

---

## 6. Presentation Handlerカバレッジ（テストスイート統合フロー）

> **訂正（2026-07-15, WI-270）**: 下記 4 統合フローに引用されていた `IT-API-*` 連番 ID（`KReqInteg-001〜003` / `AgentInteg-001〜002` / `V0MigInteg-001〜003` / `CiGateInteg-001〜002`）は、**prefix ごと実テストツリーに 1 件も存在しない**。全て ❌ へ格下げする。

> **昇格（2026-07-16, WI-277）**: 下記 4 フローに対し、`buildRegressionSuite(baseDir)` で全 adapter を実体配線した cross-layer 統合テスト（新規 prefix `IT-FLOW-*`）を追加した。捏造 `IT-API-*` は再利用しない。全て カバー へ昇格。

| 統合フロー名 | 対応ストーリー | 実テスト | カバー状態 |
|------------|-------------|---------|----------|
| k-requirements 実行統合フロー | H14-01 | IT-FLOW-KReq-001, IT-FLOW-KReq-002 | ✅ カバー済 <!-- @attestation H14-01 --> |
| agent-independence 実行統合フロー | H14-02 | IT-FLOW-AgentInteg-001, IT-FLOW-AgentInteg-002 | ✅ カバー済 <!-- @attestation H14-02 --> |
| v0 移行フロー統合 | H15-01 | IT-FLOW-V0Mig-001, IT-FLOW-V0Mig-002, IT-FLOW-V0Mig-003 | ✅ カバー済 <!-- @attestation H15-01 --> |
| CIゲート化統合フロー | H15-02 | IT-FLOW-CiGate-001, IT-FLOW-CiGate-002 | ✅ カバー済 <!-- @attestation H15-02 --> |

**統合フロー カバレッジ: 4/4（100%）**（WI-277 で実 `IT-FLOW-*` 統合テスト追加により昇格。旧「4フロー 10件」の捏造 `IT-API-*` とは別物）

---

## 7. 未カバー項目一覧

WI-277 の実テスト追加により、WI-270 が挙げた未カバー 4 分類（計 13 行）は全て解消した。現時点で ❌ 行は存在しない。

| 項目 | 状態 | 備考 |
|------|------|------|
| H14-01-AC-6（TestRunnerPort adapter 実行） | 解消済 | `IT-ADP-VitestRunner-*` / `IT-FLOW-KReq-*` で裏付け（正本の カバー印 は §2） |
| H15-01-AC-5（対応表の Markdown 永続化） | 解消済 | `IT-ADP-MigrationRepo-*` / `IT-FLOW-V0Mig-002` で `save()` 実 FS 書き込みを裏付け（`findAll/findById` はスタブで未検証・§1 注記参照。正本の カバー印 は §2） |
| Infrastructure Adapter 7 種 | 解消済 | `IT-ADP-*` 実 FS 統合テストで裏付け（正本の カバー印 は §5） |
| 統合フロー 4 種 | 解消済 | `IT-FLOW-*` 実配線テストで裏付け（正本の カバー印 は §6） |

> **残ギャップ（実ソース側・本 WI スコープ外）**: `MarkdownMigrationMappingRepositoryAdapter.findAll()` / `findById()` はスタブ（`[]` / `null`）で読み戻し API が未実装。永続化ファイル名は実装が `migration-mappings.md`、設計文書は `v0_v1_test_mapping.md` で不一致。これらはソース修正 WI（story-implementor）で扱う。

---

## 8. 次のアクション

### 判定: カバー 100% — WI-277 の実テスト追加により全項目カバー（捏造による水増しではない）

1. 残ギャップ（`findAll/findById` スタブ・永続化ファイル名の設計文書との不一致）はソース修正 WI（story-implementor）で解消する。
2. 各 AC の `@ac` 束縛・L3-005（coverage-report 整合ゲート）による回帰防止は後続で強化する。

## 訂正履歴

### 2026-07-15 — 反ロンダリング実態訂正（WI-270, quick, fix）

<!-- @work-item-id WI-270 -->

WI-267 が実テスト再検証で確定させた laundering の実態訂正。全 cited ID を `grep -rlF "<ID>" scripts/harness/__tests__/` で照合した。

実在テストのインベントリ（正本・実 grep）: `UT-RS-*` と `IT-UC-*`（RunKReq / RunK14K15 / AgentGuard / RunGng / AnalyzeMig / MigrateV0 / ConfigCiGate）は実在する。一方 **`IT-REPO-*` prefix と `IT-API-*` prefix のテストは regression-suite スイートに 1 件も存在しない**。

除去した虚偽引用と格下げ:

1. **§1 サマリー / 判定「カバー印 100%（55/0）」→ ⚠️ 76.4%（42/13）**。
2. **§5 Infrastructure Adapter「7/7 100%」→ 0/7**。7 adapter の `IT-REPO-*` ID が全て不在。
3. **§6 統合フロー「4フロー 10件」→ 0/4**。4 フローの `IT-API-*` ID が全て不在。
4. **§2 H14-01-AC-6 / H15-01-AC-5 → ❌**。唯一の根拠だった adapter/flow ID が不在。
5. その他の AC カバー印 行から、混在していた不在 ID（`IT-API-*`, `IT-REPO-*`, `UT-RS-160〜165`, `UT-RS-174`）を除去。残る `IT-UC-*` / `UT-RS-*`（実在）で主要根拠が保たれる行は カバー印 を維持。
6. ドメインロジック（12/12）・UseCase（7/7）は全て実在 `UT-RS-*` / `IT-UC-*` で裏付けられるため維持。

実スイート結果（verbatim・exit 0）: `Test Files 22 passed (22) / Tests 147 passed (147)`。実在テストは全て pass しており、上記 ❌ はフィーチャ欠落ではなく実テスト未実装のギャップである。

**ungated-legacy マーカーは維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。カバー印 を新規追加していない。テストコードは一切変更していない。

### 2026-07-16 — 実テスト追加による誠実な昇格（WI-277, quick, chore）

<!-- @work-item-id WI-277 -->

WI-270 が ❌ に格下げした 13 行（Infrastructure Adapter 7 種・統合フロー 4 種・H14-01-AC-6・H15-01-AC-5）に、**実在し pass するテスト**を追加して誠実に カバー印 へ昇格した。

追加テスト（全て `scripts/harness/__tests__/integration/regression-suite/` 配下・実 FS/実データ・ドメイン層モックなし）:

- **`IT-ADP-*`（Infrastructure Adapter 実 FS 統合、計 22 ケース）**: `IT-ADP-VitestRunner-001〜003`（`vitest-test-runner-adapter.integration.test.ts`）/ `IT-ADP-V0SpecReader-001〜003`（`file-system-v0-spec-reader-adapter.integration.test.ts`）/ `IT-ADP-ImportAnalyzer-001〜003`（`biome-ast-import-analyzer-adapter.integration.test.ts`）/ `IT-ADP-MigrationRepo-001〜004`（`markdown-migration-mapping-repository-adapter.integration.test.ts`）/ `IT-ADP-ConfigQuery-001〜002` + `IT-ADP-CiGateWriter-001〜003`（`ci-gate-adapters.integration.test.ts`）/ `IT-ADP-SuiteRegistry-001〜004`（`static-suite-registry-adapter.integration.test.ts`）。
- **`IT-FLOW-*`（composition-root 実配線 cross-layer、計 9 ケース）**: `IT-FLOW-KReq-001〜002`（`k-requirements-flow.integration.test.ts`）/ `IT-FLOW-AgentInteg-001〜002`（`agent-independence-flow.integration.test.ts`）/ `IT-FLOW-V0Mig-001〜003`（`v0-migration-flow.integration.test.ts`）/ `IT-FLOW-CiGate-001〜002`（`ci-gate-flow.integration.test.ts`）。

**ID 採番方針**: WI-270 が「1 件も実在しない」と確定した捏造 prefix `IT-REPO-*` / `IT-API-*` は再利用せず、誠実性を明示する別 prefix `IT-ADP-*`（実 FS adapter 統合）/ `IT-FLOW-*`（実配線フロー）を新設した。これにより昇格した カバー印 の根拠が捏造 ID とは別物の実テストであることが matrix・レポート双方で一目瞭然になる。

**昇格内容**:

1. **§1 サマリー / 判定「⚠️ 76.4%（42/13）」→ カバー 100%（55/0）**。分子=カバー印 行数（AC 25 + INV 12 + UseCase 7 + Adapter 7 + Flow 4 = 55）、分母=55。
2. **§5 Infrastructure Adapter「0/7」→ 7/7**。各 adapter に実 `IT-ADP-*` 統合テスト。
3. **§6 統合フロー「0/4」→ 4/4**。各フローに実 `IT-FLOW-*` 配線テスト。
4. **§2 H14-01-AC-6 / H15-01-AC-5 → カバー印**。実 adapter/flow テストで裏付け。

**誠実性の担保（テストを弱めていない・ソース修正はスコープ外）**:

- Adapter テストは `mkdtemp` の実一時ディレクトリ・実ファイルを相手に実挙動を検証（FS I/O をモックしない）。旧レポートが「モック化方針でテスト未定義」だった部分に実体を与えた。
- `MarkdownMigrationMappingRepositoryAdapter.findAll()` / `findById()` はスタブ（`[]` / `null`）で読み戻し API が未実装。H15-01-AC-5 は `save()` の実 FS 書き込みで裏付け、読み戻しは未検証と§1・§5・§7 に明記した。永続化ファイル名の設計文書（`v0_v1_test_mapping.md`）と実装（`migration-mappings.md`）の不一致もソース側ギャップとして残置（テストは実挙動に忠実）。
- `IT-ADP-VitestRunner-*` は実 adapter の空配列・未実装ユニット（テストディレクトリ不在 → pass）・同一 targetUnit 集約の各分岐を検証。ドメイン VO が不正 TestCase を弾くため adapter の failed 変換分岐は正当な入力で到達不能であり、この分岐用の水増しテストは作らなかった。

実スイート結果（verbatim・exit 0）: `Test Files 32 passed (32) / Tests 178 passed (178)`（regression-suite unit + integration。WI-270 時点は `22 passed / 147 passed`、本 WI で +10 files / +31 tests）。
