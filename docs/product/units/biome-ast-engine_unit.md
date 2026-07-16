# Unit定義: biome-ast-engine

@story-id H03-08
設計要素: Phase Gate self-hosting 用の biome-ast-engine Unit definition.

> **Unit ID**: biome-ast-engine
> **作成日**: 2026-03-12
> **Wave**: 1（基盤構築）
> **対応Epic**: H-01 Biome AST解析基盤

---

## 1. 概要

biome-ast-engineは、PhasegateのL1（コードレベル）品質防御を担うUnit。v0のESLintベースの4カスタムルール（require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure）をBiomeプラグインとして移植し、さらにAI生成コード特有のアンチパターンを検出する4ルール（no-any-abuse, no-code-duplication, no-ghost-file, no-comment-flood）を追加実装する。

CIパイプラインでのBiome統合とESLint関連依存の完全除去により、Rust製の高速AST解析によるエディタ保存時フィードバックからCI/CDまで一貫したL1品質チェック基盤を確立する。v0のbiome-toolchainを改名・再定義し、ツールチェーン管理からAST解析エンジンとしての責務に特化させた。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H01-01 | v0コア4ルールのBiomeプラグイン移植 | Must |
| H01-02 | AI生成コードアンチパターン検出ルール | Must |
| H01-03 | CIパイプラインBiome統合（ESLint完全除去） | Must |

---

## 3. 機能要件

### 3.1 コア4ルールのBiomeプラグイン移植（H01-01）

- `require-unit-comment`: ソースファイルに`// @unit`コメントが存在しない場合を検出する
- `require-layer-comment`: ソースファイルに`// @layer`コメントが存在しない場合を検出する
- `no-layer-violation`: importグラフ解析によりレイヤー境界を越えるimport（例: domain→infrastructure）を検出する。循環依存検出を含み、循環importをHarnessError（L1-003）として報告する
- `enforce-folder-structure`: アーキテクチャに違反するファイル配置を検出する
- v0 ESLintルールと同等のテストケースを用意し、同一の検出精度を保証する（パリティテスト）
- @unit/@layerメタデータの付与漏れ検出精度をK3.5水準で維持する

### 3.2 AI生成コードアンチパターン検出ルール（H01-02）

- `no-any-abuse`: `any`型の過剰使用（AI生成コードの典型的アンチパターン）を検出する
- `no-code-duplication`: 構造的に重複するコードブロックを検出する
- `no-ghost-file`: どこからもimportされないファイルを検出する
- `no-comment-flood`: 過剰なコメント（AIが生成しがちな冗長コメント）を検出する
- 各ルールのHarnessErrorコード（L1-005〜L1-008）を定義し、統一フォーマットに準拠する

### 3.3 CIパイプラインBiome統合 + ESLint完全除去（H01-03）

- CIパイプライン（aidlc-gate.yml相当）でBiomeによるリント+フォーマットチェックを実行する
- H01-01の4カスタムルール + H01-02の4アンチパターンルールの計8ルールをCIで実行する
- ESLint関連の設定ファイル（.eslintrc*, eslint.config.*）・依存パッケージをプロジェクトから完全除去する
- CI失敗時のエラー出力をHarnessError形式（code/severity/message/suggestion）に準拠させる

---

## 4. ドメインモデル概要

- **BiomeRule（集約）**: 各Biomeルールの定義・有効/無効状態・severity設定を管理
- **RuleName（値オブジェクト）**: ルール名の型安全な表現（コア4ルール + アンチパターン4ルール）
- **LayerName（値オブジェクト）**: 有効なレイヤー名（domain/application/infrastructure/presentation）
- **RuleViolation（値オブジェクト）**: ルール違反の検出結果（ファイルパス・行番号・ルール名・メッセージ）
- **ImportGraph（ドメインサービス）**: importグラフの構築・循環依存検出・レイヤー違反判定
- **LintExecution（集約）**: リント実行のライフサイクル管理（実行開始→結果収集→レポート生成）

> 詳細なドメインモデル設計はdomain-designerスキルで定義する。

---

## 5. 外部依存

### 5.1 Shared Kernel参照

| 参照元 | 内容 |
|--------|------|
| `HarnessError` 型（harness-error） | L1ルール違反のエラー出力フォーマット（code/severity/message/suggestion/adr_ref/fix_example） |
| `@unit/@layer` メタデータ仕様（traceability-model） | require-unit-comment / require-layer-commentルールが検出するメタデータの形式定義。traceability-modelが正規仕様を所有し、本UnitはL1での存在チェックを担当する |
| Layer依存方向（architecture-philosophy.md） | no-layer-violationルールが参照するレイヤー間依存方向の定義 |
| Folder structure（folder_management_rules.md） | enforce-folder-structureルールが参照するフォルダ構造定義 |

### 5.2 Cross-Unit Contract

| 契約 | 方向 | 相手Unit | 内容 |
|------|------|---------|------|
| L1ルール実行結果 | 提供 | validator-system | L1バリデータの実行結果（RuleViolation[]）を提供。RuleViolationは`{ filePath: string; line: number; column: number; ruleName: RuleName; message: string; severity: "error" | "warning"; fix_example?: string }`の構造を持つ |
| @unit/@layerメタデータ形式定義 | 消費 | traceability-model | L1 require-unit-comment / require-layer-commentルールが検出するメタデータの正規形式（`// @unit {unit_name}` / `// @layer {layer_name}`）はtraceability-modelが定義する仕様に準拠する |
| Biome直接呼出 | 提供 | agent-integration | PostToolUse Hook Adapterがbiome check/formatを直接呼び出す |
| Biome統合CIパイプライン | 提供 | ci-governance | CI/CDテンプレートがBiomeリント+フォーマットステップを参照 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|----------------|
| K3 | Biome AST解析 — importグラフ解析+循環依存検出 | no-layer-violationルールにimportグラフ解析・循環依存検出を実装。プロンプトでは代替不可能なAST解析をBiomeネイティブで提供 |
| K3.5 | @unit/@layer/@story-idメタデータ | require-unit-comment / require-layer-commentルールで@unit/@layerメタデータの存在をL1レベルで強制。v0と同等の検出精度を維持 |
| K1 | 4層防御モデル（L1-L4） | L1レイヤーの全8ルール（コア4 + アンチパターン4）を本Unitが担当。4層防御の最前線を構成 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit | 内容 |
|------|------|---------|------|
| Biomeルール | require-unit-comment | 全Unit（L1バリデーション） | @unitコメント存在チェック |
| Biomeルール | require-layer-comment | 全Unit（L1バリデーション） | @layerコメント存在チェック |
| Biomeルール | no-layer-violation | 全Unit（L1バリデーション） | レイヤー境界違反+循環依存検出 |
| Biomeルール | enforce-folder-structure | 全Unit（L1バリデーション） | フォルダ構造アーキテクチャ準拠検証 |
| Biomeルール | no-any-abuse | 全Unit（L1バリデーション） | any型過剰使用検出 |
| Biomeルール | no-code-duplication | 全Unit（L1バリデーション） | 構造的コード重複検出 |
| Biomeルール | no-ghost-file | 全Unit（L1バリデーション） | 未参照ファイル検出 |
| Biomeルール | no-comment-flood | 全Unit（L1バリデーション） | 過剰コメント検出 |
| CI | Biome統合CIパイプライン | ci-governance, regression-suite | aidlc-gate.yml相当のBiomeリント+フォーマットチェック |

---

## 8. 実装上の制約・注意事項

- **Rust環境依存**: Biomeカスタムプラグインの実装にRust 1.70.0+およびwasm32-unknown-unknownターゲットが必要。CI環境にもRustツールチェーンのセットアップが必要
- **WASMバイナリ管理**: ビルド済みWASMバイナリ（150-200KB, release-optimized）のバージョン管理とCI上でのビルド検証が必要
- **biome.json正規版**: GritQLパターンはbiome.json内にインライン記述（正規版）。.gritファイルは参照用のみ
- **v0パリティ保証**: v0 ESLintルールとの完全等価性テスト（パリティテスト）が移植完了の前提条件
- **HarnessErrorコード体系**: L1-001〜L1-004（コア4ルール）、L1-005〜L1-008（アンチパターン4ルール）の8コードを使用
- **PostToolUse Hookタイムアウト**: agent-integrationからのbiome直接呼出は500ms以内に完了する必要がある

---

## 9. Corpus 履歴

- 2026-04-25: Phase Gate self-hosting の kebab-case path 解決用 entry を追加した。
- 2026-07-16: WI-285 で詳細定義を canonical path へ統合し、単一正本化した。
