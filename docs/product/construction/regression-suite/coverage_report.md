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

---

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 23 | 2 | 92.0% |
| ドメインロジック（不変条件） | 12 | 0 | 100% |
| UseCase | 7 | 0 | 100% |
| Infrastructure Adapter | 0 | 7 | 0% |
| Presentation Handler（テストスイート統合フロー） | 0 | 4 | 0% |
| **総合** | **42** | **13** | **76.4%** |

> **訂正（2026-07-15, WI-270）**: 旧「総合 55/0 = 100%」は取消し。分子=カバー印 行数（AC 23 + INV 12 + UseCase 7 + Adapter 0 + Flow 0 = 42）、分母=55。Infrastructure Adapter（§5）の `IT-REPO-VitestRunner/V0SpecReader/ImportAnalyzer/MigrationRepo/ConfigQuery/CiGateWriter/SuiteRegistry-*` と統合フロー（§6）の `IT-API-KReqInteg/AgentInteg/V0MigInteg/CiGateInteg-*` は prefix ごと実テストツリーに 1 件も存在しない（`grep -rlF` 0 件）。受け入れ基準の H14-01-AC-6 / H15-01-AC-5 も、唯一の根拠 ID が不在のため ❌ とした。

### 判定結果

- ⚠️ 76.4%: 訂正後の実カバレッジ。ドメインロジック（不変条件 12/12）・UseCase（7/7）・受け入れ基準の大半は実在する `UT-RS-*` / `IT-UC-*` テストで裏付けられているが、**Infrastructure Adapter（7 種）と統合フロー（4 種）は専用テストが 1 件も実在しない**。旧レポートはこれらを `IT-REPO-*` / `IT-API-*` の連番 ID で「実装済み」と偽装していた。実ソースは実装済みであり、これはテスト/引用のギャップであってフィーチャの欠落ではない。

> **注記**: 実スイート `Tests 147 passed` は全て pass しているが、それは実在する UseCase/VO テスト（`IT-UC-*` / `UT-RS-*`）が通るためであり、上記 ❌ の Adapter/Flow テストとは無関係。

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
| H14-01-AC-6 | TestRunnerPort（VitestTestRunnerAdapter）がKRequirementTest[]を実行してTestExecutionSummaryを返すこと | 実装テスト不在（旧引用の VitestRunner adapter テストは不在。§5 参照） | ❌ 未カバー |
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
| H15-01-AC-5 | v0テスト仕様とv1テスト実装の対応表の作成（v0_v1_test_mapping.md 永続化） | 実装テスト不在（旧引用の MigrationRepo adapter / V0MigInteg フローテストは不在。§5/§6 参照） | ❌ 未カバー |

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

| Adapter名 | 対応ポート | 実テスト | カバー状態 |
|----------|----------|---------|----------|
| VitestTestRunnerAdapter | TestRunnerPort | 専用テスト不在 | ❌ 未カバー |
| FileSystemV0SpecReaderAdapter | V0SpecReaderPort | 専用テスト不在 | ❌ 未カバー |
| BiomeAstImportAnalyzerAdapter | ImportAnalyzerPort | 専用テスト不在 | ❌ 未カバー |
| MarkdownMigrationMappingRepositoryAdapter | MigrationMappingRepositoryPort | 専用テスト不在 | ❌ 未カバー |
| HarnessConfigQueryAdapter | ConfigQueryPort | 専用テスト不在 | ❌ 未カバー |
| JsonCiGateResultWriterAdapter | CiGateResultWriterPort | 専用テスト不在 | ❌ 未カバー |
| StaticSuiteRegistryAdapter | SuiteRegistryPort | 専用テスト不在 | ❌ 未カバー |

**Infrastructure Adapter カバレッジ: 0/7（0%）**（旧「7/7 100%（26件）」は捏造 `IT-REPO-*` ID による水増し）

---

## 6. Presentation Handlerカバレッジ（テストスイート統合フロー）

> **訂正（2026-07-15, WI-270）**: 下記 4 統合フローに引用されていた `IT-API-*` 連番 ID（`KReqInteg-001〜003` / `AgentInteg-001〜002` / `V0MigInteg-001〜003` / `CiGateInteg-001〜002`）は、**prefix ごと実テストツリーに 1 件も存在しない**。全て ❌ へ格下げする。

| 統合フロー名 | 対応ストーリー | 実テスト | カバー状態 |
|------------|-------------|---------|----------|
| k-requirements 実行統合フロー | H14-01 | 専用統合テスト不在 | ❌ 未カバー |
| agent-independence 実行統合フロー | H14-02 | 専用統合テスト不在 | ❌ 未カバー |
| v0 移行フロー統合 | H15-01 | 専用統合テスト不在 | ❌ 未カバー |
| CIゲート化統合フロー | H15-02 | 専用統合テスト不在 | ❌ 未カバー |

**統合フロー カバレッジ: 0/4（0%）**（旧「4フロー 10件」は捏造 `IT-API-*` ID による水増し）

---

## 7. 未カバー項目一覧

| 項目 | 状態 | 理由 |
|------|------|------|
| H14-01-AC-6（TestRunnerPort adapter 実行） | ❌ | 旧引用 VitestRunner adapter テストが不在 |
| H15-01-AC-5（v0_v1_test_mapping 永続化） | ❌ | 旧引用 MigrationRepo adapter / V0MigInteg フローテストが不在 |
| Infrastructure Adapter 7 種 | ❌ | 全 `IT-REPO-*` ID が不在。専用 adapter テストが 1 件も存在しない |
| 統合フロー 4 種 | ❌ | 全 `IT-API-*` ID が不在。専用統合テストが 1 件も存在しない |

> いずれも実ソースは実装済みであり、テスト/引用のギャップであってフィーチャの欠落ではない。実 adapter/統合テストの追加・`@ac` 束縛・L3-005 ゲーティングは後続フェーズで行う。

---

## 8. 次のアクション

### 判定: ⚠️ 76.4% — 実テスト追加後に カバー印 へ復旧（強制 green 禁止）

1. **Infrastructure Adapter（7 種）と統合フロー（4 種）の実テストを追加**する。これらは現状 1 件も実在しないため、テスト実装フェーズの最優先項目とする。
2. H14-01-AC-6 / H15-01-AC-5 は上記 adapter/flow テストの追加により カバー印 へ復旧できる。
3. 実テスト追加後に各 AC を `@ac` 束縛し、L3-005（coverage-report 整合ゲート）で回帰を防止する。

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
