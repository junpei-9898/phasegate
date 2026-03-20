# ユニットテスト設計: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H11-01〜H11-04
> **前提ドキュメント**: `docs/product/construction/agent-integration/domain_model.md`

---

## 1. 対象ドメインモデル

- **エンティティ**: ReentryGuard
- **値オブジェクト**: HookEvent、ProtectedFileList、HookTranslationResult、FallbackCapabilitySpec
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
| UT-HTR-002 | `{ shouldBlock: false, cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }` | 生成成功 |
| UT-HTR-003 | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED', cliArgs: [], expectedExitCode: 0 }` | 生成成功 |
| UT-HTR-004 | `{ shouldBlock: false, skipReason: 'REENTRY_DETECTED', cliArgs: [], expectedExitCode: 0 }` | 生成成功 |
| UT-HTR-005 | `{ shouldBlock: false, cliCommand: 'harness:complete-check', cliArgs: [], expectedExitCode: 0 }`（timeoutMs省略） | 生成成功（timeoutMs = undefined） |

#### 不変条件テスト（INV-2: shouldBlock=trueならcliCommandはundefined）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HTR-010 | INV-2 | `{ shouldBlock: true, cliCommand: 'harness:lint', cliArgs: [], expectedExitCode: 0 }` | HarnessError がthrowされる |
| UT-HTR-011 | INV-2 エラーメッセージ | 同上 | 「shouldBlock=trueのときcliCommandは設定不可」等の識別情報が含まれる |

#### 不変条件テスト（INV-3: skipReasonがあるならcliCommandはundefined）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HTR-020 | INV-3 | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED', cliCommand: 'harness:lint', cliArgs: [], expectedExitCode: 0 }` | HarnessError がthrowされる |
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
| UT-FCS-001 | `{ supportedCommands: ['harness:lint'], noAgentApiImports: true }` | 生成成功 |
| UT-FCS-002 | `{ supportedCommands: ['harness:lint', 'harness:complete-check'], noAgentApiImports: false }` | 生成成功 |
| UT-FCS-003 | `{ supportedCommands: ['harness:lint'], noAgentApiImports: true }`（supportedCommands 1件、最小有効） | 生成成功 |

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
| UT-HTC-010 | ConfigQueryPort.isEnabled('post-tool-use') = true | `PostToolUseEvent { toolName: 'Write', affectedFilePaths: ['src/app.ts'] }` | `{ shouldBlock: false, cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }` |
| UT-HTC-011 | ConfigQueryPort.isEnabled('post-tool-use') = false | `PostToolUseEvent { toolName: 'Write', affectedFilePaths: ['src/app.ts'] }` | `{ shouldBlock: false, skipReason: 'HOOK_DISABLED' }` |

#### StopEventの変換テスト

| ケースID | 前提条件（ポートモック） | 入力HookEvent | 期待HookTranslationResult |
|---------|-------------------|-------------|--------------------------|
| UT-HTC-020 | ReentryGuard.isActive() = false | `StopEvent { sessionId: 'sess-001' }` | `{ shouldBlock: false, cliCommand: 'harness:complete-check', cliArgs: [], expectedExitCode: 0 }` |
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
| UT-FVS-001 | ImportAnalyzerPort: エージェントAPIのimportなし、CliCommandRegistryPort: 全コマンド登録済み | `{ supportedCommands: ['harness:lint'], noAgentApiImports: true }` | HarnessError[] = []（violations なし） |
| UT-FVS-002 | noAgentApiImports = false（importチェックスキップ）、CliCommandRegistryPort: 全コマンド登録済み | `{ supportedCommands: ['harness:lint'], noAgentApiImports: false }` | HarnessError[] = []（violations なし） |

#### verify()violation検出テスト（importチェック）

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-010 | ImportAnalyzerPort: `@anthropic-ai/claude-code` のimportを検出 | `{ supportedCommands: ['harness:lint'], noAgentApiImports: true }` | HarnessError[]に1件以上のviolation（どのモジュールがどのAPIをimportしているか含む） |
| UT-FVS-011 | ImportAnalyzerPort: 複数モジュールでエージェントAPI使用 | `{ noAgentApiImports: true, ... }` | HarnessError[]に複数のviolation（モジュールごとに1件） |
| UT-FVS-012 | noAgentApiImports = falseの場合 | `{ noAgentApiImports: false, ... }`（importあっても） | importチェックはスキップされHarnessError[] = [] |

#### verify()violation検出テスト（commandName存在確認）

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-020 | CliCommandRegistryPort: `harness:lint` は登録済みだが `harness:unknown` は未登録 | `{ supportedCommands: ['harness:lint', 'harness:unknown'], noAgentApiImports: false }` | HarnessError[]に1件のviolation（`harness:unknown` が未登録） |
| UT-FVS-021 | CliCommandRegistryPort: 全コマンド未登録 | `{ supportedCommands: ['harness:lint', 'harness:complete-check'], noAgentApiImports: false }` | HarnessError[]に2件のviolation |

#### verify()複合violation検出テスト

| ケースID | 前提条件（ポートモック） | 入力FallbackCapabilitySpec | 期待結果 |
|---------|-------------------|--------------------------|---------|
| UT-FVS-030 | ImportAnalyzerPort: importあり、CliCommandRegistryPort: コマンド未登録 | `{ supportedCommands: ['harness:unknown'], noAgentApiImports: true }` | HarnessError[]に複数種別のviolation（importエラー + commandエラー） |

---

## 5. 境界値・異常系まとめ

| ケースID | 対象 | 入力 | 期待結果 |
|---------|------|------|---------|
| UT-BV-001 | ProtectedFileList | patterns: []（空配列） | HarnessError（INV-4違反） |
| UT-BV-002 | ProtectedFileList | patterns: ['a']（1件） | 生成成功（最小有効） |
| UT-BV-003 | FallbackCapabilitySpec | supportedCommands: []（空配列） | HarnessError（INV-5違反） |
| UT-BV-004 | FallbackCapabilitySpec | supportedCommands: ['cmd']（1件） | 生成成功（最小有効） |
| UT-BV-005 | HookTranslationResult | shouldBlock: true かつ cliCommand: 'harness:lint' | HarnessError（INV-2違反） |
| UT-BV-006 | HookTranslationResult | skipReason: 'HOOK_DISABLED' かつ cliCommand: 'harness:lint' | HarnessError（INV-3違反） |
| UT-BV-007 | ReentryGuard | active状態でactivate() | HarnessError（INV-1違反） |
| UT-BV-008 | HookToCliTranslator | targetFilePaths: []（空配列）のPreToolUseEvent | shouldBlock: false（ブロックしない） |
| UT-BV-009 | HookToCliTranslator | HOOK_DISABLEDのPostToolUseEvent | skipReason: 'HOOK_DISABLED' |
| UT-BV-010 | HookToCliTranslator | ReentryGuard active時のStopEvent | skipReason: 'REENTRY_DETECTED' |
| UT-BV-011 | ProtectedFileList.matches() | filePath: ''（空文字） | false |
| UT-BV-012 | ProtectedFileList.matches() | filePath: 'BIOME.JSON'（大文字） | false（大文字小文字を区別する） |
| UT-BV-013 | HookTranslationResult | timeoutMs: 0 | 実装依存（設計上は不正値として扱うことを推奨） |
| UT-BV-014 | FallbackVerificationService | noAgentApiImports: falseでimportあり | importチェックスキップ（violations なし） |

---

## 6. テストケースサマリー

| コンポーネント | 種別 | テストケース数 |
|-------------|------|-------------|
| ReentryGuard | エンティティ | 11件（UT-RG-001〜UT-RG-031） |
| HookEvent | 値オブジェクト | 8件（UT-HE-001〜UT-HE-021） |
| ProtectedFileList | 値オブジェクト | 12件（UT-PFL-001〜UT-PFL-041） |
| HookTranslationResult | 値オブジェクト | 11件（UT-HTR-001〜UT-HTR-031） |
| FallbackCapabilitySpec | 値オブジェクト | 7件（UT-FCS-001〜UT-FCS-021） |
| HookToCliTranslator | ドメインサービス | 11件（UT-HTC-001〜UT-HTC-030） |
| FallbackVerificationService | ドメインサービス | 10件（UT-FVS-001〜UT-FVS-030） |
| 境界値・異常系 | 横断 | 14件（UT-BV-001〜UT-BV-014） |
| **合計** | | **84件** |

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
