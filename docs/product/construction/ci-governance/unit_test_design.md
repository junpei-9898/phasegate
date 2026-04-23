# ユニットテスト設計: ci-governance

@story-id H13-01
@story-id H13-02
@story-id H13-03
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20
> **対応ストーリー**: H13-01, H13-02, H13-03
> **Wave**: 3
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象ドメインモデル

- **集約ルート**: CiTemplate, ErrorRepetition, AgentsMdPointer
- **値オブジェクト**: TemplateConfig, EscalationAction, RepetitionResetCondition, PointerEntry, LessonArtifact（型定義）
- **ドメインサービス**: TemplateGenerator, RepetitionDetector, PointerValidator, LessonAggregator

---

## 2. 値オブジェクトテストケース

### 2.1 TemplateConfig

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/template-config.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-TC-001 | `targetValidatorIds=['v1']`, `triggerCondition='pull_request'`, `failOnWarning=false` | 正常に生成される |
| UT-TC-002 | `targetValidatorIds=['v1','v2','v3']`, `triggerCondition='schedule'`, `failOnWarning=true` | 正常に生成される（複数ValidatorId） |
| UT-TC-003 | `targetValidatorIds=['v1']`, `triggerCondition='pre-commit'`, `failOnWarning=false` | 正常に生成される |
| UT-TC-004 | `targetValidatorIds=[]` | エラーをスロー / 生成失敗（INV-2: 空リスト不正） |
| UT-TC-005 | `triggerCondition='push'`（不正値） | エラーをスロー / 生成失敗（TriggerCondition不正値） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-TC-006 | INV-2: targetValidatorIdsは1件以上 | `targetValidatorIds=[]` | 生成失敗 |
| UT-TC-007 | イミュータビリティ: Object.freeze()により生成後の変更は反映されない | 生成後に`targetValidatorIds`を変更しようとする | 変更が反映されない（immutable） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-TC-008 | 同一`targetValidatorIds`/`triggerCondition`/`failOnWarning`を持つ2つのTemplateConfig | `equals()`がtrueを返す |
| UT-TC-009 | `failOnWarning`のみ異なる2つのTemplateConfig | `equals()`がfalseを返す |
| UT-TC-010 | `targetValidatorIds`の内容が同一だが順序が異なる2つのTemplateConfig | `equals()`がtrueを返す（順序非依存） |

---

### 2.2 EscalationAction

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/escalation-action.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-EA-001 | `logLevel='warn'`, `messageTemplate='Error {errorCode} occurred {count} times'` | 正常に生成される |
| UT-EA-002 | `logLevel='error'`, `messageTemplate='Critical: {errorCode} x{count}'` | 正常に生成される |
| UT-EA-003 | `logLevel='warn'`, `messageTemplate=''`（空文字） | エラーをスロー / 生成失敗（messageTemplate空文字不可） |
| UT-EA-004 | `logLevel='info'`（不正値） | エラーをスロー / 生成失敗（EscalationLogLevel不正値） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-EA-005 | messageTemplateは空文字不可 | `messageTemplate=''` | 生成失敗 |
| UT-EA-006 | logLevelは`'warn'`または`'error'`のみ | `logLevel='debug'` | 生成失敗 |

#### formatMessageテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-EA-007 | `messageTemplate='Error {errorCode} x{count}'`, `errorCode='L1-001'`, `count=3` | `'Error L1-001 x3'`が返る |
| UT-EA-008 | テンプレートに`{errorCode}`プレースホルダーなし | テンプレートそのままが返る（置換なし） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-EA-009 | 同一`logLevel`/`messageTemplate`を持つ2つのEscalationAction | `equals()`がtrueを返す |
| UT-EA-010 | `logLevel`が異なる2つのEscalationAction | `equals()`がfalseを返す |

---

### 2.3 RepetitionResetCondition

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/repetition-reset-condition.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RRC-001 | `resetOnResolution=true` | 正常に生成される |
| UT-RRC-002 | `resetOnResolution=false` | 正常に生成される |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-RRC-003 | 同一`resetOnResolution`を持つ2つのRepetitionResetCondition | `equals()`がtrueを返す |
| UT-RRC-004 | `resetOnResolution`が異なる2つのRepetitionResetCondition | `equals()`がfalseを返す |

---

### 2.4 PointerEntry

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/pointer-entry.test.ts`

#### 生成テスト（CommandPointer）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PE-001 | `createCommand(key='cmd-status', command='phasegate:status', description='ステータス確認')` | type=`'command'`のPointerEntryが生成される |
| UT-PE-002 | `createCommand(key='', command='phasegate:lint', description='...')` | エラーをスロー / 生成失敗（key空文字不可） |
| UT-PE-003 | `createCommand(key='k', command='', description='...')` | エラーをスロー / 生成失敗（command空文字不可） |

#### 生成テスト（FilePointer）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PE-004 | `createFile(key='file-readme', filePath='docs/README.md', description='README')` | type=`'file'`のPointerEntryが生成される |
| UT-PE-005 | `createFile(key='file-abs', filePath='/absolute/path.md', description='...')` | エラーをスロー / 生成失敗（INV-11: 絶対パス不正） |
| UT-PE-006 | `createFile(key='', filePath='docs/foo.md', description='...')` | エラーをスロー / 生成失敗（key空文字不可） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-PE-007 | INV-11: FilePointer.filePathはプロジェクトルートからの相対パス | `filePath='/Users/foo/bar.md'`（絶対パス） | 生成失敗 |

#### 判別メソッドテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PE-008 | CommandPointerに対して`isCommand()` | `true`を返す |
| UT-PE-009 | CommandPointerに対して`isFile()` | `false`を返す |
| UT-PE-010 | FilePointerに対して`isFile()` | `true`を返す |
| UT-PE-011 | FilePointerに対して`isCommand()` | `false`を返す |

---

## 3. 集約ルートテストケース

### 3.1 CiTemplate

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/ci-template.test.ts`

#### 生成テスト（create）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CT-001 | `templateType='aidlc-gate'`, `presetRef='standard'` | CiTemplateが生成される（config=null, isConfigured()=false） |
| UT-CT-002 | `templateType='consistency-check'`, `presetRef='minimal'` | CiTemplateが生成される |
| UT-CT-003 | `templateType='pre-commit'`, `presetRef='strict'` | CiTemplateが生成される |
| UT-CT-004 | `templateType='invalid-type'`（不正値） | `CiGovernanceDomainError`をスロー（INV-1違反） |
| UT-CT-005 | `templateType='aidlc-gate'`, `presetRef=''`（空文字） | エラーをスロー / 生成失敗 |

#### withConfigテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CT-006 | 有効なTemplateConfig（targetValidatorIds=['v1']）を注入 | isConfigured()=trueのCiTemplateが返る（新インスタンス） |
| UT-CT-007 | targetValidatorIds=[]のTemplateConfigを注入 | `CiGovernanceDomainError`をスロー（INV-2違反） |
| UT-CT-008 | withConfig()の連続呼び出し | 後のwithConfig()の設定で上書きされた新インスタンスが返る |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CT-009 | INV-1: templateTypeは3種のいずれか | `templateType='schedule'` | エラーをスロー |
| UT-CT-010 | INV-2: targetValidatorIdsは1件以上 | `withConfig()`に空Ids | エラーをスロー |

#### validateテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CT-011 | 有効なCiTemplate（config注入済み）に対して`validate()` | HarnessError[]が空配列（検証通過） |
| UT-CT-012 | config=nullのCiTemplate（`withConfig()`未呼び出し）に対して`validate()` | 「設定未注入」エラーを含むHarnessError[]が返る |

#### isConfiguredテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CT-013 | create()直後のCiTemplate | `isConfigured()`がfalseを返す |
| UT-CT-014 | withConfig()適用後のCiTemplate | `isConfigured()`がtrueを返す |

---

### 3.2 ErrorRepetition

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/error-repetition.test.ts`

#### 生成テスト（create）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ER-001 | `code='L1-001'`（thresholdデフォルト） | occurrenceCount=0, escalated=false, threshold=3で生成される |
| UT-ER-002 | `code='L2-002'`, `threshold=5` | occurrenceCount=0, escalated=false, threshold=5で生成される |
| UT-ER-003 | デフォルト生成時のEscalationAction | logLevel='warn'のEscalationActionが設定される |
| UT-ER-004 | デフォルト生成時のRepetitionResetCondition | resetOnResolution=trueのRepetitionResetConditionが設定される |

#### incrementテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ER-005 | 初期状態のErrorRepetitionに対して`increment()` | occurrenceCount=1, escalated=falseになる |
| UT-ER-006 | occurrenceCount=2（threshold=3）の状態で`increment()` | occurrenceCount=3, escalated=trueになる（INV-6成立） |
| UT-ER-007 | occurrenceCount=1（threshold=3）の状態で`increment()` | occurrenceCount=2, escalated=falseのまま（threshold未達） |
| UT-ER-008 | 既にescalated=trueの状態でさらに`increment()` | occurrenceCount=4, escalated=trueのまま |

#### isEscalatedテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ER-009 | 初期状態（escalated=false） | `isEscalated()`がfalseを返す |
| UT-ER-010 | 3回increment後（threshold=3） | `isEscalated()`がtrueを返す |

#### resetテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ER-011 | escalated=true, resetOnResolution=trueの状態で`reset()` | occurrenceCount=0, escalated=falseにリセットされる |
| UT-ER-012 | escalated=falseの状態で`reset()` | `CiGovernanceDomainError`をスロー（INV-7違反） |
| UT-ER-013 | escalated=true, resetOnResolution=falseの状態で`reset()` | `CiGovernanceDomainError`をスロー（INV-7違反） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-ER-014 | INV-5: occurrenceCountは0以上 | 負値のoccurrenceCount（直接インスタンス生成） | エラー状態 |
| UT-ER-015 | INV-6: escalated=trueならoccurrenceCount>=threshold | increment()後の状態でINV-6整合性確認 | escalated=trueのとき必ずoccurrenceCount>=threshold |

#### getEscalationActionテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ER-016 | 有効なErrorRepetitionに対して`getEscalationAction()` | 設定済みのEscalationAction VOが返る |

---

### 3.3 AgentsMdPointer

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/agents-md-pointer.test.ts`

#### 生成テスト（create）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-AMP-001 | 引数なし（省略） | pointers=[], adrLinks=[]の空AgentsMdPointerが生成される |
| UT-AMP-002 | 有効なPointerEntry[]（key一意） | 指定PointerEntry[]でAgentsMdPointerが生成される |
| UT-AMP-003 | key重複のPointerEntry[]を渡す | `CiGovernanceDomainError`をスロー（INV-8違反） |

#### addPointerテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-AMP-004 | 空AgentsMdPointerに新規CommandPointerを`addPointer()` | pointers.length=1になる |
| UT-AMP-005 | 既存keyと異なるkeyのPointerEntryを`addPointer()` | 正常に追加される（pointers.length増加） |
| UT-AMP-006 | 既存keyと同一keyのPointerEntryを`addPointer()` | `CiGovernanceDomainError`をスロー（INV-8違反） |

#### replacePointerテスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-AMP-007 | 既存keyのPointerEntryを`replacePointer()` | 既存エントリが新エントリに置換される（pointers.length変化なし） |
| UT-AMP-008 | 存在しないkeyのPointerEntryを`replacePointer()` | 新規追加として扱われる（pointers.length増加） |

#### validateテスト（構造的不変条件）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-AMP-009 | 有効なpointers（相対パスのFilePointer含む）を持つAgentsMdPointer | HarnessError[]が空配列（検証通過） |
| UT-AMP-010 | 絶対パスのfilePathを持つFilePointerを含むAgentsMdPointer | INV-11違反のHarnessErrorを含むHarnessError[]が返る |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-AMP-011 | INV-8: pointers[].keyはすべて一意 | 同一keyを持つ2つのPointerEntry追加試行 | 2件目の`addPointer()`でエラー |

---

## 4. ドメインサービステストケース

### 4.1 TemplateGenerator

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/template-generator.test.ts`

#### generateConfigテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-TG-001 | `presetId='standard'`, `templateType='aidlc-gate'` | PresetConfigPort: `getPreset()`→failOnWarning=false, ValidatorIdRegistryPort: `listAll()`→['v1','v2'] | `Result.ok(TemplateConfig)`が返る。triggerCondition='pull_request' |
| UT-TG-002 | `presetId='standard'`, `templateType='consistency-check'` | PresetConfigPort: `getPreset()`→failOnWarning=true, ValidatorIdRegistryPort: `listAll()`→['v1'] | triggerCondition='schedule'のTemplateConfigが返る |
| UT-TG-003 | `presetId='minimal'`, `templateType='pre-commit'` | PresetConfigPort: `getPreset()`→failOnWarning=false, ValidatorIdRegistryPort: `listAll()`→['v1'] | triggerCondition='pre-commit'のTemplateConfigが返る |
| UT-TG-004 | `presetId='standard'`, `templateType='aidlc-gate'` | PresetConfigPort: I/O失敗（エラーをスロー） | `Result.fail(HarnessError[])`が返る |
| UT-TG-005 | `presetId='standard'`, `templateType='aidlc-gate'` | ValidatorIdRegistryPort: `listAll()`→[]（空） | `Result.fail(HarnessError[])`が返る（targetValidatorIdsが空になるため） |

#### TemplateType×TriggerConditionマッピングテスト（D6ルール）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-TG-006 | D6: aidlc-gate→pull_request | `templateType='aidlc-gate'` | `triggerCondition='pull_request'` |
| UT-TG-007 | D6: consistency-check→schedule | `templateType='consistency-check'` | `triggerCondition='schedule'` |
| UT-TG-008 | D6: pre-commit→pre-commit | `templateType='pre-commit'` | `triggerCondition='pre-commit'` |

---

### 4.2 RepetitionDetector

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/repetition-detector.test.ts`

#### detectテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-RD-001 | `error.code='L1-001'`（初回発生） | ErrorRepetitionRepositoryPort: `findByCode()`→null | 新規ErrorRepetition生成、`save()`呼び出し、occurrenceCount=1でnullを返す |
| UT-RD-002 | `error.code='L1-001'`（2回目発生） | ErrorRepetitionRepositoryPort: `findByCode()`→occurrenceCount=1のインスタンス | `increment()`後にsave()、occurrenceCount=2でnullを返す |
| UT-RD-003 | `error.code='L1-001'`（3回目: threshold=3に到達） | ErrorRepetitionRepositoryPort: `findByCode()`→occurrenceCount=2のインスタンス | `increment()`後にsave()、escalated=trueになりEscalationActionが返る |
| UT-RD-004 | `error.code='L1-001'`（1回目） | ErrorRepetitionRepositoryPort: `save()`がI/O失敗 | `HarnessError`がスローされる |
| UT-RD-005 | `error.code='L1-001'`（2回目、閾値未満） | ErrorRepetitionRepositoryPort: `findByCode()`→occurrenceCount=1のインスタンス | nullが返る（エスカレーション未発生） |

---

### 4.3 PointerValidator

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/pointer-validator.test.ts`

#### validateテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-PV-001 | CommandPointerを含むPointerEntry[] | CommandExistencePort: `exists('phasegate:status')`→true | HarnessError[]が空配列（Dead Pointerなし） |
| UT-PV-002 | 存在しないCommandPointerを含むPointerEntry[] | CommandExistencePort: `exists('harness:unknown')`→false | AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る |
| UT-PV-003 | FilePointerを含むPointerEntry[] | FileExistencePort: `exists('docs/README.md')`→true | HarnessError[]が空配列（Dead Pointerなし） |
| UT-PV-004 | 存在しないFilePointerを含むPointerEntry[] | FileExistencePort: `exists('docs/nonexistent.md')`→false | AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る |
| UT-PV-005 | adrLinks=['ADR-001']（存在するADR） | AdrExistencePort: `exists('ADR-001')`→true | HarnessError[]が空配列 |
| UT-PV-006 | adrLinks=['ADR-999']（存在しないADR） | AdrExistencePort: `exists('ADR-999')`→false | AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る |
| UT-PV-007 | 複合: CommandPointer（存在）+ FilePointer（不存在）混在 | CommandExistencePort→true, FileExistencePort→false | FilePointerのみのエラーが返る |
| UT-PV-008 | 空のPointerEntry[] | ポートは呼び出されない | HarnessError[]が空配列 |

---

### 4.4 LessonAggregator

**テスト配置**: `scripts/harness/__tests__/unit/ci-governance/lesson-aggregator.test.ts`

#### aggregateテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-LA-001 | 重複なしのLessonArtifact[]（3件） | モックなし（ポート依存なし） | `Result.ok(PointerEntry[])`が返る。PointerEntries.length=3 |
| UT-LA-002 | 同一lessonId（UUID）が2件含まれるLessonArtifact[] | モックなし | `Result.fail([DUPLICATE_LESSON_ID HarnessError])`が返る |
| UT-LA-003 | 空のLessonArtifact[] | モックなし | `Result.ok([])`が返る |
| UT-LA-004 | 正常な1件のLessonArtifactに対するPointerEntry変換 | モックなし | key='lesson-{lessonId}'形式, type='file'のPointerEntryが返る |
| UT-LA-005 | 3件のうち2件が同一lessonId | モックなし | Result.fail()が返り、重複検出エラーが含まれる |

#### PointerEntry変換ルールテスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-LA-006 | key形式: `lesson-{lessonId}` | `lessonId='abc-123-def'` | `key='lesson-abc-123-def'`のPointerEntryが生成される |
| UT-LA-007 | LessonArtifact.lessonIdはUUID形式必須（INV-12） | 非UUID形式の`lessonId='invalid-id'` | バリデーションエラーが返る |

---

## 5. テストケース総数サマリー

| 対象クラス | 生成テスト | 不変条件テスト | 等値性テスト | その他 | 合計 |
|----------|-----------|-------------|------------|------|------|
| TemplateConfig | 5 | 2 | 3 | — | 10 |
| EscalationAction | 4 | 2 | 2 | 2（formatMessage） | 10 |
| RepetitionResetCondition | 2 | — | 2 | — | 4 |
| PointerEntry | 6 | 1 | — | 4（判別メソッド） | 11 |
| CiTemplate | 5 | 2 | — | 7（withConfig/validate/isConfigured） | 14 |
| ErrorRepetition | 4 | 2 | — | 10（increment/isEscalated/reset/getEscalationAction） | 16 |
| AgentsMdPointer | 3 | 1 | — | 8（addPointer/replacePointer/validate） | 12 |
| TemplateGenerator | 5 | — | — | 3（D6マッピング） | 8 |
| RepetitionDetector | 5 | — | — | — | 5 |
| PointerValidator | 8 | — | — | — | 8 |
| LessonAggregator | 5 | — | — | 2（変換ルール） | 7 |
| **合計** | **52** | **10** | **7** | **36** | **105** |
