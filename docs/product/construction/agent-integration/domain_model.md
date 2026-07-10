# ドメインモデル: agent-integration

@story-id H11-01
@story-id H11-02
@story-id H11-03
@story-id H11-04
@work-item-id WI-097
@story-id H11-06
@work-item-id WI-218
> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-28（ISSUE-001 issueパス認識追加）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H11-01〜H11-04, B-7
> **対応Issue**: ISSUE-001
> **v2.2.0変更**: フェーズゲート統合拡張（WriteTargetScope, ProjectPaths, PhaseGateQueryResult, PhaseGateQueryPort追加）
> **ISSUE-026 Phase C-2変更**: WriteTargetScope に `_cross/WI-*` パス認識を追加。`docs/inception/_cross/{WI-XXX}/` → Level 3 スコープ（`unitId="_cross"`）
> **WI-218変更**: WI入口の `description.md` は Phase 1 work として扱い、`docs/inception/_cross/{WI-XXX}/description.md` と `docs/inception/{unit}/{WI-XXX}/description.md` は Level 3 スコープにしない。
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
| HookSkipEvent | 値オブジェクト | hook skip observability の append-only record。`hookType`, `reason`, `targetPaths`, `timestamp` を保持し、`.phasegate/hook-skip-events.jsonl` に記録される。@work-item-id WI-166 |
| FullModeSession | 値オブジェクト | `mode`, `unit`, `workItemId`, `allowedCategories`, `reason`, `startedAt`, `expiresAt` を持つ hook-visible authorization marker。`.phasegate/session.json` に保存され、PreToolUse の full-mode-required 判定を TTL・unit・category で限定的に bypass する。@work-item-id WI-206 |
| FallbackCapabilitySpec | 値オブジェクト | CLI/FSフォールバック仕様の宣言（supportedCommands[]/noAgentApiImports） |
| WriteTargetScope | 値オブジェクト | ファイルパスから推定されたフェーズゲートスコープ。`level: 1\|2\|3`, `unitId?: string`, `storyId?: string` を保持。storyId は US ID / issue ID / WI ID を格納する（v2.2.0追加、ISSUE-026で `_cross/WI-*` 対応）。WI入口の `description.md` は Phase 1 work として扱う。@work-item-id WI-218 |
| ProjectPaths | 値オブジェクト | `phasegate.config.json` の `project.paths` セクションを型安全に保持。`source: string[]`, `docs.construction: string`, `docs.inception: string`（v2.2.0追加） |
| PhaseGateQueryResult | 値オブジェクト | フェーズゲート検査結果。`passed: boolean`, `blockers: string[]`, `warnings: string[]` を保持（v2.2.0追加） |
| HookToCliTranslator | ドメインサービス | HookEvent→HookTranslationResult変換。Hook種別ごとの変換ルールを担う。v2.2.0でPreToolUseにStep 2（フェーズゲートチェック）追加 |
| FallbackVerificationService | ドメインサービス | FallbackCapabilitySpecに基づくcoreモジュールのエージェント非依存性検証 |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | Hook Adapterのエラー出力にHarnessError型を使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | Hook有効/無効設定・保護対象ファイル設定・プロジェクトパス設定をConfigQueryPort経由で参照 | 読取専用 |

### 他Unitから受け取るCross-Unit Contract

| 型名 | 所有Unit | 利用目的 |
|------|---------|---------|
| CommandName | harness-api | HookTranslationResultのcliCommandフィールドで使用 |
| ExitCode | harness-api | HookTranslationResultのexpectedExitCodeフィールドで使用 |
| HarnessApiResponse | harness-api | infrastructure層でCLI実行後のレスポンス解析に使用（ドメイン層では不使用） |
| checkPhaseGateCommandHandler | phase-dependency-model | PhaseGateQueryAdapter経由でフェーズゲート検査を実行（v2.2.0追加） |

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
| WriteTargetScope | ✓ | ✓ | level: PhaseGateLevel, unitId?: string, storyId?: string。fromPath()静的ファクトリでファイルパスからスコープを推定。storyId は US ID / issue ID / WI ID を格納する。`docs/inception/_cross/WI-*` は横断WIの仮想unitとして `unitId="_cross"` を保持する（ISSUE-026 Phase C-2）。`docs/inception/_cross/{WI}/description.md` と `docs/inception/{unit}/{WI}/description.md` はPhase 1 scopeに解決する。@work-item-id WI-218 |
| ProjectPaths | ✓ | ✓ | source: string[]（1件以上必須）, docs.construction: string, docs.inception: string（v2.2.0追加） |
| PhaseGateQueryResult | ✓ | ✓ | passed: boolean, blockers: readonly string[], warnings: readonly string[]。passed=falseの場合blockers 1件以上必須（v2.2.0追加） |

### 補助型

| 型 | 説明 |
|---|------|
| HookType | `'pre-tool-use' \| 'post-tool-use' \| 'stop'` |
| SkipReason | `'REENTRY_DETECTED' \| 'HOOK_DISABLED' \| 'TIMEOUT_EXCEEDED'` |
| HookSkipEventRecord | `{ hookType: HookType, reason: SkipReason \| string, targetPaths: string[], timestamp: string }`。harness-api status と共有する JSON Lines record。@work-item-id WI-166 |
| PreToolUseEvent | `{ hookType: 'pre-tool-use', toolName: string, targetFilePaths: string[] }` |
| PostToolUseEvent | `{ hookType: 'post-tool-use', toolName: string, affectedFilePaths: string[] }` |
| StopEvent | `{ hookType: 'stop', sessionId: string }` |
| PhaseGateLevel | `1 \| 2 \| 3`（v2.2.0追加） |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| HookToCliTranslator | HookEvent → HookTranslationResult変換。Hook種別ごとの変換ルールを担う:<br>・PreToolUse Step 1: ProtectedFileList照合 → ブロック判定<br>・PreToolUse Step 2: WriteTargetScope推定 → PhaseGateQueryPort.checkGate() → フェーズゲートブロック判定（v2.2.0追加）<br>・PostToolUse: `phasegate:lint` / `phasegate:lint --fast` コマンド指定（timeoutMs: 500）<br>・Stop: ReentryGuard.isActive()チェック → `phasegate:complete-check` コマンド指定 | ReentryGuardStatePort, CliCommandRegistryPort, ConfigQueryPort, PhaseGateQueryPort |
| FallbackVerificationService | FallbackCapabilitySpecに基づくcoreモジュールのエージェント非依存性検証。violation時にHarnessError[]を返す | ImportAnalyzerPort |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス/エンティティ |
|---------|------|--------------------------|
| ReentryGuardStatePort | `stop_hook_active` フラグの読み書き（環境変数 or 一時ファイル） | ReentryGuard（エンティティ） |
| ImportAnalyzerPort | coreモジュールのimport解析（エージェント固有API参照チェック） | FallbackVerificationService |
| CliCommandRegistryPort | harness-apiのCLI Command Registryから有効なCommandName一覧取得 | HookToCliTranslator |
| ConfigQueryPort | HarnessConfigV2からHook有効/無効設定・保護対象ファイルパターン・プロジェクトパス取得。v2.2.0で `getProjectPaths(): ProjectPaths` 追加、`checkDesignDocsExist()` 削除 | HookToCliTranslator |
| PhaseGateQueryPort | phase-dependency-modelの `checkPhaseGate()` を呼び出す契約。`checkGate(scope: WriteTargetScope): Promise<PhaseGateQueryResult>`（v2.2.0追加） | HookToCliTranslator（AsyncHookToCliTranslator） |
| HookSkipEventRecorderPort | hook skip event を best-effort で append する。write failure は元 hook result を変更せず、必要なら debug log に限定する。@work-item-id WI-166 | HandlePostToolUseUseCase, HandleStopUseCase |
| FullModeSessionQueryPort | `.phasegate/session.json` から full-mode session を読み取り、現在の target paths / unit / dominant category が許可範囲内かを判定する。期限切れ・unit 不一致・カテゴリ不一致・不正 JSON は fail closed。@work-item-id WI-206 | HandlePreToolUseUseCase |
| FullModeRequirementQueryPort | 変更対象ファイル群が full-mode を要求するかを quick-mode に問い合わせる契約。hook payload から抽出した before/after content（Edit の `old_string`/`new_string`、Write の disk/new content）を渡し、コメントのみ差分を api 変更として誤って full-mode 要求しないようにする。content が無い場合は従来のパスベース判定に戻る（後方互換）。分類ルール自体は quick-mode 側の責務で、本 unit は hook 境界での content 受け渡しのみを担う。@work-item-id WI-015 | HandlePreToolUseUseCase |

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
| INV-6 | WriteTargetScope | `level`は1, 2, 3のいずれか |
| INV-7 | WriteTargetScope | `level=1`の場合、`unitId`と`storyId`はundefined |
| INV-8 | WriteTargetScope | `level=2`の場合、`unitId`は必須かつ`storyId`はundefined |
| INV-9 | WriteTargetScope | `level=3`の場合、`unitId`は必須 |
| INV-10 | ProjectPaths | `source`は1件以上のエントリを持つ |
| INV-11 | ProjectPaths | `docs.construction`と`docs.inception`は非空文字列 |
| INV-12 | PhaseGateQueryResult | `passed=false`の場合、`blockers`は1件以上 |

### HookToCliTranslatorの変換ルール

| HookEvent種別 | 変換ロジック | 出力 |
|--------------|------------|------|
| PreToolUseEvent | Step 1: ProtectedFileList.matches(targetFilePath)がtrueならブロック | `{ shouldBlock: true, cliCommand: undefined }` |
| PreToolUseEvent | Step 2: WriteTargetScope.fromPath()でスコープ推定 → PhaseGateQueryPort.checkGate()でゲート不通過ならブロック（v2.2.0追加） | `{ shouldBlock: true, cliCommand: undefined }` |
| PreToolUseEvent | Step 2: スコープ外（fromPath()がnull）またはゲート通過の場合 | `{ shouldBlock: false, cliCommand: undefined }` |
| PostToolUseEvent | ConfigQueryPort.isEnabled('post-tool-use')がfalseの場合 | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED' }` |
| PostToolUseEvent | 通常の場合 | `{ shouldBlock: false, cliCommand: 'phasegate:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }` |
| StopEvent | ReentryGuard.isActive()がtrueの場合 | `{ shouldBlock: false, skipReason: 'REENTRY_DETECTED' }` |
| StopEvent | 通常の場合 | `{ shouldBlock: false, cliCommand: 'phasegate:complete-check', cliArgs: [], expectedExitCode: 0 }` |

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
  ├── [PreToolUse]（v2.2.0 2-step flow）
  │   Step 1: ConfigQueryPort → 保護対象パターン取得
  │           ProtectedFileList.matches(targetFilePaths) → ブロック判定
  │           → shouldBlock=true の場合即return
  │   Step 2: ConfigQueryPort.getProjectPaths() → ProjectPaths取得
  │           WriteTargetScope.fromPath(filePath, projectPaths) → スコープ推定
  │           ※ fromPath() は以下のパスパターンを認識:
  │             - {source}/{unitId}/...                    → level=3, unitId
  │             - {inception}/{unitId}/{storyId}/...       → level=3, unitId, storyId（US）
  │             - {inception}/{unitId}/issues/{issueId}/...→ level=3, unitId, storyId=issueId（ISSUE-001追加）
  │             - {inception}/issues/{issueId}/...         → level=1（横断issue、ISSUE-001追加）
  │             - {inception}/_cross/{wiId}/description.md → level=1（WI-218追加）
  │             - {inception}/{unitId}/{wiId}/description.md → level=1（WI-218追加）
  │             - {inception}/_cross/{wiId}/...            → level=3, unitId="_cross", storyId=wiId（ISSUE-026 Phase C-2追加）
  │             - {inception}/_shared/...                  → level=1
  │             - {construction}/{unitId}/...              → level=2, unitId
  │           → scope=null（スコープ外）の場合: HookTranslationResult { shouldBlock: false }
  │           → scope!=null の場合: PhaseGateQueryPort.checkGate(scope)
  │              → !hasPassed(): HookTranslationResult { shouldBlock: true }
  │              → hasPassed():  HookTranslationResult { shouldBlock: false }
  │
  ├── [PostToolUse]
  │   ConfigQueryPort → Hook有効/無効チェック
  │   → HookTranslationResult { cliCommand: 'phasegate:lint', timeoutMs: 500 }
  │      または { skipReason: 'HOOK_DISABLED' }
  │
  └── [Stop]
      ReentryGuardStatePort → stop_hook_active フラグ読み取り
      ReentryGuard.isActive()
      → isActive=true: HookTranslationResult { skipReason: 'REENTRY_DETECTED' }
      → isActive=false:
          ReentryGuard.activate() → ReentryGuardStatePort（フラグ書き込み）
          HookTranslationResult { cliCommand: 'phasegate:complete-check' }
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

### D6: WriteTargetScopeをVOとして定義（v2.2.0）

ファイルパスからフェーズゲートスコープを推定する責務を `WriteTargetScope.fromPath()` 静的ファクトリメソッドに集約した。`WriteTargetClassifier` ドメインサービスの導入は検討したが、サービス化は過剰と判断しVOの静的メソッドで十分とした。`ProjectPaths` を引数に取ることで `phasegate.config.json` のパス設定に動的に対応する。

### D7: ConfigQueryPort.getProjectPaths()を同期メソッドとして定義（v2.2.0）

`getProjectPaths()` は `ProjectPaths` を同期的に返す。理由: `phasegate.config.json` は起動時に1回読み込みキャッシュするため、非同期にする必要がない。`isHookEnabled()` / `getProtectedFilePatterns()` が `Promise` を返すのは歴史的経緯であり、新規メソッドでは不要な非同期性を避けた。

### D8: PhaseGateQueryPortの動的importパターン（v2.2.0）

`PhaseGateQueryAdapter` は `await import('../../../phase-dependency-model/composition-root.js')` で phase-dependency-model を動的にロードする。validator-system の `PhaseDependencyPhaseGatePolicyAdapter` と同じパターンを踏襲し、静的import による循環依存を回避する。import失敗時は安全側（passed=true, warning付き）にフォールバックする。

### D9: AsyncHookToCliTranslatorのみにStep 2を追加（v2.2.0）

同期版 `HookToCliTranslator` にはStep 2（フェーズゲートチェック）を追加しない。理由: Step 2は `PhaseGateQueryPort.checkGate()` が非同期であるため、同期版では実装不可能。同期版はユニットテストでのみ使用されており、本番のpre-tool-use hookは全て `AsyncHookToCliTranslator` 経由で実行される。

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

- 集約なし・エンティティ1つ・VO7つ（v2.2.0で+3）・ドメインサービス2つの構成
- 「薄いAdapter層」の原則に従い、バリデーションロジックはharness-api側に委譲
- ReentryGuardのライフサイクルが1ファイルで完結する設計
- v2.2.0の追加VO（WriteTargetScope, ProjectPaths, PhaseGateQueryResult）は既存概念との結合度が低く、フェーズゲート機能のON/OFFに影響しない

### SOLID評価（v2.2.0追加分）

- **OCP**: PhaseGateQueryPortの追加により、フェーズゲート検査の実装を差し替え可能。既存のProtectedFileListブロック機構に手を入れずに拡張できた
- **ISP**: PhaseGateQueryPortは`checkGate()`の単一メソッドのみ。ConfigQueryPortに`getProjectPaths()`を追加したがインターフェース肥大化は最小限

**評価結果**: 問題なし。設計を確定する。

## 9. Stop Hook Command Execution Boundary

<!-- @work-item-id WI-203 -->

`phasegate:complete-check` is a canonical command identity owned by harness-api and consumed by agent-integration. The Stop hook invariant is that this command identity remains executable through the packaged PhaseGate CLI even when the downstream project has no `scripts/harness/cli/complete-check.ts` wrapper.

Failure classification has two meanings:

| Classification | Meaning | Stop hook strict-mode reason |
|---|---|---|
| Complete Check failure | The canonical command ran and validators or lint returned non-zero. | `Complete Check failed (exitCode=N)` |
| Execution wiring failure | The hook could not invoke the intended command path, e.g. a missing module or obsolete wrapper path. | `Complete Check execution failed (exitCode=N)` |

This boundary keeps project-specific command wrappers optional extension points rather than runtime prerequisites for the built-in Stop hook.
