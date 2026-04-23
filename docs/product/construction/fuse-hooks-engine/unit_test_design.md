# ユニットテスト設計: fuse-hooks-engine

@story-id HF1-01
@story-id HF1-02
@story-id HF1-03
@story-id HF1-04
@story-id HF1-05
> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-20
> **対応ストーリー**: HF1-01, HF1-02, HF1-03, HF1-04, HF1-05
> **Wave**: 2
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象ドメインモデル

- **集約ルート**: HookDefinition
- **エンティティ**: FUSEMount, CompletionGate
- **値オブジェクト**: HookType, FilePattern, HookAction, MagicFile, ProtectedResourceList, DestructiveCommandList, HookYamlConfig
- **ドメインサービス**: HookEvaluationService

---

## 2. 値オブジェクトテストケース

### 2.1 HookType

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-type.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-001 | `HookType.create('pre-write')` | `value='pre-write'` の HookType が生成される |
| UT-HF-002 | `HookType.create('pre-read')` | `value='pre-read'` の HookType が生成される |
| UT-HF-003 | `HookType.create('post-write')` | `value='post-write'` の HookType が生成される |
| UT-HF-004 | `HookType.create('on-complete')` | `value='on-complete'` の HookType が生成される |
| UT-HF-005 | `HookType.create('invalid')` | `Result.fail()` が返る（INV-1違反） |
| UT-HF-006 | `HookType.create('')` | `Result.fail()` が返る（空文字不正） |

#### matchesEventテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-007 | `HookType.create('pre-write').matchesEvent('write')` | `true` を返す |
| UT-HF-008 | `HookType.create('pre-write').matchesEvent('read')` | `false` を返す |
| UT-HF-009 | `HookType.create('pre-read').matchesEvent('read')` | `true` を返す |
| UT-HF-010 | `HookType.create('post-write').matchesEvent('write')` | `true` を返す |
| UT-HF-011 | `HookType.create('on-complete').matchesEvent('write')` | `true` を返す |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HF-012 | 同一 `value` を持つ2つの HookType | `equals()` が `true` を返す |
| UT-HF-013 | 異なる `value` を持つ2つの HookType | `equals()` が `false` を返す |

---

### 2.2 FilePattern

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/file-pattern.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-014 | `includePatterns=['**/*.ts']`, excludePatterns省略 | 正常に生成される |
| UT-HF-015 | `includePatterns=['src/**/*.ts', 'tests/**/*.ts']`, `excludePatterns=['**/*.spec.ts']` | 正常に生成される（複数パターン） |
| UT-HF-016 | `includePatterns=[]` | `Result.fail()` が返る（INV-2違反: 空リスト不正） |
| UT-HF-017 | `includePatterns=['[invalid']` | `Result.fail()` が返る（INV-11違反: 不正glob形式） |

#### testメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-018 | `includePatterns=['**/*.md']`, `filePath='docs/README.md'` | `test()` が `true` を返す |
| UT-HF-019 | `includePatterns=['**/*.ts']`, `filePath='src/index.js'` | `test()` が `false` を返す |
| UT-HF-020 | `includePatterns=['**/*.ts']`, `excludePatterns=['**/*.spec.ts']`, `filePath='foo.spec.ts'` | `test()` が `false` を返す（excludeにマッチ） |
| UT-HF-021 | `includePatterns=['**/*.ts']`, `excludePatterns=['**/*.spec.ts']`, `filePath='src/index.ts'` | `test()` が `true` を返す（includeマッチ、excludeミス） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HF-022 | 同一パターンを持つ2つの FilePattern | `equals()` が `true` を返す |
| UT-HF-023 | excludePatterns のみ異なる2つの FilePattern | `equals()` が `false` を返す |

---

### 2.3 HookAction

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-action.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-024 | `actionType='block-write'`, `config={ reason: 'Protected file', notifyUser: true }` | 正常に生成される |
| UT-HF-025 | `actionType='allow-read'`, `config={ maxAccessCount: 5 }` | 正常に生成される |
| UT-HF-026 | `actionType='run-shell'`, `config={ script: 'echo hello', timeout: 3000, failOnNonZero: true }` | 正常に生成される |
| UT-HF-027 | `actionType='trigger-completion-check'`, `config={ gateId: 'story-001-gate' }` | 正常に生成される |
| UT-HF-028 | `actionType='invalid-action'` | `Result.fail()` が返る（INV-3違反） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HF-029 | INV-3: actionTypeは4種のいずれか | `actionType='delete-file'` | 生成失敗 |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HF-030 | 同一 `actionType` と `config` を持つ2つの HookAction | `equals()` が `true` を返す |
| UT-HF-031 | `actionType` が異なる2つの HookAction | `equals()` が `false` を返す |

---

### 2.4 MagicFile

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/magic-file.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-032 | `filePath='.harness/done/HF1-01.done'`, requiredFields省略 | 正常に生成される |
| UT-HF-033 | `filePath='.harness/done/HF1-01.done'`, `requiredFields=['storyId', 'completedAt']` | 正常に生成される（必須フィールドあり） |
| UT-HF-034 | `filePath='/absolute/path/done'` | `Result.fail()` が返る（INV-10違反: 絶対パス不正） |
| UT-HF-035 | `filePath=''` | `Result.fail()` が返る（空文字不正） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HF-036 | 同一 `filePath` と `requiredFields` を持つ2つの MagicFile | `equals()` が `true` を返す |
| UT-HF-037 | `requiredFields` のみ異なる2つの MagicFile | `equals()` が `false` を返す |

---

### 2.5 ProtectedResourceList

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/protected-resource-list.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-038 | `patterns=['**/*.env', '.harness/**']` | 正常に生成される |
| UT-HF-039 | `patterns=[]` | 正常に生成される（空リスト許容） |
| UT-HF-040 | `patterns=['[invalid']` | `Result.fail()` が返る（INV-12違反: 不正glob形式） |

#### matchesメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-041 | `patterns=['**/*.env']`, `filePath='.env'` | `matches()` が `true` を返す |
| UT-HF-042 | `patterns=['**/*.env']`, `filePath='src/index.ts'` | `matches()` が `false` を返す |
| UT-HF-043 | `patterns=[]`, `filePath='anything.ts'` | `matches()` が `false` を返す（空リスト: 全て非マッチ） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HF-044 | 同一 `patterns` を持つ2つの ProtectedResourceList | `equals()` が `true` を返す |

---

### 2.6 DestructiveCommandList

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/destructive-command-list.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-045 | `commands=[{ command: 'rm', dangerousOptions: ['-rf', '-fr'] }]` | 正常に生成される |
| UT-HF-046 | `commands=[]` | 正常に生成される（空リスト許容） |
| UT-HF-047 | `commands=[{ command: '', dangerousOptions: [] }]` | `Result.fail()` が返る（INV-13違反: コマンド名空文字） |

#### isDestructiveメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-048 | `commands=[{ command: 'rm', dangerousOptions: ['-rf'] }]`, `commandLine='rm -rf /tmp/foo'` | `isDestructive()` が `true` を返す |
| UT-HF-049 | `commands=[{ command: 'rm', dangerousOptions: ['-rf'] }]`, `commandLine='rm -i /tmp/foo'` | `isDestructive()` が `false` を返す（危険オプションなし） |
| UT-HF-050 | `commands=[{ command: 'git', dangerousOptions: ['reset --hard'] }]`, `commandLine='git reset --hard HEAD'` | `isDestructive()` が `true` を返す |
| UT-HF-051 | `commands=[]`, `commandLine='rm -rf /tmp'` | `isDestructive()` が `false` を返す（空リスト: 全て安全） |

---

### 2.7 HookYamlConfig

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-yaml-config.test.ts`

#### 生成テスト（AJVスキーマバリデーション）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-052 | 有効なraw YAML構造（version=1, hooks=1件） | `Result.ok(HookYamlConfig)` が返る |
| UT-HF-053 | `version` フィールドなし | `Result.fail()` が返る（スキーマバリデーション失敗） |
| UT-HF-054 | `hooks=[]`（空配列） | `Result.ok(HookYamlConfig)` が返る（空フック定義は許容） |
| UT-HF-055 | `hooks` フィールドなし | `Result.fail()` が返る（必須フィールド欠如） |

#### toHookDefinitionsメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-056 | 有効な1件のhookエントリ（pre-write + block-write） | `Result.ok([HookDefinition])` が返る |
| UT-HF-057 | INV-4違反エントリ（pre-read + block-write） | `Result.fail([HarnessError[]])` が返る |
| UT-HF-058 | 2件の有効なhookエントリ | `Result.ok([HookDefinition, HookDefinition])` が返る（length=2） |

---

## 3. 集約ルート・エンティティテストケース

### 3.1 HookDefinition（集約ルート）

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/aggregates/hook-definition.test.ts`

#### 生成テスト（create）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-059 | `hookType='pre-write'`, `filePattern=['**/*.ts']`, `action='block-write'` | `Result.ok(HookDefinition)` が返る。hookIdはUUID形式 |
| UT-HF-060 | `hookType='pre-read'`, `filePattern=['**/*.env']`, `action='allow-read'` | 正常に生成される |
| UT-HF-061 | `hookType='post-write'`, `filePattern=['**/*.md']`, `action='run-shell'` | 正常に生成される |
| UT-HF-062 | `hookType='on-complete'`, `filePattern=['.harness/done/*.done']`, `action='trigger-completion-check'` | 正常に生成される |
| UT-HF-063 | `hookType='pre-read'`, `action='block-write'`（INV-4違反） | `Result.fail()` が返る（HOOK_ACTION_TYPE_MISMATCH） |
| UT-HF-064 | `hookType='on-complete'`, `action='run-shell'`（INV-5違反） | `Result.fail()` が返る（HOOK_ACTION_TYPE_MISMATCH） |

#### matchesメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-065 | `hookType='pre-write'`, `filePattern=['**/*.ts']`, `filePath='src/index.ts'`, `eventType='write'` | `matches()` が `true` を返す |
| UT-HF-066 | `hookType='pre-write'`, `filePattern=['**/*.ts']`, `filePath='docs/README.md'`, `eventType='write'` | `matches()` が `false` を返す（パターン不一致） |
| UT-HF-067 | `hookType='pre-write'`, `filePattern=['**/*.ts']`, `filePath='src/index.ts'`, `eventType='read'` | `matches()` が `false` を返す（イベント種別不一致） |
| UT-HF-068 | `hookType='pre-read'`, `filePattern=['**/*.env']`, `filePath='.env'`, `eventType='read'` | `matches()` が `true` を返す |

#### getActionテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-069 | 有効なHookDefinition（block-writeアクション）の `getAction()` | `actionType='block-write'` の HookAction が返る |

---

### 3.2 FUSEMount（エンティティ）

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/entities/fuse-mount.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-070 | `FUSEMount.create('/project/root')` | `status='unmounted'`, `fallbackMode=null` で生成される |

#### mountメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-071 | unmounted状態の FUSEMount に `mount()` | `status='mounted'`, `isMounted()=true` になる |
| UT-HF-072 | mounted状態から `mount()` 再呼び出し | 冪等（エラーなしで状態維持） |

#### enterFallbackメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-073 | `enterFallback('L1')` | `status='fallback'`, `fallbackMode='L1'`, `isFallback()=true` になる |
| UT-HF-074 | `enterFallback('L2')` | `status='fallback'`, `fallbackMode='L2'` になる |
| UT-HF-075 | `enterFallback('L3')` | `status='fallback'`, `fallbackMode='L3'` になる |
| UT-HF-076 | `enterFallback('L4')` | `status='fallback'`, `fallbackMode='L4'` になる |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HF-077 | INV-7: fallbackModeはL1〜L4のいずれか | `enterFallback('L5')` | エラーをスロー |

---

### 3.3 CompletionGate（エンティティ）

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/entities/completion-gate.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-078 | `CompletionGate.create(storyId, magicFile)` | `status='pending'`, `checkedAt=null`, `failureReason=null` で生成される |

#### startCheck/passed/failメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-079 | pending状態で `startCheck()` | `status='checking'` になる |
| UT-HF-080 | checking状態で `passed()` | `status='passed'`, `checkedAt` が非null ISO8601文字列になる（INV-8） |
| UT-HF-081 | checking状態で `fail('magic file not found')` | `status='failed'`, `failureReason='magic file not found'` になる（INV-9） |
| UT-HF-082 | `fail('')`（空文字reason） | エラーをスロー（INV-9違反） |

#### canRecheckメソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HF-083 | pending状態の CompletionGate | `canRecheck()` が `true` を返す |
| UT-HF-084 | failed状態の CompletionGate | `canRecheck()` が `true` を返す |
| UT-HF-085 | passed状態の CompletionGate | `canRecheck()` が `false` を返す |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HF-086 | INV-8: passed時にcheckedAtが非null | `passed()` 後に `checkedAt` を確認 | `checkedAt` が非null |
| UT-HF-087 | INV-9: failed時にfailureReasonが非null非空文字 | `fail('reason')` 後に `failureReason` を確認 | `failureReason='reason'` |

---

## 4. ドメインサービステストケース

### 4.1 HookEvaluationService

**テスト配置**: `scripts/harness/__tests__/unit/fuse-hooks-engine/services/hook-evaluation-service.test.ts`

#### evaluateメソッドテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-HF-088 | `filePath='src/index.ts'`, `eventType='write'`, `definitions=[pre-writeフック(**.ts)]` | モックなし（純粋ドメイン） | `[block-write HookAction]` が返る |
| UT-HF-089 | `filePath='docs/README.md'`, `eventType='write'`, `definitions=[pre-writeフック(**.ts)]` | モックなし | `[]` が返る（パターン不一致、アクションなし） |
| UT-HF-090 | `filePath='.env'`, `eventType='read'`, `definitions=[pre-readフック(**.env)]` | モックなし | `[allow-read HookAction]` が返る |
| UT-HF-091 | `filePath='src/index.ts'`, `eventType='write'`, `definitions=[]` | モックなし | `[]` が返る（定義なし） |
| UT-HF-092 | `filePath='src/index.ts'`, `eventType='write'`, `definitions=[pre-writeフック(**.ts), post-writeフック(**.ts)]` | モックなし | 2件の HookAction が返る（複数マッチ） |
| UT-HF-093 | `filePath='.harness/done/HF1-01.done'`, `eventType='write'`, `definitions=[on-completeフック(.harness/done/*.done)]` | モックなし | `[trigger-completion-check HookAction]` が返る |
| UT-HF-094 | `filePath='src/index.ts'`, `eventType='read'`, `definitions=[pre-writeフック(**.ts)]` | モックなし | `[]` が返る（イベント種別不一致） |

---

## 5. テストケース総数サマリー

| 対象クラス | 生成テスト | 不変条件テスト | 等値性テスト | その他 | 合計 |
|----------|-----------|-------------|------------|------|------|
| HookType | 6 | — | 2 | 5（matchesEvent） | 13 |
| FilePattern | 4 | — | 2 | 4（test） | 10 |
| HookAction | 5 | 1 | 2 | — | 8 |
| MagicFile | 4 | — | 2 | — | 6 |
| ProtectedResourceList | 3 | — | 1 | 3（matches） | 7 |
| DestructiveCommandList | 3 | — | — | 4（isDestructive） | 7 |
| HookYamlConfig | 4 | — | — | 3（toHookDefinitions） | 7 |
| HookDefinition | 6 | — | — | 5（matches/getAction） | 11 |
| FUSEMount | 1 | 1 | — | 6（mount/enterFallback/isMounted/isFallback） | 8 |
| CompletionGate | 1 | 2 | — | 8（startCheck/passed/fail/canRecheck） | 11 |
| HookEvaluationService | — | — | — | 7（evaluate） | 7 |
| **合計** | **37** | **4** | **9** | **45** | **95** |
