---
traceability:
  initial_creation: true
---

# Unit定義: harness-api

> **Unit ID**: harness-api
> **作成日**: 2026-03-12
> **Wave**: 2（コア品質機構）
> **対応Epic**: H-09 Harness API
>
> **注記**: 本ファイルは kebab 命名規則版。underscore 版 (`harness_api_unit.md`) は互換のため併存する。内容は underscore 版と等価（kebab-case path resolution 用）。

---

## 1. 概要

Phasegateの全CLIコマンドの名前・入出力仕様・終了コードを一元的に所有するUnit。`phasegate:check-ready` / `phasegate:check-phase` / `phasegate:ci-check` / `phasegate:detect-drift` / `phasegate:status`に加え、`phasegate:lint` / `phasegate:complete-check`のCLIエントリポイントも本Unitが所有する。

v0には対応するUnitが存在しない新規Unitである。v0ではCLIコマンドが各Unitに散在し、コマンド名の重複や入出力仕様の不統一が発生していた。v1ではCLI Command Registryによりコマンド定義を集約し、agent-integrationが参照する**薄いCLI契約レイヤー**を提供する。実行ロジック自体はvalidator-system等の各Unitが所有し、harness-apiはCLIのエントリポイント・入出力変換・終了コード管理に責務を限定する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H09-01 | phasegate:check-ready / phasegate:check-phase | Must |
| H09-02 | phasegate:ci-check | Must |
| H09-03 | phasegate:detect-drift | Must |
| H09-04 | phasegate:status（成果物駆動状態導出） | Must |

---

## 3. 機能要件

### 3.1 phasegate:check-ready / phasegate:check-phase（H09-01）

- `phasegate:check-ready`コマンドが全storyのPhase Gate通過状態をJSON形式で返却
- `phasegate:check-phase <unit>`コマンドが指定Unitの現在フェーズ（Level/スキル名）を返却
- Phase Gate未通過のstoryが存在する場合、未通過story一覧を含むレスポンスを返す
- 存在しないUnit名が指定された場合、適切なエラーメッセージを表示

### 3.2 phasegate:ci-check（H09-02）

- 全L3バリデータ（security/performance/coverage/nyquist）を順次実行
- 全バリデータ通過時にPass判定、1つでも失敗時にFail判定を返す
- 実行結果にバリデータ別のPass/Fail詳細を含める
- 失敗時のレスポンスにHarnessError一覧を含める

### 3.3 phasegate:detect-drift（H09-03）

- 設計→コード方向とコード→設計方向の双方向乖離を検出
- 乖離レポートにUnit名・乖離方向・対象要素の詳細を含める
- 乖離が0件の場合、「乖離なし」のサマリーを返却
- `--json`フラグでJSON形式のレポート出力が可能。出力スキーマに`drifts[]`（方向/unit/要素/推奨アクション）フィールドを含める

### 3.4 phasegate:status（H09-04）

- ファイルシステム上の成果物（設計文書、テストファイル、メタデータ）の存在からハーネス検査状態を導出（成果物駆動の状態導出）
- レスポンスにL1-L4各レイヤーの健全性（有効/無効/最終実行結果）を含める
- レスポンスにPhase Gate通過状態のサマリーを含める
- レスポンスにプリセット名と有効な設定のサマリーを含める
- JSON形式での出力が可能

### 3.5 phasegate:lint / phasegate:complete-check（CLI Command Registry所有）

- `phasegate:lint`: L1 BiomeバリデータのCLIエントリポイント（実行ロジックはbiome-ast-engine）
- `phasegate:complete-check`: L1-L4全バリデータの統合実行CLIエントリポイント（実行ロジックはvalidator-system + biome-ast-engine）
- 上記コマンドの入出力仕様・終了コードを本Unitが定義・管理

### 3.6 installation lifecycle dispatch（WI-148）

@work-item-id WI-148

- `phasegate reconcile --dry-run|--apply [--force] [--json]` を installation unit の `ReconcileHandler` に dispatch する。
- `phasegate update-skills` は互換 alias として `reconcile` に委譲する。
- `phasegate init` は legacy deploy 挙動を維持しつつ、v1.0 削除予定の deprecation warning を stdout に表示する。

---

## 4. ドメインモデル概要

- **CliCommand（集約ルート）**: CLIコマンドの定義・入出力仕様・終了コードを統括
  - `commandName`: コマンド名（例: `phasegate:check-ready`）
  - `inputSpec`: 入力仕様（引数・フラグ定義）
  - `outputSpec`: 出力仕様（JSON構造・フィールド定義）
  - `exitCodes`: 終了コード定義（0: 正常, 1: 失敗, 2: エラー）
- **CommandRegistry（ドメインサービス）**: 全CLIコマンドの一元管理・コマンド名の一意性保証
- **HarnessApiResponse（値オブジェクト）**: CLI出力のJSON構造（status/errors/summary）— Cross-Unit Contract DTO
- **CheckReadyResult（値オブジェクト）**: 全storyのPhase Gate通過状態
- **PhaseInfo（値オブジェクト）**: 指定Unitの現在フェーズ情報
- **CiCheckResult（値オブジェクト）**: L3バリデータ統合実行結果（バリデータ別Pass/Fail + HarnessError一覧）
- **DriftReportSummary（値オブジェクト）**: 乖離レポートのCLI出力形式
- **HarnessStatusSummary（値オブジェクト）**: ハーネス全体の健全性サマリー（L1-L4健全性/Phase Gate/Preset/設定）
- **CommandDispatchService（ドメインサービス）**: CLIコマンドから対応する実行ロジック（validator-system等）へのディスパッチ

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: 全CLIコマンドのエラーレスポンスに使用
- **HarnessConfigV2型**（config-foundationが定義）: Preset名・有効設定の参照

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **Harness API Response DTO** | 提供 | agent-integration, ci-governance | CLI出力のJSON構造（status/errors/summary） |
| **CLI Command Registry** | 提供 | agent-integration | 全CLIコマンド名・入出力仕様・終了コード定義 |
| **Validator ID Registry** | 消費 | validator-system | ci-check/complete-checkで実行するバリデータID一覧 |
| **DriftDetectionService** | 消費 | validator-system | detect-driftコマンドの実行ロジック |
| **Preset ID Registry** | 消費 | config-foundation | statusコマンドでのプリセット情報表示 |
| **RequirementTestMatrix Schema** | 消費 | nyquist-validation | ci-checkでのnyquistバリデータ実行 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | phasegate:statusでL1-L4各レイヤーの健全性を一覧表示。phasegate:complete-checkでL1-L4全層の統合チェックを提供 |
| K11 | Drift Detection | phasegate:detect-driftコマンドで設計⇔コード乖離の任意タイミング検出をCLIインターフェースとして提供 |
| K13 | phasegate.config.json | phasegate:statusでプリセット名・有効設定のサマリーを表示し、設定状態の可視化を実現 |
| K14 | Phase Dependency | phasegate:check-ready/check-phaseでPhase Gate通過状態の機械的判定を提供 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 型定義 | HarnessApiResponse DTO（CLI出力JSON構造） | agent-integration, ci-governance |
| 型定義 | CLI Command Registry（全コマンド定義） | agent-integration |
| CLI | `phasegate:check-ready` | 外部利用者、agent-integration |
| CLI | `phasegate:check-phase <unit>` | 外部利用者、agent-integration |
| CLI | `phasegate:ci-check` | 外部利用者、ci-governance |
| CLI | `phasegate:detect-drift` | 外部利用者、agent-integration |
| CLI | `phasegate:status` | 外部利用者、agent-integration、ci-governance |
| CLI | `phasegate:lint` | 外部利用者、agent-integration |
| CLI | `phasegate:complete-check` | 外部利用者、agent-integration |
| CLI | `phasegate:impact-analysis <HXX-XX>` | 外部利用者（実行ロジック: nyquist-validation） |

---

## 8. 実装上の制約・注意事項

- **CLIコマンドの一元所有**: 全CLIコマンド名の定義権限は本Unitが所有。他Unitが新たにCLIコマンドを追加する場合、必ず本UnitのCLI Command Registryに登録する。コマンド名の重複を防止するため、CommandRegistryでコマンド名の一意性を保証
- **薄いエントリポイント層**: 本Unitは実行ロジックを持たず、CLIの入出力変換・ディスパッチ・終了コード管理に責務を限定する。実行ロジックはvalidator-system（ci-check, detect-drift, complete-check）、biome-ast-engine（lint）、config-foundation（status）等の各Unitが所有
- **agent-integrationとの境界**: agent-integrationはHook/FSイベントをharness-api CLIに変換する薄いAdapter層。harness-apiのCLI Command RegistryとHarnessApiResponse DTOを消費する関係
- **順序依存**: validator-systemおよびconfig-foundationの主要インターフェースが確定した後に本Unitの実装に着手する（unit_design_plan.md §4.2参照）
- **JSON出力の一貫性**: 全コマンドのJSON出力は共通envelope `{ status, errors[], summary }`を持ちつつ、コマンド固有のpayload型を`data`フィールドに格納する設計とする。例: `phasegate:check-phase`は`data: PhaseInfo`、`phasegate:detect-drift`は`data: DriftReportSummary`、`phasegate:ci-check`は`data: CiCheckResult`。HarnessApiResponseは共通envelopeのみ定義し、payload型は各コマンド定義に紐づく
- **終了コード規約**: 0（正常/Pass）、1（Fail/対象未検出）、2（実行エラー）の3値を全コマンドで統一。agent-integrationがHook内で終了コードに基づくフロー制御を行うため、終了コードの意味論を厳密に定義
- **成果物駆動の状態導出（H09-04）**: phasegate:statusはDBやステートファイルではなく、ファイルシステム上の成果物の存在から状態を導出する。これにより状態の不整合やステートファイルの破損リスクを排除
