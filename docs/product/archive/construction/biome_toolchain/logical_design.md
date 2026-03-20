# 論理設計: biome-toolchain

> **作成日**: 2026-03-11
> **対応ストーリー**: US-036, US-037, US-038, US-039
> **モード**: Phase 2（Unit横断設計）
> **前提ドキュメント**: `domain_model.md`, `biome_toolchain_unit.md`, `integration_contract.md`

---

## 1. アーキテクチャ概要

### 1.1 ハイブリッド構成

biome-toolchainは2つの独立した実行系統で構成される。

**実行系統A: Biomeプラグイン（ヘキサゴナル外側）**

- GritQLルール（require-unit-comment, require-layer-comment）とRust Pluginルール（no-layer-violation, enforce-folder-structure）をBiome CLIの拡張として実装する
- TypeScriptアプリケーションとは独立したビルド成果物（GritQLパターン定義 + WASMバイナリ）
- Biome CLIが直接ロードして実行する。TypeScript層は関与しない
- biome.jsonにルール定義・有効/無効・severity・対象ファイルパターンを記述する

**実行系統B: TypeScriptアプリケーション（ヘキサゴナルアーキテクチャ）**

- ルールのメタデータ管理、実行オーケストレーション、アンチパターン検出、Hook制御、CIゲート判定を担う
- Biome CLIをInfrastructure層のアダプター経由で呼び出す
- ヘキサゴナルアーキテクチャに従い、依存方向は内側（Domain）から外側（Infrastructure/Controller）へ

**系統間の境界**

- 実行系統AはBiome CLI内部で動作し、JSON形式の診断結果を標準出力する
- 実行系統BはBiome CLIをサブプロセスとして起動し、JSON出力をパースして取り込む
- 両系統の接点はBiome CLIのJSON出力フォーマットのみであり、コード上の直接依存は存在しない

### 1.2 ヘキサゴナルアーキテクチャ（実行系統B）

実行系統Bは以下の層構成をとり、依存方向は必ず外側から内側へ向かう。

```
Controller層（CLI / Hook / CI）
    ↓ 依存
UseCase層
    ↓ 依存
Domain層（集約 / 値オブジェクト / ドメインサービス）
    ↑ 依存（Port定義はDomain層に属する）
Infrastructure層（アダプター実装）
```

- **Domain層**: ビジネスルール。外部依存を一切持たない。Portインターフェースを定義する
- **Port層**: Domain層内に定義されるインターフェース。Infrastructure層が実装する
- **UseCase層**: アプリケーションロジック。集約の取得・調整・永続化を行う。Portへの依存のみ許容
- **Controller層**: 外部からのエントリーポイント。CLI引数パース、Hook形式対応、CI出力変換
- **Infrastructure層**: Port実装。Biome CLIプロセス起動、ファイルシステムアクセス、設定ファイル読み込み

### 1.3 ディレクトリ構成

```
packages/biome-toolchain/
├── biome-plugins/                    # 実行系統A
│   ├── gritql/                       # GritQLルール定義
│   │   ├── require-unit-comment.grit
│   │   └── require-layer-comment.grit
│   ├── rust/                         # Rust Pluginソース
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── no_layer_violation.rs
│   │   │   └── enforce_folder_structure.rs
│   │   └── tests/
│   │       ├── no_layer_violation_test.rs
│   │       └── enforce_folder_structure_test.rs
│   └── dist/                         # WASMビルド出力先
│       ├── no-layer-violation.wasm
│       └── enforce-folder-structure.wasm
├── src/                              # 実行系統B
│   ├── domain/                       # Domain層
│   │   ├── model/
│   │   │   ├── biome-rule.ts
│   │   │   ├── lint-execution.ts
│   │   │   ├── anti-pattern-detector.ts
│   │   │   ├── hook-configuration.ts
│   │   │   └── ci-gate-configuration.ts
│   │   ├── value-object/
│   │   │   ├── rule-violation.ts
│   │   │   ├── rule-name.ts
│   │   │   ├── rule-type.ts
│   │   │   ├── file-path.ts
│   │   │   ├── layer-name.ts
│   │   │   ├── unit-name.ts
│   │   │   ├── import-edge.ts
│   │   │   ├── violation-severity.ts
│   │   │   ├── anti-pattern-type.ts
│   │   │   ├── implementation-type.ts
│   │   │   ├── execution-status.ts
│   │   │   ├── lint-report.ts
│   │   │   ├── hook-command.ts
│   │   │   ├── pass-condition.ts
│   │   │   ├── ci-step.ts
│   │   │   └── harness-compatible-error.ts
│   │   ├── service/
│   │   │   ├── lint-orchestration-service.ts
│   │   │   ├── import-graph-analyzer.ts
│   │   │   └── parity-test-service.ts
│   │   ├── port/
│   │   │   ├── biome-executor.ts
│   │   │   ├── file-reader.ts
│   │   │   └── biome-config-loader.ts
│   │   └── error/
│   │       └── domain-errors.ts
│   ├── usecase/
│   │   ├── execute-lint-usecase.ts
│   │   ├── execute-post-tool-use-hook-usecase.ts
│   │   ├── evaluate-ci-gate-usecase.ts
│   │   ├── detect-anti-patterns-usecase.ts
│   │   └── verify-parity-usecase.ts
│   ├── controller/
│   │   ├── cli-controller.ts
│   │   ├── hook-controller.ts
│   │   └── ci-controller.ts
│   └── infrastructure/
│       ├── biome-cli-executor.ts
│       ├── file-system-reader.ts
│       └── json-biome-config-loader.ts
├── tests/                            # テストファイル
│   ├── domain/
│   ├── usecase/
│   ├── controller/
│   └── infrastructure/
├── biome.json                        # Biome設定（ルール登録含む）
├── package.json
└── tsconfig.json
```

---

## 2. Biomeプラグイン層設計（実行系統A）

### 2.1 GritQLルール

#### 2.1.1 require-unit-comment

**目的**: 全てのTypeScriptソースファイルの先頭に `// @unit <unit-name>` コメントが存在することを強制する。

**パターン定義方式**: biome.jsonの `linter.rules.custom` セクション内に `source` フィールドでGritQLパターンをインライン記述する。加えて `biome-plugins/gritql/require-unit-comment.grit` に同一パターンを管理用として保持する（biome.jsonが正、.gritファイルは参照用）。

**パターン設計**:

- ファイル全体のASTルートノードを取得する
- 先頭コメント群（leading_comments）の中に `// @unit ` で始まるコメントが存在するかを検査する
- 存在しない場合、ファイル先頭位置（line: 1, column: 1）に違反を報告する

**対象ファイルグロブ**: `src/**/*.ts`, `src/**/*.tsx`（テストファイル `**/*.test.ts`, `**/*.spec.ts` は除外）

**エラーメッセージ**: `ファイル先頭に @unit コメントが必要です。例: // @unit biome-toolchain`

**severity**: `error`

#### 2.1.2 require-layer-comment

**目的**: 全てのTypeScriptソースファイルの先頭に `// @layer <layer-name>` コメントが存在することを強制する。

**パターン定義方式**: require-unit-commentと同様、biome.jsonの `source` フィールドにインライン記述する。

**パターン設計**:

- ファイル全体のASTルートノードを取得する
- 先頭コメント群の中に `// @layer ` で始まり、その後に有効なレイヤー名（domain / port / usecase / controller / infrastructure）が続くコメントが存在するかを検査する
- 存在しない場合、ファイル先頭位置に違反を報告する
- レイヤー名が5つの有効値以外の場合も違反とする

**対象ファイルグロブ**: `src/**/*.ts`, `src/**/*.tsx`（テストファイル除外）

**エラーメッセージ**: `ファイル先頭に @layer コメントが必要です。有効な値: domain, port, usecase, controller, infrastructure`

**severity**: `error`

### 2.2 Rust Pluginルール

#### 2.2.1 no-layer-violation

**目的**: TypeScriptのimport文を解析し、ヘキサゴナルアーキテクチャのレイヤー依存方向に違反するインポートを検出する。

**WASMビルドパイプライン**:

1. `biome-plugins/rust/` 配下にCargoプロジェクトを構成する
2. `cargo build --target wasm32-unknown-unknown --release` でWASMバイナリをビルドする
3. ビルド成果物を `biome-plugins/dist/no-layer-violation.wasm` に配置する
4. pnpmスクリプト `build:plugins` でビルドを自動化する（`pnpm run build:plugins`）
5. CIでもビルドステップとして `build:plugins` を実行し、WASMバイナリの再現性を保証する

**Visitorパターン設計**:

- Biome Rust Plugin APIの `Visitor` トレイトを実装する
- `visit_import_declaration` で各import文をインターセプトする
- import元ファイルのパスから `@layer` コメントを参照してレイヤーを判定する（フォールバック: ディレクトリパスからの推定）
- import先モジュールのパスを解決し、同様にレイヤーを判定する
- 2つのレイヤー間の依存方向を検証する

**レイヤー境界定義データ構造（biome.json内ルール設定）**:

biome.jsonの当該ルール設定セクションに `options` として以下を記述する。

```
allowedDependencies:
  domain: []                           # domainは何にも依存しない
  port: ["domain"]                     # portはdomainにのみ依存
  usecase: ["domain", "port"]          # usecaseはdomain, portに依存
  controller: ["usecase", "domain", "port"]
  infrastructure: ["domain", "port"]   # infrastructureはportを実装する
```

**インポートAST解析 → レイヤー判定 → 依存方向検証フロー**:

1. import文のソースリテラル（`from '...'` の文字列）を取得する
2. 相対パス/エイリアスパスを絶対パスに解決する
3. 解決先ファイルの `@layer` コメントを読み取る（キャッシュ有り）。コメントがない場合はディレクトリパス（`/domain/`, `/port/`, `/usecase/`, `/controller/`, `/infrastructure/`）から推定する
4. 現在のファイルのレイヤーと解決先のレイヤーを取得する
5. `allowedDependencies` マップを参照し、現在レイヤーから解決先レイヤーへの依存が許可されているかを判定する
6. 許可されていない場合、import文の位置に違反を報告する

**エラーメッセージ**: `レイヤー依存違反: {sourceLayer} から {targetLayer} への依存は許可されていません`

**severity**: `error`

#### 2.2.2 enforce-folder-structure

**目的**: ファイルの配置が `folder_management_rules.md` および `architecture-philosophy.md` で定義されたフォルダ構造に準拠していることを検証する。

**WASMビルドパイプライン**: no-layer-violationと同一のCargoプロジェクト内に実装する。ビルド成果物は `biome-plugins/dist/enforce-folder-structure.wasm` に配置する。

**ファイルパスパターンマッチ設計**:

- Biome Plugin APIの `visit_root` で各ファイルの処理開始時にファイルパスを検証する
- biome.json内の `options` にフォルダ構造ルールを定義する

**検証ルール**:

| パターン | 期待されるディレクトリ | 説明 |
|---------|---------------------|------|
| `src/domain/**` | model/, value-object/, service/, port/, error/ | Domain層の構成 |
| `src/usecase/**` | ファイル名が `*-usecase.ts` | UseCase層の命名 |
| `src/controller/**` | ファイル名が `*-controller.ts` | Controller層の命名 |
| `src/infrastructure/**` | Port実装のファイル名がPortと対応 | Infrastructure層の構成 |
| `tests/**` | domain/, usecase/, controller/, infrastructure/ | テストのミラー構成 |

**folder_management_rules.md / architecture-philosophy.mdとの照合**:

- ルール設定にドキュメントのルールをエンコードする。ドキュメント自体は実行時に参照しない（設定時の人間がドキュメントを参照してルールを設定する）
- 設定値の変更はbiome.jsonの `options` を更新することで対応する

**エラーメッセージ**: `フォルダ構造違反: {filePath} は {expectedPattern} に配置されるべきです`

**severity**: `error`

### 2.3 biome.json統合設計

**カスタムルール登録方式**:

biome.jsonの `linter.rules` セクションにカスタムルールを登録する。

構成の概要:

- `linter.rules.custom.requireUnitComment`: GritQLルール。`source` フィールドにGritQLパターンをインライン記述。`level: "error"`
- `linter.rules.custom.requireLayerComment`: 同上
- `plugins`: WASMプラグインのパス指定。`["./biome-plugins/dist/no-layer-violation.wasm", "./biome-plugins/dist/enforce-folder-structure.wasm"]`
- 各Rust Pluginルールは `linter.rules.plugin` セクションで `level` と `options` を設定する

**severity設定**:

| ルール | severity | 理由 |
|--------|----------|------|
| require-unit-comment | error | 必須メタデータ。CI通過条件 |
| require-layer-comment | error | 必須メタデータ。CI通過条件 |
| no-layer-violation | error | アーキテクチャ違反は即座にブロック |
| enforce-folder-structure | error | フォルダ構造違反は即座にブロック |

**対象ファイルパターン**:

- `include`: `["src/**/*.ts", "src/**/*.tsx"]`
- `exclude`: `["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**", "**/node_modules/**", "**/dist/**"]`

**WASMバイナリパス設定**: `biome-plugins/dist/` ディレクトリからの相対パスで指定する。biome.jsonの `plugins` 配列にパスを列挙する。

---

## 3. Domain層設計（実行系統B）

### 3.1 BiomeRule集約

**責務**: Biomeルールのメタデータを管理する。実際のリント実行はBiome CLI（BiomeExecutorポート経由）が行うため、BiomeRule集約はルール情報の保持と判定ロジックに徹する。

**属性**:

| 属性 | 型 | 説明 |
|------|-----|------|
| ruleName | RuleName | ルール識別子（4値のいずれか） |
| ruleType | RuleType | 実装方式（GritQL / RustPlugin）。生成時に確定し不変 |
| enabled | boolean | 有効/無効。デフォルトtrue |
| applicableFilePatterns | string[] | 適用対象ファイルグロブパターン |

**メソッド設計**:

- `check(sourceFile)`: BiomeRule自体は実行しない。代わりにBiomeExecutorポートを通じてBiome CLIに委譲する。この集約ではルールメタデータ（ルール名、有効/無効、対象パターン）を提供する役割に限定する
- `enable()` / `disable()`: 有効/無効を切り替える
- `isApplicable(filePath)`: ファイルパスが `applicableFilePatterns` にマッチするか判定する。globパターンマッチングを行う

**不変条件**:

- INV-1: `enabled === true` のとき、対象ファイルに対して検査がスキップされてはならない（UseCase層で保証）
- INV-2: `ruleName` は `require-unit-comment | require-layer-comment | no-layer-violation | enforce-folder-structure` のいずれか。生成時にバリデーション
- INV-3: `ruleType` は生成時に `ruleName` から自動決定され、変更不可。`require-unit-comment`/`require-layer-comment` → GritQL、`no-layer-violation`/`enforce-folder-structure` → RustPlugin

**ファクトリメソッド**: `BiomeRule.create(ruleName)` で生成する。ruleNameからruleTypeとデフォルトのapplicableFilePatternsを自動設定する。

### 3.2 LintExecution集約

**責務**: 1回のリント実行のライフサイクルを管理する。状態遷移を厳密に制御し、全ファイル x 全ルールの検査完了を保証する。

**属性**:

| 属性 | 型 | 説明 |
|------|-----|------|
| executionId | string | UUID v4で自動生成 |
| status | ExecutionStatus | 現在の状態 |
| targetFiles | FilePath[] | 検査対象ファイル群 |
| appliedRules | RuleName[] | 適用ルール群 |
| violations | RuleViolation[] | 検出された違反（内部配列） |
| checkedPairs | Set<string> | 検査済みの「ファイル x ルール」ペア |
| startedAt | Date | null | 実行開始時刻 |
| completedAt | Date | null | 実行完了時刻 |

**メソッド設計**:

- `start(targetFiles, enabledRules)`: Pending → Running。targetFilesが空またはenabledRulesが空の場合はエラー。startedAtを記録。checkedPairsを初期化
- `recordViolation(violation)`: Running状態でのみ呼び出し可能。violationsに追加する。対応する「ファイル x ルール」ペアをcheckedPairsに記録する
- `markChecked(filePath, ruleName)`: 違反なしの場合にcheckedPairsに記録する。Running状態でのみ呼び出し可能
- `complete()`: 全targetFiles x 全appliedRulesのペアがcheckedPairsに含まれていることを検証する。含まれていない場合はエラー。Running → Completed。completedAtを記録。LintReportを生成して返す
- `fail(reason)`: Running → Failed。異常終了を記録する

**状態遷移（INV-5）**:

| 現在 | イベント | 次 | ガード条件 |
|------|---------|-----|----------|
| Pending | start | Running | targetFiles.length >= 1 かつ enabledRules.length >= 1 |
| Running | recordViolation | Running | — |
| Running | markChecked | Running | — |
| Running | complete | Completed | checkedPairs が targetFiles x appliedRules の全組み合わせを含む |
| Running | fail | Failed | — |

不正な状態遷移（例: Pending → Completed、Completed → Running）は例外を送出する。

**LintReport生成ロジック**: `complete()` 時に以下を算出する。

- totalFiles: targetFiles.length
- totalViolations: violations.length
- errorCount: violations中のseverity === 'error' の件数
- warningCount: violations中のseverity === 'warning' の件数
- durationMs: completedAt - startedAt（ミリ秒）
- passed: errorCount === 0

### 3.3 AntiPatternDetector集約

**責務**: AI生成コードのアンチパターン検出。4種の検出器を管理し、それぞれ独立して動作する。

**属性**:

| 属性 | 型 | 説明 |
|------|-----|------|
| detectorType | AntiPatternType | 検出器種別（4種） |
| implementationType | ImplementationType | 実装方式 |
| enabled | boolean | 有効/無効 |
| threshold | number | 検出閾値（正の数値） |

**ファクトリ/ストラテジパターン設計**:

4種の検出器は `AntiPatternDetector` 集約のインスタンスとして生成される。検出ロジックは `implementationType` に基づき異なる戦略で実行される。

- `AntiPatternDetectorFactory.createAll(config)`: 設定から4種のDetectorインスタンスを一括生成する
- `AntiPatternDetectorFactory.create(type, threshold)`: 個別生成する

**BiomeRule実装 vs ExternalScript実装の分岐設計**:

| 検出器 | ImplementationType | 実行方式 |
|--------|-------------------|---------|
| AnyTypeAbuse | BiomeRule | BiomeExecutorポート経由。Biome標準の `noExplicitAny` ルール結果を取得し、閾値判定する |
| CommentFlood | BiomeRule | BiomeExecutorポート経由。AST解析結果からコメント行比率を算出し、閾値判定する |
| CodeDuplication | ExternalScript | FileReaderポートでソースを読み取り、TypeScript内でトークンベースの類似度分析を行う |
| GhostFile | ExternalScript | FileReaderポートで全ファイルを列挙し、import参照グラフを構築して未参照ファイルを検出する |

- UseCase層で `implementationType` を参照し、BiomeRule型はBiomeExecutorに、ExternalScript型はTypeScript内の検出ロジックに振り分ける
- 検出結果は共通の `RuleViolation` 値オブジェクトに変換する

**閾値管理（INV-7, INV-8）**:

- `setThreshold(type, threshold)`: 閾値は正の数値（> 0）。0以下の場合は例外を送出する
- 各検出器は独立して動作する（INV-7）。あるDetectorの検出結果が他のDetectorの入力になることはない
- デフォルト閾値: AnyTypeAbuse=5, CommentFlood=0.4（40%）, CodeDuplication=0.8（80%類似度）, GhostFile=1（1ファイルでも検出）

### 3.4 HookConfiguration集約

**責務**: PostToolUse Hookの実行条件と制約を管理する。

**属性**:

| 属性 | 型 | 説明 |
|------|-----|------|
| hookType | "PostToolUse" | 固定値 |
| enabled | boolean | 有効/無効 |
| targetPatterns | string[] | 実行対象ファイルパターン（例: `["*.ts", "*.tsx"]`） |
| commands | HookCommand[] | 実行コマンドリスト |
| timeoutMs | number | タイムアウト（デフォルト: 500ms） |

**ファイルパターンマッチング**: `shouldExecute(filePath)` は以下のロジックで判定する。

1. `enabled === false` の場合、常にfalseを返す
2. `filePath` が `targetPatterns` のいずれかにマッチするか判定する（globマッチング）
3. マッチしない場合はfalseを返す（不要なファイルに対してHookを実行しない）

**タイムアウト管理（INV-9, INV-10）**:

- `isWithinTimeout(elapsedMs)`: `elapsedMs <= timeoutMs` を返す
- INV-10: PostToolUse Hook実行時間は500ms以下。この制約はHookConfiguration集約が設定値として保持し、UseCase層で実行時間を計測して判定する
- タイムアウト超過時はエラーではなく警告として記録し、結果は返す（ユーザー体験を優先）

**コマンド構築**: `getCommand()` は以下を返す。

- Hook用コマンド: `biome check --changed --apply` を1コマンドとして構築する（check + format統合実行）
- `--changed` フラグにより変更ファイルのみを対象とする
- デーモンモード: Biome CLIのデーモンプロセスが起動済みであることを前提とし、コールドスタートを回避する

### 3.5 CIGateConfiguration集約

**責務**: CIパイプラインにおける合格/不合格判定とESLint残存チェックを管理する。

**属性**:

| 属性 | 型 | 説明 |
|------|-----|------|
| gateId | string | ゲート識別子（例: "aidlc-gate"） |
| workflowFile | FilePath | ワークフローファイルパス |
| steps | CIStep[] | 実行ステップ定義 |
| passCondition | PassCondition | 合格条件 |

**合格判定ロジック（INV-11）**: `evaluate(lintReport)` は以下を判定する。

1. `lintReport.errorCount <= passCondition.maxErrors`（通常 maxErrors = 0）
2. `lintReport.warningCount <= passCondition.maxWarnings`
3. 両条件を満たす場合のみtrueを返す
4. Biomeリント + フォーマットの両方の結果が含まれていることを前提とする（UseCase層で両方実行してからevaluateを呼ぶ）

**ESLint残存チェック（INV-12）**: `checkEslintRemoval(projectFiles)` は以下を検査する。

1. `.eslintrc.*`, `.eslintignore`, `eslint.config.*` ファイルが存在しないこと
2. `package.json` の `dependencies` / `devDependencies` に `eslint` および `eslint-*` パッケージが含まれていないこと
3. `import` 文に `eslint` を含むファイルが存在しないこと
4. いずれかが検出された場合、RuleViolationとして返す

**HarnessCompatibleError形式変換**: `formatError(violation)` はRuleViolationをHarnessError互換形式に変換する。詳細は3.9節を参照。

### 3.6 値オブジェクト群

#### RuleViolation

- 等価性: `filePath.value + ":" + line + ":" + column + ":" + ruleName.value` の文字列比較
- `equals(other)` メソッドで等価判定を提供する
- イミュータブル。生成後の変更不可

#### RuleName

- 4値の列挙型: `require-unit-comment`, `require-layer-comment`, `no-layer-violation`, `enforce-folder-structure`
- ファクトリメソッド `RuleName.of(value)` で生成。不正値は例外送出
- `isGritQL()`: require-unit-comment または require-layer-comment の場合true
- `isRustPlugin()`: no-layer-violation または enforce-folder-structure の場合true

#### RuleType

- 2値の列挙型: `GritQL`, `RustPlugin`
- RuleNameから自動導出可能: `RuleType.fromRuleName(ruleName)`

#### FilePath

- `value` プロパティ: 正規化されたパス文字列
- `normalize(rawPath)`: 相対パスを絶対パスに変換。パス区切り文字を統一
- `matches(pattern)`: globパターンとのマッチング判定
- `getLayer()`: パスからレイヤー名を推定する（`/domain/` → LayerName.domain など）

#### LayerName

- 5値の列挙型: `domain`, `port`, `usecase`, `controller`, `infrastructure`
- `canDependOn(target)`: 自レイヤーからtargetレイヤーへの依存が許可されているか判定
- 依存許可マップ:
  - domain: []
  - port: [domain]
  - usecase: [domain, port]
  - controller: [usecase, domain, port]
  - infrastructure: [domain, port]

#### UnitName

- `value` プロパティ: Unit名文字列
- バリデーション: 空文字列不可、kebab-case形式

#### ImportEdge

- source, target, sourceLayer, targetLayer を保持
- `isViolation()`: sourceLayerからtargetLayerへの依存がLayerName.canDependOnで許可されていない場合true

#### ViolationSeverity

- 2値の列挙型: `error`, `warning`

#### AntiPatternType

- 4値の列挙型: `AnyTypeAbuse`, `CommentFlood`, `CodeDuplication`, `GhostFile`
- `getImplementationType()`: BiomeRule型かExternalScript型かを返す

#### ImplementationType

- 2値の列挙型: `BiomeRule`, `ExternalScript`

#### ExecutionStatus

- 4値の列挙型: `Pending`, `Running`, `Completed`, `Failed`
- `canTransitionTo(next)`: 有効な遷移先かを判定

#### LintReport

- イミュータブルな結果オブジェクト
- `passed` は `errorCount === 0` で算出
- `merge(other)`: 2つのLintReportを統合する（Biome結果 + AntiPattern結果の統合に使用）

#### HookCommand

- `command` と `args` を保持
- `toCommandString()`: 実行可能な文字列を返す（例: `biome check --changed --apply`）

#### PassCondition

- `maxErrors`, `maxWarnings`, `requireEslintRemoval` を保持
- `isSatisfiedBy(lintReport)`: 合格条件を満たすか判定

#### CIStep

- `name`, `command`, `continueOnError` を保持
- イミュータブル

### 3.7 ドメインサービス

#### 3.7.1 LintOrchestrationService

**責務**: 複数集約にまたがるリント実行の調整を行う。

**コンストラクタ依存**: `BiomeExecutor`（Port）, `FileReader`（Port）

**executeLint(targetFiles, config) フロー**:

1. `LintExecution.create()` で実行集約を生成する
2. `config` から有効なBiomeRule群を取得する
3. `lintExecution.start(targetFiles, enabledRules)` で実行を開始する
4. BiomeExecutorポート経由でBiome CLIを実行する（全ルール一括）
5. Biome CLI結果（JSON）をパースし、各違反を `lintExecution.recordViolation(violation)` で記録する
6. 違反のないファイル x ルールのペアは `lintExecution.markChecked(filePath, ruleName)` で記録する
7. AntiPatternDetector群を実行する
   - BiomeRule型: BiomeExecutor経由の結果を閾値判定する
   - ExternalScript型: FileReader経由でソースを取得し、TypeScript内で検出ロジックを実行する
8. AntiPattern検出結果もlintExecutionに記録する
9. `lintExecution.complete()` でLintReportを生成して返す

**executePostToolUseHook(changedFile, hookConfig) フロー（軽量実行）**:

1. `hookConfig.shouldExecute(changedFile)` で実行要否を判定する。不要な場合は即座にnull LintReportを返す
2. `LintExecution.create()` で実行集約を生成する
3. 有効なBiomeRule群のみを対象とする（AntiPatternDetectorは除外）
4. `hookConfig.getCommand()` でコマンドを取得する（`biome check --changed --apply`）
5. BiomeExecutorポート経由で実行する
6. 結果をLintExecutionに記録し、complete()でLintReportを返す
7. **AntiPattern検出は実行しない**（500ms制約のため）
8. 実行時間を計測し、`hookConfig.isWithinTimeout(elapsedMs)` で制約内かを確認する。超過時はLintReportにwarningを付加する

#### 3.7.2 ImportGraphAnalyzer

**責務**: ソースファイル間のインポート依存関係グラフを構築し、レイヤー違反・循環依存を検出する。

**コンストラクタ依存**: `FileReader`（Port）

**buildGraph(sourceFiles) フロー**:

1. 各ソースファイルのimport文を正規表現で抽出する（AST不使用。パフォーマンス優先）
2. import先モジュールのパスを解決する（相対パス・エイリアス対応）
3. 各ファイルの `@layer` コメントからレイヤーを判定する。コメントがない場合はディレクトリパスから推定する
4. ImportEdge値オブジェクトのリストとしてグラフを構築する

**detectLayerViolations(graph, boundaries) フロー**:

1. グラフの各ImportEdgeに対して `edge.isViolation()` を判定する
2. 違反EdgeをRuleViolation（ruleName=no-layer-violation）に変換して返す

**detectCircularDependencies(graph) フロー**:

1. グラフの隣接リスト表現を構築する
2. DFS（深さ優先探索）で閉路を検出する
3. 検出された閉路の各Edgeに対してRuleViolation（ruleName=no-layer-violation, message に循環パスを含む）を生成する

#### 3.7.3 ParityTestService

**責務**: v0 ESLintルールとBiomeルールの等価性を検証する。

**コンストラクタ依存**: `BiomeExecutor`（Port）, `FileReader`（Port）

**検証フロー**:

1. v0テストケース（期待結果付きのソースファイル群）をFileReaderで読み込む
2. 各テストケースに対してBiomeExecutor経由でBiomeルールを実行する
3. Biome結果とv0期待結果を突き合わせる
4. 差分がある場合はパリティ違反としてレポートする
5. 検証対象: 4ルール x 各テストケース（正常ケース + 違反ケース）

### 3.8 ドメインエラー

| エラー型 | 発生条件 | メッセージ例 |
|---------|---------|------------|
| InvalidRuleNameError | 不正なルール名で生成しようとした | `不正なルール名: {value}。有効値: require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure` |
| InvalidStateTransitionError | 不正な状態遷移を試みた | `状態遷移エラー: {currentStatus} から {targetStatus} への遷移は不可` |
| IncompleteExecutionError | 全ファイル x 全ルールの検査が未完了で complete() を呼んだ | `検査未完了: {uncheckedCount} ペアが未検査` |
| ViolationRecordError | Running以外の状態でrecordViolationを呼んだ | `違反記録エラー: 現在の状態 {status} では違反を記録できません` |
| InvalidThresholdError | 閾値に0以下を設定しようとした | `閾値エラー: 閾値は正の数値である必要があります。指定値: {value}` |
| BiomeExecutionError | Biome CLIの実行に失敗した | `Biome実行エラー: {detail}` |
| FileNotFoundError | 指定ファイルが存在しない | `ファイル未検出: {filePath}` |
| ConfigLoadError | biome.json読み込み失敗 | `設定読み込みエラー: {detail}` |

### 3.9 HarnessCompatibleError値オブジェクト

**目的**: 統合契約（§4.1）で定義されるHarnessError形式との互換性を持つ値オブジェクトをbiome-toolchain内に定義する。harness-dx（Wave 3）はWave 1時点では未実装のため、直接importできない。

**設計方針**:

- biome-toolchain内に `HarnessCompatibleError` 値オブジェクトを定義する
- HarnessErrorインターフェースと同一のプロパティを持つ
- 将来harness-dxが実装された時点で、Shared Kernelの `HarnessError` に統合する（HarnessCompatibleErrorを削除し、Shared Kernelからimportに切り替え）

**属性**:

| 属性 | 型 | 説明 |
|------|-----|------|
| code | string | エラーコード（例: "LINT_VIOLATION", "LAYER_VIOLATION", "ESLINT_REMNANT"） |
| severity | "error" \| "warning" | 重要度 |
| suggestion | string | 修正方法の提案 |
| adr_ref | string | 関連ADRパス |
| fix_example | string | 修正コード例 |

**変換ロジック（CIGateConfiguration.formatError）**:

- `RuleViolation` → `HarnessCompatibleError` の変換マッピング:
  - code: `"LINT_" + violation.ruleName.value.toUpperCase().replace(/-/g, "_")`
  - severity: violation.severity の値をそのまま使用
  - suggestion: violation.suggestion が存在すればそのまま、なければルール名に応じたデフォルト提案
  - adr_ref: ルール名に応じた固定パス（例: `docs/ADR/xxx-layer-boundary.md`）
  - fix_example: violation.suggestion から生成、または空文字列

---

## 4. Port（ポートインターフェース）設計

ポートはDomain層に定義される。Infrastructure層がこれを実装する。

### 4.1 BiomeExecutor

**責務**: Biome CLIによるリント・フォーマット実行を抽象化する。

**メソッドシグネチャ**:

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `check(targetFiles, ruleNames)` | targetFiles: FilePath[], ruleNames: RuleName[] | Promise\<BiomeCheckResult\> | 指定ファイル群に対して指定ルールでチェックを実行 |
| `checkChanged(changedFile)` | changedFile: FilePath | Promise\<BiomeCheckResult\> | 変更ファイルに対するチェック（--changed相当） |
| `format(targetFiles)` | targetFiles: FilePath[] | Promise\<BiomeFormatResult\> | フォーマットチェックを実行 |
| `checkAndApply(changedFile)` | changedFile: FilePath | Promise\<BiomeCheckResult\> | check + format --apply の統合実行（Hook用） |

**BiomeCheckResult**: `{ violations: RuleViolation[], checkedFiles: FilePath[], checkedRules: RuleName[] }`

**BiomeFormatResult**: `{ formattedFiles: FilePath[], issues: RuleViolation[] }`

### 4.2 FileReader

**責務**: ファイルシステムからのファイル読み取りを抽象化する。

**メソッドシグネチャ**:

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `read(filePath)` | filePath: FilePath | Promise\<string\> | ファイル内容を文字列として返す |
| `exists(filePath)` | filePath: FilePath | Promise\<boolean\> | ファイル存在チェック |
| `glob(pattern)` | pattern: string | Promise\<FilePath[]\> | グロブパターンにマッチするファイル一覧 |
| `readPackageJson()` | — | Promise\<Record\<string, unknown\>\> | package.jsonの内容を返す |

### 4.3 BiomeConfigLoader

**責務**: biome.json設定の読み込みとルール設定の抽出を抽象化する。

**メソッドシグネチャ**:

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `load()` | — | Promise\<BiomeConfig\> | biome.jsonを読み込みパースして返す |
| `getEnabledRules()` | — | Promise\<BiomeRule[]\> | 有効なルール群をBiomeRule集約として返す |
| `getAntiPatternConfig()` | — | Promise\<AntiPatternConfig\> | アンチパターン検出の設定を返す |

**BiomeConfig**: biome.jsonの構造化表現。linter設定、formatter設定、plugin設定を含む。

---

## 5. UseCase層設計

### 5.1 ExecuteLintUseCase（US-036, US-038）

**責務**: 対象ファイル群に対するフルリント実行を調整する。

**依存ポート**: BiomeExecutor, FileReader, BiomeConfigLoader

**実行フロー**:

1. BiomeConfigLoaderから有効なBiomeRule群とAntiPatternConfigを取得する
2. FileReaderで対象ファイル群を確定する（glob展開）
3. LintOrchestrationService.executeLint() に委譲する
4. 返却されたLintReportを呼び出し元に返す

**エラーハンドリング**: BiomeExecutionError発生時はLintExecutionをFailed状態にし、エラー情報をLintReportに含めて返す。

### 5.2 ExecutePostToolUseHookUseCase（US-037）

**責務**: PostToolUse Hook実行。500ms制約を実現する。

**依存ポート**: BiomeExecutor, BiomeConfigLoader

**500ms制約の実現設計**:

1. BiomeConfigLoaderからHookConfigurationを構築する
2. `hookConfig.shouldExecute(changedFile)` で実行要否を判定する。不要なら即座にnull結果を返す
3. 実行前に `performance.now()` で開始時刻を記録する
4. LintOrchestrationService.executePostToolUseHook() に委譲する
   - BiomeRuleのみ実行（AntiPattern除外）
   - `biome check --changed --apply` の統合コマンド（1プロセス起動で完結）
   - Biome CLIデーモンモードにより起動コストを最小化
5. 実行後に `performance.now()` で終了時刻を記録し、差分を算出する
6. `hookConfig.isWithinTimeout(elapsedMs)` で500ms制約を判定する
7. 超過時はLintReportにwarningを付加するが、結果自体は返す（ブロッキングしない）

**パフォーマンス最適化ポイント**:

- `--changed` フラグ: 変更ファイルのみ対象
- check + format統合: 1回のbiome CLIプロセスで完結
- デーモンモード: `biome start` で事前にデーモン起動。Hookはデーモンに接続して実行
- AntiPattern除外: ExternalScript型検出器（CodeDuplication, GhostFile）はフルリント時のみ

### 5.3 EvaluateCIGateUseCase（US-039）

**責務**: CIパイプラインでのゲート判定を行う。

**依存ポート**: BiomeExecutor, FileReader, BiomeConfigLoader

**実行フロー**:

1. BiomeConfigLoaderからCIGateConfigurationを構築する
2. ExecuteLintUseCaseを内部で呼び出し、LintReportを取得する
3. `ciGateConfig.checkEslintRemoval(projectFiles)` でESLint残存チェックを実行する
4. ESLint残存があればLintReportにerrorとして追加する
5. `ciGateConfig.evaluate(mergedLintReport)` で合格判定する
6. 不合格の場合、各違反を `ciGateConfig.formatError(violation)` でHarnessCompatibleErrorに変換する
7. 結果（合否、LintReport、HarnessCompatibleError[]）を返す

### 5.4 DetectAntiPatternsUseCase（US-038）

**責務**: アンチパターン検出に特化した実行。ExecuteLintUseCaseから内部的に呼ばれることもあるが、単独実行も可能。

**依存ポート**: BiomeExecutor, FileReader, BiomeConfigLoader

**実行フロー**:

1. BiomeConfigLoaderからAntiPatternConfigを取得する
2. AntiPatternDetectorFactory.createAll(config) でDetector群を生成する
3. BiomeRule型Detector:
   - BiomeExecutor経由でBiome標準ルール結果を取得する
   - 結果を閾値判定する
4. ExternalScript型Detector:
   - FileReader経由でソースファイルを読み取る
   - TypeScript内の検出ロジック（Promise.all並列実行）で検出する
5. 全Detector結果を集約してRuleViolation[]として返す

**フルリント時のAntiPattern外部スクリプト実行**: ExternalScript型（CodeDuplication, GhostFile）はPromise.allで並列実行する。Hook時はこれらを除外する。

### 5.5 VerifyParityUseCase（US-036）

**責務**: v0 ESLintルールとの等価性検証。

**依存ポート**: BiomeExecutor, FileReader

**実行フロー**:

1. ParityTestService.verify() に委譲する
2. v0テストフィクスチャ（期待結果付きソースファイル）をFileReaderで読み込む
3. 各テストケースに対してBiomeExecutorでルールを実行する
4. v0期待結果とBiome結果を突き合わせる
5. パリティレポート（一致/不一致の詳細）を返す

---

## 6. Controller層設計

### 6.1 CLI Controller

**責務**: コマンドラインからのリント実行、アンチパターン検出、パリティ検証のエントリーポイント。

**コマンド引数パース**:

| コマンド | 引数 | 説明 |
|---------|------|------|
| `biome-toolchain lint [files...]` | `--rules <rule1,rule2>`, `--fix` | リント実行 |
| `biome-toolchain detect-anti-patterns [files...]` | `--type <type>` | アンチパターン検出 |
| `biome-toolchain verify-parity` | `--fixtures <dir>` | パリティ検証 |

**出力フォーマット**:

- 違反一覧: `{filePath}:{line}:{column} {severity} {ruleName}: {message}`
- サマリー: `{totalFiles} files checked, {errorCount} errors, {warningCount} warnings`
- JSON出力オプション: `--format json` でJSON形式出力に切り替え可能

**終了コード**:

| コード | 意味 |
|-------|------|
| 0 | 成功（違反なし） |
| 1 | リント違反検出（error severity） |
| 2 | 実行エラー（設定不備、ファイル未検出等） |

**依存UseCase**: ExecuteLintUseCase, DetectAntiPatternsUseCase, VerifyParityUseCase

### 6.2 Hook Controller

**責務**: PostToolUse Hook形式でのエントリーポイント。Claude Code Hooksから呼び出される。

**PostToolUse Hook形式**:

- 標準入力: JSON形式で変更ファイル情報を受け取る `{ "tool": "write", "filePath": "..." }`
- 標準出力: JSON形式で結果を返す `{ "status": "pass" | "fail", "violations": [...] }`
- 実行: `node packages/biome-toolchain/dist/hook-controller.js`

**500msレスポンス最適化**:

1. 標準入力のJSONパースは同期処理で行う（バッファリング不要なサイズ）
2. ExecutePostToolUseHookUseCaseに委譲する
3. タイムアウト超過時も結果を返す（ブロッキングせず、warningを付加）
4. プロセス起動オーバーヘッド削減: デーモンモードの活用。Biome CLIのデーモンが常駐しているため、子プロセス起動 → デーモン接続 → 結果返却の一連が高速

**依存UseCase**: ExecutePostToolUseHookUseCase

### 6.3 CI Controller

**責務**: GitHub Actionsからのエントリーポイント。CIゲート判定とGitHub annotations出力。

**GitHub Actions annotations変換**:

- 違反をGitHub Actions形式のannotation（`::error file=...,line=...,col=...::message`）に変換する
- これによりPRの差分ビューに直接違反箇所が表示される
- warning severityの違反は `::warning` として出力する

**aidlc-gate.yml連携**:

- CI Controllerは `biome-toolchain ci-gate` コマンドとして実行される
- 終了コード0/1でゲート通過/不通過を表現する
- `--output annotations` オプションでGitHub annotations形式を選択する
- `--output json` オプションでJSON形式出力も可能（将来の他CIツール対応）

**出力内容**:

1. リント結果サマリー
2. 違反一覧（GitHub annotations形式）
3. ESLint残存チェック結果
4. HarnessCompatibleError形式のエラー詳細（JSON、CI成果物として保存可能）

**依存UseCase**: EvaluateCIGateUseCase

---

## 7. Infrastructure層設計（アダプター）

### 7.1 BiomeCLIExecutor

**実装対象ポート**: BiomeExecutor

**CLIプロセス起動**: `child_process.execFile` を使用してBiome CLIを起動する。

- 基本コマンド: `npx biome check --reporter=json`
- フォーマットチェック: `npx biome format --reporter=json`
- check + apply統合: `npx biome check --apply --reporter=json`
- changed指定: `npx biome check --changed --reporter=json`

**JSON出力パース**: Biome CLIの `--reporter=json` オプションにより出力されるJSON形式の診断結果をパースする。

パース対象フィールド:

- `diagnostics[].file_path` → FilePath値オブジェクト
- `diagnostics[].span.start.line` / `.column` → line, column
- `diagnostics[].category` → RuleName値オブジェクト（カスタムルール名のマッピング）
- `diagnostics[].message` → message文字列
- `diagnostics[].severity` → ViolationSeverity値オブジェクト

**エラーハンドリング**:

- 終了コード0: 違反なし
- 終了コード1: 違反あり（正常系として処理）
- 終了コード2以上: Biome CLI自体のエラー。BiomeExecutionErrorを送出する
- タイムアウト: `child_process.execFile` の `timeout` オプションで制御。Hook時は500ms、フルリント時は無制限

**Hook用軽量実行パス**:

- `checkAndApply(changedFile)` メソッドで `biome check --changed --apply --reporter=json` を実行する
- 単一ファイル指定によりBiome CLIの走査範囲を最小化する
- デーモンモード活用: `biome start` でデーモンを事前起動。以降のbiome CLIコマンドはデーモンに接続して実行するため、毎回のプロセス起動コストがなくなる

**デーモンモード設計**:

- デーモン起動: `biome start` をバックグラウンドで実行（初回のみ）
- デーモン状態確認: `biome status` で起動状態を確認
- デーモン接続: biome CLIはデーモン起動済みの場合、自動的にデーモンに接続する（追加フラグ不要）
- デーモン停止: テスト終了時・CIジョブ終了時に `biome stop` で停止

### 7.2 FileSystemReader

**実装対象ポート**: FileReader

- `read(filePath)`: `fs/promises.readFile(filePath.value, 'utf-8')`
- `exists(filePath)`: `fs/promises.access(filePath.value)` のtry-catch
- `glob(pattern)`: `glob` ライブラリ（fast-glob）を使用したファイル列挙
- `readPackageJson()`: プロジェクトルートの `package.json` を読み込みJSONパース

### 7.3 JsonBiomeConfigLoader

**実装対象ポート**: BiomeConfigLoader

**biome.json読み込み**: FileSystemReader（内部依存）を使用してbiome.jsonを読み込む。

**ルール設定抽出**:

- `getEnabledRules()`: biome.jsonの `linter.rules.custom` と `linter.rules.plugin` からカスタムルール設定を読み取り、`level !== "off"` のルールをBiomeRule集約として返す
- `getAntiPatternConfig()`: biome.jsonの独自セクション（`harness.antiPatterns`）からアンチパターン検出設定を読み取る

**設定のバリデーション**: biome.jsonが存在しない場合、必須フィールドが欠落している場合はConfigLoadErrorを送出する。

---

## 8. テスト設計

### 8.1 テスト対象 x テストレイヤー対応表

| テスト対象 | ユニットテスト | 統合テスト | 備考 |
|-----------|:----------:|:--------:|------|
| GritQLルール（require-unit-comment, require-layer-comment） | -- | -- | Biome CLI経由でのパターンマッチ検証（8.2参照） |
| Rust Plugin（no-layer-violation, enforce-folder-structure） | -- | -- | Rustネイティブテスト + WASM統合テスト（8.2参照） |
| BiomeRule集約 | o | -- | 不変条件、ファクトリ、isApplicable |
| LintExecution集約 | o | -- | 状態遷移、不変条件、LintReport生成 |
| AntiPatternDetector集約 | o | -- | 閾値管理、検出器種別判定 |
| HookConfiguration集約 | o | -- | ファイルパターンマッチ、タイムアウト判定 |
| CIGateConfiguration集約 | o | -- | 合格判定、ESLint残存チェック、formatError |
| 値オブジェクト群 | o | -- | 等価性、バリデーション、変換ロジック |
| LintOrchestrationService | o | -- | フロー検証（Port mock） |
| ImportGraphAnalyzer | o | -- | グラフ構築、違反検出、循環検出 |
| ParityTestService | o | -- | 等価性検証フロー |
| ExecuteLintUseCase | o | -- | Port mock |
| ExecutePostToolUseHookUseCase | o | -- | Port mock、500ms制約 |
| EvaluateCIGateUseCase | o | -- | Port mock |
| DetectAntiPatternsUseCase | o | -- | Port mock、並列実行 |
| VerifyParityUseCase | o | -- | Port mock |
| CLI Controller | o | -- | 引数パース、終了コード |
| Hook Controller | o | -- | 入出力形式、タイムアウト挙動 |
| CI Controller | o | -- | annotations変換 |
| BiomeCLIExecutor | -- | o | 実プロセス起動（外部依存） |
| FileSystemReader | -- | o | 実ファイルシステム（外部依存） |
| JsonBiomeConfigLoader | -- | o | 実ファイル読み込み（外部依存） |
| パリティ検証 | -- | o | v0 ESLint vs Biome結果突き合わせ |

### 8.2 Biomeプラグイン層テスト方針

**GritQLルールテスト**:

- Biome CLIを実行してテストフィクスチャに対するルール適用結果を検証する
- テストフィクスチャ: `tests/fixtures/gritql/` に正常ファイル（コメントあり）と違反ファイル（コメントなし）を配置する
- テスト実行: `biome check --reporter=json tests/fixtures/gritql/` の出力を検証する
- TypeScriptのテストランナー（Vitest）から `child_process.execFile` でBiome CLIを呼び出す形式
- テストケース例:
  - `@unitコメントがあるファイルに対して違反が報告されないこと`
  - `@unitコメントがないファイルに対してrequire-unit-commentの違反が報告されること`
  - `@layerコメントの値が不正な場合に違反が報告されること`

**Rust Pluginテスト**:

- Rustネイティブテスト: `cargo test` でRustコード単体の検証を行う
  - `biome-plugins/rust/tests/` にテストモジュールを配置する
  - レイヤー判定ロジック、依存方向検証ロジック、ファイルパスパターンマッチをユニットテストする
- WASM統合テスト: ビルド済みWASMをBiome CLIにロードし、テストフィクスチャに対して実行する
  - `tests/fixtures/rust-plugin/` に違反コード・正常コードを配置する
  - Vitest から Biome CLI を呼び出して結果を検証する
- テストケース例:
  - `domainからusecaseへのimportがレイヤー違反として検出されること`
  - `usecaseからdomainへのimportが許可されること`
  - `循環依存が検出されること`
  - `不正なディレクトリ配置が検出されること`

### 8.3 Domain層テスト方針

**各集約の不変条件テスト**:

テストファイルはDomain層のモデルごとに分割する。

BiomeRule集約テスト（`tests/domain/biome-rule.test.ts`）:

- INV-1: 有効なルールで検査がスキップされないこと（isApplicableの正確性）
- INV-2: 不正なルール名でのファクトリ生成が例外を送出すること
- INV-3: ruleTypeが生成後に変更不可であること（GritQLルール名でRustPlugin型にならないこと）

AntiPatternDetector集約テスト（`tests/domain/anti-pattern-detector.test.ts`）:

- INV-7: 各検出器が独立して動作すること（他検出器の状態に依存しないこと）
- INV-8: 0以下の閾値設定が例外を送出すること

HookConfiguration集約テスト（`tests/domain/hook-configuration.test.ts`）:

- INV-9: 同一ファイルに対する複数回実行で同一結果を返すこと
- INV-10: timeoutMs設定値がisWithinTimeoutで正しく判定されること

CIGateConfiguration集約テスト（`tests/domain/ci-gate-configuration.test.ts`）:

- INV-11: errorCount > 0のLintReportでevaluateがfalseを返すこと
- INV-12: ESLint関連ファイルが存在する場合にcheckEslintRemovalが違反を返すこと

**LintExecution状態遷移テスト**（`tests/domain/lint-execution.test.ts`）:

- Pending → Running → Completed の正常遷移
- Pending → Running → Failed の異常遷移
- Pending → Completed の直接遷移が例外を送出すること
- Running以外でrecordViolationが例外を送出すること
- 全ファイル x 全ルール未検査でcompleteが例外を送出すること
- complete()で生成されるLintReportの正確性

### 8.4 UseCase層テスト方針

**BiomeExecutorモック戦略**:

- BiomeExecutor, FileReader, BiomeConfigLoader はPortインターフェースであり、管理下にない外部依存にあたるため、モックを使用する
- Domain層のモデル（BiomeRule, LintExecution等）は管理下にある依存のため、実体を使用する
- モックの作成: `vi.fn()` でPortメソッドのスタブを定義する

**500ms制約テスト**（`tests/usecase/execute-post-tool-use-hook-usecase.test.ts`）:

- BiomeExecutorモックの応答時間を制御する
  - 正常ケース: 100ms応答 → warningなしのLintReportが返ること
  - 境界ケース: 500ms応答 → warningなしのLintReportが返ること
  - 超過ケース: 600ms応答 → warningつきのLintReportが返ること（ブロッキングされないこと）
- AntiPatternDetectorが実行されないことの検証

### 8.5 Controller層テスト方針

**CLI Controller テスト**（`tests/controller/cli-controller.test.ts`）:

- 引数パースの正確性（各コマンド、オプション）
- 違反時に終了コード1を返すこと
- 実行エラー時に終了コード2を返すこと
- 出力フォーマットの正確性（テキスト形式、JSON形式）
- UseCaseはモックして、Controller自体のロジックに集中する

**Hook Controller テスト**（`tests/controller/hook-controller.test.ts`）:

- 標準入力JSONのパース正確性
- 標準出力JSONの形式正確性
- UseCaseへの委譲が正しく行われること

**CI Controller テスト**（`tests/controller/ci-controller.test.ts`）:

- GitHub annotations形式の出力正確性（`::error file=...` 形式）
- 合格時に終了コード0、不合格時に終了コード1を返すこと
- HarnessCompatibleError形式のJSON出力正確性

### 8.6 Infrastructure層テスト方針

Infrastructure層は外部依存（Biome CLIプロセス、ファイルシステム）との統合テストとして実施する。

**BiomeCLIExecutor テスト**（`tests/infrastructure/biome-cli-executor.test.ts`）:

- 実際のBiome CLIプロセスを起動して検証する
- テストフィクスチャファイルに対するcheck結果のパース正確性
- Biome CLI未インストール時のエラーハンドリング
- タイムアウト発生時の挙動

**FileSystemReader テスト**（`tests/infrastructure/file-system-reader.test.ts`）:

- テスト用一時ディレクトリを作成して検証する
- ファイル読み込み、存在チェック、グロブパターンの動作確認
- 存在しないファイルへのアクセス時のエラーハンドリング

**JsonBiomeConfigLoader テスト**（`tests/infrastructure/json-biome-config-loader.test.ts`）:

- テスト用biome.jsonファイルを作成して検証する
- 有効ルール抽出、アンチパターン設定抽出の正確性
- 不正な形式のbiome.jsonに対するエラーハンドリング

### 8.7 ParityTest方針（v0 ESLint等価性）

**目的**: v0のESLintカスタムルール4種と、移植後のBiomeルール4種が等価な検出結果を返すことを保証する。

**テストフィクスチャ構成**:

```
tests/parity/
├── fixtures/
│   ├── require-unit-comment/
│   │   ├── valid/           # 違反なしのソースファイル
│   │   └── invalid/         # 違反ありのソースファイル + 期待結果JSON
│   ├── require-layer-comment/
│   │   ├── valid/
│   │   └── invalid/
│   ├── no-layer-violation/
│   │   ├── valid/
│   │   └── invalid/
│   └── enforce-folder-structure/
│       ├── valid/
│       └── invalid/
└── parity.test.ts
```

**検証方式**:

1. 各フィクスチャに対してBiome CLIを実行する
2. 実行結果と期待結果JSON（v0 ESLintの出力を事前記録）を突き合わせる
3. 違反の検出有無、検出位置（行・列）、メッセージの主要部分が一致することを検証する
4. 完全一致ではなく、機能的等価性を検証する（メッセージ文言の差異は許容）

### 8.8 テストダブル方針

**モック対象**: Port（BiomeExecutor, FileReader, BiomeConfigLoader）のみ。これらは管理下にない外部依存である。

**モック非対象**: Domain層のモデル（BiomeRule, LintExecution, AntiPatternDetector等）は実体を使用する。UseCase単体テストであっても、Domain層のオブジェクトは実体を生成してテストする。

**日本語テストケース名の例示**:

```
target('executeLint', () => {
  describe('対象ファイル群に対してフルリントを実行する', () => {
    context('全ルールが有効な場合', () => {
      it('全ファイル x 全ルールの検査結果を含むLintReportを返すこと', () => {
        // Arrange
        const mockBiomeExecutor = { check: vi.fn().mockResolvedValue(...) };
        ...

        // Act
        const actual = await usecase.execute(targetFiles, config);

        // Assert
        expect(actual.totalFiles).toBe(3);
        expect(actual.passed).toBe(true);
      });
    });

    context('違反が検出された場合', () => {
      it('errorCountが0より大きいLintReportを返すこと', () => {
        // Arrange
        ...

        // Act
        const actual = await usecase.execute(targetFiles, config);

        // Assert
        expect(actual.errorCount).toBeGreaterThan(0);
        expect(actual.passed).toBe(false);
      });
    });
  });
});
```

---

## 9. ストーリーとの対応

| ストーリー | 設計要素 |
|-----------|---------|
| **US-036**: v0カスタムESLintルールのBiomeプラグイン移植 | Biomeプラグイン層全体（§2）、BiomeRule集約（§3.1）、RuleName/RuleType値オブジェクト（§3.6）、BiomeExecutorポート（§4.1）、ExecuteLintUseCase（§5.1）、VerifyParityUseCase（§5.5）、ParityTestService（§3.7.3）、BiomeCLIExecutor（§7.1）、biome.json統合設計（§2.3）、パリティテスト（§8.7） |
| **US-037**: PostToolUse HookのBiomeベース高速化 | HookConfiguration集約（§3.4）、HookCommand値オブジェクト（§3.6）、LintOrchestrationService.executePostToolUseHook（§3.7.1）、ExecutePostToolUseHookUseCase（§5.2）、Hook Controller（§6.2）、BiomeCLIExecutor Hook用軽量実行パス（§7.1）、デーモンモード設計（§7.1） |
| **US-038**: L1バリデータのBiomeベース再構築 | AntiPatternDetector集約（§3.3）、AntiPatternType/ImplementationType値オブジェクト（§3.6）、LintExecution集約（§3.2）、LintOrchestrationService.executeLint（§3.7.1）、ImportGraphAnalyzer（§3.7.2）、ExecuteLintUseCase（§5.1）、DetectAntiPatternsUseCase（§5.4）、CLI Controller（§6.1） |
| **US-039**: CIパイプラインのBiome統合 | CIGateConfiguration集約（§3.5）、PassCondition/CIStep値オブジェクト（§3.6）、HarnessCompatibleError（§3.9）、EvaluateCIGateUseCase（§5.3）、CI Controller（§6.3）、CIパイプライン設計（§10） |

---

## 10. CIパイプライン設計

### aidlc-gate.yml ワークフロー構成

**トリガー**: push（main, develop）, pull_request（main, develop）

**ジョブ構成**:

```
jobs:
  biome-lint-gate:
    runs-on: ubuntu-latest
    steps:
      1. Checkout
      2. Setup Node.js
      3. Setup Rust toolchain（WASMビルド用）
      4. Install dependencies（pnpm install）
      5. Build Biome plugins（pnpm run build:plugins）
      6. Biome lint check（biome-toolchain ci-gate --output annotations）
      7. Upload lint report（artifact）
```

**ステップ定義**:

| ステップ | コマンド | 失敗時 | 説明 |
|---------|---------|--------|------|
| Build Biome plugins | `pnpm run build:plugins` | ジョブ失敗 | GritQLパターン検証 + Rust→WASMビルド |
| Biome lint check | `node packages/biome-toolchain/dist/ci-controller.js --output annotations` | ジョブ失敗 | 4カスタムルール + AntiPattern + ESLint残存チェック |
| Upload lint report | `actions/upload-artifact` | 継続 | HarnessCompatibleError形式のJSONレポートを成果物として保存 |

**合格条件**:

1. Biomeプラグインのビルドが成功すること
2. 全カスタムルール（4種）のチェックでerror severityの違反が0件であること
3. アンチパターン検出でerror severityの違反が0件であること
4. ESLint関連の設定・依存パッケージが完全に除去されていること（INV-12）
5. 上記4条件を全て満たした場合のみCIゲートを通過する（終了コード0）
