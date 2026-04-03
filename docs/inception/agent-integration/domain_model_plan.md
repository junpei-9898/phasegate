# ドメインモデル設計計画: agent-integration

> **作成日**: 2026-03-19
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: agent-integration（H-11 エージェント統合オプション）
> **担当ストーリー**: H11-01〜H11-04

---

## 1. スコープ

- **対象Unit**: agent-integration
- **担当ストーリー**:
  - H11-01: コア品質能力のCLI/FSフォールバック定義
  - H11-02: Claude Code PreToolUse Hook Adapter（リンター設定保護）
  - H11-03: Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント）
  - H11-04: Claude Code Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止）
- **他Unitとの境界**:
  - harness-api: CLI Command Registry・Harness API Response DTOを消費（`phasegate:lint` / `phasegate:lint --fast` / `phasegate:complete-check` 呼び出し）
  - harness-error: Hook Adapterのエラー出力にHarnessError型を使用
  - config-foundation: HarnessConfigV2からHook有効/無効設定・保護対象ファイル設定を参照

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| HookEvent | H11-02〜H11-04 | 値オブジェクト（Hook種別 + イベントペイロード） |
| ProtectedFileList | H11-02 | 値オブジェクト（PreToolUseでブロック対象とするファイルパスパターン） |
| HookTranslationResult | H11-02〜H11-04 | 値オブジェクト（HookEvent→CLIコマンド変換結果） |
| ReentryGuard | H11-04 | ※エンティティ評価対象（後述） |
| FallbackCapabilitySpec | H11-01 | 値オブジェクト（CLI/FSフォールバック仕様の宣言） |
| HookToCliTranslator | H11-02〜H11-04 | ドメインサービス（HookEvent→CLIコマンド変換） |
| FallbackVerificationService | H11-01 | ドメインサービス（coreモジュールのエージェント非依存性検証） |

### 集約候補: ReentryGuardの評価

Unit定義§4では `ReentryGuard` を**エンティティ**と記載している。横断契約§6の集約降格方針に照らして検討する。

**エンティティとして維持する根拠**:
- `stop_hook_active` フラグは Stop Hook 実行中に「active」状態に遷移し、完了後に「inactive」に戻る明確な状態遷移を持つ
- 再入検出ロジック（`activate() → isActive() → deactivate()`）はライフサイクルを持つ挙動であり、純粋なVOでは表現できない
- H11-04の「無限ループ防止」という重要なビジネスルールをカプセル化する責務がある

**集約ルートにしない根拠（エンティティとして独立）**:
- ReentryGuardは単一インスタンス（プロセス全体で1つ）であり、他のエンティティを内包しない
- 横断契約§6の「集約降格」はルートを持つ集約構造に対するものであり、単純なエンティティの採用は許容される

**結論**: ReentryGuardはエンティティとして採用（集約なし）。フラグの永続化はインフラ層（環境変数 or 一時ファイル）に委譲するため、ドメイン層は状態遷移ロジックのみを持つ。

### 全体構成の結論: 集約なし + エンティティ1つ

agent-integrationは「薄いAdapter層」（unit定義§1, §8）であり、ステートレスな変換処理とReentryGuardのみを持つシンプルなドメインモデルとなる。

---

## 3. 設計方針

### 3.1 VO中心・エンティティ1つの構成

```
[Claude Code Hook イベント入力]
  PreToolUse { toolName, filePaths }
  PostToolUse { toolName, affectedFiles }
  Stop { sessionId }

[HookToCliTranslator（ドメインサービス）]
  HookEvent → HookTranslationResult（CLIコマンド名 + 引数）
  ├── PreToolUse → ProtectedFileList照合 → ブロック判定
  ├── PostToolUse → "phasegate:lint" / "phasegate:lint --fast"
  └── Stop → ReentryGuard.isActive() チェック
              → "phasegate:complete-check"

[ReentryGuard（エンティティ）]
  activate() / isActive() / deactivate()
  → Stop Hook 無限ループ防止フラグ管理

[FallbackVerificationService（ドメインサービス）]
  → coreモジュールのimport解析
  → FallbackCapabilitySpec との整合性確認

[出力]
  HookTranslationResult → infrastructure層がCLI実行・HarnessApiResponse解析
  FallbackCapabilitySpec → テストスイートに利用
```

### 3.2 HookEventの型設計

HookEventをHook種別ごとのUnion型として定義する:

```
HookEvent =
  | PreToolUseEvent { hookType: 'pre-tool-use', toolName: string, targetFilePaths: string[] }
  | PostToolUseEvent { hookType: 'post-tool-use', toolName: string, affectedFilePaths: string[] }
  | StopEvent { hookType: 'stop', sessionId: string }
```

### 3.3 HookTranslationResultの構造

```
HookTranslationResult {
  shouldBlock: boolean               // PreToolUse時のブロック判定
  cliCommand?: CommandName           // 実行すべきharness-api CLIコマンド名
  cliArgs: string[]                  // コマンド引数
  expectedExitCode: ExitCode         // 期待する正常終了コード
  skipReason?: SkipReason            // スキップ理由（再入検出時等）
}
```

`cliCommand`が`undefined`の場合はCLI実行なし（ブロックのみ、またはスキップ）。

### 3.4 ReentryGuardのライフサイクル

```
[初期状態: inactive]
    ↓ Stop Hook 開始
activate()
[active状態]
    ↓ Stop Hook 再入試行
isActive() → true → SkipReason.REENTRY_DETECTED（スキップ）
    ↓ Stop Hook 完了
deactivate()
[inactive状態に戻る]
```

永続化はReentryGuardStatePort（環境変数またはtmpファイル）に委譲。ドメイン層は状態遷移ロジックのみ。

### 3.5 ProtectedFileListの設計

```
ProtectedFileList {
  patterns: string[]   // ["biome.json", ".biome.json", "tsconfig.json", "package.json"]
  matches(filePath: string): boolean
}
```

デフォルトパターンはドメイン層にハードコード（K13: config変更で保護対象ファイルを増やす拡張ポイントはConfigQueryPortで対応可能）。

### 3.6 FallbackCapabilitySpecの設計

H11-01のCLI/FSフォールバック保証を「仕様の宣言」としてドメイン層に持つ。

```
FallbackCapabilitySpec {
  supportedCommands: CommandName[]   // CLI経由で実行可能なコマンド一覧
  noAgentApiImports: boolean         // coreモジュールがエージェント固有APIを非依存であること
}
```

FallbackVerificationServiceがこの仕様を検証し、violation時にHarnessError[]を返す。

### 3.7 「薄いAdapter層」原則の貫徹

- バリデーションロジック・CLIコマンド仕様はharness-apiが所有。本Unitはcommand nameをポートから参照するのみ
- Hook Adapter実装（Claude Code固有API呼び出し）はinfrastructure層に配置
- ドメイン層はHookEvent→HookTranslationResultの純粋な変換処理のみ

---

## 4. QA（設計判断の根拠）

### Q1: ReentryGuardのフラグ永続化はどこで担うか

**質問**: `stop_hook_active` フラグはプロセス間をまたぐため、環境変数・一時ファイル・プロセスメモリ等の選択肢があるが、どこに永続化するか？ドメイン層への影響は？

**推奨案**: 永続化実装（環境変数 or `$TMPDIR/stop_hook_active` ファイル）はインフラ層のReentryGuardStatePortが担う。ドメイン層のReentryGuardエンティティはポートを通じて状態を読み書きし、状態遷移ロジックのみをカプセル化する。これによりドメイン層は環境変数・ファイルシステムへの直接依存を持たない。

**結論**: ReentryGuardStatePortとしてポート化。ドメインエンティティはポート経由で永続化を行う。

### Q2: FallbackVerificationService はドメイン層に置くべきか

**質問**: H11-01のcoreモジュールimport解析は「実装ファイルのAST解析」という技術的処理であり、ドメイン層に置くべきかインフラ層に置くべきか？

**推奨案**: ドメイン層はFallbackCapabilitySpec（何を検証すべきかの宣言）とFallbackVerificationServiceのインターフェース定義のみを持ち、実際のimport解析はImportAnalyzerPort（インフラ層）が担う。これにより「エージェント非依存性の検証ルール」はドメイン層に閉じ込めつつ、解析技術はポートで分離する。

**結論**: FallbackVerificationServiceはドメインサービスとして定義。import解析実装はImportAnalyzerPortに委譲。

### Q3: PostToolUse Hook のタイムアウト（500ms）管理はドメイン層か

**質問**: H11-03の「500msタイムアウト厳守」はドメインルールか、インフラ層の関心事か？

**推奨案**: タイムアウト値（500ms）はHookTranslationResultに `timeoutMs?: number` フィールドとして含める（ドメイン層の宣言的設定）。実際のタイムアウト制御はインフラ層のCliExecutorPort実装が担う。ドメイン層は「このコマンドは500ms以内に完了すべき」という宣言のみを持つ。

**結論**: `timeoutMs` をHookTranslationResultのオプションフィールドとして定義。タイムアウト制御はインフラ層に委譲。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 | 利用サービス |
|--------|------|------|------------|
| ReentryGuardStatePort | 外部→ドメイン | `stop_hook_active` フラグの読み書き（環境変数 or 一時ファイル） | ReentryGuard（エンティティ） |
| ImportAnalyzerPort | 外部→ドメイン | coreモジュールのimport解析（エージェント固有API参照チェック） | FallbackVerificationService |
| CliCommandRegistryPort | 外部→ドメイン | harness-apiのCLI Command Registryから有効なコマンド名一覧取得 | HookToCliTranslator |
| ConfigQueryPort | 外部→ドメイン | HarnessConfigV2からHook設定・保護対象ファイルパターン取得 | HookToCliTranslator |

---

## 6. ドメインモデル概要

### 所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| ReentryGuard | エンティティ | `stop_hook_active` フラグの状態遷移管理（activate/isActive/deactivate）。無限ループ防止の核心 |
| HookEvent | 値オブジェクト | Hook種別（PreToolUse/PostToolUse/Stop）+ ペイロードのUnion型VO |
| ProtectedFileList | 値オブジェクト | PreToolUseでブロック対象とするファイルパスパターンリスト（matches()メソッド付き） |
| HookTranslationResult | 値オブジェクト | HookEvent→CLIコマンド変換結果（shouldBlock/cliCommand?/cliArgs/expectedExitCode/skipReason?/timeoutMs?） |
| FallbackCapabilitySpec | 値オブジェクト | CLI/FSフォールバック仕様の宣言（supportedCommands[]/noAgentApiImports） |
| HookToCliTranslator | ドメインサービス | HookEvent→HookTranslationResult変換。Hook種別ごとの変換ルールを担う |
| FallbackVerificationService | ドメインサービス | FallbackCapabilitySpecに基づくcoreモジュールのエージェント非依存性検証 |

### 補助型

| 型 | 説明 |
|---|------|
| HookType | `'pre-tool-use' \| 'post-tool-use' \| 'stop'` |
| SkipReason | `'REENTRY_DETECTED' \| 'HOOK_DISABLED' \| 'TIMEOUT_EXCEEDED'` |

---

## 7. 不変条件（予定）

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | ReentryGuard | activate()はisActive()=falseの状態でのみ呼び出し可能（二重activateは不正） |
| INV-2 | HookTranslationResult | shouldBlock=trueの場合、cliCommandはundefined |
| INV-3 | HookTranslationResult | skipReasonが存在する場合、cliCommandはundefined |
| INV-4 | ProtectedFileList | patternsは1件以上（空リストは不正） |
| INV-5 | FallbackCapabilitySpec | supportedCommandsは1件以上 |

---

## 8. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: harness-api | CLI Command Registry（CommandName一覧）・Harness API Response DTOの確定が前提。Wave 2 Step 2で確定済み |
| 依存: harness-error | HarnessError型の確定が前提。Wave 1で実装済み |
| 依存: config-foundation | HarnessConfigV2の確定が前提。Wave 1で実装済み |
| リスク: ReentryGuardの永続化戦略 | 環境変数 vs 一時ファイルの選択はインフラ層の実装詳細だが、プロセス間での動作（並列Hook実行等）に影響する。ドメイン層はポートで隠蔽するが、実装時に選択が必要 |
| リスク: PostToolUse 500msタイムアウト | タイムアウト超過時のフォールバック動作（警告のみ vs Hookブロック vs スキップ）はH11-03の受け入れ基準で確認が必要 |
| リスク: FallbackVerificationServiceのテスト難易度 | coreモジュールのimport解析はビルドアーティファクトやTypeScript解析ツールへの依存が生じる可能性がある。ImportAnalyzerPortでインフラ依存を完全に分離することが重要 |

---

## 9. 承認

- [ ] 人間承認済み（Phase 2着手許可）
