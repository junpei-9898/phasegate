# Unit定義: config-foundation

> **Unit ID**: config-foundation
> **作成日**: 2026-03-12
> **Wave**: 1（基盤構築）
> **対応Epic**: H-04 phasegate.config.json v2

> **注記**: 本ファイルは `config_foundation_unit.md`（アンダースコア版）のケバブケース版である。Phase Gate の path resolution が kebab-case ファイル名を要求するため、同一内容を両ファイル名で保持している。正規ソースは本ファイル（kebab-case）とする。

---

## 1. 概要

phasegate.config.json v2のスキーマ設計・バリデーション・Preset System・機能切替を担うUnit。Phasegate v1の全Unitが依存する品質設定基盤を提供し、`HarnessConfigV2`型をShared Kernelとして公開する。

v0ではオーケストレーション設定（orchestration/sessionセクション）やv1→v2マイグレーション（US-027/028/030）を含んでいたが、v1ではこれらをOrchestrationパッケージに移管し、**品質設定のSingle Source of Truth**に特化する。新たにPreset System（minimal/standard/strict）によるProgressive Disclosureを実現し、プロジェクトの成熟度に応じた段階的品質ゲート強化を可能にする。

configurable_phase_gate_plan による拡張では、`phaseDependencies` セクションに `storyReflection` サブセクションと `preset: "default"` フォールバックが追加される。これらは config-foundation が「構造」を所有し、意味論は phase-dependency-model 側で解釈される。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H04-01 | phasegate.config.json v2スキーマ定義 | Must |
| H04-02 | Preset System定義と切替 | Must |
| H04-03 | GSD由来品質機能のデフォルト無効化 + phasegate:enable/disable機能切替 | Must |

### configurable_phase_gate_plan 追加スコープ

| タスク | 内容 |
|--------|------|
| A-4-2 | `harness-config-v2.schema.json` に `phaseDependencies.storyReflection` セクションと `phaseDependencies.preset: "default"` を optional 追加 |
| A-6 | `init --preset <name>` CLI オプション追加、`skill-deployer.ts` の `initHarnessConfig` から preset 初期値を書き込み、`"default"` → `"full"` フォールバックを Provider 層で実装 |

---

## 3. 機能要件

### 3.1 phasegate.config.json v2スキーマ（H04-01）

- v2スキーマに以下のトップレベルセクションを含む: `project` / `layers` / `quickMode` / `phaseDependencies` / `planningMode` / `paths` / `reporting` / `harnesses`
- `layers`セクションでL1-L4の有効/無効・バリデータ構成・閾値が設定可能
- `quickMode`セクションで`allowedCategories` / `maintainedLayers` / `relaxedGates`が設定可能
- `phaseDependencies`セクションで `preset`（`default`/`full`/`standard`/`minimal`/`custom`）と `storyReflection` サブセクション（`enabled`, `mappings`）が optional で指定可能
- JSONスキーマバリデーション（スキーマファイル定義 + バリデーション実行）
- 有効・無効なサンプル設定ファイルによる検証

### 3.2 Preset System（H04-02）

- 3つのプリセット定義:
  - **minimal**: L1+L2のみ有効（学習・プロトタイプ向け）
  - **standard**: L1+L2+L3有効、カバレッジ閾値90%（通常開発向け）
  - **strict**: L1-L4全有効、カバレッジ閾値95%、bundleSizeLimit・agentLessonCollection・deadCodeGC有効（本番向け）
- `project.preset`フィールドの値変更のみでプリセット切替が完了
- プリセットの個別設定上書き（例: standardだがcoverageThresholdを95%に）が可能

### 3.3 デフォルト無効化 + phasegate:enable/disable（H04-03）

- GSD由来の品質機能がデフォルトで`enabled: false`
- `phasegate:enable <feature>`コマンドで個別機能を有効化
- `phasegate:disable <feature>`コマンドで個別機能を無効化
- `phasegate:enable --list`で有効化/無効化可能な機能名一覧を表示
- 存在しない機能名が指定された場合、利用可能な機能名一覧を含むエラーメッセージを表示

### 3.4 init --preset オプション（configurable_phase_gate_plan A-6）

- `phasegate init --preset <full|standard|minimal|custom>` で初期 `phasegate.config.json` を生成
- `--preset` 未指定時は `full` を採用（ただし設定ファイル上は `"default"` と記録し、Provider 層で `full` に解決する）
- `skill-deployer.ts` の `initHarnessConfig` から preset 値を受け取り、テンプレートに反映

---

## 4. ドメインモデル概要

- **HarnessConfigV2（集約ルート）**: v2設定の読み込み・検証・永続化を統括
- **ConfigVersion（値オブジェクト）**: v1 / v2のバージョン識別
- **Preset（値オブジェクト）**: minimal / standard / strict のプリセット定義（`"default"` はスキーマ入力の糖衣構文としてのみ扱い、ドメイン層では `full` に解決済みの値を持つ）
- **LayerConfig（値オブジェクト）**: L1-L4各レイヤーの有効/無効・バリデータ構成・閾値
- **QuickModeConfig（値オブジェクト）**: Quick Mode設定（allowedCategories / maintainedLayers / relaxedGates）
- **FeatureToggle（値オブジェクト）**: 個別機能の有効/無効状態
- **FeatureRegistry（ドメインサービス）**: phasegate:enable/disableの対象機能名レジストリ。Validator ID Registryおよびharnessesセクションのキーをマージして有効化/無効化可能な機能名一覧を提供する
- **ConfigValidationService（ドメインサービス）**: JSONスキーマに基づく設定ファイルのバリデーション
- **PresetResolutionService（ドメインサービス）**: プリセット + 個別上書きの解決・マージ

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: バリデーションエラー等のエラー出力に使用

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **HarnessConfigV2型** | 提供 | 全Unit | v2設定スキーマの型定義（Shared Kernel） |
| **Preset ID Registry** | 提供 | harness-api, quick-mode, validator-system | プリセットID（minimal/standard/strict）と有効レイヤー定義 |
| **Validator ID Registry** | 消費 | validator-system | phasegate:enable/disableの対象機能名として参照 |
| **phaseDependencies 構造定義** | 提供 | phase-dependency-model | `preset` / `storyReflection` を含む構造。意味論解釈は相手側の責務 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | `layers`セクションでL1-L4の有効/無効・バリデータ構成を設定可能にする |
| K13 | phasegate.config.json | 品質設定のSingle Source of Truthとしてv2スキーマを定義・バリデーション |
| K14 | Phase Dependency Model | `phaseDependencies`セクションでphase-dependency-modelの設定を格納。Level間依存の緩和禁止制約をスキーマレベルで表現する |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 型定義 | `HarnessConfigV2`型（Shared Kernel） | 全Unit |
| スキーマ | harness-config-v2.schema.json | 全Unit（バリデーション用） |
| モジュール | config-loader（v2スキーマ読み込み） | 全Unit |
| CLI | `phasegate:enable` / `phasegate:disable` / `phasegate init --preset` | 外部利用者、harness-api |
| データ | Preset定義（minimal/standard/strict） | harness-api, quick-mode, validator-system |

---

## 8. 実装上の制約・注意事項

- **v0との差異**: v0のUS-027（orchestrationセクション）、US-028（sessionセクション）、US-030（v1→v2マイグレーション）はOrchestrationパッケージに移管済み。本Unitは品質設定のみを扱う
- **型定義の先行確定**: Wave 1開始前に`HarnessConfigV2`型のインターフェースを先行定義し、他Unitの並列開発を可能にする
- **デフォルト無効原則**: GSD由来の全品質機能は`enabled: false`をデフォルトとし、Go/No-Go Gate #8（デフォルトOFF）を遵守する
- **JSONスキーマバリデーション**: ajv等のJSONスキーマバリデータを使用。スキーマファイルは`harness-config-v2.schema.json`として管理
- **設定ファイルフォーマット**: インデント2のJSON形式。ファイルパスはプロジェクトローカル原則（`~`や`$HOME`禁止）
- **harness-errorへの実装時依存**: harness-errorがfix_example検証でバリデータ実行にconfig参照する。型定義の先行確定により並列開発は可能
- **HarnessConfigV2型とharnessesセクション**: `harnesses`セクション内の`deadCodeGC`はstrictプリセットで有効化される。`agentLessonCollection`/`cascadeUpdate`/`bundleSizeLimit`/`deadCodeGC`の全キーがharnessesセクションに含まれる
- **FeatureRegistry**: `phasegate:enable --list`が返す機能名一覧は、Validator ID Registry（validator-systemが所有）の全ID + harnessesセクションのキーを統合したもの。FeatureRegistryがこの統合を担当する
- **後方互換性**: `phaseDependencies.storyReflection` と `phaseDependencies.preset` は optional。既存の `phasegate.config.json` は無改修で有効。未指定時は Provider 層（`HarnessConfigPhaseConfigProvider`）でデフォルト補完する
- **`"default"` 解決責務**: `preset: "default"` はスキーマ入力レベルの糖衣構文で、Infrastructure 層の `HarnessConfigPhaseConfigProvider` で `"full"` に解決してから Domain 層へ渡す。Domain 層は `"default"` を知らない
