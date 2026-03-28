# Unit定義: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-12
> **Wave**: 2（コア品質機構）
> **対応Epic**: H-11 エージェント統合オプション

---

## 1. 概要

コア品質能力（L1-L4）のCLI/FSフォールバック保証と、Claude Code Hook Adapter（PreToolUse/PostToolUse/Stop）を提供するUnit。**薄いAdapter層**に限定し、全CLIコマンド仕様はharness-apiが所有する。本Unitの責務はHook/FSイベントをharness-api CLIコマンドに変換することのみである。

v0のquality-hooks Unit（US-016〜019）を前身とし、v1ではCLI/FSフォールバック保証（H11-01）を新設することでエージェント非依存性を明示的に保証する。また、v0のbiome-toolchainが担当していたPostToolUse Hook（US-037相当）をH11-03として本Unitに統合し、Biomeベースの高速フォーマット+リントをHook Adapterとして提供する。

---

## 2. 担当ストーリー / Issue

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H11-01 | コア品質能力のCLI/FSフォールバック定義 | Must |
| H11-02 | Claude Code PreToolUse Hook Adapter（リンター設定保護） | Must |
| H11-03 | Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント） | Must |
| H11-04 | Claude Code Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止） | Must |

| Issue ID | タイトル | 優先度 |
|----------|---------|--------|
| ISSUE-001 | WriteTargetScope の issue パス認識追加 | Must |

---

## 3. 機能要件

### 3.1 CLI/FSフォールバック保証（H11-01）

- L1-L4全バリデータがCLIコマンドから直接実行可能であることを検証するテスト
- Claude Code Hookが無効な環境でも全バリデータが正常動作することを検証するテスト
- coreモジュールが特定エージェントAPI（Claude Code Hook API等）をimportしていないことを検証するテスト
- CLI/FSフォールバックの利用方法ドキュメント

### 3.2 PreToolUse Hook Adapter（H11-02）

- `biome.json`（`.biome.json`含む）、`tsconfig.json`、`package.json`の変更をブロック
- ブロック時に変更対象ファイル名を含むHarnessErrorを表示
- ブロック対象外ファイルへの変更は正常に実行
- Adapterはコア品質能力に依存し、エージェント固有APIは薄いラッパーに留める

### 3.3 PostToolUse Hook Adapter（H11-03）

- **正規経路**: `harness:lint`コマンド（harness-api所有）を呼び出す。内部でBiome（`biome check`/`biome format`）が実行される
- **低遅延fast-path**: 500msタイムアウト内での完了を保証するため、`harness:lint --fast`モード（フォーマットのみ）をharness-apiに追加要求する。Biome直呼びは行わず、harness-api経由で統一する
- v0のformat-typescript-hook.shと同等以上の機能をBiomeで実現
- Hook未使用時はCLI（`harness:lint`）で同等機能が実行可能
- Hook実行テストの存在

### 3.5 WriteTargetScope の issue パス認識（ISSUE-001）

- `docs/inception/{unit}/issues/{ISSUE-XXX}/` パスを認識し、Level 3 スコープ（unitId + storyId=issueId）としてマッピングする
- issue ID は内部的に storyId フィールドで扱い、US と同一のフェーズゲートチェックを適用する
- `docs/inception/issues/` 配下（横断的 issue）は Level 1 として扱い、フェーズゲートは適用しない
- fromPath() のマッチロジックに `issues/` セグメント検出を追加する

### 3.4 Stop Hook Adapter（H11-04）

- **正規フロー**: Stop Hook実行時に`harness:complete-check`を呼び出す（`pnpm test` + L1-L4全バリデータの統合実行を含む）。`harness:complete-check`がfailを返した場合、エージェント完了を阻止する
- CLI/FSフォールバック経路でも`harness:complete-check`が同一の完了条件を提供するため、Hook経路との「完了条件のズレ」を排除する
- `stop_hook_active`フラグで再入を検出し、無限ループ（テスト失敗→再試行→テスト失敗）を防止
- 再入検出時にStop Hookをスキップし、適切な警告メッセージを表示
- Hook未使用時はCLI（`harness:complete-check`相当）で同等の完了チェックが実行可能

---

## 4. ドメインモデル概要

- **HookEvent（値オブジェクト）**: Hook種別（PreToolUse/PostToolUse/Stop）とイベントペイロード（対象ファイルパス、ツール名等）
- **ProtectedFileList（値オブジェクト）**: PreToolUseでブロック対象とするファイルパスパターンのリスト（biome.json, tsconfig.json, package.json）
- **HookTranslationResult（値オブジェクト）**: HookEventをharness-api CLIコマンドに変換した結果（コマンド名、引数、期待する終了コード）
- **ReentryGuard（エンティティ）**: `stop_hook_active`フラグの管理。再入検出・スキップ判定・フラグリセットを担う
- **HookToCliTranslator（ドメインサービス）**: HookEventを受け取り、対応するharness-api CLIコマンドへの変換を行う。PreToolUse→ファイル保護チェック、PostToolUse→`harness:lint`、Stop→`pnpm test` + `harness:ci-check`（`harness:complete-check`）
- **FallbackVerificationService（ドメインサービス）**: coreモジュールのエージェント固有API非依存性を検証。import解析によりClaude Code Hook API等の直接参照がないことを確認

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: Hook Adapterのエラー出力に使用
- **HarnessConfigV2型**（config-foundationが定義）: Hook有効/無効設定の参照

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **CLI Command Registry** | 消費 | harness-api | 全CLIコマンド名・入出力仕様・終了コード定義。`harness:lint`、`harness:ci-check`、`harness:complete-check`等 |
| **Harness API Response DTO** | 消費 | harness-api | CLI出力のJSON構造（status/errors/summary）。Hook Adapterがレスポンスをパースしてエージェントに返す |

### 5.3 実装時依存

| 依存先Unit | 依存内容 |
|-----------|---------|
| harness-api | CLIコマンド呼び出し（`harness:lint`、`harness:lint --fast`、`harness:complete-check`） |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | CLI/FSフォールバック保証により、Hook無しでもL1-L4全層が機能することを検証 |
| K3 | Biome AST解析 | PostToolUse Hook AdapterがBiome直接呼び出しで高速フォーマット+リントを実行 |
| K6 | 2-Phase Execution | Stop Hook Adapterが`harness:complete-check`経由で2-Phase Execution遵守を検証 |
| K13 | harness.config.json | Hook設定（有効/無効、保護対象ファイル等）はharness.config.jsonから参照 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| Hook Adapter | PreToolUse Hook Adapter（リンター設定保護） | Claude Code利用環境 |
| Hook Adapter | PostToolUse Hook Adapter（Biome高速フォーマット+リント） | Claude Code利用環境 |
| Hook Adapter | Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止） | Claude Code利用環境 |
| パターン | ReentryGuard（`stop_hook_active`フラグ機構） | fuse-hooks-engine（Future: FUSE完了ゲートの参照実装） |
| テスト資産 | CLI/FSフォールバック検証テストスイート | regression-suite（回帰テスト対象） |

---

## 8. 実装上の制約・注意事項

- **薄いAdapter層の原則**: 本Unitはhook/FSイベントをharness-api CLIコマンドに変換する薄いAdapter層に限定する。バリデーションロジック、CLIコマンド仕様、出力フォーマットはharness-apiが所有し、本Unitには含めない
- **CLIコマンド仕様の非所有**: `harness:lint`、`harness:ci-check`、`harness:complete-check`等のCLIコマンド名・入出力仕様・終了コードはharness-apiのCLI Command Registryが定義する。本Unitはそれを消費するのみ
- **v0との差異**: v0のquality-hooks（US-016〜019）を前身とし、US-037（PostToolUse Hook）をbiome-toolchainから本Unitに統合。v1ではCLI/FSフォールバック保証（H11-01）を新設
- **エージェント非依存性の保証**: coreモジュール（domain/usecase層）がClaude Code Hook API等のエージェント固有APIを直接importしていないことをテストで検証する。Hook Adapterはinfrastructure層に配置し、エージェント固有の依存をこの層に閉じ込める
- **PostToolUse Hookタイムアウト**: 500ms厳守。Biome直接呼び出しにより高速化を実現するが、タイムアウト超過時はHook実行をスキップしワーニングを出力する
- **harness-apiへの順序依存**: harness-apiのCLI Command RegistryとHarness API Response DTOが確定した後に、本Unitの実装を開始することを推奨
