# テストカバレッジ計画: harness-api

> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **フェーズ**: Phase 1（計画）
> **担当スキル**: test-coverage-checker
> **Wave**: 2（コア品質機構）
> **参照計画**: `unit_test_design_plan.md`, `it_test_design_plan.md`

---

## 1. 目的

本計画は、harness-api Unit のテスト設計文書（unit_test_design.md / it_test_design.md）に対して、以下の観点から網羅性と品質を検証することを目的とする。

1. **受け入れ基準カバレッジ**: harness_api_unit.md §3 の各ACに対応するテストケースの存在確認
2. **ドメインロジックカバレッジ**: domain_model.md §5 の不変条件・ビジネスルールの網羅確認
3. **UseCaseカバレッジ**: 正常系/異常系/境界値のカバー確認
4. **APIカバレッジ**: 8CLIコマンドハンドラー・CommandRegistry・DispatchServiceのカバー確認
5. **Engineering Perspective 評価**: ケント・ベック/マーティン・ファウラー/アンクル・ボブ/エリック・エヴァンスの4視点による品質評価

---

## 2. 検証対象ドキュメント

| ドキュメント | パス | 検証観点 |
|------------|------|---------|
| 受け入れ基準 | `docs/product/units/harness_api_unit.md` §3 | AC to テストケースマッピング |
| ドメインモデル | `docs/product/construction/harness-api/domain_model.md` §5 | 不変条件・ビジネスルールカバレッジ |
| 論理設計 | `docs/product/construction/harness-api/logical_design.md` | 層構成・メソッド仕様のカバレッジ |
| ユニットテスト設計 | `docs/product/construction/harness-api/unit_test_design.md` | 93ケースの品質評価 |
| ITテスト設計 | `docs/product/construction/harness-api/it_test_design.md` | 統合テストケース品質評価 |

---

## 3. 検証スコープ

### 3.1 ユニットテスト（93ケース）

| 対象カテゴリ | ケース数 | 検証内容 |
|------------|--------|---------|
| CliCommandDefinition（VO） | 8 | プレフィックス制約・等値性・不変性 |
| HarnessApiResponse\<T\>（VO） | 8 | INV-3/INV-4・等値性・静的ファクトリ |
| CheckReadyResult（VO） | 4 | allPassed整合性不変条件 |
| PhaseInfo（VO） | 4 | unitId/currentLevel制約 |
| CiCheckResult（VO） | 6 | INV-5/INV-6 |
| DriftReportSummary（VO） | 4 | INV-7 |
| HarnessStatusSummary（VO） | 4 | 4レイヤー必須・LayerId一意性 |
| ArtifactScanResult（VO） | 4 | 生成・構造確認 |
| LayerHealth（VO） | 5 | LayerId列挙制約・lastResult列挙制約 |
| CommandInputSpec（VO） | 3 | 基本生成 |
| ExitCodeSpec（VO） | 3 | 値一意性制約 |
| CommandRegistry（ドメインサービス） | 8 | INV-1/INV-2・CRUD操作 |
| CommandDispatchService（ドメインサービス） | 12 | 全8コマンドディスパッチ・ExitCode決定 |
| StatusDerivationService（ドメインサービス） | 8 | LayerHealth導出・enabled反映 |
| 境界値・異常系（横断） | 12 | 横断的境界値・異常系 |

### 3.2 ITテスト（推定80+ケース）

| 対象カテゴリ | ケース概数 | 検証内容 |
|------------|--------|---------|
| UseCase（4本） | 22 | InitializeRegistry/DispatchCmd/DecideExitCode/DeriveStatus |
| Infrastructure Adapter（6本） | 27 | 各PortアダプターのCRUD・例外処理 |
| Presentation Handler（8本） | 35 | 8CLIコマンドハンドラーの入出力・エラー処理 |
| Cross-Layer統合（3テストファイル） | 16 | CommandDispatch統合/StatusDerivation統合/SharedKernel契約 |

---

## 4. 受け入れ基準 → テストケースマッピング計画

| AC ID | 受け入れ基準内容 | 対応テストケース（計画） |
|-------|---------------|-------------------|
| AC-H09-01-1 | check-readyが全storyのPhase Gate通過状態をJSON返却 | UT-CDS-001/002, IT-UC-DispatchCmd-001, IT-API-CheckReady-001/002 |
| AC-H09-01-2 | check-phase \<unit\>が指定UnitのフェーズをJSON返却 | UT-CDS-003, IT-UC-DispatchCmd-002, IT-API-CheckPhase-001 |
| AC-H09-01-3 | Phase Gate未通過storyが存在する場合、未通過一覧を含む | UT-CDS-002, IT-UC-DispatchCmd-008, IT-API-CheckReady-002 |
| AC-H09-01-4 | 存在しないUnit名が指定された場合、エラー表示 | UT-CDS-012, IT-UC-DispatchCmd-008, IT-API-CheckPhase-004 |
| AC-H09-02-1 | 全L3バリデータを順次実行 | UT-CDS-004, IT-UC-DispatchCmd-003, IT-API-CiCheck-001 |
| AC-H09-02-2 | 全通過でPass、1つでもFailでFail判定 | UT-CDS-004, IT-UC-DispatchCmd-003 |
| AC-H09-02-3 | バリデータ別Pass/Fail詳細を含む | UT-CCR-001/002, IT-REPO-ValidatorExec-001/002 |
| AC-H09-02-4 | 失敗時HarnessError一覧を含む | UT-HAR-006, IT-API-CiCheck-002 |
| AC-H09-03-1 | 設計→コード/コード→設計の双方向乖離を検出 | UT-CDS-005/006, IT-REPO-ValidatorExec-003/004 |
| AC-H09-03-2 | 乖離レポートにUnit名・方向・要素を含む | UT-DRS-001/002, IT-REPO-ValidatorExec-004 |
| AC-H09-03-3 | 乖離0件の場合「乖離なし」サマリー返却 | UT-CDS-005, IT-UC-DispatchCmd-004 |
| AC-H09-03-4 | --jsonフラグでJSON出力（drifts[]フィールド含む） | IT-API-DetectDrift-001/002 |
| AC-H09-04-1 | ファイルシステム成果物からハーネス検査状態を導出 | UT-SDS-001〜004, IT-UC-DeriveStatus-001/002 |
| AC-H09-04-2 | L1-L4各レイヤーの健全性を含む | UT-HSS-001, IT-API-Status-001 |
| AC-H09-04-3 | Phase Gate通過状態のサマリーを含む | IT-UC-DeriveStatus-001 |
| AC-H09-04-4 | プリセット名・有効設定サマリーを含む | IT-UC-DeriveStatus-001/002/006, IT-REPO-ConfigQuery-001/002 |
| AC-H09-04-5 | JSON形式での出力が可能 | IT-API-Status-001/002 |

---

## 5. 不変条件カバレッジ計画

| 不変条件 | 内容 | カバー予定テストケース |
|---------|------|-------------------|
| INV-1 | CommandName重複禁止 | UT-CRG-003, IT-UC-InitRegistry-003 |
| INV-2 | harness:プレフィックス必須 | UT-CRG-004/005, UT-CCD-003/004/005, IT-UC-InitRegistry-004 |
| INV-3 | pass時errors=[] | UT-HAR-005, UT-BND-003 |
| INV-4 | fail/error時errors>=1件 | UT-HAR-006/007 |
| INV-5 | validatorResults>=1件 | UT-CCR-003, UT-BND-004 |
| INV-6 | allPassed === 全件passed論理積 | UT-CCR-004/005/006 |
| INV-7 | totalCount === drifts.length | UT-DRS-003/004, UT-BND-006 |
| D5ルール | harness:statusはFail=1を返さない | UT-CDS-009/010, IT-UC-DecideExit-004/005, IT-API-Status-003 |

---

## 6. Engineering Perspective 評価計画

### ケント・ベック視点（TDD適切性）

- Red-Green-Refactorサイクルに沿った粒度の評価
- YAGNI違反ケースの有無確認
- 小さなステップで実装可能なケース粒度の確認

### マーティン・ファウラー視点（テスト設計スメル）

- テストメソッドの複雑度評価
- テスト間依存関係の有無確認
- セットアップの適切性評価

### アンクル・ボブ視点（SOLID・責務分離）

- ユニットテスト/ITテストの責務分離（SRP）確認
- CommandRegistry/DispatchServiceテストのDIP準拠確認
- 各テストケースの単一振る舞い確認

### エリック・エヴァンス視点（ドメイン表現）

- ユビキタス言語の使用確認（CommandDispatch/StatusDerivationなどのドメイン概念）
- ドメイン不変条件テストとアプリケーション層テストの分離確認
- テストケース名のドメイン語彙準拠確認

---

## 7. 成果物

| 成果物 | パス | 作成タイミング |
|-------|------|-------------|
| テストカバレッジ計画（本ファイル） | `docs/inception/harness-api/test_coverage_plan.md` | Phase 1完了 |
| テストカバレッジレポート | `docs/product/construction/harness-api/coverage_report.md` | Phase 2完了 |

---

## 8. 制約事項・前提

- テスト設計文書（unit_test_design.md / it_test_design.md）が完成している状態を前提とする
- 実装コードは存在しないため、設計文書レベルの静的分析を行う
- Engineering Perspective は設計文書に対して評価し、実装上の問題は対象外とする
