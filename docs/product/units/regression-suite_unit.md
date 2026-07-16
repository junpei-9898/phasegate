# Unit定義: regression-suite

> **Unit ID**: regression-suite
> **作成日**: 2026-03-12
> **Wave**: 3（拡張・運用・保証）
> **対応Epic**: H-14 K1-K15回帰保証 + H-15 v0テスト資産移行

---

## 1. 概要

K1-K15の全非交渉要件の回帰テスト、v0の143テスト仕様のv1再実装、Go/No-Go Gate品質側条件の回帰テスト、およびCIゲート統合を担当するUnit。Phasegateの品質基盤が機能追加や変更の副作用で破壊されないことを継続的に保証する。

v0のregression-suiteを継承・拡張したUnitである。v1ではH-14（K1-K15回帰保証）とH-15（v0テスト資産移行）を統合し、**Phase A（H-14: Wave 2後半から設計・一部実装開始可能）**と**Phase B（H-15: 全v1 Unit実装完了後に着手）**の内部マイルストーンで段階的に構築する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 | 内部Phase |
|----------|---------|--------|-----------|
| H14-01 | K1-K13回帰テスト整備 | Must | Phase A |
| H14-02 | K14-K15回帰テスト + エージェント非依存ガード | Must | Phase A |
| H14-03 | Go/No-Go Gate品質側3条件回帰テスト | Must | Phase A |
| H15-01 | v0 143テスト仕様のv1再実装 | Must | Phase B |
| H15-02 | v1再実装テストのCIゲート化 | Must | Phase B |

---

## 3. 機能要件

### 3.1 K1-K13回帰テスト整備（H14-01）

- K1（4層防御）: L1-L4各レイヤーのバリデータ正常動作を検証する回帰テスト
- K2（Phase Gate）: phase-gateの3層構造検証テスト
- K3（Biome AST）: Biome AST解析（importグラフ + 循環依存）の回帰テスト
- K3.5（メタデータ）: @unit/@layer/@story-id/@storyメタデータ強制の回帰テスト
- K4-K6（テスト品質/DDD/2Phase）: テスト品質ルール・スキル構造・2-Phase Executionの回帰テスト
- K7-K9（DocSplit/Cascade/AgentLesson）: Document Split・Cascade Updater・Agent-Lesson Systemの回帰テスト
- K10-K13（Security/Drift/Consistency/Config）: Security・Performance・Drift・Consistency・Config単一原則の回帰テスト
- 全回帰テストのCIゲートへの組み込み

### 3.2 K14-K15回帰テスト + エージェント非依存ガード（H14-02）

- K14回帰テスト: Phase Dependency Modelの3層構造・Level間依存強制の回帰テスト
- K15回帰テスト: plan文書なしのPhase 2移行拒否の回帰テスト
- エージェント非依存ガード: coreモジュールが特定エージェントAPI（Claude Code Hook API等）をimportしていないことを検証
- エージェント非依存ガード: Adapterモジュールのみがエージェント固有APIを使用していることを検証

### 3.3 Go/No-Go Gate品質側3条件回帰テスト（H14-03）

- GNG-4「yolo/skip-permissions不採用」の検証テスト（deny listとhooksが完全維持）
- GNG-5「2-Phase Execution維持」の検証テスト（設計スキルの人間承認ゲート存在）
- GNG-8「デフォルトOFF」の検証テスト（GSD由来機能のデフォルト値がfalse/disabled）
- 全3条件の検証テストのCIゲートへの組み込み

### 3.4 v0 143テスト仕様のv1再実装（H15-01）

- v0テスト仕様の移行対象分析と移行対象リストの作成
- 各テスト仕様のv1コードベースでの再実装
- Biome移行に伴い修正が必要なテストの特定と修正
- 再実装された全テストが`pnpm test`で実行可能であること
- v0テスト仕様とv1テスト実装の対応表の作成

### 3.5 v1再実装テストのCIゲート化（H15-02）

- CIパイプラインにv1再実装テスト全件実行のステップを追加
- 1件でもテスト失敗があればCIが失敗する設定
- テスト実行結果のサマリー（通過数/失敗数/全体数）のCI出力への含有
- テストカバレッジ90%閾値のv1再実装テストへの適用

---

## 4. ドメインモデル概要

- **RegressionTestSuite（集約ルート）**: 回帰テストスイート全体の実行・結果集約を統括
  - `suiteId`: スイートID（k-requirements / gng-gate / v0-migration / agent-independence）
  - `testCases`: テストケース一覧
  - `executionResult`: 実行結果（pass/fail + 個別テスト結果）
- **KRequirementTest（値オブジェクト）**: K要件ごとの回帰テスト定義（K番号・テスト対象・検証条件）
- **GngConditionTest（値オブジェクト）**: Go/No-Go Gate条件ごとの回帰テスト定義（GNG番号・テスト対象・検証条件）
- **AgentIndependenceTest（値オブジェクト）**: エージェント非依存ガードテスト定義（検証対象import・許可/禁止パターン）
- **V0TestMigration（集約ルート）**: v0テスト仕様のv1移行を統括
  - `v0TestId`: v0テスト仕様ID
  - `v1TestPath`: v1再実装テストのファイルパス
  - `migrationStatus`: 移行状態（pending / migrated / modified / skipped）
  - `biomeModification`: Biome移行に伴う修正内容（あれば）
- **MigrationMapping（値オブジェクト）**: v0テスト仕様 → v1テスト実装の対応表エントリ
- **CiGateConfig（値オブジェクト）**: CIゲート設定（必須テストスイートID一覧、カバレッジ閾値）
- **TestExecutionSummary（値オブジェクト）**: テスト実行結果サマリー（通過数/失敗数/全体数/カバレッジ）
- **RegressionRunner（ドメインサービス）**: 回帰テストスイートの選択実行・結果集約ロジック
- **MigrationAnalyzer（ドメインサービス）**: v0テスト仕様の移行対象分析・Biome修正必要性判定ロジック
- **ImportGuardService（ドメインサービス）**: coreモジュールのimport解析・エージェント固有API依存検出ロジック

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: 回帰テスト失敗時のエラー出力フォーマット
- **HarnessConfigV2型**（config-foundationが定義）: カバレッジ閾値の参照

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **Validator ID Registry** | 消費 | validator-system | K1回帰テストでのバリデータ正常動作検証 |
| **Phase Dependency 3層構造** | 消費 | phase-dependency-model | K2/K14回帰テストでのphase-gate検証 |
| **@unit/@layerメタデータ仕様** | 消費 | traceability-model | K3.5回帰テストでのメタデータ強制検証 |
| **Preset ID Registry** | 消費 | config-foundation | K13回帰テストでのConfig単一原則検証 |
| **biome-ast-engine ルール** | 消費 | biome-ast-engine | K3回帰テストでのBiome AST解析検証 |
| **RequirementTestMatrix Schema** | 消費 | nyquist-validation | Nyquist関連回帰テストの検証 |
| **Harness API Response DTO** | 消費 | harness-api | CIゲート統合でのコマンド実行・結果取得 |
| **AGENTS.md Schema** | 消費 | ci-governance | K9回帰テストでのAgent-Lesson検証 |

### 5.3 Phase別依存（回帰テスト対象）

本Unitは回帰テスト対象として段階的にUnitに依存する。Phase Aは**Wave 1-2のみ**に依存し、Wave 2後半から先行設計・実装を開始可能。Phase BはWave 3を含む**全v1 Unit**完了後に着手する。

#### Phase A（H14: K1-K15回帰テスト + Go/No-Go Gate）

| Wave | 対象Unit | 必要な理由 |
|------|---------|-----------|
| Wave 1 | biome-ast-engine, phase-dependency-model, traceability-model, config-foundation, adr-foundation, harness-error | K1-K3.5, K7, K13-K15回帰テスト対象 |
| Wave 2 | nyquist-validation, validator-system, harness-api, quick-mode, agent-integration | K1, K4, K6, K10-K12回帰テスト対象 |

#### Phase B（H15: v0テスト資産移行）

| Wave | 対象Unit | 必要な理由 |
|------|---------|-----------|
| Wave 1-2 | Phase Aの全Unit | v0テスト仕様のv1再実装対象 |
| Wave 3 | skill-quality, ci-governance | K5, K8, K9回帰テスト対象 + v0テスト資産の完全移行 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | L1-L4各レイヤーのバリデータ正常動作を検証する回帰テスト |
| K2 | Phase Gate | phase-gateの3層構造検証テスト |
| K3 | Biome AST解析 | Biome AST解析（importグラフ + 循環依存）の回帰テスト |
| K3.5 | @unit/@layer/@story-idメタデータ | メタデータ強制の回帰テスト |
| K4 | テスト品質ルール | テスト品質ルールの回帰テスト |
| K5 | DDD設計スキル群 | スキル構造の回帰テスト |
| K6 | 2-Phase Execution | 2-Phase Executionの回帰テスト + GNG-5検証 |
| K7 | Document Split | Document Split（inception/product分離）の回帰テスト |
| K8 | Cascade Updater | Cascade Updaterの回帰テスト |
| K9 | Agent-Lesson System | Agent-Lesson Systemの回帰テスト |
| K10 | Security/Performance検出 | Security・Performance検出の回帰テスト |
| K11 | Drift Detection | Drift Detectionの回帰テスト |
| K12 | Consistency Checker | Consistency Checkerの回帰テスト |
| K13 | phasegate.config.json | Config単一原則の回帰テスト |
| K14 | Phase Dependency Model | Phase Dependency Modelの3層構造・Level間依存強制の回帰テスト |
| K15 | Plan文書の必須生成 | plan文書なしのPhase 2移行拒否の回帰テスト |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| モジュール | RegressionRunner（回帰テストスイート実行） | ci-governance（CIゲート組み込み） |
| データ | TestExecutionSummary（テスト実行結果サマリー） | harness-api（statusコマンド）、ci-governance（CIゲート結果） |
| データ | MigrationMapping（v0→v1テスト対応表） | 外部利用者（移行状況確認） |
| テストスイート | k-requirements（K1-K15回帰テスト） | CIパイプライン |
| テストスイート | gng-gate（Go/No-Go Gate品質側3条件） | CIパイプライン |
| テストスイート | v0-migration（v0 143テスト仕様のv1再実装） | CIパイプライン |
| テストスイート | agent-independence（エージェント非依存ガード） | CIパイプライン |

---

## 8. 実装上の制約・注意事項

- **Phase A/B内部マイルストーン**: Phase A（H14: K1-K15回帰テスト + Go/No-Go Gate回帰テスト）はWave 2後半から設計・一部実装を開始可能。回帰テスト対象のUnitが実装完了した時点で、そのUnitに対応するK要件の回帰テストを順次実装する。Phase B（H15: v0テスト資産移行）は全v1 Unit実装完了後に着手する
- **エージェント非依存ガードの実装**: coreモジュール（domain/usecase層）のimport文を解析し、`@anthropic-ai/claude-code`等のエージェント固有パッケージをimportしていないことを検証する。許可されるのはadapter/infrastructure層のみ。import解析はbiome-ast-engineの解析結果を活用することを検討
- **v0テスト仕様の移行対象分析**: v0の143テスト仕様のうち、v1スコープに含まれるもの（品質ハーネス関連）を移行対象とする。オーケストレーションパッケージに移管された機能のテストはスコープ外
- **Biome移行に伴うテスト修正**: v0ではESLintベースだったテストをBiome対応に修正する。ESLint固有のAPI呼び出し・設定参照をBiome相当に置き換え、テスト結果の等価性を保証する
- **CIゲート統合の段階的構築**: Phase Aの回帰テストは個別にCIゲートに組み込み、Phase Bのv0移行テストは全件完了後に一括でCIゲートに追加する。CIの実行時間を考慮し、テストスイートの並列実行を設定する
- **カバレッジ閾値**: v1再実装テスト全体のカバレッジ閾値は90%（standard preset準拠）。ただし回帰テスト自体のカバレッジは対象外（回帰テストは外部Unitの公開インターフェースを検証するものであり、自Unit内のカバレッジ概念は適用しない）
- **テストの独立性**: 各回帰テストは他の回帰テストに依存しない。K1の回帰テストが失敗してもK2の回帰テストは独立して実行・結果報告される。テストスイートをVitest 3.0.0のworkspace機能で分離し、並列実行を可能にする
- **v0テスト対応表の管理**: v0テスト仕様（143件）とv1テスト実装の対応表は`docs/product/construction/regression_suite/v0_v1_test_mapping.md`に管理する。対応表にはv0テストID、v1テストファイルパス、移行状態（migrated/modified/skipped）、Biome修正内容を記載する

---

## 9. Corpus 履歴

- 2026-07-16: WI-285 で Unit ID と一致する canonical filename へ移行した。
