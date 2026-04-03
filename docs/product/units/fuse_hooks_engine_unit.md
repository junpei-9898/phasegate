# Unit定義: fuse-hooks-engine

> **Phase**: Future（v1スコープ外）

> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-12
> **Wave**: Future Phase
> **対応Epic**: H-F1 FUSE Hooks Engine（L0 Pre-write enforcement）

---

## 1. 概要

OS-level FUSEによるファイルI/Oインターセプションで、AIエージェントの種類やプロンプト遵守度に依存しない決定論的ガバナンスを実現するUnit。`.harness-hooks.yml`による宣言的フック定義、FUSE パススルーによるPreWrite/PostWrite/PreReadハンドラ、シェルラッパーによるPreBash/PostBash、Magic File + CLIによる完了ゲートを実装する。

v0のfuse-hooks-engine Unit（US-040〜044）を前身とし、v1ではFuture Phaseに移動。v1のL1-L4防御モデルでCore Valueが維持可能であるため、L0（OS-level enforcement）は将来の強化オプションとして位置づける。v1のvalidator-system（L0バリデータ登録インターフェース）、harness-api（CLIコマンド拡張ポイント）、config-foundation（L0セクション追加用スキーマ拡張）の各Extension Pointを利用して統合する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| HF1-01 | .harness-hooks.yml宣言的フック定義 | Must |
| HF1-02 | FUSEパススルー+PreWrite/PostWrite | Must |
| HF1-03 | PreRead Hook機密ファイルブロック | Must |
| HF1-04 | シェルラッパーPreBash/PostBash | Must |
| HF1-05 | 完了ゲートMagic File+CLI | Must |

---

## 3. 機能要件

### 3.1 .harness-hooks.yml宣言的フック定義（HF1-01）

- `.harness-hooks.yml`のYAMLスキーマ定義
- フック種別: PreWrite / PostWrite / PreRead / PreBash / OnComplete
- 各フックにファイルパターン（glob）とアクション（block / allow / run）を設定可能
- YAMLスキーマバリデーションの通過検証

### 3.2 FUSEパススルー + PreWrite/PostWrite（HF1-02）

- FUSE-T（macOS）/ libfuse（Linux）パススルーファイルシステムの実装
- PreWrite: レイヤー違反ファイル書き込みのEPERM拒否
- PreWrite: 設計文書なしの実装コード書き込み拒否
- PostWrite: ファイル書き込み直後のバリデータ自動起動
- FUSE未使用時のL1-L4フォールバック動作

### 3.3 PreRead Hook機密ファイルブロック（HF1-03）

- `.env`、`*.key`、`*.pem`等の機密ファイル読み取りブロック
- ブロック対象ファイルパターンの`.harness-hooks.yml`設定
- ブロック時の適切なエラーメッセージ（HarnessError形式）
- FUSE未使用時のClaude Code PreToolUse Hookによる同等のブロック

### 3.4 シェルラッパーPreBash/PostBash（HF1-04）

- シェルラッパー（PATH override）で主要コマンドインターセプト
- 破壊的コマンド（`rm -rf /`、`git push --force`等）ブロック
- ブロック対象コマンドの`.harness-hooks.yml`設定
- FUSE未使用時のClaude Code deny-check.shフォールバック

### 3.5 完了ゲートMagic File + CLI（HF1-05）

- Magic File（`.harness/DONE`）書き込みトリガーの完了ゲート
- `pnpm test`全グリーン検証
- テスト未通過時のEPERM拒否
- CLI（`harness:complete`）での同等機能
- FUSE未使用時のClaude Code Stop Hookフォールバック

---

## 4. ドメインモデル概要

- **HookDefinition（集約ルート）**: `.harness-hooks.yml`から生成されるフック定義。フック種別・ファイルパターン・アクションの組み合わせを保持
- **HookType（値オブジェクト）**: PreWrite / PostWrite / PreRead / PreBash / OnComplete の列挙
- **FilePattern（値オブジェクト）**: globパターンによるファイルマッチング条件
- **HookAction（値オブジェクト）**: block / allow / run のアクション定義
- **FUSEMount（エンティティ）**: パススルーファイルシステムのマウント状態管理。マウントポイント・元ディレクトリ・稼働状態を保持
- **CompletionGate（エンティティ）**: Magic File書き込みトリガーの完了ゲート。テスト結果検証・EPERM拒否判定を担う
- **MagicFile（値オブジェクト）**: `.harness/DONE`ファイルパス。完了ゲートのトリガーファイル
- **HookEvaluationService（ドメインサービス）**: HookDefinitionに基づきファイルI/Oイベントを評価し、block/allow/runの判定を実行
- **ProtectedResourceList（値オブジェクト）**: PreReadでブロック対象とする機密ファイルパターンのリスト
- **DestructiveCommandList（値オブジェクト）**: PreBashでブロック対象とする破壊的コマンドパターンのリスト

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: フックブロック時のエラー出力に使用
- **HarnessConfigV2型**（config-foundationが定義）: L0セクション設定の参照

### 5.2 v1 Extension Points（統合に必要な拡張ポイント）

本UnitはFuture Phaseであり、v1のCross-Unit Contractを直接消費するのではなく、v1側が確保するExtension Pointを利用して統合する。

| Extension Point | 所有Unit | 本Unitでの利用 | v1側で確保すべき内容 |
|----------------|---------|---------------|---------------------|
| L0バリデータ登録インターフェース | validator-system | FUSE PreWrite/PreReadバリデータをL0として登録 | ValidatorRegistryにプラグイン方式でL0バリデータを追加登録できるAPI |
| CLIコマンド拡張ポイント | harness-api | `harness:complete`コマンドの追加登録 | CommandRegistryへの新規コマンド登録API |
| L0セクション追加用スキーマ拡張 | config-foundation | phasegate.config.json v2にL0設定セクションを追加 | `layers.L0`セクション追加を想定したスキーマ拡張ポイント |

### 5.3 実装時依存

| 依存先Unit | 依存内容 |
|-----------|---------|
| validator-system | L0バリデータ登録インターフェース（L0 enforcement）。PreWriteハンドラからバリデータを呼び出しレイヤー違反を検出 |
| agent-integration | Hook参照実装。ReentryGuard（stop_hook_active）パターン、Stop Hook Adapterの完了ゲート設計を参照 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（将来拡張） | L0（OS-level enforcement）を追加し、L1-L4の上位防御層として機能。FUSEによるエージェント非依存の強制力を実現。ただしL0はオプショナルであり、v1のL1-L4で品質保証は完結する |
| K6 | 2-Phase Execution | 完了ゲート（Magic File + CLI）が2-Phase Execution遵守を物理的に強制 |
| K13 | phasegate.config.json | v1側のconfig-foundationにL0セクション追加用のスキーマ拡張ポイントを確保。実際のL0設定追加はFuture Phase実装時に行う |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 設定ファイル | `.harness-hooks.yml`（宣言的フック定義） | 外部利用者（開発者） |
| CLI | `harness:complete`（完了ゲートCLI、v1の`phasegate:complete-check`のFuture拡張版） | 外部利用者、agent-integration |
| L0バリデーション | PreWrite/PreRead/PreBash enforcement（FUSE利用時） | 全Unit（FUSE有効環境） |
| パターン | HookEvaluationService（フック評価ドメインサービス） | 将来の拡張Unit |

---

## 8. 実装上の制約・注意事項

- **Future Phaseの位置づけ**: 本Unitはv1スコープ外であり、詳細なconstruction-level設計（US単位の詳細設計・実装計画）は作成しない。Unit定義とExtension Point契約までをスコープとする
- **v1 Extension Pointへの依存**: 実装開始前に、validator-system（L0バリデータ登録インターフェース）、harness-api（CLIコマンド拡張ポイント）、config-foundation（L0スキーマ拡張）の各Extension Pointがv1で確定・安定していることが前提
- **FUSE環境依存**: FUSE-T（macOS）/ libfuse（Linux）が必要であり、開発・CI環境へのインストールが前提。FUSE非対応環境ではv1のL1-L4 + agent-integrationのHook Adapterにフォールバック
- **v0との差異**: v0のfuse-hooks-engine（US-040〜044）を前身とする。v1ではFuture Phaseに移動し、v1のL1-L4防御モデルでCore Valueが十分に維持可能であることを前提とする
- **agent-integrationとの責務分界**: agent-integrationはClaude Code Hook Adapterとして薄いAdapter層を提供。本UnitはOS-level FUSEによるエージェント非依存の強制力を提供。両者は相互補完的であり、FUSE有効時はL0が優先、FUSE無効時はagent-integrationにフォールバック
- **完了ゲートの参照実装**: agent-integrationのReentryGuard（stop_hook_active）パターンおよびStop Hook Adapterの設計を参照し、FUSE版の完了ゲートを設計する
