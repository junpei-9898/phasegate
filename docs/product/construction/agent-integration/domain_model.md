# ドメインモデル: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H11-01〜H11-04
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| ReentryGuard | エンティティ | `stop_hook_active` フラグの状態遷移管理（activate/isActive/deactivate）。Stop Hook 無限ループ防止の核心 |
| HookEvent | 値オブジェクト | Hook種別（PreToolUse/PostToolUse/Stop）+ ペイロードのUnion型VO |
| ProtectedFileList | 値オブジェクト | PreToolUseでブロック対象とするファイルパスパターンリスト（matches()メソッド付き） |
| HookTranslationResult | 値オブジェクト | HookEvent→CLIコマンド変換結果（shouldBlock/cliCommand?/cliArgs/expectedExitCode/skipReason?/timeoutMs?） |
| FallbackCapabilitySpec | 値オブジェクト | CLI/FSフォールバック仕様の宣言（supportedCommands[]/noAgentApiImports） |
| HookToCliTranslator | ドメインサービス | HookEvent→HookTranslationResult変換。Hook種別ごとの変換ルールを担う |
| FallbackVerificationService | ドメインサービス | FallbackCapabilitySpecに基づくcoreモジュールのエージェント非依存性検証 |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | Hook Adapterのエラー出力にHarnessError型を使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | Hook有効/無効設定・保護対象ファイル設定をConfigQueryPort経由で参照 | 読取専用 |

### 他Unitから受け取るCross-Unit Contract

| 型名 | 所有Unit | 利用目的 |
|------|---------|---------|
| CommandName | harness-api | HookTranslationResultのcliCommandフィールドで使用 |
| ExitCode | harness-api | HookTranslationResultのexpectedExitCodeフィールドで使用 |
| HarnessApiResponse | harness-api | infrastructure層でCLI実行後のレスポンス解析に使用（ドメイン層では不使用） |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| FallbackCapabilitySpec Contract | regression-suite | CLI/FSフォールバック仕様宣言（K14/K15回帰テストが検証するエージェント非依存性保証） |

---

## 2. Aggregate Boundary

### 結論: 集約なし + エンティティ1つ（ReentryGuard）

横断契約§6の集約降格方針を参照しつつ、以下の分析によりエンティティ1つ＋VOのみの構成とした。

### ReentryGuardをエンティティとして維持する根拠

- **状態遷移**: `stop_hook_active` フラグは Stop Hook 実行中に `inactive → active → inactive` という明確な状態遷移を持つ
- **ライフサイクル**: `activate() → isActive() → deactivate()` のメソッド連鎖がライフサイクルを表現しており、純粋なVOでは表現できない
- **ビジネスルール**: H11-04の「無限ループ防止」という重要なビジネスルールをカプセル化する責務がある

### 集約ルートにしない根拠

- ReentryGuardは単一インスタンス（プロセス全体で1つ）であり、他のエンティティを内包しない
- 横断契約§6の集約降格は集約ルートを持つ複合構造に対するものであり、単純なエンティティの採用は許容される

### 「薄いAdapter層」としての構成

agent-integrationはunit定義§1/§8が示す通り「薄いAdapter層」であり、ステートレスな変換処理（HookEvent → CLIコマンド）とReentryGuardのみを持つシンプルなドメインモデルとなる。

---

## 3. Model Classification

### エンティティ

| エンティティ | 識別子 | ライフサイクル |
|------------|--------|--------------|
| ReentryGuard | — （プロセス単一インスタンス） | Stop Hook開始でactivate、完了でdeactivate。ReentryGuardStatePort経由で状態永続化 |

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| HookEvent | ✓ | ✓ | Union型: PreToolUseEvent \| PostToolUseEvent \| StopEvent |
| ProtectedFileList | ✓ | ✓ | patterns: string[]（1件以上必須）+ matches(filePath: string): boolean |
| HookTranslationResult | ✓ | ✓ | shouldBlock: boolean, cliCommand?: CommandName, cliArgs: string[], expectedExitCode: ExitCode, skipReason?: SkipReason, timeoutMs?: number |
| FallbackCapabilitySpec | ✓ | ✓ | supportedCommands: CommandName[]（1件以上必須）, noAgentApiImports: boolean |

### 補助型

| 型 | 説明 |
|---|------|
| HookType | `'pre-tool-use' \| 'post-tool-use' \| 'stop'` |
| SkipReason | `'REENTRY_DETECTED' \| 'HOOK_DISABLED' \| 'TIMEOUT_EXCEEDED'` |
| PreToolUseEvent | `{ hookType: 'pre-tool-use', toolName: string, targetFilePaths: string[] }` |
| PostToolUseEvent | `{ hookType: 'post-tool-use', toolName: string, affectedFilePaths: string[] }` |
| StopEvent | `{ hookType: 'stop', sessionId: string }` |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| HookToCliTranslator | HookEvent → HookTranslationResult変換。Hook種別ごとの変換ルールを担う:<br>・PreToolUse: ProtectedFileList照合 → ブロック判定<br>・PostToolUse: `harness:lint` / `harness:lint --fast` コマンド指定（timeoutMs: 500）<br>・Stop: ReentryGuard.isActive()チェック → `harness:complete-check` コマンド指定 | ReentryGuardStatePort, CliCommandRegistryPort, ConfigQueryPort |
| FallbackVerificationService | FallbackCapabilitySpecに基づくcoreモジュールのエージェント非依存性検証。violation時にHarnessError[]を返す | ImportAnalyzerPort |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス/エンティティ |
|---------|------|--------------------------|
| ReentryGuardStatePort | `stop_hook_active` フラグの読み書き（環境変数 or 一時ファイル） | ReentryGuard（エンティティ） |
| ImportAnalyzerPort | coreモジュールのimport解析（エージェント固有API参照チェック） | FallbackVerificationService |
| CliCommandRegistryPort | harness-apiのCLI Command Registryから有効なCommandName一覧取得 | HookToCliTranslator |
| ConfigQueryPort | HarnessConfigV2からHook有効/無効設定・保護対象ファイルパターン取得 | HookToCliTranslator |

---

## 5. Domain Rules and Invariants

### 不変条件

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | ReentryGuard | `activate()`はisActive()=falseの状態でのみ呼び出し可能（二重activateはHarnessErrorを発生） |
| INV-2 | HookTranslationResult | `shouldBlock=true`の場合、`cliCommand`はundefined |
| INV-3 | HookTranslationResult | `skipReason`が存在する場合、`cliCommand`はundefined |
| INV-4 | ProtectedFileList | `patterns`は1件以上（空リストは不正） |
| INV-5 | FallbackCapabilitySpec | `supportedCommands`は1件以上 |

### HookToCliTranslatorの変換ルール

| HookEvent種別 | 変換ロジック | 出力 |
|--------------|------------|------|
| PreToolUseEvent | ProtectedFileList.matches(targetFilePath)がtrueならブロック | `{ shouldBlock: true, cliCommand: undefined }` |
| PreToolUseEvent | 保護対象外ファイルの場合 | `{ shouldBlock: false, cliCommand: undefined }` |
| PostToolUseEvent | ConfigQueryPort.isEnabled('post-tool-use')がfalseの場合 | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED' }` |
| PostToolUseEvent | 通常の場合 | `{ shouldBlock: false, cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }` |
| StopEvent | ReentryGuard.isActive()がtrueの場合 | `{ shouldBlock: false, skipReason: 'REENTRY_DETECTED' }` |
| StopEvent | 通常の場合 | `{ shouldBlock: false, cliCommand: 'harness:complete-check', cliArgs: [], expectedExitCode: 0 }` |

**PostToolUse timeoutMs**: 500ms固定。infrastructure層のCliExecutorPortがこの値を使ってタイムアウト制御を実施する。ドメイン層は「このコマンドは500ms以内に完了すべき」という宣言のみを持つ。

### ReentryGuardのライフサイクル

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

永続化はReentryGuardStatePort（環境変数 or `$TMPDIR/stop_hook_active` ファイル）に委譲。ドメイン層は状態遷移ロジックのみ。

### FallbackVerificationServiceの責務

- `FallbackCapabilitySpec.noAgentApiImports=true` の場合: ImportAnalyzerPortでcoreモジュールがエージェント固有API（`@anthropic-ai/claude-code`等）をimportしていないことを確認
- `FallbackCapabilitySpec.supportedCommands` に記載のCommandNameが全てCliCommandRegistryPortに存在することを確認
- violation検出時: HarnessError[]を返す（どのモジュールがどのAPIをimportしているか、どのCommandNameが未登録かを含む）

---

## 6. Data Flow

```
[Claude Code Hook イベント入力]
  PreToolUse  { toolName, targetFilePaths }
  PostToolUse { toolName, affectedFilePaths }
  Stop        { sessionId }
         ↓
HookToCliTranslator.translate(hookEvent)
  ├── [PreToolUse]
  │   ConfigQueryPort → 保護対象パターン取得
  │   ProtectedFileList.matches(targetFilePaths) → ブロック判定
  │   → HookTranslationResult { shouldBlock: true/false }
  │
  ├── [PostToolUse]
  │   ConfigQueryPort → Hook有効/無効チェック
  │   → HookTranslationResult { cliCommand: 'harness:lint', timeoutMs: 500 }
  │      または { skipReason: 'HOOK_DISABLED' }
  │
  └── [Stop]
      ReentryGuardStatePort → stop_hook_active フラグ読み取り
      ReentryGuard.isActive()
      → isActive=true: HookTranslationResult { skipReason: 'REENTRY_DETECTED' }
      → isActive=false:
          ReentryGuard.activate() → ReentryGuardStatePort（フラグ書き込み）
          HookTranslationResult { cliCommand: 'harness:complete-check' }
         ↓
[infrastructure層 Hook Adapter]
  CliExecutorPort → HookTranslationResult.cliCommand 実行
  → HarnessApiResponse<T> 取得・解析
  → Stop完了時: ReentryGuard.deactivate() → ReentryGuardStatePort（フラグクリア）

[H11-01 CLI/FSフォールバック保証]
FallbackVerificationService.verify(spec)
  → ImportAnalyzerPort → coreモジュールのimport解析
  → CliCommandRegistryPort → 登録コマンド確認
  → violation: HarnessError[]
  → 正常: FallbackCapabilitySpec（検証済み）
```

---

## 7. 設計判断記録

### D1: ReentryGuardをエンティティとして維持した理由

横断契約§6の集約降格方針を参照しつつも、ReentryGuardは「active/inactive状態遷移 + activate/isActive/deactivateライフサイクル」を持つため、純粋なVOへの降格は不適切と判断した。Stop Hook実行中の状態を表現するには明確な状態遷移モデルが必要であり、これは「データとしての等値性」ではなく「同一インスタンスの状態変化」を表現する。

### D2: 集約ルートなしの判断

ReentryGuardは単一インスタンスであり他のエンティティを内包しない。その他の概念（HookEvent/ProtectedFileList/HookTranslationResult/FallbackCapabilitySpec）は全てステートレスなVOである。複合的なライフサイクル管理が不要なため、集約ルートは不要と判断した。

### D3: ProtectedFileListのデフォルトパターンをドメイン層にハードコード

デフォルト保護対象パターン（`biome.json`, `.biome.json`, `tsconfig.json`, `package.json`）はリンター設定ファイルとして常に保護すべき業務ルールであるため、ドメイン層にハードコードする。追加パターンはConfigQueryPort経由でHarnessConfigV2から取得可能（拡張ポイント）。

### D4: FallbackVerificationServiceのドメインサービス化

H11-01のcoreモジュールimport解析は「何を検証すべきか（エージェント非依存性ルール）」はドメイン関心事、「どう解析するか（ASTパース等）」はインフラ関心事として分離した。FallbackVerificationServiceがドメインルール（FallbackCapabilitySpec）を保持し、実際の解析はImportAnalyzerPortに委譲する。

### D5: timeoutMsをHookTranslationResultのフィールドとして定義

500msタイムアウトはH11-03の受け入れ基準で定義された業務要件（「PostToolUse Hookは500ms以内に完了すべき」）であり、ドメイン層での宣言的定義が適切。実際のタイムアウト制御はinfrastructure層のCliExecutorPort実装が担う。

---

## 8. 品質評価（engineering-perspective）

### ドメインスメルチェック

- **責務混在**: HookToCliTranslatorは変換ロジックのみを担い、CLI実行はCliExecutorPortに委譲 → 問題なし
- **不適切なVO**: ReentryGuardの状態遷移をエンティティとして維持し、VOに落とし込まない → 正当な判断
- **言語の乖離**: HookEvent/HookTranslationResult/ReentryGuardはClaude Code Hook仕様のユビキタス言語に準拠 → 問題なし
- **境界不明確**: CliCommandRegistryPortによりharness-apiのCommandName参照をポート経由に限定 → 境界明確

### SOLID評価

- **SRP**: HookToCliTranslatorが変換、FallbackVerificationServiceが検証、ReentryGuardが状態管理に単一化 → 遵守
- **依存方向**: ドメイン層がポートを定義し、infrastructure層がPortを実装（外向き依存） → 遵守
- **インターフェース分離**: ReentryGuardStatePort/ImportAnalyzerPort/CliCommandRegistryPort/ConfigQueryPortが適切に分離 → 遵守

### シンプルさ評価

- 集約なし・エンティティ1つ・VO4つ・ドメインサービス2つのシンプルな構成
- 「薄いAdapter層」の原則に従い、バリデーションロジックはharness-api側に委譲
- ReentryGuardのライフサイクルが1ファイルで完結する設計

**評価結果**: 問題なし。設計を確定する。
