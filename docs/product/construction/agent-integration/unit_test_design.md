# ユニットテスト設計: agent-integration

@story-id H11-01
@story-id H11-02
@story-id H11-03
@story-id H11-04
@work-item-id WI-097
> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H11-01〜H11-04
> **対応Issue**: ISSUE-001
> **前提ドキュメント**: `docs/product/construction/agent-integration/domain_model.md`

---

## 1. 対象ドメインモデル

- **エンティティ**: ReentryGuard
- **値オブジェクト**: HookEvent、ProtectedFileList、HookTranslationResult、FallbackCapabilitySpec、WriteTargetScope（v2.2.0）、ProjectPaths（v2.2.0）、PhaseGateQueryResult（v2.2.0）
- **ドメインサービス**: HookToCliTranslator、FallbackVerificationService

---

## 2. エンティティテストケース

### ReentryGuard

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RG-001 | 新規インスタンス生成（引数なし） | isActive() = false（初期状態はinactive） |

#### ビジネスルールテスト（状態遷移）

| ケースID | 初期状態 | 操作 | 期待状態 |
|---------|---------|------|---------|
| UT-RG-010 | inactive | activate() を呼び出す | isActive() = true |
| UT-RG-011 | active | deactivate() を呼び出す | isActive() = false |
| UT-RG-012 | inactive | deactivate() を呼び出す | isActive() = false（冪等性: エラーなし） |
| UT-RG-013 | active | isActive() を呼び出す | true を返す |
| UT-RG-014 | inactive | isActive() を呼び出す | false を返す |

#### 不変条件テスト（INV-1: 二重activate禁止）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-RG-020 | INV-1: active状態でactivate()は禁止 | active状態でactivate()を呼び出す | HarnessError がthrowされる |
| UT-RG-021 | INV-1: メッセージ内容 | active状態でactivate()を呼び出す | エラーメッセージに「二重activate」「ReentryGuard」等の識別情報が含まれる |

#### 状態遷移シーケンステスト

| ケースID | 操作シーケンス | 期待結果 |
|---------|-------------|---------|
| UT-RG-030 | activate() → deactivate() → activate() | 2回目のactivate()が成功し isActive() = true |
| UT-RG-031 | activate() → activate() | 2回目でHarnessError がthrow（UT-RG-020と同義、シーケンス視点） |

---

## 3. 値オブジェクトテストケース

### HookEvent

#### 生成テスト（各Unionバリアント）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HE-001 | `{ hookType: 'pre-tool-use', toolName: 'Write', targetFilePaths: ['src/index.ts'] }` | PreToolUseEvent として生成される |
| UT-HE-002 | `{ hookType: 'post-tool-use', toolName: 'Write', affectedFilePaths: ['src/index.ts'] }` | PostToolUseEvent として生成される |
| UT-HE-003 | `{ hookType: 'stop', sessionId: 'sess-001' }` | StopEvent として生成される |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HE-010 | 同一プロパティを持つ2つのPreToolUseEventを比較 | 等値（値等価性） |
| UT-HE-011 | hookTypeが異なる2つのHookEventを比較 | 非等値 |
| UT-HE-012 | targetFilePathsの順序が異なる2つのPreToolUseEventを比較 | 非等値（順序依存） |

#### 制約テスト（不正入力）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HE-020 | `hookType: 'unknown'`（未定義のHookType） | HarnessError または型エラーがthrowされる |
| UT-HE-021 | PreToolUseEventで `targetFilePaths: []`（空配列） | 生成成功（空配列は許容） |

---

### ProtectedFileList

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PFL-001 | `patterns: ['biome.json', 'tsconfig.json']`（2件） | 生成成功 |
| UT-PFL-002 | `patterns: ['biome.json']`（1件、最小有効） | 生成成功 |

#### 制約テスト（INV-4: patternsは1件以上）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PFL-010 | `patterns: []`（空配列） | HarnessError がthrowされる |
| UT-PFL-011 | `patterns: []` のエラーメッセージ | 「patternsは1件以上」等の識別情報が含まれる |

#### matches()メソッドテスト（正常系）

| ケースID | patterns | 入力filePath | 期待結果 |
|---------|---------|------------|---------|
| UT-PFL-020 | `['biome.json']` | `'biome.json'` | true（完全一致） |
| UT-PFL-021 | `['biome.json']` | `'tsconfig.json'` | false（不一致） |
| UT-PFL-022 | `['.biome.json', 'tsconfig.json', 'package.json']` | `'package.json'` | true（複数パターンのうち1件一致） |
| UT-PFL-023 | `['biome.json']` | `'src/biome.json'` | false（パスプレフィックスあり・完全一致なら不一致） |
| UT-PFL-024 | `['**/*.json']` | `'src/config.json'` | true（globパターン一致） |
| UT-PFL-025 | `['**/*.json']` | `'src/config.ts'` | false（glob不一致） |

#### matches()メソッドテスト（境界値）

| ケースID | patterns | 入力filePath | 期待結果 |
|---------|---------|------------|---------|
| UT-PFL-030 | `['biome.json']` | `''`（空文字） | false |
| UT-PFL-031 | `['biome.json']` | `'BIOME.JSON'`（大文字） | false（大文字小文字区別） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-PFL-040 | 同一patternsを持つ2つのProtectedFileListを比較 | 等値 |
| UT-PFL-041 | パターン順序が異なる2つのProtectedFileListを比較 | 非等値（順序依存） |

---

### HookTranslationResult

#### 生成テスト（正常系）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HTR-001 | `{ shouldBlock: true, cliArgs: [], expectedExitCode: 1 }`（ブロック結果） | 生成成功 |
| UT-HTR-002 | `{ shouldBlock: false, cliCommand: 'phasegate:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }` | 生成成功 |
| UT-HTR-003 | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED', cliArgs: [], expectedExitCode: 0 }` | 生成成功 |
| UT-HTR-004 | `{ shouldBlock: false, skipReason: 'REENTRY_DETECTED', cliArgs: [], expectedExitCode: 0 }` | 生成成功 |
| UT-HTR-005 | `{ shouldBlock: false, cliCommand: 'phasegate:complete-check', cliArgs: [], expectedExitCode: 0 }`（timeoutMs省略） | 生成成功（timeoutMs = undefined） |

#### 不変条件テスト（INV-2: shouldBlock=trueならcliCommandはundefined）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HTR-010 | INV-2 | `{ shouldBlock: true, cliCommand: 'phasegate:lint', cliArgs: [], expectedExitCode: 0 }` | HarnessError がthrowされる |
| UT-HTR-011 | INV-2 エラーメッセージ | 同上 | 「shouldBlock=trueのときcliCommandは設定不可」等の識別情報が含まれる |

#### 不変条件テスト（INV-3: skipReasonがあるならcliCommandはundefined）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HTR-020 | INV-3 | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED', cliCommand: 'phasegate:lint', cliArgs: [], expectedExitCode: 0 }` | HarnessError がthrowされる |
| UT-HTR-021 | INV-3 エラーメッセージ | 同上 | 「skipReasonがある場合cliCommandは設定不可」等の識別情報が含まれる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HTR-030 | 同一フィールドを持つ2つのHookTranslationResultを比較 | 等値 |
| UT-HTR-031 | cliArgsの内容が異なる2つのHookTranslationResultを比較 | 非等値 |

---

### FallbackCapabilitySpec

#### 生成テスト（正常系）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-FCS-001 | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true }` | 生成成功 |
| UT-FCS-002 | `{ supportedCommands: ['phasegate:lint', 'phasegate:complete-check'], noAgentApiImports: false }` | 生成成功 |
| UT-FCS-003 | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true }`（supportedCommands 1件、最小有効） | 生成成功 |

#### 制約テスト（INV-5: supportedCommandsは1件以上）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-FCS-010 | `{ supportedCommands: [], noAgentApiImports: true }` | HarnessError がthrowされる |
| UT-FCS-011 | `{ supportedCommands: [] }` のエラーメッセージ | 「supportedCommandsは1件以上」等の識別情報が含まれる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-FCS-020 | 同一フィールドを持つ2つのFallbackCapabilitySpecを比較 | 等値 |
| UT-FCS-021 | noAgentApiImportsが異なる2つのFallbackCapabilitySpecを比較 | 非等値 |

---

## 4. ドメインサービステストケース

### HookToCliTranslator

> **モック対象ポート**: ConfigQueryPort、ReentryGuardStatePort（ReentryGuard経由）、CliCommandRegistryPort

#### PreToolUseEventの変換テスト

| ケースID | 前提条件（ポートモック） | 入力HookEvent | 期待HookTranslationResult |
|---------|-------------------|-------------|--------------------------|
| UT-HTC-001 | ProtectedFileList.matches(targetFilePath) = true | `PreToolUseEvent { toolName: 'Write', targetFilePaths: ['biome.json'] }` | `{ shouldBlock: true, cliCommand: undefined }` |
| UT-HTC-002 | ProtectedFileList.matches(targetFilePath) = false | `PreToolUseEvent { toolName: 'Write', targetFilePaths: ['src/app.ts'] }` | `{ shouldBlock: false, cliCommand: undefined }` |
| UT-HTC-003 | targetFilePathsが複数あり、うち1件がprotected | `PreToolUseEvent { targetFilePaths: ['src/app.ts', 'biome.json'] }` | `{ shouldBlock: true }`（1件でもmatchすればブロック） |
| UT-HTC-004 | targetFilePathsが空配列 | `PreToolUseEvent { targetFilePaths: [] }` | `{ shouldBlock: false }`（照合対象なし、ブロックしない） |

#### PostToolUseEventの変換テスト

| ケースID | 前提条件（ポートモック） | 入力HookEvent | 期待HookTranslationResult |
|---------|-------------------|-------------|--------------------------|
| UT-HTC-010 | ConfigQueryPort.isEnabled('post-tool-use') = true | `PostToolUseEvent { toolName: 'Write', affectedFilePaths: ['src/app.ts'] }` | `{ shouldBlock: false, cliCommand: 'phasegate:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }` |
| UT-HTC-011 | ConfigQueryPort.isEnabled('post-tool-use') = false | `PostToolUseEvent { toolName: 'Write', affectedFilePaths: ['src/app.ts'] }` | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED' }` |

#### StopEventの変換テスト

| ケースID | 前提条件（ポートモック） | 入力HookEvent | 期待HookTranslationResult |
|---------|-------------------|-------------|--------------------------|
| UT-HTC-020 | ReentryGuard.isActive() = false | `StopEvent { sessionId: 'sess-001' }` | `{ shouldBlock: false, cliCommand: 'phasegate:complete-check', cliArgs: [], expectedExitCode: 0 }` |
| UT-HTC-021 | ReentryGuard.isActive() = true | `StopEvent { sessionId: 'sess-001' }` | `{ shouldBlock: false, skipReason: 'REENTRY_DETECTED' }` |

#### 異常系テスト

| ケースID | 前提条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HTC-030 | CliCommandRegistryPortが指定コマンドを返さない（未登録） | `PostToolUseEvent`（通常） | HarnessError がthrowされる（コマンド未登録エラー） |

---

### FallbackVerificationService

> **モック対象ポート**: ImportAnalyzerPort、CliCommandRegistryPort

#### verify()正常系テスト

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-001 | ImportAnalyzerPort: エージェントAPIのimportなし、CliCommandRegistryPort: 全コマンド登録済み | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true }` | HarnessError[] = []（violations なし） |
| UT-FVS-002 | noAgentApiImports = false（importチェックスキップ）、CliCommandRegistryPort: 全コマンド登録済み | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: false }` | HarnessError[] = []（violations なし） |

#### verify()violation検出テスト（importチェック）

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-010 | ImportAnalyzerPort: `@anthropic-ai/claude-code` のimportを検出 | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true }` | HarnessError[]に1件以上のviolation（どのモジュールがどのAPIをimportしているか含む） |
| UT-FVS-011 | ImportAnalyzerPort: 複数モジュールでエージェントAPI使用 | `{ noAgentApiImports: true, ... }` | HarnessError[]に複数のviolation（モジュールごとに1件） |
| UT-FVS-012 | noAgentApiImports = falseの場合 | `{ noAgentApiImports: false, ... }`（importあっても） | importチェックはスキップされHarnessError[] = [] |

#### verify()violation検出テスト（commandName存在確認）

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-020 | CliCommandRegistryPort: `phasegate:lint` は登録済みだが `harness:unknown` は未登録 | `{ supportedCommands: ['phasegate:lint', 'harness:unknown'], noAgentApiImports: false }` | HarnessError[]に1件のviolation（`harness:unknown` が未登録） |
| UT-FVS-021 | CliCommandRegistryPort: 全コマンド未登録 | `{ supportedCommands: ['phasegate:lint', 'phasegate:complete-check'], noAgentApiImports: false }` | HarnessError[]に2件のviolation |

#### verify()複合violation検出テスト

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-030 | ImportAnalyzerPort: importあり、CliCommandRegistryPort: コマンド未登録 | `{ supportedCommands: ['harness:unknown'], noAgentApiImports: true }` | HarnessError[]に複数種別のviolation（importエラー + commandエラー） |

---

## ISSUE-001追加分: WriteTargetScope（issueパス認識）

> **対応Issue**: ISSUE-001
> **対象VO**: WriteTargetScope（`fromPath()` の issueパス認識拡張）
> **前提**: `docs/product/construction/agent-integration/domain_model.md` ISSUE-001変更セクション、`docs/inception/issues/ISSUE-001/logical_design.md` セクション3.3

---

### WriteTargetScope: fromPath() issueパス認識テスト

#### Unit固有issueパスの認識テスト

| ケースID | 入力filePath | ProjectPaths | 期待結果 |
|---------|------------|-------------|---------|
| UT-WTS-I001 | `'docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'` | デフォルト（inception=`docs/inception`） | `WriteTargetScope { level: 3, unitId: 'agent-integration', storyId: 'ISSUE-001' }` |
| UT-WTS-I002 | `'docs/inception/phase-dependency-model/issues/ISSUE-002/tdd_implementation_plan.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'phase-dependency-model', storyId: 'ISSUE-002' }` |
| UT-WTS-I003 | `'docs/inception/agent-integration/issues/BUG-03/scenario_test_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'agent-integration', storyId: 'BUG-03' }` |

#### 横断的issueパスの認識テスト

| ケースID | 入力filePath | ProjectPaths | 期待結果 |
|---------|------------|-------------|---------|
| UT-WTS-I010 | `'docs/inception/issues/ISSUE-001/issue_description.md'` | デフォルト | `WriteTargetScope { level: 1 }`（フェーズゲート不適用） |
| UT-WTS-I011 | `'docs/inception/issues/ISSUE-001/logical_design.md'` | デフォルト | `WriteTargetScope { level: 1 }`（フェーズゲート不適用） |
| UT-WTS-I012 | `'docs/inception/issues/ISSUE-002/tdd_implementation_plan.md'` | デフォルト | `WriteTargetScope { level: 1 }`（横断的issueは常にLevel 1） |

#### 既存USパスとの後方互換テスト

| ケースID | 入力filePath | ProjectPaths | 期待結果 |
|---------|------------|-------------|---------|
| UT-WTS-I020 | `'docs/inception/agent-integration/H11-05/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'agent-integration', storyId: 'H11-05' }`（変更なし） |
| UT-WTS-I021 | `'docs/inception/some-unit/HF1-06/scenario_test_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'HF1-06' }`（変更なし） |

#### カスタムProjectPathsでのissueパス認識テスト

| ケースID | 入力filePath | ProjectPaths | 期待結果 |
|---------|------------|-------------|---------|
| UT-WTS-I030 | `'custom/inception/my-unit/issues/ISSUE-001/logical_design.md'` | inception=`custom/inception` | `WriteTargetScope { level: 3, unitId: 'my-unit', storyId: 'ISSUE-001' }` |
| UT-WTS-I031 | `'custom/inception/issues/ISSUE-001/issue_description.md'` | inception=`custom/inception` | `WriteTargetScope { level: 1 }`（横断的issue） |

#### 境界値テスト（issueパス）

> **設計根拠**: `write-target-scope.ts` の `fromPath()` 実装を基に期待値を確定。`normalize()` は `//` を `/` に正規化し、末尾 `/` を除去する。inceptionMatch の結果が `[unitId, "issues", issueId, ...]` パターンの場合、issueId が WORK_ITEM_ID_PATTERN にマッチしなければ level=2（unitId のみ）にフォールバックする。

| ケースID | 入力filePath | ProjectPaths | 期待結果 |
|---------|------------|-------------|---------|
| UT-WTS-I040 | `'docs/inception/agent-integration/issues/'`（issueIdなし） | デフォルト | `WriteTargetScope { level: 2, unitId: 'agent-integration' }` — 末尾スラッシュ正規化後 `issues` が storyId 位置になるが WORK_ITEM_ID_PATTERN 不マッチのため level=2 フォールバック |
| UT-WTS-I041 | `'docs/inception/agent-integration/issues/invalid/logical_design.md'`（issueIdがWORK_ITEM_ID_PATTERNにマッチしない） | デフォルト | `WriteTargetScope { level: 2, unitId: 'agent-integration' }` — `invalid` は WORK_ITEM_ID_PATTERN 不マッチのため storyId なしで level=2 フォールバック |
| UT-WTS-I042 | `'docs/inception/agent-integration/issues/123-456/logical_design.md'`（先頭が大文字アルファベットでない） | デフォルト | `WriteTargetScope { level: 2, unitId: 'agent-integration' }` — `123-456` は先頭非大文字のため WORK_ITEM_ID_PATTERN 不マッチ、level=2 フォールバック |
| UT-WTS-I043 | `'docs/inception//issues/ISSUE-001/logical_design.md'`（unitId空セグメント） | デフォルト | `WriteTargetScope { level: 1 }` — `normalize()` が `//` を `/` に正規化し、パスは `docs/inception/issues/ISSUE-001/logical_design.md`（横断的issueパス）として解釈される |

---

### WriteTargetScope: WORK_ITEM_ID_PATTERN 間接検証テスト

> **変更内容**: `STORY_ID_PATTERN = /^[A-Z]+\d+-\d+$/` を `WORK_ITEM_ID_PATTERN = /^[A-Z][\w]+-\d+$/` に変更
> **テスト方針**: パターン定数は private のため、`fromPath()` 経由で間接的に検証する。各IDをinceptionパス内のstoryId位置に配置し、level=3（storyId付き）で解決されるか level=2（storyIdなし）にフォールバックするかで判定する。

#### マッチするIDパターン（fromPath() 経由で level=3, storyId 付きになること）

| ケースID | 入力filePath | ProjectPaths | 期待結果 | 備考 |
|---------|------------|-------------|---------|------|
| UT-WTS-P001 | `'docs/inception/some-unit/ISSUE-001/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'ISSUE-001' }` | issue ID（新規対応） |
| UT-WTS-P002 | `'docs/inception/some-unit/H11-05/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'H11-05' }` | 既存US ID（後方互換） |
| UT-WTS-P003 | `'docs/inception/some-unit/HF1-06/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'HF1-06' }` | 既存US ID（後方互換） |
| UT-WTS-P004 | `'docs/inception/some-unit/BUG-03/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'BUG-03' }` | バグID |
| UT-WTS-P005 | `'docs/inception/some-unit/TASK-1/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'TASK-1' }` | 汎用work-item ID |
| UT-WTS-P006 | `'docs/inception/some-unit/A1-1/logical_design.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: 'some-unit', storyId: 'A1-1' }` | 最短有効パターン |

#### マッチしないIDパターン（fromPath() 経由で storyId なし = level=2 にフォールバックすること）

| ケースID | 入力filePath | ProjectPaths | 期待結果 | 備考 |
|---------|------------|-------------|---------|------|
| UT-WTS-P010 | `'docs/inception/some-unit/invalid/logical_design.md'` | デフォルト | `WriteTargetScope { level: 2, unitId: 'some-unit' }` — storyId なし | 小文字のみ、ハイフン+数字なし |
| UT-WTS-P011 | `'docs/inception/some-unit/123-456/logical_design.md'` | デフォルト | `WriteTargetScope { level: 2, unitId: 'some-unit' }` — storyId なし | 先頭が大文字アルファベットでない |
| UT-WTS-P012 | `'docs/inception/some-unit//logical_design.md'` | デフォルト | `WriteTargetScope { level: 2, unitId: 'some-unit' }` — storyId なし（正規化で空セグメント除去） | 空文字相当 |
| UT-WTS-P013 | `'docs/inception/some-unit/issue-001/logical_design.md'` | デフォルト | `WriteTargetScope { level: 2, unitId: 'some-unit' }` — storyId なし | 先頭が小文字 |
| UT-WTS-P014 | `'docs/inception/some-unit/-001/logical_design.md'` | デフォルト | `WriteTargetScope { level: 2, unitId: 'some-unit' }` — storyId なし | 先頭がハイフン |
| UT-WTS-P015 | `'docs/inception/some-unit/ISSUE/logical_design.md'` | デフォルト | `WriteTargetScope { level: 2, unitId: 'some-unit' }` — storyId なし | ハイフン+数字がない |

---

## ISSUE-026 Phase C-2追加分: WriteTargetScope（_cross/WIパス認識）

> **対応Story**: H11-06
> **対象VO**: WriteTargetScope（`fromPath()` の `_cross/WI-*` パス認識拡張）

| ケースID | 入力filePath | ProjectPaths | 期待結果 |
|---------|------------|-------------|---------|
| UT-WTS-WI001 | `'docs/inception/_cross/WI-026/description.md'` | デフォルト | `WriteTargetScope { level: 3, unitId: '_cross', storyId: 'WI-026' }` |
| UT-WTS-WI002 | `'custom/inception/_cross/WI-026/description.md'` | inception=`custom/inception` | `WriteTargetScope { level: 3, unitId: '_cross', storyId: 'WI-026' }` |
| UT-WTS-WI003 | `'docs/inception/_cross/memo.md'` | デフォルト | `WriteTargetScope { level: 1 }` — 非WIをstoryId付きLevel 3として誤認しない |

---

## ISSUE-001追加分: PhaseGateQueryResult

> **対応Issue**: ISSUE-001（v2.2.0で追加されたVO）
> **対象VO**: PhaseGateQueryResult
> **不変条件**: INV-12（passed=falseの場合、blockersは1件以上必須）

### PhaseGateQueryResult: 生成テスト（正常系）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PGR-001 | `passed: true, blockers: [], warnings: []` | 生成成功。`hasPassed()` = true |
| UT-PGR-002 | `passed: false, blockers: ['設計文書が不足しています'], warnings: []` | 生成成功。`hasPassed()` = false |
| UT-PGR-003 | `passed: true, blockers: [], warnings: ['推奨: シナリオテスト設計を追加してください']` | 生成成功。warnings 1件 |
| UT-PGR-004 | `passed: false, blockers: ['blocker1', 'blocker2'], warnings: ['warn1']` | 生成成功。blockers 2件、warnings 1件 |

### PhaseGateQueryResult: 不変条件テスト（INV-12: passed=falseならblockers 1件以上）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-PGR-010 | INV-12 | `passed: false, blockers: [], warnings: []` | PhaseGateQueryResultInvariantError がthrowされる |
| UT-PGR-011 | INV-12 エラーメッセージ | `passed: false, blockers: [], warnings: ['warn']` | エラーメッセージに「passed=false」「blockers」等の識別情報が含まれる |

### PhaseGateQueryResult: アクセサテスト

| ケースID | 入力 | 操作 | 期待結果 |
|---------|------|------|---------|
| UT-PGR-020 | `passed: true, blockers: [], warnings: []` | `hasPassed()` | true |
| UT-PGR-021 | `passed: false, blockers: ['b1'], warnings: []` | `hasPassed()` | false |
| UT-PGR-022 | `passed: false, blockers: ['b1', 'b2'], warnings: []` | `getBlockers()` | `['b1', 'b2']` の読み取り専用配列 |
| UT-PGR-023 | `passed: true, blockers: [], warnings: ['w1']` | `getWarnings()` | `['w1']` の読み取り専用配列 |

### PhaseGateQueryResult: 不変性テスト

| ケースID | 操作 | 期待結果 |
|---------|------|---------|
| UT-PGR-030 | 生成後に `blockers` 配列を外部から変更しようとする | 元の配列が変更されない（防御的コピー） |
| UT-PGR-031 | 生成後に `warnings` 配列を外部から変更しようとする | 元の配列が変更されない（防御的コピー） |

### PhaseGateQueryResult: 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-PGR-040 | 同一フィールドを持つ2つのPhaseGateQueryResultを比較 | 等値 |
| UT-PGR-041 | passedが異なる2つのPhaseGateQueryResultを比較 | 非等値 |
| UT-PGR-042 | blockersの内容が異なる2つのPhaseGateQueryResultを比較 | 非等値 |
| UT-PGR-043 | warningsの順序が異なる2つのPhaseGateQueryResultを比較 | 非等値（順序依存） |

---

## 5. 境界値・異常系まとめ

| ケースID | 対象 | 入力 | 期待結果 |
|---------|------|------|---------|
| UT-BV-001 | ProtectedFileList | patterns: []（空配列） | HarnessError（INV-4違反） |
| UT-BV-002 | ProtectedFileList | patterns: ['a']（1件） | 生成成功（最小有効） |
| UT-BV-003 | FallbackCapabilitySpec | supportedCommands: []（空配列） | HarnessError（INV-5違反） |
| UT-BV-004 | FallbackCapabilitySpec | supportedCommands: ['cmd']（1件） | 生成成功（最小有効） |
| UT-BV-005 | HookTranslationResult | shouldBlock: true かつ cliCommand: 'phasegate:lint' | HarnessError（INV-2違反） |
| UT-BV-006 | HookTranslationResult | skipReason: 'HOOK_DISABLED' かつ cliCommand: 'phasegate:lint' | HarnessError（INV-3違反） |
| UT-BV-007 | ReentryGuard | active状態でactivate() | HarnessError（INV-1違反） |
| UT-BV-008 | HookToCliTranslator | targetFilePaths: []（空配列）のPreToolUseEvent | shouldBlock: false（ブロックしない） |
| UT-BV-009 | HookToCliTranslator | HOOK_DISABLEDのPostToolUseEvent | skipReason: 'HOOK_DISABLED' |
| UT-BV-010 | HookToCliTranslator | ReentryGuard active時のStopEvent | skipReason: 'REENTRY_DETECTED' |
| UT-BV-011 | ProtectedFileList.matches() | filePath: ''（空文字） | false |
| UT-BV-012 | ProtectedFileList.matches() | filePath: 'BIOME.JSON'（大文字） | false（大文字小文字を区別する） |
| UT-BV-013 | HookTranslationResult | timeoutMs: 0 | 実装依存（設計上は不正値として扱うことを推奨） |
| UT-BV-014 | FallbackVerificationService | noAgentApiImports: falseでimportあり | importチェックスキップ（violations なし） |
| UT-BV-015 | WriteTargetScope.fromPath() | issueパス（`docs/inception/{unit}/issues/999/logical_design.md`）でissueIdが数字始まり | storyIdなしのフォールバック（level=2, unitId のみ）（ISSUE-001追加） |
| UT-BV-016 | WriteTargetScope.fromPath() | issueIdなしのディレクトリパス（`docs/inception/issues/`のみ） | level=1 にフォールバック（ISSUE-001追加��� |
| UT-BV-017 | WriteTargetScope.fromPath() | issueIdなしの`docs/inception/{unit}/issues/` | level=2 フォールバック（`issues` が WORK_ITEM_ID_PATTERN 不マッチ）（ISSUE-001追加） |
| UT-BV-018 | PhaseGateQueryResult | passed=false, blockers=[] | PhaseGateQueryResultInvariantError（INV-12違反）（ISSUE-001追加） |
| UT-BV-019 | PhaseGateQueryResult | passed=true, blockers=[], warnings=[] | 生成成功（最小有効）（ISSUE-001追加） |

---

## 6. テストケースサマリー

| コンポーネント | 種別 | テストケース数 |
|-------------|------|-------------|
| ReentryGuard | エンティティ | 11件（UT-RG-001〜UT-RG-031） |
| HookEvent | 値オブジェクト | 8件（UT-HE-001〜UT-HE-021） |
| ProtectedFileList | 値オブジェクト | 12件（UT-PFL-001〜UT-PFL-041） |
| HookTranslationResult | 値オブジェクト | 11件（UT-HTR-001〜UT-HTR-031） |
| FallbackCapabilitySpec | 値オブジェクト | 7件（UT-FCS-001〜UT-FCS-021） |
| WriteTargetScope（ISSUE-001） | 値オブジェクト | 26件（UT-WTS-I001〜UT-WTS-I043, UT-WTS-P001〜UT-WTS-P015） |
| PhaseGateQueryResult（ISSUE-001） | 値オブジェクト | 16件（UT-PGR-001〜UT-PGR-043） |
| HookToCliTranslator | ドメインサービス | 11件（UT-HTC-001〜UT-HTC-030） |
| FallbackVerificationService | ドメインサービス | 10件（UT-FVS-001〜UT-FVS-030） |
| HookSkipEvent（WI-166） | 値オブジェクト | 5件（UT-HSE-001〜UT-HSE-005） |
| 境界値・異常系 | 横断 | 19件（UT-BV-001〜UT-BV-019） |
| **合計** | | **136件** |

<!-- @work-item-id WI-166 -->
### 6.1 HookSkipEvent test additions

| ケースID | 対象 | 入力 | 期待結果 |
|---|---|---|---|
| UT-HSE-001 | HookSkipEvent | hookType/reason/timestamp/targetPaths を持つ record | 生成成功し JSON Lines に serializable |
| UT-HSE-002 | HookSkipEvent | reason が未知文字列 | forward-compatible reason として保持 |
| UT-HSE-003 | HookSkipEvent | timestamp が空 | invariant error |
| UT-HSE-004 | HookSkipEventRecorderPort failure policy | append が失敗 | 呼び出し元 hook result を変更しない |
| UT-HSE-005 | SkipReason | `REENTRY_DETECTED`, `HOOK_DISABLED`, `TIMEOUT_EXCEEDED` | status projection で reason count に使える stable key |

---

## 7. テスト規約準拠チェック

| 規約 | 適用方針 |
|------|---------|
| テストケース名は日本語 | 実装時のit()記述は全て日本語で記述する |
| AAAパターン | Arrange（モックセットアップ）→ Act（メソッド呼び出し）→ Assert（期待値検証）の3フェーズ構造 |
| 実行結果は `actual` 変数 | `const actual = target.method(input)` → `expect(actual).toEqual(...)` |
| target/context/describe/it 構造 | `target(メソッド名)` > `describe(振る舞い説明)` > `context(前提条件)` > `it(期待値)` |
| モックは外部依存のみ | ドメインサービスはポート（Port）をモック。エンティティ・VOは実体を使用 |
| ファイル名はkebab-case | `reentry-guard.test.ts`、`protected-file-list.test.ts` 等 |

---

## 8. 次ステップへの誘導

```
unit-test-designer（本設計）✅ 完了
        ↓
test-coverage-checker ← テストケース設計の網羅性チェック
        ↓
unit-test-logic-designer ← 各テストケースの疑似コード設計
        ↓
story-implementor ← TDD実装
```

**推奨**: `test-coverage-checker` スキルを実行し、ドメインモデルの不変条件・状態遷移・ビジネスルールに対するカバレッジを確認してから次フェーズに進んでください。

## 9. WI-203 Stop Hook CLI Executor Tests

<!-- @work-item-id WI-203 -->

| ケースID | 対象 | 入力 | 期待結果 |
|---|---|---|---|
| UT-AI-WI203-001 | `ChildProcessCliExecutorAdapter` | `execute("phasegate:complete-check", [])` | `npx tsx <package>/scripts/harness/main.ts phasegate:complete-check` を spawn し、`scripts/harness/cli/complete-check.ts` を参照しない |
| UT-AI-WI203-002 | `ChildProcessCliExecutorAdapter` | `execute("custom-check", ["--flag"])` | legacy extension 互換として `scripts/harness/cli/custom-check.ts --flag` を spawn する |

## WI-304 SessionStart World context unit tests

<!-- @work-item-id WI-304 -->

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI304-UC-001 | World無効でcontextを取得する | query未実行、World sectionなし |
| UT-WI304-UC-002 | mixed classificationを取得する | blocking → cleanup → waivedのordinal sort |
| UT-WI304-UC-003 | adopted legacy 604件を取得する | entry 0、count 604 |
| UT-WI304-PRES-001 | 6 entryをdefault limitで表示する | 5 entry + deterministic omission |
| UT-WI304-PRES-002 | 2000 chars境界を表示する | scalar cap内、entry途中切断なし |
| UT-WI304-PRES-003 | unavailable resultを表示する | 固定一行warning、reason非表示 |

usecaseはdeterministic fake query portを使い、World domain objectをmockしない。
<!-- @work-item-id WI-305 -->

## WI-305 hook declaration tests

設計変更eventがmatching Work Item declarationで通過し、不一致時だけblockされること、World無効時に従来hook contractを維持することを検証する。

## WI-384 apply_patch parser / hook contract tests

<!-- @work-item-id WI-384 -->

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI384-PATCH-001..003 | Update / Add / Delete directive を抽出する | MODIFY / CREATE / DELETE を保持 |
| UT-WI384-PATCH-004 | 3 kind 混在の複数ファイル patch を抽出する | 入力順の targets |
| UT-WI384-PATCH-005..009 | path 空白、重複、End 欠落、marker 外、空入力 | 決定的・fail-closed な結果 |
| UT-WI384-BASH-001..003 | Bash heredoc と既存 shell writers を抽出する | path-only 既存 API が不変 |

Vitest / semantic AAA / 日本語かつ重複しない `it()` 名 / `actual` 変数を用い、domain service を
モックしない。`@work-item-id WI-384` を付け、新規 WCR-005 obligation を発生させない。
