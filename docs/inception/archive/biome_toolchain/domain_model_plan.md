# ドメインモデル設計計画: biome-toolchain

> **Unit ID**: biome-toolchain
> **Wave**: 1（基盤構築）
> **対象Epic**: E-11 ESLint→Biome全面移行
> **作成日**: 2026-03-10
> **ステータス**: Phase 1（計画）— 人間承認待ち

---

## 1. スコープ

### 対象Unitと担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-036 | v0カスタムESLintルールのBiomeプラグイン移植 | Must |
| US-037 | PostToolUse HookのBiomeベース高速化 | Must |
| US-038 | L1バリデータのBiomeベース再構築 | Must |
| US-039 | CIパイプラインのBiome統合 | Must |

### 他Unitとの境界

- **依存先**: なし（Wave 1基盤Unit。他Unitに依存しない）
- **公開インターフェース**:
  - **Biomeルール4種** → 全Unit（L1バリデーション）が利用
  - **PostToolUse Biomeフォーマット** → 全Unit（開発ループ）が利用
  - **Biome統合CIパイプライン** → regression-suite Unitが利用
- **境界の明確化**:
  - L2 Pre-commitバリデータ（phase-gate, architecture等）は quality-hooks Unit の責務。biome-toolchainはL1（editor層）のみ担当
  - HarnessError形式への準拠は harness-dx Unit が定義する共通フォーマットに従う（ただしbiome-toolchain自体はHarnessErrorの定義元ではない）
  - `biome.json` 設定ファイルの保護（変更ブロック）は quality-hooks Unit の PreToolUse Hook（US-016）が担当

---

## 2. 集約候補の分析

### 2.1 ストーリーから抽出した業務名詞一覧

| 業務名詞 | 出典 | 説明 |
|----------|------|------|
| BiomeRule（Biomeルール） | US-036 | Biomeプラグインとして実装されるカスタムリントルール |
| RuleViolation（ルール違反） | US-036, US-038 | ルール実行結果として検出された違反 |
| LintReport（リントレポート） | US-038, US-039 | ルール実行結果の集約レポート |
| BiomeConfig（Biome設定） | US-036, US-039 | `biome.json` に定義されるルール有効/無効・オプション設定 |
| PostToolUseHook（PostToolUseフック） | US-037 | ファイル変更後に自動実行されるBiomeチェック/フォーマット |
| L1Validator（L1バリデータ） | US-038 | Biome AST解析ベースのeditor層バリデータ |
| AntiPattern（アンチパターン） | US-038 | AI生成コードの品質問題パターン（any乱用、コード重複、ゴーストファイル、コメント洪水） |
| CIPipeline（CIパイプライン） | US-039 | GitHub ActionsワークフローでのBiomeリント+フォーマットチェック |
| ImportGraph（インポートグラフ） | US-036 | ソースファイル間のimport依存関係のグラフ構造 |
| LayerBoundary（レイヤー境界） | US-036 | アーキテクチャレイヤー間の許可された依存方向の定義 |
| UnitMetadata（Unitメタデータ） | US-036 | @unitコメントによるソースファイルのUnit帰属情報 |
| LayerMetadata（レイヤーメタデータ） | US-036 | @layerコメントによるソースファイルのLayer帰属情報 |
| FolderStructure（フォルダ構造） | US-036 | アーキテクチャ準拠のフォルダ構成ルール |
| HarnessError | US-039 | CI失敗時の統一エラーフォーマット（harness-dxが定義、biome-toolchainは利用側） |

### 2.2 集約候補とその根拠

#### 集約候補 1: `BiomeRule`（Biomeルール集約）

- **根拠**: 4つのカスタムルール（require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure）は、それぞれ独立した検出ロジックを持つが、「Biome設定で有効/無効を切り替えられるルール」という共通のライフサイクルを持つ。ルールは単独で意味を持ち、他のルールの存在に依存しないため、各ルールが独立したエンティティとなる。
- **含まれるもの**: ルール名、ルール種別（metadata/import-graph/folder）、検出ロジック、違反生成ロジック
- **不変条件**: ルールは有効化されている場合、対象ファイルに対して必ず検査を実行する

#### 集約候補 2: `LintExecution`（リント実行集約）

- **根拠**: リント実行は「対象ファイル群に対して有効なルール群を適用し、違反を収集してレポートを生成する」という一連のトランザクション境界を持つ。1回のリント実行が整合性の単位となる。
- **含まれるもの**: 実行対象ファイル群、適用ルール群、検出された違反一覧、実行結果（成功/失敗）、実行時間
- **不変条件**: 実行完了時、全対象ファイルが全有効ルールで検査済みであること

#### 集約候補 3: `AntiPatternDetector`（アンチパターン検出器集約）

- **根拠**: US-038で定義されるAI生成コードアンチパターン検出（any型乱用、コード重複、ゴーストファイル、コメント洪水）は、4つのカスタムルールとは異なるドメイン知識（AI生成コードの特性）に基づく。検出ロジックの粒度と進化方向が異なるため、独立した集約とする。
- **含まれるもの**: 検出種別（any乱用/重複/ゴースト/コメント洪水）、検出閾値、検出ロジック
- **不変条件**: 各検出器は独立して動作し、他の検出器の結果に依存しない

#### 集約候補 4: `HookConfiguration`（フック設定集約）

- **根拠**: PostToolUse Hook（US-037）は、Biomeチェック/フォーマットの実行トリガーと実行パラメータを管理する。フックの有効/無効、実行対象ファイルパターン、実行コマンドが一つの設定単位として管理される。
- **含まれるもの**: フック種別（PostToolUse）、対象ファイルパターン、実行コマンド（biome check / biome format）、タイムアウト設定
- **不変条件**: フック実行は冪等であること（同じファイルに対して複数回実行しても結果が同じ）

#### 集約候補 5: `CIGateConfiguration`（CIゲート設定集約）

- **根拠**: US-039のCIパイプライン統合は、GitHub ActionsワークフローでのBiome実行設定を管理する。CIゲートの合格/不合格判定ロジック、ESLint依存の除去確認、HarnessError形式準拠を一つの設定単位として扱う。
- **含まれるもの**: ワークフロー定義、実行ステップ、合格条件、エラーフォーマット設定
- **不変条件**: CIゲートはBiomeリント+フォーマットの両方が成功した場合のみ通過する

---

## 3. 設計方針

### 3.1 集約の粒度方針

biome-toolchainはリンター・AST解析という**ツールチェーン**ドメインであり、一般的なビジネスドメインとは異なる特性を持つ:

1. **ステートレス性が高い**: ルール実行は入力（ソースコード）に対して出力（違反リスト）を返す純粋関数に近い。永続化が必要なエンティティは少ない
2. **設定駆動**: 動作は主に`biome.json`設定ファイルによって決定される。ランタイムで状態が変化するエンティティは限定的
3. **Biomeプラグインシステムの制約**: Biomeプラグインは所定のAPI（GritQL / Rust Plugin API）に従う必要があり、ドメインモデルの自由度はプラグインAPIの設計に依存する

これらの特性を踏まえ、以下の方針を採用する:

- **集約は小さく保つ**: ルールごとに独立した集約とし、ルール間の結合を最小化する
- **値オブジェクトを多用する**: ファイルパス、レイヤー名、Unit名、違反メッセージ等は値オブジェクトとして表現する
- **ドメインサービスの適切な活用**: リント実行のオーケストレーション（複数ルールの適用、レポート集約）はドメインサービスとして表現する。これは「複数集約にまたがる操作」に該当するため

### 3.2 値オブジェクト vs エンティティの判断基準

| 概念 | 分類 | 根拠 |
|------|------|------|
| BiomeRule（4カスタムルール） | エンティティ | ルール名で一意に識別される。有効/無効の状態を持つ |
| RuleViolation | 値オブジェクト | ファイル・行番号・ルール名の組み合わせで等価判定。不変 |
| FilePath | 値オブジェクト | 文字列ベースの不変値。パス正規化ロジックを持つ |
| LayerName | 値オブジェクト | domain/port/usecase/controller等の列挙型。不変 |
| UnitName | 値オブジェクト | Unit名文字列。不変 |
| ImportEdge | 値オブジェクト | インポート元→先の関係。不変 |
| ViolationSeverity | 値オブジェクト | error/warningの列挙型 |
| AntiPatternType | 値オブジェクト | any乱用/重複/ゴースト/コメント洪水の列挙型 |
| LintReport | エンティティ | 実行IDで識別。違反リストを集約し、成功/失敗の状態を持つ |
| HookConfig | エンティティ | フック種別で識別。有効/無効・設定パラメータの状態を持つ |

### 3.3 Shared Kernelとの関係

biome-toolchainは基盤Unitであり、以下の共有概念を定義・提供する:

- **@unit/@layerメタデータ仕様**: `require-unit-comment`, `require-layer-comment`ルールが強制するメタデータ形式は、全Unitが従うShared Kernelの一部
- **レイヤー境界定義**: `no-layer-violation`ルールが参照するレイヤー間の許可された依存方向は、`architecture-philosophy.md`に定義されたアーキテクチャ原則をコードで表現したもの
- **フォルダ構造定義**: `enforce-folder-structure`ルールが参照するフォルダ構成ルールは、`folder_management_rules.md`をコードで表現したもの
- **HarnessError**: harness-dx Unitが定義する共通エラーフォーマット。biome-toolchainはCI失敗時にこのフォーマットでエラーを出力する（利用側）

### 3.4 ドメインイベント候補

| イベント | 発生条件 | 消費者 |
|---------|---------|--------|
| RuleViolationDetected | ルール実行で違反を検出 | LintReport集約 |
| LintExecutionCompleted | リント実行が完了（成功/失敗） | CIパイプライン、PostToolUse Hook |
| AntiPatternDetected | AI生成コードアンチパターンを検出 | LintReport集約 |

---

## 4. QA（不明点・確認事項）

### [Question] Q1: Biomeプラグイン実装方式の選定

Biomeのカスタムルール実装には以下の選択肢がある:
1. **GritQL**: 宣言的パターンマッチング。シンプルなルールに適する
2. **Rust Plugin API**: Rustで実装するネイティブプラグイン。複雑なAST解析に適する
3. **Analyzer (lint) rules via contribution**: Biome本体にルールを寄贈する

`no-layer-violation`（importグラフ解析+循環依存検出）は複雑なグラフ解析が必要であり、GritQLでは表現力が不足する可能性がある。一方、`require-unit-comment`/`require-layer-comment`は比較的単純なパターンマッチで実現可能。

**推奨案:** `require-unit-comment`と`require-layer-comment`はGritQLで実装し、`no-layer-violation`と`enforce-folder-structure`はRust Plugin APIで実装するハイブリッドアプローチ。ただし、Biome Plugin APIの成熟度（2026年3月時点のstability）を確認する必要がある。

[Answer]
推奨案を採用。

---

### [Question] Q2: アンチパターン検出器のBiome組み込み vs 外部ツール

US-038のAI生成コードアンチパターン検出（any型乱用、コード重複、ゴーストファイル、コメント洪水）について:
- **any型乱用**: Biome組み込みルール（`noExplicitAny`の拡張）で対応可能
- **コード重複**: jscpd相当の機能はBiome単体では提供されていない。外部ツール連携が必要か
- **ゴーストファイル**: ファイル参照グラフの解析が必要。Biome単体では困難か
- **コメント洪水**: AST解析でコメント比率を算出可能。Biomeルールで実装可能

**推奨案:** any型乱用とコメント洪水はBiomeルールとして実装。コード重複とゴーストファイルは、Biome AST解析の結果を入力とする外部スクリプト（TypeScript）として実装し、L1バリデータの一部として統合する。「L1バリデータ = Biomeルール + Biome AST活用スクリプト」という構成。

[Answer]
推奨案を採用。
---

### [Question] Q3: v0 ESLintルールとBiomeルールのパリティ検証方針

US-036 AC-5「各プラグインにv0 ESLintルールと同等のテストケースが存在する」の「同等」の定義について:
- v0のESLintルールのテストケース数と検出パターンをベースラインとする
- Biome移植後に同じ入力に対して同じ検出結果を返すことを検証する

**推奨案:** v0のESLintルールテストケースを`.test.ts`として移植し、Biomeルール実行結果とv0の期待結果を突き合わせるパリティテストスイートを構築する。テストケースは`tests/biome-rules/`配下に配置。

[Answer]
推奨案を採用

---

### [Question] Q4: PostToolUse Hook実行のパフォーマンス目標

US-037 AC-2「ESLint実行時と比較して処理時間が大幅に短縮されている」の「大幅」の定量基準について:
- Biomeは公称でESLintの50-100倍高速
- PostToolUse Hookはエディタ操作のたびに実行されるため、レイテンシが開発体験に直結する

**推奨案:** PostToolUse Hook実行時間の目標を「単一ファイルに対して500ms以下」と設定する。v0のESLint実行時間をベンチマークとして記録し、Biome移行後の実行時間を比較する定量テストを用意する。

[Answer]
推奨案を採用

---

### [Question] Q5: CIパイプラインにおけるESLint完全除去の確認方法

US-039 AC-3「ESLint関連の設定ファイル・依存パッケージがプロジェクトから除去されている」について:
- `package.json`からeslint関連devDependencies除去
- `.eslintrc*`、`eslint.config.*`ファイルの削除
- CI設定ファイル内のeslint参照の除去

**推奨案:** ESLint完全除去を検証するCIステップ（`grep -r "eslint" --include="*.json" --include="*.yml" --include="*.yaml"`で残存チェック）を追加し、残存があればCIを失敗させる。これはUS-055 Go/No-Go Gate回帰テストの一部としても機能する。

[Answer]
推奨案を採用

---

## 5. 前提条件・リスク

### 前提条件

| # | 前提条件 | 根拠 |
|---|---------|------|
| P1 | Biome Plugin API（Rust/GritQL）が2026年3月時点で安定版として利用可能 | Biomeのプラグインエコシステムの成熟度に依存 |
| P2 | v0の4カスタムESLintルールのソースコード・テストケースが参照可能 | ALIDL_HARNESS v0リポジトリへのアクセスが必要 |
| P3 | `biome.json`設定ファイルで4カスタムルールの有効/無効を個別制御可能 | Biomeのプラグイン設定機構に依存 |
| P4 | importグラフ解析がBiomeのAST APIで実現可能（特にTypeScript pathsの解決） | Biome AST APIの機能範囲に依存 |
| P5 | phasegate.config.json v2のレイヤー定義セクションが参照可能（config-foundation Unitと同時Wave 1） | Wave 1並列実行時の調整が必要 |

### リスク

| # | リスク | 影響度 | 確率 | 軽減策 |
|---|--------|--------|------|--------|
| R1 | Biome Plugin APIの不安定性 | 高 | 中 | 安定版API確認後に実装開始。GritQLとRust APIの両方を検証し、安定度の高い方を優先 |
| R2 | no-layer-violationのimportグラフ解析がBiome単体で困難 | 高 | 中 | Biome AST + TypeScriptスクリプトのハイブリッド実装をフォールバックとして準備 |
| R3 | v0 ESLintルールとBiomeルールの挙動差異 | 中 | 高 | パリティテストスイートで差異を体系的に検出・文書化 |
| R4 | ESLint除去による既存CIの破壊 | 高 | 低 | ESLint除去は段階的に実施。Biomeルールの全テスト通過確認後にESLint依存を削除 |
| R5 | config-foundation Unit（Wave 1並列）との設定ファイル競合 | 中 | 中 | biome-toolchainは`biome.json`のみを管理し、`phasegate.config.json`への直接依存を最小化する |
