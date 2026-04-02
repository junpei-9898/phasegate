# 論理設計計画: biome-toolchain

> **Unit ID**: biome-toolchain
> **作成日**: 2026-03-11
> **モード**: 横断（Unit全体の論理設計）
> **対応ストーリー**: US-036, US-037, US-038, US-039

---

## 1. スコープ

### 対象Unit
- **biome-toolchain**（Wave 1 基盤構築）

### 対象ストーリー
| Story ID | タイトル | 主要関連層 |
|----------|---------|-----------|
| US-036 | v0カスタムESLintルールのBiomeプラグイン移植 | Biomeプラグイン層, Domain, Infrastructure |
| US-037 | PostToolUse HookのBiomeベース高速化 | Controller(Hook), UseCase, Domain |
| US-038 | L1バリデータのBiomeベース再構築 | Domain, UseCase, Controller(CLI), Infrastructure |
| US-039 | CIパイプラインのBiome統合 | Domain, UseCase, Controller(CI), Infrastructure |

### 設計対象の層
| 層 | 対象 | 備考 |
|----|------|------|
| Biomeプラグイン層 | 対象 | GritQL / Rust Plugin。TypeScriptとは独立した成果物 |
| Domain層 | 対象 | 集約・値オブジェクト・ドメインサービスの詳細設計 |
| UseCase層 | 対象 | ユースケースの入出力・オーケストレーション設計 |
| Controller層 | 対象 | CLI（リント実行）+ PostToolUse Hook + CIワークフロー |
| Infrastructure層 | 対象 | ポート実装（BiomeCLIExecutor, FileSystemReader, JsonBiomeConfigLoader） |
| DB層 | **対象外** | ステートレスなツールチェーンUnitのためDB不要 |
| BFF/Frontend層 | **対象外** | CLIツールのためUI不要 |

---

## 2. 設計方針

### 2.1 アーキテクチャ層の定義

biome-toolchainは **ツールチェーンUnit** であり、一般的なWebアプリケーションとは異なるハイブリッド構成を取る。以下の2つの実行系統を分離して設計する。

#### 実行系統A: Biomeプラグイン（GritQL / Rust Plugin）
- Biomeのプラグインシステム上で動作するネイティブルール
- GritQL（宣言的パターンマッチング）とRust Plugin API（命令的解析）の2方式
- TypeScriptのヘキサゴナルアーキテクチャの**外側**に位置する
- Biome本体のAST解析結果を直接利用するため、ポート抽象化は不要

#### 実行系統B: TypeScriptアプリケーション（ヘキサゴナルアーキテクチャ）
- リント実行オーケストレーション、アンチパターン検出（外部スクリプト）、Hook/CI制御
- ヘキサゴナルアーキテクチャ + DDDに従う
- 依存方向: Domain -> Port -> UseCase -> Controller

#### 層の根拠

| 層 | 根拠 |
|----|------|
| Biomeプラグイン層 | Biomeプラグインはbiome.jsonで宣言的に登録され、Biome CLIが直接実行する。TypeScriptランタイムとは独立しており、別の成果物として管理すべき |
| Domain層 | ドメインモデル（5集約 + 値オブジェクト + ドメインサービス）がリントのビジネスロジックを保持。集約の豊かさを優先する設計哲学に従う |
| UseCase層 | 複数集約の協調（LintOrchestration）やHook/CI判定のフローを調整。Usecaseは集約の取得・実行・結果集約の調整役に徹する |
| Controller層 | 3つのエントリポイント（CLI, PostToolUse Hook, CIワークフロー）を持つ。各エントリポイントがUseCaseを呼び出す |
| Infrastructure層 | Biome CLIプロセス起動、ファイルシステム読み取り、biome.json読み込みのアダプター実装 |

### 2.2 技術スタックの前提

| 技術 | 用途 |
|------|------|
| TypeScript | UseCase, Controller, Infrastructure, Domain（TS部分）, 外部スクリプト（CodeDuplication, GhostFile） |
| GritQL | require-unit-comment, require-layer-commentルール定義 |
| Rust (Biome Plugin API) | no-layer-violation, enforce-folder-structureルール実装 |
| Vitest | 全TypeScriptコードのテスト |
| Biome CLI | リント・フォーマット実行のランタイム |
| pnpm | パッケージ管理 |
| GitHub Actions | CIパイプライン定義 |

### 2.3 ディレクトリ構成方針

```
src/units/biome-toolchain/
├── domain/                          # Domain層
│   ├── aggregates/                  # 集約
│   ├── value-objects/               # 値オブジェクト
│   └── services/                    # ドメインサービス
├── port/                            # ポート（インターフェース）
├── usecase/                         # ユースケース
├── controller/                      # Controller層
│   ├── cli/                         # CLIエントリポイント
│   └── hook/                        # PostToolUse Hookエントリポイント
├── infrastructure/                  # Infrastructure層（アダプター）
└── biome-plugins/                   # Biomeプラグイン層（TypeScript外）
    ├── gritql/                      # GritQLルール定義
    └── rust-plugin/                 # Rust Pluginソース
```

---

## 3. 設計内容サマリー

### 3.1 Biomeプラグイン層

BiomeプラグインはTypeScriptのヘキサゴナルアーキテクチャの外側に位置し、独立した成果物として設計する。

- **GritQLルール（2ルール）**:
  - `require-unit-comment`: `@unit` コメントの存在をパターンマッチで検証。`.grit` ファイルとして定義
  - `require-layer-comment`: `@layer` コメントの存在をパターンマッチで検証。`.grit` ファイルとして定義
  - 設計観点: GritQLパターン定義、対象ファイルグロブ、エラーメッセージ定義
- **Rust Pluginルール（2ルール）**:
  - `no-layer-violation`: インポート文のAST解析 → レイヤー判定 → 依存方向検証。Rust Plugin APIで実装
  - `enforce-folder-structure`: ファイルパスのパターンマッチ → architecture-philosophy.md / folder_management_rules.mdに定義された構造との照合
  - 設計観点: Rust構造体定義、Biome Plugin APIのVisitorパターン、レイヤー境界定義のデータ構造、設定の外部化方式
- **biome.json統合**:
  - カスタムルールの登録方式、severity設定、対象ファイルパターン

### 3.2 Domain層

ドメインモデルで定義された5集約・値オブジェクト・ドメインサービスのTypeScript実装設計。

- **BiomeRule集約**: ルール有効/無効管理、ファイル適用判定、check()メソッドのシグネチャ設計。ただしBiomeプラグイン自体の実行はBiomeCLIExecutorポート経由で行うため、Domain層ではルールメタデータ管理に徹する
- **LintExecution集約**: 状態遷移（Pending→Running→Completed/Failed）の実装、不変条件（INV-4〜6）の強制、LintReport生成ロジック
- **AntiPatternDetector集約**: 4種の検出器のファクトリ/ストラテジパターン設計。BiomeRule実装（AnyTypeAbuse, CommentFlood）とExternalScript実装（CodeDuplication, GhostFile）の分岐
- **HookConfiguration集約**: ファイルパターンマッチング、タイムアウト管理（INV-10: 500ms制約）、コマンド構築
- **CIGateConfiguration集約**: 合格判定ロジック（INV-11）、ESLint残存チェック（INV-12）、HarnessError形式変換
- **値オブジェクト群**: RuleViolation（等価性ロジック）、RuleName/RuleType/ViolationSeverity（列挙型）、FilePath（正規化ロジック）、LayerName（レイヤー定義）、ImportEdge、LintReport、HookCommand、PassCondition、CIStep、ExecutionStatus、AntiPatternType、ImplementationType
- **ドメインサービス**:
  - LintOrchestrationService: BiomeRule群 + AntiPatternDetector群の実行調整、LintExecution管理
  - ImportGraphAnalyzer: インポートグラフ構築、レイヤー違反・循環依存検出
  - ParityTestService: v0 ESLintとの等価性検証

### 3.3 UseCase層

Domain層の集約・サービスを組み合わせてユースケースを実現するオーケストレーション層。

- **ExecuteLintUseCase**: 対象ファイル群に対するフルリント実行（US-036, US-038）
  - 入力: targetFiles, configPath
  - 出力: LintReport
  - フロー: BiomeConfigLoader → BiomeRule群取得 → LintExecution生成 → LintOrchestrationService.executeLint() → LintReport返却
- **ExecutePostToolUseHookUseCase**: 単一ファイルに対する軽量リント+フォーマット実行（US-037）
  - 入力: changedFilePath
  - 出力: LintReport（軽量版）
  - フロー: HookConfiguration.shouldExecute() → BiomeExecutor.format() → BiomeExecutor.check() → タイムアウト検証（INV-10）
  - 制約: 500ms以下の実行時間
- **EvaluateCIGateUseCase**: CIパイプラインでのゲート判定（US-039）
  - 入力: lintReport, projectFiles
  - 出力: CIGateResult（pass/fail + HarnessError[]）
  - フロー: CIGateConfiguration.evaluate() → CIGateConfiguration.checkEslintRemoval() → HarnessError形式変換
- **DetectAntiPatternsUseCase**: アンチパターン検出（US-038）
  - 入力: targetFiles
  - 出力: RuleViolation[]
  - フロー: AntiPatternDetector群取得 → detect() → 結果集約
- **VerifyParityUseCase**: v0 ESLintルールとの等価性検証（US-036）
  - 入力: testCases, biomeRuleResults
  - 出力: ParityReport
  - フロー: ParityTestService.verify() → レポート生成

### 3.4 Controller層

3つのエントリポイントからUseCaseを呼び出す。

- **CLI Controller**:
  - `biome check` 相当のリント実行コマンド。ExecuteLintUseCase / DetectAntiPatternsUseCaseを呼び出し
  - コマンド引数パース、対象ファイル解決、結果のコンソール出力（HarnessError形式）
  - 終了コード制御（違反あり=1, なし=0）
- **Hook Controller**:
  - PostToolUse Hook用エントリポイント。ExecutePostToolUseHookUseCaseを呼び出し
  - Claude Code Hooks形式での呼び出しインターフェース
  - 500ms以下のレスポンス保証のための最適化設計（プロセス起動の最小化等）
- **CI Controller**:
  - GitHub Actionsワークフロー（aidlc-gate.yml）から呼び出されるエントリポイント
  - EvaluateCIGateUseCaseを呼び出し
  - CI出力形式（GitHub Actions annotations等）への変換

### 3.5 Infrastructure層（アダプター）

ポートの具象実装。

- **BiomeCLIExecutor** (implements BiomeExecutor):
  - `biome check` / `biome format` のCLIプロセス起動
  - JSON出力モード（`--reporter=json`）のパース
  - エラーハンドリング（プロセス異常終了、タイムアウト）
  - プロセス起動最適化（Hook用の軽量実行パス）
- **FileSystemReader** (implements FileReader):
  - Node.js fs/promises によるファイル読み取り
  - グロブパターンによる対象ファイル列挙
- **JsonBiomeConfigLoader** (implements BiomeConfigLoader):
  - biome.json の読み込み・パース
  - ルール設定の抽出、extends解決

---

## 4. QA（不明点・確認事項）

### [Question] Q1: GritQLルールの配置場所とbiome.jsonへの登録方式

GritQLルール（`.grit`ファイル）はBiomeのプラグインシステムにおいてどのような配置・登録方式を取るか。Biomeの公式ドキュメント上、GritQLカスタムルールは `biome.json` の `linter.rules` セクションで `source` フィールドにGritQLパターンを直接記述する方式と、外部 `.grit` ファイルを参照する方式の2つが考えられる。

**推奨案:** biome.jsonの `linter.rules` 内に `source` フィールドでGritQLパターンを直接インライン記述する方式を推奨。理由: (1) ファイル分散を避けbiome.json一箇所で管理できる (2) Biome公式の推奨方式に準拠 (3) パターンが比較的シンプル（コメント存在チェック）なのでインラインで十分。ただし、パターンが複雑化した場合は外部ファイル方式への移行も検討する。

[Answer]
推奨案にしましょう

### [Question] Q2: Rust Pluginのビルド・配布方式

Rust Pluginルール（no-layer-violation, enforce-folder-structure）のビルドパイプラインと成果物の配布方式を確認したい。Rust Pluginはwasmバイナリとしてビルドされるのか、ネイティブバイナリとしてビルドされるのか。また、ビルド成果物はnpmパッケージとして配布するのか、リポジトリ内にコミットするのか。

**推奨案:** Biome Plugin APIはWASMバイナリ（`.wasm`）としてビルドする方式を推奨。理由: (1) クロスプラットフォーム対応が容易 (2) Biome本体のプラグインローディング機構がWASMを前提としている (3) ビルド成果物はリポジトリ内の `biome-plugins/dist/` に配置し、CIでビルド検証を行う。npm配布は現時点では不要（モノリポ内利用のため）。

[Answer]
推奨案にしましょう

### [Question] Q3: no-layer-violationルールにおけるレイヤー境界定義の取得方式

no-layer-violationルールはRust Pluginとして実装されるが、レイヤー境界定義（どのレイヤーからどのレイヤーへのインポートが許可されるか）をどこから取得するか。選択肢: (A) biome.json内のルール設定として定義 (B) 別の設定ファイル（phasegate.config.json等）から読み込み (C) Rust Plugin内にハードコード。

**推奨案:** (A) biome.json内のルール設定として定義する方式を推奨。理由: (1) Biomeプラグインの設定はbiome.jsonに集約すべき (2) architecture-philosophy.mdの依存方向ルール（domain -> port -> usecase -> controller）は安定しており変更頻度が低い (3) Rust Plugin API経由でルール設定を読み取れる。ただし、phasegate.config.jsonとの二重管理リスクは認識しておく。

[Answer]
推奨案にしましょう

### [Question] Q4: PostToolUse Hook 500ms制約の実現方式

INV-10（PostToolUse Hook実行時間500ms以下）を実現するための具体的な方式を確認したい。`biome check` + `biome format` を単一ファイルに対して実行する場合、プロセス起動オーバーヘッドだけで数百ms消費する可能性がある。

**推奨案:** 以下の最適化を組み合わせる。(1) `biome check --changed` で差分ファイルのみ対象 (2) フォーマットとリントを1回の `biome check --apply` で統合実行 (3) Biome CLIのデーモンモード（`biome start`）を活用してプロセス起動オーバーヘッドを排除。デーモンモードが利用不可の場合は、フォーマットのみ（`biome format`）に絞ることも検討。

[Answer]
推奨案にしましょう

### [Question] Q5: AntiPatternDetector外部スクリプト（CodeDuplication, GhostFile）の実行タイミング

CodeDuplication検出とGhostFile検出はTypeScript外部スクリプトとして実装されるが、これらをLintOrchestrationServiceの中でBiomeルール群と同期的に実行するのか、非同期的に並列実行するのか。また、PostToolUse Hook（500ms制約）の際にはこれらの重い検出を除外すべきか。

**推奨案:** (1) フルリント実行時はBiomeルール群と並列に非同期実行（Promise.all）。ただしLintExecution集約の状態遷移は順序保証する (2) PostToolUse Hook実行時はCodeDuplication・GhostFile検出を除外し、BiomeRule（check/format）のみ実行する。理由: 重い解析はCI時に実施すれば十分であり、Hookの500ms制約を守ることが優先。

[Answer]
推奨案にしましょう

### [Question] Q6: HarnessErrorフォーマットの依存方向

CIGateConfigurationはCI失敗時にHarnessError形式でエラーを出力する必要がある（統合契約 §4.1）。HarnessErrorは harness-dx Unit が提供する型だが、biome-toolchainはWave 1（基盤Unit）であり、harness-dx（Wave 3）に依存できない。この依存方向の矛盾をどう解決するか。

**推奨案:** biome-toolchain内でHarnessError互換の型を値オブジェクトとして定義し、harness-dxが実装された後にShared Kernelとして統合する方式を推奨。具体的には: (1) Domain層にHarnessCompatibleError値オブジェクトを定義 (2) harness-dx完成後にShared Kernelの正式なHarnessError型に置き換え (3) 出力JSON形式はHarnessErrorのスキーマに合わせておく。

[Answer]
推奨案にしましょう

---

## 5. 前提条件・リスク

### 前提条件

| # | 前提条件 | 根拠 |
|---|---------|------|
| P-1 | Biome GritQL / Rust Plugin APIが安定版として利用可能 | Biome公式ドキュメント・リリースノート |
| P-2 | biome-toolchainは他Unitに依存しない基盤Unitである | 統合契約 Wave 1定義 |
| P-3 | architecture-philosophy.mdのレイヤー依存方向定義が確定済み | principles/architecture-philosophy.md |
| P-4 | folder_management_rules.mdのディレクトリ構造定義が確定済み | docs/folder_management_rules.md |
| P-5 | HarnessError形式は統合契約 §4.1で定義済み | integration_contract.md §4.1 |
| P-6 | PostToolUse Hook実行環境はClaude Code Hooksに準拠 | ドメインモデル HookConfiguration集約 |

### リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| R-1 | Biome Rust Plugin APIが不安定で破壊的変更が入る可能性 | 高 | no-layer-violation, enforce-folder-structureの2ルールをTypeScriptフォールバック実装も並行設計する |
| R-2 | PostToolUse Hook 500ms制約をBiome CLIプロセス起動で達成困難 | 中 | Biomeデーモンモード活用、またはフォーマットのみに機能縮小する段階的戦略 |
| R-3 | GritQLの表現力不足でrequire-unit-comment/require-layer-commentが実装困難 | 低 | GritQLで不十分な場合はRust Pluginに昇格させる |
| R-4 | CodeDuplication/GhostFile検出の精度がプロジェクト規模に依存 | 中 | 閾値を設定可能にし、プロジェクトごとに調整可能にする |
| R-5 | HarnessError互換型とharness-dx正式型の乖離 | 低 | JSON出力スキーマを統合契約で固定し、型の内部実装は後で統合 |
