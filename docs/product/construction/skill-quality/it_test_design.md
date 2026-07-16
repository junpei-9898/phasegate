# ITテスト設計: skill-quality

@story-id H12-01
@story-id H12-02
@story-id H12-03
@story-id H12-04
@story-id H12-05
@story-id H12-06
> **Unit ID**: skill-quality

<!-- @work-item-id WI-184 -->
Skill catalog CLI regression coverage includes a real `skills list` process test for guidance-category skills and helper-level coverage for an empty catalog plus shared `skills/<name>/SKILL.md` path resolution.
> **作成日**: 2026-03-20
> **対応ストーリー**: H12-01, H12-02, H12-03, H12-04, H12-05, H12-06
> **Wave**: 3
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象コンポーネント

- **UseCase**: ExecuteTddCycleUseCase, CheckCoverageUseCase, RunPlanCheckerLoopUseCase, CollectLessonsUseCase, WriteLessonArtifactUseCase, ApplyCascadeUpdateUseCase, ValidateSkillStructureUseCase
- **Infrastructure Adapter**: GitCommitExecutorAdapter, L1BiomeValidatorAdapter, L2ValidatorSystemAdapter, FileSystemLessonSourceReaderAdapter, FileSystemLessonArtifactWriterAdapter, AjvLessonArtifactSchemaAdapter, FileSystemRequirementTestMatrixAdapter, ValidatorIdRegistryBridgeAdapter, HarnessConfigQueryAdapter, VitestCoverageRunnerAdapter, FileSystemSkillFileReaderAdapter
- **Presentation Handler**: ExecuteTddCycleHandler, CheckCoverageHandler, RunPlanCheckerLoopHandler, CollectLessonsHandler, ApplyCascadeUpdateHandler, ValidateSkillStructureHandler
- **Cross-Layer Integration**: TDD サイクル実行統合, カバレッジ検証統合, Plan-Checker Loop 統合, Lesson Artifact 統合, Cascade Update 統合, SKILL.md 検証統合

---

## 2. UseCaseテストケース

### ExecuteTddCycleUseCase（H12-01）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/execute-tdd-cycle-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ExecTdd-001 | REFACTOR+passed=true でコミットが成功すること | unit='skill-quality', storyId='H12-01', description='add domain model', phase='REFACTOR', passed=true | CommitExecutorPort: commit→void, L1ValidatorPort: validate→[], L2ValidatorPort: validate→[] | output.ready=true, output.violations=[], output.committedMessage='feat(skill-quality/H12-01): add domain model' |
| IT-UC-ExecTdd-002 | L1 違反がある場合にコミットが実行されないこと | phase='REFACTOR', passed=true | L1ValidatorPort: validate→[{ ruleId: 'L1-001', message: 'format error' }], L2ValidatorPort: 呼ばれない, CommitExecutorPort: 呼ばれない | output.ready=false, output.violations.length=1, output.committedMessage=null |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ExecTdd-003 | phase='GREEN' の場合に TDD_CYCLE_INCOMPLETE エラーになること | phase='GREEN', passed=true | モック不要 | HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる |
| IT-UC-ExecTdd-004 | phase='REFACTOR', passed=false の場合にエラーになること | phase='REFACTOR', passed=false | モック不要 | HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる |
| IT-UC-ExecTdd-005 | storyId が空文字列の場合に入力バリデーションエラーになること | storyId='' | モック不要 | HarnessError(EMPTY_COMMIT_FIELD) がスローされる |

#### バリデーション

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ExecTdd-006 | L2 のみ違反がある場合にコミットが実行されないこと | 有効な phase/passed | L1ValidatorPort: validate→[], L2ValidatorPort: validate→[{ ruleId: 'L2-001', message: 'lint error' }], CommitExecutorPort: 呼ばれない | output.ready=false, output.violations[0].ruleId='L2-001' |

---

### CheckCoverageUseCase（H12-02）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/check-coverage-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CheckCov-001 | 要件カバレッジ 100% + コードカバレッジ 85% で閾値達成すること | storyId='H12-02' | ConfigQueryPort: { requirement: 100, code: 80 }, RequirementTestMatrixPort: total=5, covered=5, uncoveredIds=[], CoverageRunnerPort: line=85, branch=80, fn=90 | output.meetsThreshold=true, output.coverageReport.requirementCoverage.coverageRate=100 |
| IT-UC-CheckCov-002 | 要件カバレッジ 80% で閾値未達になること | storyId='H12-02' | ConfigQueryPort: { requirement: 100, code: 80 }, RequirementTestMatrixPort: total=5, covered=4, uncoveredIds=['REQ-05'], CoverageRunnerPort: line=85 | output.meetsThreshold=false, output.coverageReport.requirementCoverage.uncoveredIds=['REQ-05'] |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CheckCov-003 | RequirementTestMatrix ファイルが見つからない場合にエラーになること | storyId='H12-02' | RequirementTestMatrixPort: read→throw HarnessError(MATRIX_FILE_NOT_FOUND) | HarnessError(MATRIX_FILE_NOT_FOUND) が伝播する |
| IT-UC-CheckCov-004 | CoverageRunner が失敗した場合にエラーになること | storyId='H12-02' | CoverageRunnerPort: run→throw HarnessError(COVERAGE_RUN_FAILED) | HarnessError(COVERAGE_RUN_FAILED) が伝播する |

---

### RunPlanCheckerLoopUseCase（H12-03）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/run-plan-checker-loop-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-PlanLoop-001 | 1 回目の評価で gaps=[] になりPASSED で終了すること | planDocument='...', storyId='H12-03' | PlanCheckExecutorPort: 1 回目→{ coverageRate: 100, gaps: [] } | output.status='PASSED', output.loopHistory.length=1, output.escalationRequired=false |
| IT-UC-PlanLoop-002 | 2 回目の評価で gaps=[] になり PASSED で終了すること | planDocument='...', storyId='H12-03' | PlanCheckExecutorPort: 1 回目→{ coverageRate: 60, gaps: ['gap1'] }, 2 回目→{ coverageRate: 100, gaps: [] } | output.status='PASSED', output.loopHistory.length=2, output.escalationRequired=false |
| IT-UC-PlanLoop-003 | 3 回全て gaps 非空で FAILED_EXCEEDED になること | planDocument='...', storyId='H12-03' | PlanCheckExecutorPort: 全 3 回→{ coverageRate: 50, gaps: ['gap1'] } | output.status='FAILED_EXCEEDED', output.loopHistory.length=3, output.escalationRequired=true |

#### エラーハンドリング

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-PlanLoop-004 | PlanCheckExecutorPort が例外をスローした場合にエラーが伝播すること | planDocument='...', storyId='H12-03' | PlanCheckExecutorPort: evaluate→throw new Error('executor error') | エラーが UseCase 外に伝播する |

---

### CollectLessonsUseCase（H12-04 前半）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/collect-lessons-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CollLess-001 | agentLessonCollection が有効で Lesson が収集されること | sources=['path1', 'path2'] | ConfigQueryPort: isAgentLessonCollectionEnabled→true, LessonSourceReaderPort: 各 2 件の RawLessonEntry | output.lessons.length=4, output.totalCollected=4, output.deduplicatedCount=0 |
| IT-UC-CollLess-002 | 重複がある場合に deduplicate されること | sources=['path1'] | ConfigQueryPort: true, LessonSourceReaderPort: 同一 content の RawLessonEntry 3 件 | output.lessons.length=1, output.totalCollected=3, output.deduplicatedCount=2 |
| IT-UC-CollLess-003 | agentLessonCollection が無効の場合に空で返すこと | sources=['path1'] | ConfigQueryPort: isAgentLessonCollectionEnabled→false | output.lessons=[], output.totalCollected=0, output.deduplicatedCount=0, LessonSourceReaderPort は呼ばれない |

---

### WriteLessonArtifactUseCase（H12-04 後半）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/write-lesson-artifact-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-WriteLess-001 | 有効な Lesson[] が JSON として出力されること | storyId='H12-04', lessons=2 件 | LessonArtifactSchemaPort: validate→[], LessonArtifactWriterPort: write→void | output.lessonCount=2, output.outputPath が '.harness/lesson-artifacts/' で始まる |
| IT-UC-WriteLess-002 | lessons=[] の場合に空の Artifact が出力されること | storyId='H12-04', lessons=[] | LessonArtifactSchemaPort: validate→[], LessonArtifactWriterPort: write→void | output.lessonCount=0 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-WriteLess-003 | ci-governance スキーマ違反でエラーになること | storyId='H12-04', lessons=1 件 | LessonArtifactSchemaPort: validate→[{ ruleId: 'schema-001', message: 'missing field' }] | HarnessError(LESSON_ARTIFACT_SCHEMA_VIOLATION) がスローされる |
| IT-UC-WriteLess-004 | storyId が INVALID 形式でエラーになること | storyId='INVALID' | モック不要 | HarnessError(INVALID_STORY_ID) がスローされる |

---

### ApplyCascadeUpdateUseCase（H12-05）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/apply-cascade-update-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CascUpd-001 | 2 件のターゲットファイルに @story-id が付与されること | storyId='H12-05' | CascadeUpdateService.resolve→[target1, target2], FileSystemPort: read→'# existing content', write→void | output.updatedCount=2, output.appliedStoryIds=['@story-id H12-05'] |
| IT-UC-CascUpd-002 | 対象ファイルがない場合に更新なしで正常終了すること | storyId='H12-05' | CascadeUpdateService.resolve→[], FileSystemPort: 呼ばれない | output.updatedCount=0, output.errors=[] |

#### エラーハンドリング

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-CascUpd-003 | 一部ファイルの書き込みが失敗した場合に errors に記録されること | storyId='H12-05' | CascadeUpdateService.resolve→[target1, target2], FileSystemPort: target1 は成功、target2 は throw Error('write failed') | output.updatedCount=1, output.errors.length=1 |

---

### ValidateSkillStructureUseCase（H12-06）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/validate-skill-structure-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ValSkill-001 | 全必須セクションが揃っている場合に passed=true になること | skillFilePath='skills/example.skill' | SkillStructureValidator（実体使用）, SkillFileReaderPort: read→全 6 セクションを含む Markdown | output.result.passed=true, output.result.missingSection=[] |
| IT-UC-ValSkill-002 | 'purpose' が欠落している場合に passed=false になること | skillFilePath='skills/example.skill' | SkillFileReaderPort: read→'purpose' セクションなしの Markdown | output.result.passed=false, output.result.missingSection=['purpose'] |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-ValSkill-003 | ファイルが存在しない場合に SKILL_FILE_NOT_FOUND エラーになること | skillFilePath='skills/nonexistent.skill' | SkillFileReaderPort: read→throw HarnessError(SKILL_FILE_NOT_FOUND) | HarnessError(SKILL_FILE_NOT_FOUND) が伝播する |

---

## 3. Infrastructure Adapter テストケース

### GitCommitExecutorAdapter（CommitExecutorPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/git-commit-executor-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-GitCommit-001 | 有効な CommitMessage で git commit が実行されること | CommitMessage(unit='skill-quality', storyId='H12-01', description='test') | child_process.exec モック: 終了コード 0 | commit が成功する（例外なし）、実行コマンドに 'feat(skill-quality/H12-01): test' が含まれる |
| IT-REPO-GitCommit-002 | git commit が失敗した場合に GIT_COMMIT_FAILED エラーになること | 有効な CommitMessage | child_process.exec モック: 終了コード 1, stderr='nothing to commit' | HarnessError(GIT_COMMIT_FAILED) がスローされる |

---

### FileSystemLessonSourceReaderAdapter（LessonSourceReaderPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/file-system-lesson-source-reader-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-LessReader-001 | [Agent-Lesson] タグを含むファイルからエントリが抽出されること | source='path/to/lesson-file.ts' | node:fs/promises モック: readFile→'<!-- [Agent-Lesson] content1 -->\n...' | RawLessonEntry[] に 1 件が含まれる |
| IT-REPO-LessReader-002 | [Agent-Lesson] タグがないファイルで空配列が返されること | source='path/to/no-lesson.ts' | node:fs/promises モック: readFile→'// no lessons here' | [] が返される |
| IT-REPO-LessReader-003 | 複数の [Agent-Lesson] タグが全て抽出されること | source='path/to/file.ts' | node:fs/promises モック: readFile→2 件の [Agent-Lesson] タグを含む内容 | RawLessonEntry[] に 2 件が含まれる |

---

### FileSystemLessonArtifactWriterAdapter（LessonArtifactWriterPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/file-system-lesson-artifact-writer-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-LessWriter-001 | LessonArtifact が JSON ファイルとして出力されること | LessonArtifact（lessons=1 件） | node:fs/promises モック: mkdir→void, writeFile→void | writeFile が '.harness/lesson-artifacts/*.json' パスで 1 回呼ばれる |
| IT-REPO-LessWriter-002 | 出力先ディレクトリが存在しない場合に作成されること | LessonArtifact | node:fs/promises モック: mkdir（recursive=true）→void | mkdir が recursive=true で呼ばれる |

---

### AjvLessonArtifactSchemaAdapter（LessonArtifactSchemaPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/ajv-lesson-artifact-schema-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-LessSchema-001 | スキーマ準拠の JSON が violations=[] で通過すること | ci-governance スキーマ準拠の JSON オブジェクト | スキーマファイル実体を使用 | validate() が [] を返す |
| IT-REPO-LessSchema-002 | 必須フィールド欠落の JSON が violations 非空で返すこと | storyId フィールドが欠落した JSON | スキーマファイル実体を使用 | validate() に ValidationViolation が 1 件以上含まれる |

---

### FileSystemRequirementTestMatrixAdapter（RequirementTestMatrixPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/file-system-requirement-test-matrix-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ReqMatrix-001 | storyId に対応するマトリックスが読み取られること | storyId='H12-02' | node:fs/promises モック: readFile→H12-02 エントリを含む JSON | RequirementTestMatrix が返される |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ReqMatrix-002 | ファイルが存在しない場合に MATRIX_FILE_NOT_FOUND エラーになること | storyId='H12-02' | node:fs/promises モック: readFile→throw ENOENT | HarnessError(MATRIX_FILE_NOT_FOUND) がスローされる |

---

### HarnessConfigQueryAdapter（ConfigQueryPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/harness-config-query-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ConfigQuery-001 | getCoverageThreshold() が設定から閾値を返すこと | なし | HarnessConfigV2 モック: layers.L3.coverageThreshold=80, requirementCoverageThreshold=100 | { requirement: 100, code: 80 } が返される |
| IT-REPO-ConfigQuery-002 | isAgentLessonCollectionEnabled() が設定値を返すこと | なし | HarnessConfigV2 モック: harnesses.agentLessonCollection=true | true が返される |
| IT-REPO-ConfigQuery-003 | getCascadeUpdateTargetPatterns() がデフォルトパターンを返すこと | なし | HarnessConfigV2 モック: harnesses.cascadeUpdate=true | デフォルトのパターン配列が返される |

---

### FileSystemSkillFileReaderAdapter（SkillFileReaderPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/file-system-skill-file-reader-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-SkillReader-001 | 存在するファイルの内容が読み取られること | filePath='skills/example.skill' | node:fs/promises モック: readFile→'# SKILL content' | '# SKILL content' が返される |
| IT-REPO-SkillReader-002 | exists() がファイル存在時に true を返すこと | filePath='skills/example.skill' | node:fs/promises モック: access→void（成功） | true が返される |
| IT-REPO-SkillReader-003 | exists() がファイル不在時に false を返すこと（例外を投げない） | filePath='skills/missing.skill' | node:fs/promises モック: access→throw ENOENT | false が返される（例外は投げない） |

---

### L1BiomeValidatorAdapter（L1ValidatorPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/l1-biome-validator-adapter.test.ts`

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-L1Biome-001 | L1バリデーション全通過の場合、passed=trueが返ること | なし | biome-ast-engineスタブ: 全ルールpassedの結果を返す | `{passed: true, violations: []}` |
| IT-REPO-L1Biome-002 | L1バリデーション違反がある場合、passed=falseとviolationsが返ること | なし | biome-ast-engineスタブ: L1-001違反のRuleViolation 2件 | `{passed: false, violations: [2件]}` |
| IT-REPO-L1Biome-003 | biome-ast-engineが例外をスローした場合、エラーが呼び出し元に伝播すること | なし | biome-ast-engineスタブ: throw new Error('biome error') | Errorが呼び出し元にスローされる |

---

### L2ValidatorSystemAdapter（L2ValidatorPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/l2-validator-system-adapter.test.ts`

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-L2Validator-001 | L2バリデーション全通過の場合、passed=trueが返ること | なし | validator-systemスタブ: L2全通過のValidatorCheckItem[]を返す | `{passed: true, violations: []}` |
| IT-REPO-L2Validator-002 | L2バリデーション失敗がある場合、passed=falseとviolationsが返ること | なし | validator-systemスタブ: L2-001違反のCheckItem 1件 | `{passed: false, violations: [1件]}` |
| IT-REPO-L2Validator-003 | validator-systemが例外をスローした場合、エラーが呼び出し元に伝播すること | なし | validator-systemスタブ: throw new Error | Errorが呼び出し元にスローされる |

---

### VitestCoverageRunnerAdapter（CoverageRunnerPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/vitest-coverage-runner-adapter.test.ts`

| ケースID | シナリオ | 入力 | モック設定/事前条件 | 期待結果 |
|---------|---------|------|-----------------|---------|
| IT-REPO-CovRunner-001 | カバレッジ実行が成功した場合、CoverageResultが返ること | targetPath='scripts/harness/...' | プロセス実行スタブ: coverage JSON出力（lines: 85%）を返す | `CoverageResult{lineCoverage: 85, passed: false（閾値90%未満）}` |
| IT-REPO-CovRunner-002 | カバレッジが閾値（90%）以上の場合、passed=trueが返ること | targetPath=任意 | プロセス実行スタブ: lines: 95% の出力 | `CoverageResult{lineCoverage: 95, passed: true}` |
| IT-REPO-CovRunner-003 | vitestプロセスがエラー終了した場合、エラーが伝播すること | targetPath=任意 | プロセス実行スタブ: exit code 1 | Errorがスローされる |

---

### ValidatorIdRegistryBridgeAdapter（ValidatorIdRegistryPort 実装）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/validator-id-registry-bridge-adapter.test.ts`

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-ValidatorBridge-001 | バリデータID一覧が正常に取得できること | なし | validator-systemスタブ: ['L2-001','L2-002','L3-001']を返す | `string[]`の長さ=3、'L2-001'が含まれる |
| IT-REPO-ValidatorBridge-002 | バリデータが0件の場合、空配列が返ること | なし | validator-systemスタブ: []を返す | 空配列 |
| IT-REPO-ValidatorBridge-003 | validator-systemが例外をスローした場合、エラーが伝播すること | なし | validator-systemスタブ: throw new Error | Errorが呼び出し元にスローされる |

---

## 4. Presentation Handler テストケース

### ExecuteTddCycleHandler

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/execute-tdd-cycle-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-TddHandler-001 | REFACTOR+passed=true でコミット成功時に終了コード 0 になること | args=['--unit', 'skill-quality', '--story-id', 'H12-01', '--description', 'desc', '--phase', 'REFACTOR', '--passed'] | ExecuteTddCycleUseCase モック: execute→{ ready: true, violations: [], committedMessage: 'feat(...)' } | 終了コード 0、stdout に commit message が含まれる |
| IT-API-TddHandler-002 | L1/L2 違反時に終了コード 1 になること | args=['--phase', 'REFACTOR', '--passed', ...] | ExecuteTddCycleUseCase モック: execute→{ ready: false, violations: [{ ruleId: 'L1-001', message: 'error' }], committedMessage: null } | 終了コード 1、stderr/stdout に violations が含まれる |

#### バリデーション

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-TddHandler-003 | --unit 引数が不足している場合に終了コード 2 になること | args=['--story-id', 'H12-01', '--description', 'desc', '--phase', 'REFACTOR'] | モック不要 | 終了コード 2、エラーメッセージが出力される |

---

### CheckCoverageHandler

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/check-coverage-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-CovHandler-001 | 閾値達成時に終了コード 0 になること | args=['--story-id', 'H12-02'] | CheckCoverageUseCase モック: execute→{ meetsThreshold: true, coverageReport: {...}, requirementThreshold: 100, codeThreshold: 80 } | 終了コード 0、カバレッジ率が stdout に出力される |
| IT-API-CovHandler-002 | 閾値未達時に終了コード 1 になること | args=['--story-id', 'H12-02'] | CheckCoverageUseCase モック: execute→{ meetsThreshold: false, coverageReport: {...}, ... } | 終了コード 1、未カバー項目が出力される |
| IT-API-CovHandler-003 | --format json 指定時に JSON 形式で出力されること | args=['--story-id', 'H12-02', '--format', 'json'] | CheckCoverageUseCase モック: execute→閾値達成の output | 終了コード 0、stdout が有効な JSON 文字列である |

---

### RunPlanCheckerLoopHandler

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/run-plan-checker-loop-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-PlanHandler-001 | PASSED で終了コード 0 になること | args=['--plan-file', 'plan.md', '--story-id', 'H12-03'] | RunPlanCheckerLoopUseCase モック: execute→{ status: 'PASSED', loopHistory: [...], escalationRequired: false } | 終了コード 0、成功メッセージが出力される |
| IT-API-PlanHandler-002 | FAILED_EXCEEDED で終了コード 1 になること | args=['--plan-file', 'plan.md', '--story-id', 'H12-03'] | RunPlanCheckerLoopUseCase モック: execute→{ status: 'FAILED_EXCEEDED', loopHistory: [...], escalationRequired: true } | 終了コード 1、警告メッセージが出力される |

---

### CollectLessonsHandler

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/collect-lessons-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-LessHandler-001 | 収集成功時に終了コード 0 になること | args=['--story-id', 'H12-04', '--sources', 'path1', 'path2'] | CollectLessonsUseCase モック: execute→{ lessons: [1 件], totalCollected: 1, deduplicatedCount: 0 } | 終了コード 0、収集統計が出力される |
| IT-API-LessHandler-002 | --write-artifact 指定時に WriteLessonArtifactUseCase も呼ばれること | args=['--story-id', 'H12-04', '--sources', 'path1', '--write-artifact'] | CollectLessonsUseCase モック: 成功, WriteLessonArtifactUseCase モック: execute→{ outputPath: '.harness/...', lessonCount: 1 } | 終了コード 0、出力パスが stdout に含まれる |
| IT-API-LessHandler-003 | agentLessonCollection 無効で 0 件収集時に終了コード 0 になること | args=['--story-id', 'H12-04', '--sources', 'path1'] | CollectLessonsUseCase モック: execute→{ lessons: [], totalCollected: 0, deduplicatedCount: 0 } | 終了コード 0（0 件も正常） |

---

### ApplyCascadeUpdateHandler

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/apply-cascade-update-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-CascHandler-001 | 全ファイル更新成功時に終了コード 0 になること | args=['--story-id', 'H12-05'] | ApplyCascadeUpdateUseCase モック: execute→{ updatedCount: 3, appliedStoryIds: ['@story-id H12-05'], errors: [] } | 終了コード 0、更新ファイル数が出力される |
| IT-API-CascHandler-002 | 部分失敗時に終了コード 1 になること | args=['--story-id', 'H12-05'] | ApplyCascadeUpdateUseCase モック: execute→{ updatedCount: 2, appliedStoryIds: [...], errors: ['file not found: foo.ts'] } | 終了コード 1、エラー詳細が出力される |
| IT-API-CascHandler-003 | --dry-run 指定時に実際の更新が実行されないこと | args=['--story-id', 'H12-05', '--dry-run'] | ApplyCascadeUpdateUseCase モック: execute は呼ばれない, CascadeUpdateService.resolve モック: [target1, target2] | 終了コード 0、対象ファイル一覧が出力され、write は実行されない |

---

### ValidateSkillStructureHandler

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/validate-skill-structure-handler.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-SkillHandler-001 | 構造検証合格時に終了コード 0 になること | args=['--skill-file', 'skills/example.skill'] | ValidateSkillStructureUseCase モック: execute→{ result: SkillValidationResult(passed=true) } | 終了コード 0、合格メッセージが出力される |
| IT-API-SkillHandler-002 | 必須セクション欠落時に終了コード 1 になること | args=['--skill-file', 'skills/example.skill'] | ValidateSkillStructureUseCase モック: execute→{ result: SkillValidationResult(passed=false, missingSection=['purpose']) } | 終了コード 1、欠落セクション一覧が出力される |
| IT-API-SkillHandler-003 | ファイル不存在時に終了コード 2 になること | args=['--skill-file', 'skills/nonexistent.skill'] | ValidateSkillStructureUseCase モック: execute→throw HarnessError(SKILL_FILE_NOT_FOUND) | 終了コード 2、エラーメッセージが出力される |
| IT-API-SkillHandler-004 | --format json 指定時に JSON 形式で出力されること | args=['--skill-file', 'skills/example.skill', '--format', 'json'] | ValidateSkillStructureUseCase モック: execute→passed=true | 終了コード 0、stdout が有効な JSON 文字列である |

---

## 5. Cross-Layer統合テストケース

### TDD サイクル実行統合（H12-01 End-to-End）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/tdd-cycle-e2e-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-TddE2E-001 | Handler → UseCase → Domain → Port の全レイヤーが連携してコミットが完了すること | CLI 引数: phase='REFACTOR', passed=true, 有効な unit/storyId/description | CommitExecutorPort（モック）: commit→void, L1ValidatorPort（モック）: [], L2ValidatorPort（モック）: [] | 終了コード 0、CommitExecutorPort.commit が 1 回呼ばれる |
| IT-API-TddE2E-002 | Handler → UseCase → Domain を経てバリデーションエラーが正しく伝播すること | CLI 引数: phase='RED', passed=false | ポートモック不要 | 終了コード 1、TDD_CYCLE_INCOMPLETE エラーが出力される |

---

### Lesson Artifact システム統合（H12-04 End-to-End）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/lesson-artifact-e2e-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-LessE2E-001 | CollectLessons → WriteLessonArtifact の連携フローが正常動作すること | sources=['path1'], storyId='H12-04' | LessonSourceReaderPort（モック）: [Agent-Lesson] エントリ 2 件, ConfigQueryPort: enabled=true, LessonArtifactSchemaPort（モック）: [], LessonArtifactWriterPort（モック）: void | lessons.length=2, lessonCount=2, outputPath が出力される |
| IT-API-LessE2E-002 | 重複 Lesson が排除されて 1 件のみ出力されること | sources=['path1'] | LessonSourceReaderPort（モック）: 同一 content の RawLessonEntry 3 件, ConfigQueryPort: enabled=true, LessonArtifactSchemaPort: [], LessonArtifactWriterPort: void | output.lessonCount=1, output.deduplicatedCount=2（CollectLessons 統計） |

---

### SKILL.md 検証統合（H12-06 End-to-End）

**テスト配置**: `scripts/harness/__tests__/integration/skill-quality/skill-validation-e2e-integration.test.ts`

#### 統合シナリオ

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-API-SkillE2E-001 | Handler → UseCase → SkillStructureValidator → Port の全レイヤーが連携すること | CLI 引数: --skill-file='skills/valid.skill' | SkillFileReaderPort（モック）: 全必須セクションを含む Markdown | 終了コード 0、passed=true が出力される |
| IT-API-SkillE2E-002 | 欠落セクションが正しく検出されて Handler まで伝播すること | CLI 引数: --skill-file='skills/incomplete.skill' | SkillFileReaderPort（モック）: 'outputs'/'executionFlow' が欠落した Markdown | 終了コード 1、missingSection=['outputs', 'executionFlow'] が出力される |

---

## 6. シードデータ要件

### テスト用フィクスチャ

| フィクスチャ | 用途 | 配置 |
|------------|------|------|
| `valid-skill.md` | 全必須セクションを含む SKILL.md サンプル | `scripts/harness/__tests__/integration/skill-quality/fixtures/valid-skill.md` |
| `incomplete-skill.md` | 必須セクション欠落の SKILL.md サンプル | `scripts/harness/__tests__/integration/skill-quality/fixtures/incomplete-skill.md` |
| `lesson-artifact.schema.json` | ci-governance スキーマ定義（AjvAdapter テスト用） | `docs/contracts/lesson-artifact.schema.json`（既存） |
| `requirement-test-matrix.json` | H12-02 テスト用マトリックスデータ | `scripts/harness/__tests__/integration/skill-quality/fixtures/requirement-test-matrix.json` |

### 有効な SKILL.md フィクスチャの構成要件

```markdown
---
# frontmatter
---
## 目的（purpose セクション）
...
## 入力（inputs セクション）
...
## 出力（outputs セクション）
...
## 前提条件（prerequisites セクション）
...
## 実行フロー（executionFlow セクション）
...
```

---

## 7. テスト環境設定

### テストランナー設定

```typescript
// vitest.config.ts での skill-quality 統合テスト設定
{
  testMatch: ['**/integration/skill-quality/**/*.test.ts'],
  environment: 'node',
  globals: true,
}
```

### テストヘルパー活用

- `scripts/harness/__tests__/helpers/test-helpers.ts` の `target` / `context` エイリアスを使用する
- ポートのモックには Vitest の `vi.fn()` / `vi.mock()` を使用する
- ファイルシステム操作のモックには `node:fs/promises` をモジュールレベルでモックする

### モックパターン（共通）

```typescript
// ポートモック例（AtomicCommitService テスト）
const mockCommitExecutorPort: CommitExecutorPort = {
  commit: vi.fn().mockResolvedValue(undefined),
};
const mockL1ValidatorPort: L1ValidatorPort = {
  validate: vi.fn().mockResolvedValue([]),
};
const mockL2ValidatorPort: L2ValidatorPort = {
  validate: vi.fn().mockResolvedValue([]),
};

const target = new AtomicCommitService(
  mockCommitExecutorPort,
  mockL1ValidatorPort,
  mockL2ValidatorPort,
);
```

### テスト分離方針

- 各テストケースはポートをモックに差し替え、実際の I/O を発生させない
- ファイルシステム I/O を伴う Adapter テストのみ `tmp` ディレクトリを使用し、`afterEach` でクリーンアップする
- git コマンドの実行は `child_process` モックで常に差し替える

---

## 8. テストケース総数サマリー

| カテゴリ | コンポーネント | ケース数 |
|---------|-------------|---------|
| UseCase | ExecuteTddCycleUseCase | 6 |
| UseCase | CheckCoverageUseCase | 4 |
| UseCase | RunPlanCheckerLoopUseCase | 4 |
| UseCase | CollectLessonsUseCase | 3 |
| UseCase | WriteLessonArtifactUseCase | 4 |
| UseCase | ApplyCascadeUpdateUseCase | 3 |
| UseCase | ValidateSkillStructureUseCase | 3 |
| Adapter | GitCommitExecutorAdapter | 2 |
| Adapter | FileSystemLessonSourceReaderAdapter | 3 |
| Adapter | FileSystemLessonArtifactWriterAdapter | 2 |
| Adapter | AjvLessonArtifactSchemaAdapter | 2 |
| Adapter | FileSystemRequirementTestMatrixAdapter | 2 |
| Adapter | HarnessConfigQueryAdapter | 3 |
| Adapter | FileSystemSkillFileReaderAdapter | 3 |
| Adapter | L1BiomeValidatorAdapter | 3 |
| Adapter | L2ValidatorSystemAdapter | 3 |
| Adapter | VitestCoverageRunnerAdapter | 3 |
| Adapter | ValidatorIdRegistryBridgeAdapter | 3 |
| Handler | ExecuteTddCycleHandler | 3 |
| Handler | CheckCoverageHandler | 3 |
| Handler | RunPlanCheckerLoopHandler | 2 |
| Handler | CollectLessonsHandler | 3 |
| Handler | ApplyCascadeUpdateHandler | 3 |
| Handler | ValidateSkillStructureHandler | 4 |
| Cross-Layer | TDD サイクル実行統合 | 2 |
| Cross-Layer | Lesson Artifact システム統合 | 2 |
| Cross-Layer | SKILL.md 検証統合 | 2 |
| **合計** | | **80** |
## WI-188 coverage prerequisite regressions

<!-- @work-item-id WI-188 -->

| ID | 観点 | 入力 | 期待結果 |
| --- | --- | --- | --- |
| IT-WI188-001 | unknown story | matrix exists but lacks requested story | `STORY_NOT_FOUND` error and coverage runner is not called |
| IT-WI188-002 | no tests | matrix entry has `total=0` | no-tests result is returned and coverage runner is not called |
| IT-WI188-003 | missing local Vitest | no summary and no local `node_modules/vitest` | dependency guidance error is returned without `npx` execution |

## WI-212 Skill Metadata Integration Tests

<!-- @work-item-id WI-212 -->

- Bundled skill scanning reads required `languages` frontmatter from shipped skills without breaking install flows.
- Applicability output keeps generic workflow skills available for non-TypeScript projects.
- Language-scoped skills without a matching project language produce warnings rather than hard validation errors.
## WI-298: World debt import integration

<!-- @work-item-id WI-298 -->

実coverage reportのannotationと`phasegate.world-debts.json`のdebt IDを照合し、World dogfood reportが同じdebtを`declaredSemanticDebts`へ一件importすることを検証する。structural obligation / baseline / waiverへの変換は行わない。
