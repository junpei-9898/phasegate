---
traceability:
  initial_creation: true
---

# Unit定義: validator-system

> **Unit ID**: validator-system
> **作成日**: 2026-03-12
> **Wave**: 2（コア品質機構）
> **対応Epic**: H-08 L2-L4バリデータ体系

---

## 1. 概要

L2 test-quality、L3 security/performance/coverage、L4 drift-detect/consistency-check/dead-codeの全バリデータを集約管理するUnit。4層防御モデル（L1-L4）のうちL2-L4を担当し、HarnessError出力パイプラインとconfig参照を共通基盤として、品質検証ルールをドメインとして統一的に扱う。

v0には対応するUnitが存在しない新規Unitである。v0では各品質チェックが個別に散在していたが、v1ではバリデータIDレジストリによる一元管理と、l2/l3/l4サブモジュールによる内部分離を両立させ、**統一的なバリデータ実行インターフェース**を提供する。harness-apiやquick-mode等のConsumerが、バリデータID指定で任意のバリデータを選択実行できるアーキテクチャを実現する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H08-01 | L2 test-qualityバリデータ | Must |
| H08-02 | L3 security+performanceバリデータ | Must |
| H08-03 | L3 coverageバリデータ | Must |
| H08-04 | L4 drift-detectバリデータ | Must |
| H08-05 | L4 consistency-checkバリデータ | Must |
| H08-06 | L4 dead-codeバリデータ | Must |

---

## 3. 機能要件

### 3.1 L2 test-qualityバリデータ（H08-01）

- AAAパターン（Arrange/Act/Assert）構造の検証
- テスト変数の`actual`命名規約の検証
- single-act（1テストケース1アクション）の検証
- no-domain-mock（ドメイン層のモック禁止）の検証
- E2E seed pattern（テストデータのシード方式）の検証
- describe/it命名規約の検証
- 各ルール違反時のHarnessError（L2-003）に`fix_example`を含める

### 3.2 L3 security+performanceバリデータ（H08-02）

- ハードコードされた秘密情報（APIキー、パスワード等）の検出
- SQLインジェクションパターンの検出
- ループ内awaitの検出
- N+1クエリパターンの検出
- bundleSizeLimit（strictプリセットのみ）の検証
- 各ルール違反時のHarnessError（L3-001/L3-002）に`adr_ref` + `fix_example`を含める

### 3.3 L3 coverageバリデータ（H08-03）

- phasegate.config.jsonのcoverageThresholdを読み取り閾値検証を実行
- standardプリセット（90%）での閾値検証
- strictプリセット（95%）での閾値検証
- 閾値未達時のHarnessError（L3-003）に現在のカバレッジ値と不足分を含める

### 3.4 L4 drift-detectバリデータ（H08-04）

- 設計→コード方向の乖離検出（設計文書に定義されているがコードに実装されていない要素）
- コード→設計方向の乖離検出（コードに存在するが設計文書に定義されていない要素）
- @unitメタデータで参照されるUnitが設計文書に存在することを検証
- 設計文書の@story-id HXX-XXに対応するinception文書の存在を検証
- 乖離検出時のHarnessError（L4-001）に乖離の方向・対象要素・推奨アクションを含める

### 3.5 L4 consistency-checkバリデータ（H08-05）

- 文書間のレイヤー整合性の検証（domain_model.md ⇔ logical_design.md ⇔ 実装コード）
- 設計文書間の用語不一致（エンティティ名、VO名等）の検出
- 検出時のHarnessError（L4-002）に`adr_ref` + `fix_example` + 不整合箇所の詳細を含める
- 検証対象ペア（domain_model↔logical_design, logical_design↔実装コード）が設定可能

### 3.6 L4 dead-codeバリデータ（H08-06）

- 未使用エクスポート（exportされているが他ファイルからimportされていない）の検出
- 到達不能コード（条件分岐で到達し得ないブロック）の検出
- 検出時のHarnessError（L4-003）に`adr_ref` + `fix_example` + 対象ファイルパス・行番号を含める
- strictプリセットでのみ有効（deadCodeGC機能としてphasegate.config.jsonで制御）

---

## 4. ドメインモデル概要

- **ValidatorDefinition（値オブジェクト）**: バリデータの定義を表すVO（集約なし）。`validatorId`, `layer`, `enabled` は外部依存値（HarnessConfigV2から導出）のためライフサイクルを持たない。domain_model.md §2 設計決定D1（ValidatorDefinition VOパターン）参照
- **ValidatorId（値オブジェクト）**: レイヤー + 連番のバリデータID体系（L2-001〜L4-003）
- **ValidationResult（値オブジェクト）**: バリデータ実行結果（pass/fail + HarnessError一覧）
- **ValidationRule（値オブジェクト）**: 個別の検証ルール定義（ルール名・検証ロジック・エラーテンプレート）
- **LayerConfig（値オブジェクト）**: レイヤー別の有効/無効・閾値設定（config-foundationから取得）
- **DriftReport（値オブジェクト）**: 乖離検出結果（方向・Unit名・対象要素・推奨アクション）
- **ConsistencyReport（値オブジェクト）**: 整合性検証結果（不一致箇所・検証対象ペア）
- **ValidatorRegistry（ドメインサービス）**: 全バリデータIDの一元管理・バリデータID指定による選択実行
- **ValidatorExecutionService（ドメインサービス）**: バリデータの順次実行・結果集約・HarnessError生成
- **DriftDetectionService（ドメインサービス）**: 設計⇔コードの双方向乖離検出ロジック
- **ConsistencyCheckService（ドメインサービス）**: 文書間レイヤー整合性検証ロジック
- **DeadCodeDetectionService（ドメインサービス）**: 未使用エクスポート・到達不能コード検出ロジック

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: 全バリデータのエラー出力フォーマット
- **HarnessConfigV2型**（config-foundationが定義）: レイヤー有効/無効・閾値・Preset設定の参照

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **Validator ID Registry** | 提供 | harness-api, quick-mode, config-foundation, skill-quality, ci-governance, regression-suite | バリデータID一覧（L2-001〜L4-003）と実行インターフェース。以下の正規対応表を含む: |

#### Validator ID Registry 正規対応表

| validatorName | validatorId | layer | owner-story |
|--------------|-------------|-------|-------------|
| phase-gate | L2-001 | L2 | H02-01（phase-dependency-model提供、本Unit実行） |
| metadata | L2-002 | L2 | H03-01（traceability-model提供、本Unit実行） |
| test-quality | L2-003 | L2 | H08-01 |
| security | L3-001 | L3 | H08-02 |
| performance | L3-002 | L3 | H08-02 |
| coverage | L3-003 | L3 | H08-03 |
| nyquist | L3-004 | L3 | H07-02（nyquist-validation提供、本Unit実行） |
| drift-detect | L4-001 | L4 | H08-04 |
| consistency-check | L4-002 | L4 | H08-05 |
| dead-code | L4-003 | L4 | H08-06 |
| **Phase Dependency 3層構造** | 消費 | phase-dependency-model | L2 phase-gateバリデータのフェーズ遷移条件 |
| **@unit/@layerメタデータ仕様** | 消費 | traceability-model | L2 metadataバリデータの検証対象 |
| **ADR Frontmatter Schema** | 消費 | adr-foundation | `adr_ref`フィールドの参照先ADR実在性検証 |
| **Preset ID Registry** | 消費 | config-foundation | strictプリセット限定機能（bundleSizeLimit, deadCodeGC）の判定 |
| **biome-ast-engine（L1結果参照）** | 消費 | biome-ast-engine | L1バリデータ結果の参照（L2以上の前提条件） |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | L2-L4バリデータを一元管理し、レイヤー別に有効/無効を制御 |
| K4 | テスト品質ルール | L2 test-qualityバリデータでAAA/actual命名/single-act/no-domain-mock/E2E seed/describe-it規約を機械的に強制 |
| K10 | Security/Performance検出 | L3 security+performanceバリデータでハードコード秘密/SQLインジェクション/ループ内await/N+1を検出 |
| K11 | Drift Detection | L4 drift-detectバリデータで設計⇔コードの双方向乖離を検出 |
| K12 | Consistency Checker | L4 consistency-checkバリデータで文書間レイヤー整合性を検証 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 型定義 | Validator ID Registry（バリデータID一覧 + 実行インターフェース） | harness-api, quick-mode, config-foundation |
| モジュール | ValidatorRegistry（バリデータID指定の選択実行） | harness-api (ci-check), quick-mode |
| モジュール | ValidatorExecutionService（バリデータ順次実行・結果集約） | harness-api |
| モジュール | DriftDetectionService（乖離検出） | harness-api (detect-drift) |
| データ | ValidationResult（バリデータ実行結果） | harness-api, ci-governance |
| データ | DriftReport（乖離レポート） | harness-api (detect-drift) |

---

## 8. 実装上の制約・注意事項

- **内部サブモジュール分離**: 6バリデータを`l2/`（test-quality）、`l3/`（security, performance, coverage）、`l4/`（drift-detect, consistency-check, dead-code）のサブモジュールに分離。担当者とテストスイートも独立させ、肥大化リスクを軽減
- **統一実行インターフェース**: 全バリデータがValidator集約ルートの共通インターフェースで実行可能。harness-apiやquick-modeはバリデータIDを指定するだけで任意のバリデータを選択実行できる
- **HarnessError出力パイプライン**: 全バリデータのエラー出力はHarnessError型に統一。`code`フィールドにバリデータID（L2-003, L3-001等）を使用し、`fix_example`と`adr_ref`を必須とする
- **Preset連動**: strictプリセット限定機能（bundleSizeLimit: H08-02 AC-5、deadCodeGC: H08-06 AC-4）はconfig-foundationのPreset解決結果に基づいて有効/無効を判定。バリデータ側でPreset判定ロジックを持たない
- **biome-ast-engineとの責務分離**: L1バリデータ（Biomeプラグイン）はbiome-ast-engineが所有。本Unitは**L2-L4のみ**を担当し、L1結果は参照のみ行う
- **L4バリデータの段階的実装**: drift-detect（H08-04）とconsistency-check（H08-05）は設計文書のパース・比較を伴うため、対象文書のフォーマット仕様（folder_management_rules.md）への準拠が前提。dead-code（H08-06）はAST解析を伴うため、biome-ast-engineの解析結果を活用することを検討
- **テストスイートの独立性**: l2/l3/l4サブモジュールごとにテストスイートを独立させ、並列テスト実行を可能にする。Vitest 3.0.0のworkspace機能を活用
