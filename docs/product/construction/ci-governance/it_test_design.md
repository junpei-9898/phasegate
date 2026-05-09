# ITテスト設計: ci-governance

@story-id H13-01
@story-id H13-02
@story-id H13-03
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20
> **対応ストーリー**: H13-01, H13-02, H13-03
> **Wave**: 3
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象コンポーネント

- **UseCase**: GenerateCiTemplateUseCase, RenderCiTemplateUseCase, RecordErrorOccurrenceUseCase, CheckEscalationUseCase, ResetRepetitionUseCase, MigrateAgentsMdUseCase, AggregateLessonsUseCase, ValidatePointersUseCase
- **Infrastructure Adapter**: ValidatorIdRegistryAdapter, PresetConfigAdapter, ErrorRepetitionJsonRepository, EscalationLogExecutorAdapter, YamlTemplateRendererAdapter, HarnessApiCommandExistenceAdapter, FileSystemExistenceAdapter, AdrFoundationExistenceAdapter, AgentsMdFileAdapter, LessonArtifactFileReaderAdapter
- **Presentation Handler**: GenerateCiTemplateHandler, MigrateAgentsMdHandler, CheckRepetitionHandler
- **Cross-Layer Integration**: CI/CDテンプレート生成統合フロー, 反復エラー検出統合フロー, AGENTS.md移行統合フロー

---

## 2. シードデータ要件

### 2.1 ErrorRepetition永続化テスト用

```json
// テスト用 .harness/error-history.json
{
  "version": 1,
  "entries": [
    {
      "code": "L1-001",
      "occurrenceCount": 2,
      "threshold": 3,
      "escalated": false,
      "lastUpdated": "2026-03-20T00:00:00Z"
    },
    {
      "code": "L2-001",
      "occurrenceCount": 3,
      "threshold": 3,
      "escalated": true,
      "lastUpdated": "2026-03-20T00:00:00Z"
    }
  ]
}
```

### 2.2 LessonArtifactテスト用

```json
// テスト用 lessons/test-lesson.lesson.json
{
  "lessonId": "550e8400-e29b-41d4-a716-446655440001",
  "source": "story-implementor",
  "content": "ドメインサービスは状態を持たず、ポート経由のみでI/Oを行うこと",
  "tags": ["best-practice"],
  "timestamp": "2026-03-20T00:00:00Z"
}
```

### 2.3 AGENTS.mdテスト用

```markdown
<!-- テスト用 AGENTS.md（移行前: 20行を超えるインライン記述） -->
# Agent Instructions

## Commands
- `phasegate:status` — ステータス確認コマンド
- `phasegate:check-ready` — チェックレディコマンド
...（行数確保用のダミー記述）
```

---

## 3. テスト環境設定

| 設定項目 | 内容 |
|---------|------|
| テストフレームワーク | Vitest 3.0.0 |
| テストヘルパー | `scripts/harness/__tests__/helpers/test-helpers.ts`（target/contextエイリアス） |
| モックライブラリ | Vitestビルトイン `vi.fn()` / `vi.spyOn()` |
| テスト用tmpディレクトリ | `vi.useTempDir()` または `os.tmpdir()` + テスト固有サブディレクトリ |
| ファイルI/Oテスト | 実際のファイルシステム操作（tmpdir内に実ファイルを作成して検証） |
| 外部Unitアダプタ | 全モック化（validator-system / harness-api / adr-foundation の実実装には依存しない） |

---

## 4. UseCaseテストケース

### 4.1 GenerateCiTemplateUseCase（H13-01）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-GenerateCiTemplate-001 | aidlc-gateテンプレートをstandardプリセットで生成できること | `presetId='standard'`, `templateType='aidlc-gate'` | PresetConfigPort: `getPreset()`→failOnWarning=false; ValidatorIdRegistryPort: `listAll()`→['v1','v2'] | `templateType='aidlc-gate'`, `triggerCondition='pull_request'`, `targetValidatorIds=['v1','v2']`, `validationErrors=[]` |
| IT-UC-GenerateCiTemplate-002 | consistency-checkテンプレートをstrictプリセットで生成できること | `presetId='strict'`, `templateType='consistency-check'` | PresetConfigPort: `getPreset()`→failOnWarning=true; ValidatorIdRegistryPort: `listAll()`→['v1','v2','v3'] | `triggerCondition='schedule'`, `failOnWarning=true` |
| IT-UC-GenerateCiTemplate-003 | pre-commitテンプレートをminimalプリセットで生成できること | `presetId='minimal'`, `templateType='pre-commit'` | PresetConfigPort: `getPreset()`→failOnWarning=false; ValidatorIdRegistryPort: `listAll()`→['v1'] | `triggerCondition='pre-commit'`, `validationErrors=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-GenerateCiTemplate-004 | 不正なtemplateTypeを入力した場合にエラーが返ること | `presetId='standard'`, `templateType='invalid'` | モックなし | HarnessError[]が返る（INV-1違反） |
| IT-UC-GenerateCiTemplate-005 | PresetConfigPortがI/O失敗した場合にResult.failが返ること | `presetId='standard'`, `templateType='aidlc-gate'` | PresetConfigPort: `getPreset()`→エラーをスロー | HarnessError[]を含むエラー出力が返る |

#### バリデーション

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-GenerateCiTemplate-006 | ValidatorIdRegistryPortが空リストを返す場合にINV-2違反エラーが返ること | `presetId='minimal'`, `templateType='aidlc-gate'` | ValidatorIdRegistryPort: `listAll()`→[] | `validationErrors`にINV-2違反（CI_TEMPLATE_EMPTY_VALIDATORS）が含まれる |

---

### 4.2 RenderCiTemplateUseCase（H13-01）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RenderCiTemplate-001 | aidlc-gateテンプレートが正しいoutputPathで書き出されること | `presetId='standard'`, `templateType='aidlc-gate'` | PresetConfigPort・ValidatorIdRegistryPort: 有効なデータ返却; TemplateRendererPort: `render()`→`{outputPath:'.github/workflows/aidlc-gate.yml', content:'...'}` | `outputPath='.github/workflows/aidlc-gate.yml'`, `errors=[]` |
| IT-UC-RenderCiTemplate-002 | pre-commitテンプレートが正しいoutputPathで書き出されること | `presetId='standard'`, `templateType='pre-commit'` | TemplateRendererPort: `render()`→`{outputPath:'.husky/pre-commit', content:'...'}` | `outputPath='.husky/pre-commit'` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RenderCiTemplate-003 | CiTemplate.validate()に失敗した場合はTemplateRendererPortを呼び出さないこと | `presetId='standard'`, `templateType='aidlc-gate'` | ValidatorIdRegistryPort: `listAll()`→[] | TemplateRendererPort.render()が呼び出されない。errors[]にバリデーションエラー |

---

### 4.3 RecordErrorOccurrenceUseCase（H13-02）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/record-error-occurrence-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RecordErrorOccurrence-001 | 初回エラー発生を記録するとcurrentCount=1・escalated=falseが返ること | `errorCode='L1-001'`, `errorMessage='test error'` | ErrorRepetitionRepositoryPort: `findByCode()`→null, `save()`→void | `currentCount=1`, `escalated=false`, `escalationAction=null` |
| IT-UC-RecordErrorOccurrence-002 | 既存2回のエラーに対して3回目を記録するとescalated=trueとEscalationActionが返ること | `errorCode='L1-001'`, `errorMessage='test error'` | ErrorRepetitionRepositoryPort: `findByCode()`→occurrenceCount=2のインスタンス, `save()`→void | `currentCount=3`, `escalated=true`, `escalationAction!=null` |
| IT-UC-RecordErrorOccurrence-003 | 異なるerrorCodeのエラーは独立して管理されること | `errorCode='L2-002'`（別コード） | ErrorRepetitionRepositoryPort: `findByCode('L2-002')`→null | `errorCode='L2-002'`, `currentCount=1`, `escalated=false` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-RecordErrorOccurrence-004 | リポジトリsaveが失敗した場合にエラーがスローされること | `errorCode='L1-001'`, `errorMessage='test'` | ErrorRepetitionRepositoryPort: `save()`→エラーをスロー | HarnessErrorがスローされる |

---

### 4.4 CheckEscalationUseCase（H13-02）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/check-escalation-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CheckEscalation-001 | 既存エラーコードのエスカレーション状況を確認できること | `errorCode='L2-001'` | ErrorRepetitionRepositoryPort: `findByCode()`→occurrenceCount=3, escalated=trueのインスタンス | `exists=true`, `currentCount=3`, `escalated=true` |
| IT-UC-CheckEscalation-002 | 存在しないエラーコードはexists=falseで返ること | `errorCode='L9-999'` | ErrorRepetitionRepositoryPort: `findByCode()`→null | `exists=false`, `currentCount=null`, `escalated=null` |

---

### 4.5 ResetRepetitionUseCase（H13-02）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/reset-repetition-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ResetRepetition-001 | escalated=trueのエラーをconfirmedResolution=trueでリセットできること | `errorCode='L2-001'`, `confirmedResolution=true` | ErrorRepetitionRepositoryPort: `findByCode()`→escalated=trueのインスタンス, `save()`→void | `success=true`, `errors=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ResetRepetition-002 | 存在しないエラーコードをリセットしようとするとエラーが返ること | `errorCode='L9-999'`, `confirmedResolution=true` | ErrorRepetitionRepositoryPort: `findByCode()`→null | `success=false`, `errors`に「未登録」エラーが含まれる |
| IT-UC-ResetRepetition-003 | confirmedResolution=falseの場合にINV-7違反エラーが返ること | `errorCode='L2-001'`, `confirmedResolution=false` | ErrorRepetitionRepositoryPort: `findByCode()`→escalated=trueのインスタンス | `success=false`, `errors`にREPETITION_RESET_FORBIDDEN |
| IT-UC-ResetRepetition-004 | escalated=falseのエラーをリセットしようとするとエラーが返ること | `errorCode='L1-001'`, `confirmedResolution=true` | ErrorRepetitionRepositoryPort: `findByCode()`→escalated=falseのインスタンス | `success=false`, `errors`にINV-7違反エラー |

---

### 4.6 MigrateAgentsMdUseCase（H13-03）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-MigrateAgentsMd-001 | lesson artifactを読み取りAGENTS.mdへの移行が成功すること | `dryRun=false` | LessonArtifactReaderPort: `readAll()`→2件のLessonArtifact[]; AgentsMdPort: `read()`→空AgentsMdPointer, `write()`→`{before:20, after:8}`; CommandExistencePort・FileExistencePort・AdrExistencePort: 全`exists()`→true | `success=true`, `addedPointers=2`, `linesBefore=20`, `linesAfter=8`, `kpiMet=true` |
| IT-UC-MigrateAgentsMd-002 | dryRun=trueの場合はAgentsMdPort.write()を呼び出さないこと | `dryRun=true` | LessonArtifactReaderPort: `readAll()`→1件; AgentsMdPort: `read()`→空AgentsMdPointer | `success=true`, `linesAfter=null`, `kpiMet=null`. AgentsMdPort.write()が呼び出されない |
| IT-UC-MigrateAgentsMd-003 | 移行後行数が移行前の50%以下でkpiMet=trueになること | `dryRun=false` | AgentsMdPort: `write()`→`{before:100, after:49}` | `kpiMet=true` |
| IT-UC-MigrateAgentsMd-004 | 移行後行数が移行前の50%超でkpiMet=falseになること | `dryRun=false` | AgentsMdPort: `write()`→`{before:100, after:51}` | `kpiMet=false` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-MigrateAgentsMd-005 | 同一バッチ内に重複lessonIdがある場合は移行が中断されること | `dryRun=false` | LessonArtifactReaderPort: `readAll()`→同一lessonIdを持つ2件 | `success=false`, errorsにDUPLICATE_LESSON_ID. AgentsMdPort.write()が呼び出されない |
| IT-UC-MigrateAgentsMd-006 | Dead Pointerが検出された場合は移行が中断されること | `dryRun=false` | FileExistencePort: `exists('nonexistent.md')`→false | `success=false`, errorsにAGENTS_MD_DEAD_POINTER |

---

### 4.7 AggregateLessonsUseCase（H13-03）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/aggregate-lessons-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-AggregateLessons-001 | sourceフィルタなしで全lesson artifactを変換できること | `source=undefined` | LessonArtifactReaderPort: `readAll()`→3件のLessonArtifact[] | `pointerEntries.length=3`, `totalArtifacts=3`, `errors=[]` |
| IT-UC-AggregateLessons-002 | sourceフィルタ指定で特定スキルのlesson artifactのみ変換できること | `source='story-implementor'` | LessonArtifactReaderPort: `readBySource('story-implementor')`→2件 | `pointerEntries.length=2`, `totalArtifacts=2` |
| IT-UC-AggregateLessons-003 | lesson artifactが0件の場合はpointerEntries=[]が返ること | `source=undefined` | LessonArtifactReaderPort: `readAll()`→[] | `pointerEntries=[]`, `totalArtifacts=0`, `errors=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-AggregateLessons-004 | 重複lessonIdがある場合にerrorsにDUPLICATE_LESSON_IDが含まれること | `source=undefined` | LessonArtifactReaderPort: `readAll()`→同一lessonIdを持つ2件 | `errors`にDUPLICATE_LESSON_IDエラー |

---

### 4.8 ValidatePointersUseCase（H13-03）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/validate-pointers-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ValidatePointers-001 | 全PointerEntryが実在する場合にpassed=trueが返ること | なし | AgentsMdPort: `read()`→3件のPointerEntry（全実在）; CommandExistencePort・FileExistencePort・AdrExistencePort: 全`exists()`→true | `passed=true`, `deadPointers=[]`, `errors=[]` |
| IT-UC-ValidatePointers-002 | PointerEntryが0件の場合もpassed=trueが返ること | なし | AgentsMdPort: `read()`→空AgentsMdPointer | `passed=true`, `totalPointers=0`, `deadPointers=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ValidatePointers-003 | Dead Pointerが1件検出されるとpassed=falseが返ること | なし | AgentsMdPort: `read()`→2件のPointerEntry; FileExistencePort: `exists('missing.md')`→false | `passed=false`, `deadPointers=['missing-key']`, `errors.length>=1` |

---

## 5. Infrastructure Adapterテストケース

### 5.1 ErrorRepetitionJsonRepository

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/error-repetition-json-repository.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ErrorRepetitionJson-001 | error-history.jsonが存在しない場合にfindByCodeがnullを返すこと | `code='L1-001'` | tmpdir内にファイルなし | nullが返る |
| IT-REPO-ErrorRepetitionJson-002 | save()後にfindByCode()で同じインスタンスが取得できること | 有効なErrorRepetitionインスタンス | tmpdir内にファイルなし（save()で新規作成） | save→findByCodeで同一occurrenceCount/escalatedが取得できる |
| IT-REPO-ErrorRepetitionJson-003 | 既存エントリをsave()で更新できること | occurrenceCount=3のErrorRepetition | tmpdir内に既存ファイル（occurrenceCount=2のエントリ） | findByCode()でoccurrenceCount=3が返る |
| IT-REPO-ErrorRepetitionJson-004 | deleteByCode()で対象エントリが削除されること | `code='L1-001'` | tmpdir内に'L1-001'エントリを持つファイル | deleteByCode後のfindByCode()がnullを返す |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ErrorRepetitionJson-005 | スキーマ不正なJSONファイルをfindByCode()した場合にHarnessErrorがスローされること | `code='L1-001'` | tmpdir内にスキーマ不正なerror-history.json | HarnessErrorがスローされる |

---

### 5.2 AgentsMdFileAdapter

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/agents-md-file-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-AgentsMdFile-001 | 有効なAGENTS.mdをread()してAgentsMdPointerが返ること | なし | tmpdir内にPointerEntry形式のAGENTS.mdファイル | PointerEntry[]とadrLinks[]が正しくパースされたAgentsMdPointerが返る |
| IT-REPO-AgentsMdFile-002 | write()後にread()で同じPointerEntry[]が取得できること | 2件のPointerEntry[]を持つAgentsMdPointer | tmpdir内の空AGENTS.md | write→readで同一PointerEntry[]が取得できる |
| IT-REPO-AgentsMdFile-003 | write()が移行前後の行数（before/after）を正しく返すこと | 2件のPointerEntry[]を持つAgentsMdPointer | tmpdir内に10行のAGENTS.md | `{before: 10, after: <実際の書き込み行数>}`が返る |

---

### 5.3 FileSystemExistenceAdapter

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/file-system-existence-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-FileSystemExistence-001 | 実在するファイルパスに対してexists()がtrueを返すこと | tmpdir内の実ファイルの相対パス | tmpdirに実ファイルを作成 | trueが返る |
| IT-REPO-FileSystemExistence-002 | 存在しないファイルパスに対してexists()がfalseを返すこと | 存在しないファイルのパス | ファイルなし | falseが返る |

---

### 5.4 LessonArtifactFileReaderAdapter

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/lesson-artifact-file-reader-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-LessonArtifactReader-001 | lessons/ディレクトリの*.lesson.jsonを全件読み取れること | なし | tmpdir/lessonsに2件の有効な.lesson.jsonファイル | LessonArtifact[] 2件が返る |
| IT-REPO-LessonArtifactReader-002 | readBySource()で指定スキル名のartifactのみ取得できること | `source='domain-designer'` | tmpdir/lessonsにsource='story-implementor'とsource='domain-designer'が1件ずつ | 1件のみ返る |
| IT-REPO-LessonArtifactReader-003 | スキーマ不正な.lesson.jsonは読み飛ばされること | なし | tmpdir/lessonsにスキーマ不正な.lesson.json1件と有効な.lesson.json1件 | 有効な1件のみが返る |
| IT-REPO-LessonArtifactReader-004 | lessonsディレクトリが存在しない場合は空配列が返ること | なし | tmpdirにlessonsディレクトリなし | `[]`が返る |

---

## 6. Presentation Handlerテストケース

### 6.1 GenerateCiTemplateHandler

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-GenerateCiTemplateHandler-001 | --dry-runフラグ付きでGenerateCiTemplateUseCaseが呼び出されること | `args=['--template-type','aidlc-gate','--dry-run']` | GenerateCiTemplateUseCaseモック: `execute()`→有効なGenerateCiTemplateOutput | exitCode=0、GenerateCiTemplateUseCase.execute()が1回呼び出される。RenderCiTemplateUseCase.execute()は呼び出されない |
| IT-API-GenerateCiTemplateHandler-002 | --dry-runなしでRenderCiTemplateUseCaseが呼び出されること | `args=['--template-type','aidlc-gate','--preset-id','standard']` | RenderCiTemplateUseCaseモック: `execute()`→有効なRenderCiTemplateOutput | exitCode=0、RenderCiTemplateUseCase.execute()が1回呼び出される |
| IT-API-GenerateCiTemplateHandler-003 | --format=jsonで出力がJSON形式になること | `args=['--template-type','pre-commit','--format','json']` | RenderCiTemplateUseCaseモック: `execute()`→有効な出力 | stdout出力がJSONパース可能な文字列 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-GenerateCiTemplateHandler-004 | --template-typeを省略するとexitCode=2が返ること | `args=[]`（必須引数なし） | モックなし | exitCode=2 |
| IT-API-GenerateCiTemplateHandler-005 | UseCaseがHarnessErrorを返した場合にexitCode=1が返ること | `args=['--template-type','aidlc-gate']` | RenderCiTemplateUseCaseモック: `execute()`→errors=[HarnessError1件] | exitCode=1 |

---

### 6.2 MigrateAgentsMdHandler

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-MigrateAgentsMdHandler-001 | --dry-runフラグ付きでMigrateAgentsMdUseCaseがdryRun=trueで呼ばれること | `args=['--dry-run']` | MigrateAgentsMdUseCaseモック: `execute({dryRun:true})`→success=true | exitCode=0、MigrateAgentsMdUseCase.execute({dryRun:true})が呼び出される |
| IT-API-MigrateAgentsMdHandler-002 | --validate-onlyフラグ付きでValidatePointersUseCaseが呼ばれること | `args=['--validate-only']` | ValidatePointersUseCaseモック: `execute()`→passed=true | exitCode=0、ValidatePointersUseCase.execute()が呼び出される |
| IT-API-MigrateAgentsMdHandler-003 | KPI達成時（kpiMet=true）にexitCode=0が返ること | `args=[]` | MigrateAgentsMdUseCaseモック: `execute()`→success=true, kpiMet=true | exitCode=0 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-MigrateAgentsMdHandler-004 | Dead Pointer検出時にexitCode=1が返ること | `args=[]` | MigrateAgentsMdUseCaseモック: `execute()`→success=false, errors=[DEAD_POINTER] | exitCode=1 |
| IT-API-MigrateAgentsMdHandler-005 | KPI未達（kpiMet=false）でexitCode=1が返ること | `args=[]` | MigrateAgentsMdUseCaseモック: `execute()`→success=true, kpiMet=false | exitCode=1 |

---

### 6.3 CheckRepetitionHandler

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/check-repetition-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-CheckRepetitionHandler-001 | --error-code指定でCheckEscalationUseCaseが呼ばれること | `args=['--error-code','L1-001']` | CheckEscalationUseCaseモック: `execute({errorCode:'L1-001'})`→exists=true, escalated=false | exitCode=0、CheckEscalationUseCase.execute()が呼び出される |
| IT-API-CheckRepetitionHandler-002 | --resetフラグ付きでResetRepetitionUseCaseが呼ばれること | `args=['--error-code','L2-001','--reset']` | ResetRepetitionUseCaseモック: `execute()`→success=true | exitCode=0、ResetRepetitionUseCase.execute()が呼び出される |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-CheckRepetitionHandler-003 | 存在しないエラーコードを--error-code指定するとexitCode=1が返ること | `args=['--error-code','L9-999']` | CheckEscalationUseCaseモック: `execute()`→exists=false | exitCode=1 |
| IT-API-CheckRepetitionHandler-004 | --resetでINV-7違反エラーが返った場合にexitCode=1が返ること | `args=['--error-code','L1-001','--reset']` | ResetRepetitionUseCaseモック: `execute()`→success=false, errors=[REPETITION_RESET_FORBIDDEN] | exitCode=1 |

---

## 7. Cross-Layer統合テストケース

### 7.1 CI/CDテンプレート生成統合フロー（H13-01）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/ci-template-generation-flow.test.ts`

#### 統合テスト

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-CiTemplateFlow-001 | Handler→UseCase→TemplateGenerator→CiTemplateの全レイヤーが連携してテンプレートを生成できること | `templateType='aidlc-gate'`, `presetId='standard'` | PresetConfigPortモック, ValidatorIdRegistryPortモック, TemplateRendererPortモック: 全て有効なデータ返却 | 出力にtemplateType/triggerCondition/targetValidatorIdsが含まれ、TemplateRendererPort.render()が1回呼ばれる |
| IT-API-CiTemplateFlow-002 | templateType×triggerConditionの全3種マッピングが正しく連携されること | 3種のtemplateType（aidlc-gate/consistency-check/pre-commit） | PresetConfigPortモック, ValidatorIdRegistryPortモック | aidlc-gate→pull_request, consistency-check→schedule, pre-commit→pre-commitの対応でTemplateRendererPortが呼ばれる |

---

### 7.2 反復エラー検出統合フロー（H13-02）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/error-repetition-flow.test.ts`

#### 統合テスト

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-RepetitionFlow-001 | 同一エラーコードを3回RecordErrorOccurrenceすると3回目でescalated=trueになること | `errorCode='L1-001'`を3回連続実行 | ErrorRepetitionRepositoryPortモック（状態を保持するstateful mock） | 1回目: escalated=false, 2回目: escalated=false, 3回目: escalated=true, escalationAction!=null |
| IT-API-RepetitionFlow-002 | RepetitionDetectorがEscalationActionを返した後、アプリケーション層がEscalationExecutorPortを呼び出すこと | `errorCode='L1-001'`（3回目） | ErrorRepetitionRepositoryPortモック（occurrenceCount=2を返す）, EscalationExecutorPortモック | EscalationExecutorPort.execute()が1回呼び出される（logLevel/messageTemplateが渡される） |
| IT-API-RepetitionFlow-003 | reset後のerrorCodeは再びoccurrenceCount=0から開始すること | `errorCode='L2-001'`（既存escalated=true）をreset後に再記録 | ErrorRepetitionRepositoryPortモック（reset後状態管理） | reset: success=true。再記録1回目: currentCount=1, escalated=false |

---

### 7.3 AGENTS.md移行統合フロー（H13-03）

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/agents-md-migration-flow.test.ts`

#### 統合テスト

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-AgentsMdFlow-001 | Handler→MigrateAgentsMdUseCase→LessonAggregator→PointerValidator→AgentsMdPortの全フローが連携できること | `dryRun=false` | LessonArtifactReaderPortモック: 2件返却; AgentsMdPortモック: read→空AgentsMdPointer, write→`{before:20,after:8}`; 全ExistencePortモック: true | `success=true`, `addedPointers=2`, `kpiMet=true` |
| IT-API-AgentsMdFlow-002 | Dead Pointer検出時は全レイヤーを通してwrite()がスキップされること | `dryRun=false` | LessonArtifactReaderPortモック: 1件返却; AgentsMdPortモック: read→空AgentsMdPointer; FileExistencePortモック: false | `success=false`, AgentsMdPort.write()が呼び出されない |
| IT-API-AgentsMdFlow-003 | Shared Kernel（HarnessError/HarnessErrorCode）が全レイヤーを通じて正しく伝播されること | `dryRun=false`（重複lessonId入力） | LessonArtifactReaderPortモック: 重複lessonId2件 | 返却されたHarnessErrorのcodeがDUPLICATE_LESSON_IDであること。エラーがレイヤー境界で再包装されず型安全に伝播されること |

---

## 8. WI-031 CI template render 統合テスト

<!-- @work-item-id WI-031 -->

### 8.1 TemplateRendererPort 正本一致

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-UC-RenderCiTemplate-WI031-001 | aidlc-gate を render すると bundled template と一致すること | `templateType='aidlc-gate'` | `content` が `docs/templates/ci/aidlc-gate.yml` と一致する |
| IT-UC-RenderCiTemplate-WI031-002 | consistency-check を render すると bundled template と一致すること | `templateType='consistency-check'` | `content` が `docs/templates/ci/consistency-check.yml` と一致し、GitHub Issue 作成 logic を含む |
| IT-UC-RenderCiTemplate-WI031-003 | pre-commit を render すると bundled hook と一致すること | `templateType='pre-commit'` | `content` が `docs/templates/hooks/pre-commit` と一致する |

### 8.2 GenerateCiTemplateHandler の `--render`

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-API-GenerateCiTemplateHandler-WI031-001 | render=true の場合に RenderCiTemplateUseCase が呼ばれること | `{ templateType:'aidlc-gate', render:true }` | `GenerateCiTemplateUseCase` ではなく `RenderCiTemplateUseCase` の content が output になる |
| IT-API-GenerateCiTemplateHandler-WI031-002 | render=false の場合に既存 summary 出力を維持すること | `{ templateType:'aidlc-gate' }` | `GenerateCiTemplateUseCase` が呼ばれ、summary formatter が使われる |
| IT-API-GenerateCiTemplateHandler-WI031-003 | render=true かつ format=json の場合に JSON で返ること | `{ templateType:'aidlc-gate', render:true, format:'json' }` | `outputPath`, `content`, `errors` を含む JSON 文字列になる |

---

## 9. WI-032 agent context refresh 統合テスト

<!-- @work-item-id WI-032 -->

### 9.1 RefreshAgentContext

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/refresh-agent-context-usecase.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-UC-RefreshAgentContext-WI032-001 | dry-run では AGENTS.md / CLAUDE.md を書き換えないこと | `{ dryRun:true }` | `success=true`, `applied=false`, preview が返る |
| IT-UC-RefreshAgentContext-WI032-002 | apply では AGENTS.md pointer と CLAUDE.md 標準セクションを更新すること | `{ dryRun:false }` | `applied=true`, 対象ファイルが更新される |
| IT-UC-RefreshAgentContext-WI032-003 | CLAUDE.md の user section が保持されること | 既存 CLAUDE.md に marker 内独自記述あり | marker 内テキストが更新後も残る |

### 9.2 Handler / CLI

**テスト配置**: `scripts/harness/__tests__/integration/ci-governance/refresh-agent-context-handler.test.ts`

| ケースID | シナリオ | 入力 | 期待結果 |
|---|---|---|---|
| IT-API-RefreshAgentContext-WI032-001 | `--dry-run` が use case に伝播すること | `{ dryRun:true }` | exitCode 0、dry-run 表示 |
| IT-API-RefreshAgentContext-WI032-002 | `--apply --json` が JSON を返すこと | `{ apply:true, format:'json' }` | JSON parse 可能で `applied=true` |
| IT-API-RefreshAgentContext-WI032-003 | agent-context-refresh template を render できること | `templateType='agent-context-refresh'` | workflow content が返る |
