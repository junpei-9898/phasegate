# 論理設計計画: biome-ast-engine

> **Unit ID**: biome-ast-engine
> **作成日**: 2026-03-13
> **モード**: Phase 1（論理設計計画）
> **対応ストーリー**: H01-01, H01-02, H01-03
> **前提ドキュメント**: `docs/product/construction/biome-ast-engine/domain_model.md`, `docs/product/units/biome_ast_engine_unit.md`, `docs/product/units/integration_contract.md`

---

## 1. スコープ

### 対象ストーリー

| Story ID | タイトル | この計画で扱う主論点 |
|----------|---------|----------------------|
| H01-01 | v0コア4ルールのBiomeプラグイン移植 | v0 ESLint 4ルールの責務分解、ImportGraph中心の解析フロー、v1レイヤー語彙への正規化 |
| H01-02 | AI生成コードアンチパターン検出ルール | 4アンチパターンをRuleDefinition体系へ統合し、TypeScript純粋実装として再配置 |
| H01-03 | CIパイプラインBiome統合（ESLint完全除去） | Biome CLI連携境界、HarnessError出力、ESLint資産撤去の移行順序 |

### 対象層

| 層 | 対象 | 設計観点 |
|----|------|---------|
| domain | 対象 | 値オブジェクト、ドメインサービス、ImportGraph中心の不変条件 |
| application | 対象 | lint実行、ルール解決、importグラフ解析、CI向け結果組み立て |
| infrastructure | 対象 | Biome CLI実行、TypeScript AST解析、ファイルシステム、設定読取、HarnessError変換 |
| presentation | 限定対象 | 本Unit単独のUIは持たない。必要最小限の公開Facade有無のみ整理 |

### スコープ外

- `@unit/@layer` の正規仕様定義そのものは traceability-model 所有
- `harness:lint` などCLIコマンドの最終入出力責務は harness-api 所有
- CIワークフロー全体の所有は ci-governance。biome-ast-engine は実行ロジックと出力契約のみ担う
- L2-L4 バリデータの設計は validator-system 所有

---

## 2. 設計方針

### 2.1 アーキテクチャ層定義

- v1の正規語彙は `domain / application / infrastructure / presentation` を採用する
- `port / usecase / controller` は実装パターン名としては使用可だが、`@layer` と論理層定義には使わない
- 依存方向は横断契約どおり `domain ← application ← infrastructure` および `domain ← application ← presentation` に固定する
- Domain層は外部ライブラリ型を露出させず、TypeScript ASTやCLI実行結果はPort越しの中立DTOで受け取る
- biome-ast-engine は集約を持たない前提を維持し、不変値オブジェクト + ドメインサービスで閉じる

### 2.2 技術スタック方針

| 技術 | 用途 | 採用方針 |
|------|------|---------|
| TypeScript | Unit実装全体 | v1の正規実装言語。Rust/WASMは採用しない |
| TypeScript Compiler API | import文・型注釈・コメント解析 | カスタム8ルールのAST解析基盤の第一候補 |
| Biome CLI | 標準lint/format実行、開発体験統合 | 外部プロセスとしてInfrastructure層で実行する |
| Vitest | Unit/IT/回帰テスト | 既存テスト基盤を継続利用する |
| HarnessConfigV2 | L1設定供給 | `config-foundation` から読取専用で参照する |
| HarnessError | 統一エラー出力 | `harness-error` からimportし、Infrastructureでマッピングする |

### 2.3 ディレクトリ構造方針

既存の `scripts/harness/` 配下構成と `tsconfig.json` の include 設定を踏まえ、v1では TypeScript 実装を `scripts/harness/biome-ast-engine/` に集約する。

```text
scripts/harness/biome-ast-engine/
├── domain/
│   ├── value-objects/
│   └── services/
├── application/
│   ├── usecases/
│   └── dto/
├── infrastructure/
│   ├── adapters/
│   ├── analyzers/
│   └── mappers/
└── index.ts

scripts/harness/__tests__/biome-ast-engine/
├── domain/
├── application/
├── infrastructure/
└── fixtures/
```

- 既存の `scripts/harness/eslint-rules/` は移行元として扱い、v1の恒久配置先にはしない
- ルール別の実装は「レイヤー別ディレクトリの中で責務分割」し、`rules/` を独立した擬似レイヤーとして増やさない
- `enforce-folder-structure` 自身が検証可能な構造にするため、命名規則もレイヤー語彙に統一する

---

## 3. 層別設計の計画

### 3.1 Domain層

論理設計では、以下の型シグネチャ方針を確定する。

- `RuleDefinition`
  - 不変の定義情報のみを保持し、実行処理は持たせない
  - 最低限 `name`, `type`, `defaultSeverity`, `supportsAutofix`, `requiredInputs` を持つ形を検討する
  - `enabled` や実行時 `severity` は外部設定注入後の派生値として扱う
- `ImportGraph`
  - `nodes` と `edges` を持つ不変値として定義し、循環検出とレイヤー違反抽出をメソッドで提供する
  - `no-layer-violation` と `no-ghost-file` の共通基盤として再利用する
- `LayerBoundary`
  - `sourceLayer`, `targetLayer`, `allowed` を保持し、依存方向の正規判定を集中管理する
  - v1語彙のみを許容し、v0語彙はここでは受け付けない
- `RuleViolation`
  - `RuleViolation Contract` と1対1対応する形に寄せる
  - 後段の `HarnessError` 変換で必要な `message`, `severity`, `fix_example` を保持する
- `LintReport`
  - `violations`, `passedRules`, `skippedRules`, `durationMs` を最小核とし、CI/validator-systemへ渡す集約結果とする
- `RuleDefinitionRegistry`
  - 8ルールのカタログを正規所有するドメインサービスとして設計する
  - `HarnessConfigV2.layers.L1.rules` を適用し、実行対象ルール集合へ変換する責務を持たせる
- `ImportGraphBuilder`
  - AST解析そのものはPortの責務とし、Domain側では `SourceModuleSnapshot` 群から `ImportGraph` を構築する責務に限定する
- `LintRunner`
  - ルールごとの評価戦略を直に持たず、Portから得た解析結果を使って `LintReport` を組み立てるオーケストレータとして設計する

併せて、論理設計では次のルール別責務分担も固定する。

| ルール | Domainで確定する中核概念 |
|--------|------------------------|
| require-unit-comment | ヘッダメタデータ存在判定 |
| require-layer-comment | LayerName正規値との照合 |
| no-layer-violation | ImportGraph + LayerBoundary + cycle detection |
| enforce-folder-structure | FilePathと期待配置規則の照合 |
| no-any-abuse | 型注釈使用量のしきい値判定 |
| no-code-duplication | 構造フィンガープリント比較結果の評価 |
| no-ghost-file | ImportGraphからの未到達判定 |
| no-comment-flood | コメント密度・冗長度判定 |

### 3.2 Application層

論理設計では、ユースケースを以下の単位で確定する。

| ユースケース | 主責務 | 入力/出力の設計方針 |
|-------------|--------|-------------------|
| `ResolveEnabledRulesUseCase` | RuleDefinitionRegistryとHarnessConfigV2を使い有効ルール集合を解決 | 入力: L1設定、出力: 実行対象RuleDefinition一覧 |
| `AnalyzeImportGraphUseCase` | 対象ファイル群からImportGraphを生成し、循環依存・未参照ファイル検出の基礎データを作る | 入力: 対象パス群、出力: ImportGraph |
| `ExecuteLintUseCase` | 8ルールの評価を統合しLintReportを返す | 入力: 対象ファイル群 + 実行設定、出力: LintReport |
| `RegisterRuleCatalogUseCase` | 起動時にルール定義カタログを構成し、実行器に渡せる形へ正規化する | 入力: なし、出力: RuleDefinition一覧 |
| `BuildHarnessErrorPayloadUseCase` | RuleViolation群をHarnessError互換の出力DTOへ変換する | 入力: RuleViolation群、出力: CLI/CI用DTO |
| `VerifyEslintRemovalUseCase` | H01-03向けにESLint設定・依存の残存有無を検査する | 入力: workspace snapshot、出力: 追加Violationまたは検査結果 |

- `RegisterRuleCatalogUseCase` は「動的プラグイン登録」ではなく、「8つの組込みルール定義の正規化」を意味する
- `AnalyzeImportGraphUseCase` は `ExecuteLintUseCase` から再利用される前提で設計し、import解析を一度で済ませる
- Application層では Shared Kernel 型を直接永続保持せず、DTO境界を明示する

### 3.3 Infrastructure層

論理設計では、以下のアダプター設計を確定する。

| アダプター | 役割 | 補足 |
|-----------|------|------|
| `BiomeCliExecutorAdapter` | `biome check` / `biome format` 実行と標準出力パース | Biomeを外部コマンドとして扱う |
| `TypeScriptAstAnalyzerAdapter` | ソースファイルを解析して import, コメント, any 使用箇所, 構造シグネチャを抽出 | Rust/WASM代替の中核 |
| `NodeFileSystemAdapter` | ファイル読取、ディレクトリ走査、相対パス解決 | `FilePath` の正規化を支援する |
| `HarnessConfigProviderAdapter` | `HarnessConfigV2` のL1設定を取得 | config-foundation 依存の唯一の入口 |
| `HarnessErrorMapperAdapter` | RuleViolationからHarnessErrorへ変換 | error code / suggestion / fix_example を付与する |
| `WorkspaceInventoryAdapter` | ESLint関連ファイル・依存の残存確認 | H01-03専用の補助アダプター |

- Infrastructure層は ASTライブラリやNode.js APIへの依存をここに閉じ込める
- `TypeScriptAstAnalyzerAdapter` は importグラフ用とアンチパターン用の抽出器を分割可能な設計にする
- `BiomeCliExecutorAdapter` は rule evaluation の主役ではなく、Biome本体機能との統合点として限定的に使う

### 3.4 Presentation層

本Unitは独立したUIやCLIコマンド所有権を持たないため、専用のPresentation層は基本的に持たない。

- `harness-api` や `agent-integration` から呼ばれるための薄い公開Facadeが必要かのみを論理設計で判断する
- もしFacadeを置く場合でも、責務は `application` の入出力変換に限定し、ドメイン知識は持ち込まない

---

## 4. ポートインターフェース一覧

| ポート名 | 方向 | 利用層 | 責務 |
|---------|------|-------|------|
| `RuleConfigProviderPort` | application/domain ← infrastructure | RuleDefinitionRegistry, ResolveEnabledRulesUseCase | `HarnessConfigV2.layers.L1` の取得 |
| `SourceFileReaderPort` | application/domain ← infrastructure | ImportGraphBuilder, lint関連ユースケース | ファイル本文読取とパス正規化 |
| `SourceModuleAnalyzerPort` | application/domain ← infrastructure | ImportGraphBuilder, 8ルール評価 | import, コメント, 型注釈, 構造指紋の抽出 |
| `BiomeExecutorPort` | application ← infrastructure | ExecuteLintUseCase | Biome CLI実行と標準診断の取得 |
| `WorkspaceInventoryPort` | application ← infrastructure | VerifyEslintRemovalUseCase | 設定ファイル・依存パッケージ残存確認 |
| `ViolationFormatterPort` | application ← infrastructure | BuildHarnessErrorPayloadUseCase | RuleViolation → HarnessError 変換 |
| `ClockPort` | application/domain ← infrastructure | LintRunner | 実行時間計測のテスト容易性確保 |

ポート設計の原則:

- Domain層からは Node.js / Biome / TypeScript Compiler API の型を見せない
- Portは「技術名」より「意味」で命名し、実装差し替えを可能にする
- `HarnessError` と `HarnessConfigV2` は Shared Kernel だが、参照入口はそれぞれ単一Port/Adapterに限定する

---

## 5. v0からの移行方針

### 5.1 基本方針

- v0の Rust/WASM プラグイン前提は廃止し、v1では TypeScript 純粋実装へ統一する
- v0の「Biomeプラグイン層」と「TypeScriptアプリ層」の二重構成は採らず、v1では `application + infrastructure` に集約する
- 既存の `scripts/harness/eslint-rules/` 実装と `scripts/harness/__tests__/eslint-rules/` テストを移行元のオラクルとして使う

### 5.2 移行対象マッピング

| v0/現行資産 | v1での扱い |
|------------|-----------|
| GritQLルール | TypeScript AST解析ベースのメタデータ検査へ置換 |
| Rust Plugin（no-layer-violation, enforce-folder-structure） | `TypeScriptAstAnalyzerAdapter` + Domain判定ロジックへ置換 |
| `BiomeRule` 集約 | `RuleDefinition` + `RuleDefinitionRegistry` に置換済み前提で論理設計を進める |
| `LintExecution` 集約 | `LintRunner` + `LintReport` に置換済み前提で設計する |
| `port/usecase/controller` 中心のv0語彙 | `domain/application/infrastructure/presentation` に正規化する |

### 5.3 移行時の注意点

- `RuleType` からv0の `RustPlugin` は完全に廃止する。v1では `BiomeNative` と `ExternalAnalyzer` のみを正規値とし、`RustPlugin` は型定義にも含めない
- `no-layer-violation` の精度は現行実装の「パス推定」から、`@layer` コメント + パス補助推定の二段判定へ改善する
- H01-03ではコード移行と同時に `.eslintrc*`, `eslint.config.*`, `@typescript-eslint/*` の依存整理順も論理設計に含める

---

## 6. テスト方針

### 6.1 テストレベル

| レベル | 対象 | 方針 |
|-------|------|------|
| Unit Test | 値オブジェクト、Domainサービス、Applicationユースケース | AAA、`actual` 変数名、日本語テスト名を厳守 |
| Integration Test | Infrastructureアダプター、Biome CLI連携、設定読取 | Node.js I/O とCLI実行を含む結合を検証 |
| Parity Regression | 既存ESLintルールとの検出互換性 | H01-01のコア4ルールで最優先 |
| Scenario/Contract Test | HarnessError出力契約、validator-system連携前提 | `RuleViolation Contract` と HarnessError形式の整合確認 |

### 6.2 重点観点

- 8ルールそれぞれに「検出するケース」「検出しないケース」を最低1対ずつ持つ
- `ImportGraph` 系は循環依存、同層依存、許可依存、禁止依存、未参照ファイルの5系統を分けて検証する
- `BuildHarnessErrorPayloadUseCase` は L1-001〜L1-008 のコード付与を固定値として回帰テスト化する
- H01-03では ESLint 関連ファイル/依存が残っている場合に失敗する検査を統合テストで持つ

### 6.3 テスト資産の配置方針

- 新規テストは `scripts/harness/__tests__/biome-ast-engine/` 配下へ配置する
- 既存 `scripts/harness/__tests__/eslint-rules/` は移行比較用フィクスチャとして段階的に再利用する
- フィクスチャはルール単位ではなく「入力ソース断片単位」で再利用可能に整理する

---

## 7. 見積もり

### 7.1 論理設計フェーズ見積もり

| 作業 | 見積もり |
|------|---------|
| Domain/Applicationの責務分解と型シグネチャ整理 | 1.0人日 |
| Infrastructure/Port境界の設計 | 1.0人日 |
| v0移行整理とESLint撤去方針の確定 | 0.5人日 |
| テスト戦略と回帰観点整理 | 0.5人日 |
| **合計** | **3.0人日** |

### 7.2 後続実装の概算

| 実装束 | 概算 |
|-------|------|
| コア4ルールのTypeScript移植 | 3.0〜4.0人日 |
| アンチパターン4ルール実装 | 2.0〜3.0人日 |
| Biome CLI統合 + HarnessError出力 + ESLint撤去 | 2.0人日 |
| テスト・パリティ確認 | 2.0人日 |
| **合計** | **9.0〜11.0人日** |

実装工数は `no-code-duplication` の判定方式と `no-ghost-file` の到達可能性定義で増減するため、論理設計ではこの2点を優先的に明文化する。
