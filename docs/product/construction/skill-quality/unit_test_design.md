# ユニットテスト設計: skill-quality

@story-id H12-01
@story-id H12-02
@story-id H12-03
@story-id H12-04
@story-id H12-05
@story-id H12-06
@story-id H12-07
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20
> **対応ストーリー**: H12-01, H12-02, H12-03, H12-04, H12-05, H12-06, H12-07
> **Wave**: 3
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象ドメインモデル

- **集約ルート**: PlanCheckerLoop, LessonArtifact
- **値オブジェクト**: CommitMessage, TddCycle, CommitReadiness, CoverageReport, RequirementCoverageResult, CodeCoverageResult, LoopAttempt, Lesson, LessonFingerprint, SourceContext, CascadeUpdateTarget, CascadeUpdateResult, SkillStructure, SkillValidationResult
- **ドメインサービス**: AtomicCommitService, LessonCollector, LessonDeduplicator, CascadeUpdateService, SkillStructureValidator

---

## 2. 集約ルートテストケース

### PlanCheckerLoop

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/plan-checker-loop.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PCL-001 | `PlanCheckerLoop.create()` | status=RUNNING, loopHistory=[], maxRetries=3 のインスタンスが生成される |
| UT-PCL-002 | `PlanCheckerLoop.create()` を2回呼び出す | 各インスタンスの id（UUID）が異なる |

#### addAttempt テスト（正常系）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PCL-003 | 初期状態で gaps=[] の LoopAttempt を追加 | loopHistory.length=1、status が PASSED に遷移する |
| UT-PCL-004 | 初期状態で gaps 非空の LoopAttempt を追加 | loopHistory.length=1、status が RUNNING のまま |
| UT-PCL-005 | 2回 gaps 非空の試行後に gaps=[] の試行を追加 | loopHistory.length=3、status が PASSED に遷移する |

#### addAttempt テスト（異常系・不変条件）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-PCL-006 | INV-1: loopHistory.length <= maxRetries(3) | RUNNING 状態で 4 回目の addAttempt を試みる | HarnessError(LOOP_MAX_RETRIES_EXCEEDED) がスローされる |
| UT-PCL-007 | INV-3: PASSED 後は addAttempt 不可 | status=PASSED 後に addAttempt を呼ぶ | HarnessError(LOOP_ALREADY_COMPLETED) がスローされる |
| UT-PCL-008 | INV-3: FAILED_EXCEEDED 後は addAttempt 不可 | status=FAILED_EXCEEDED 後に addAttempt を呼ぶ | HarnessError(LOOP_ALREADY_COMPLETED) がスローされる |

#### 状態遷移テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PCL-009 | gaps 非空の試行を 3 回追加 | 3 回目追加後に status が FAILED_EXCEEDED に遷移する |
| UT-PCL-010 | 1 回目 gaps 非空、2 回目 gaps=[] | 2 回目追加後に status が PASSED に遷移する |

#### 不変条件テスト（INV-4）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-PCL-011 | INV-4: maxRetries は 3 固定 | create() で生成したインスタンスの maxRetries を参照 | maxRetries === 3 である |

---

### LessonArtifact

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/lesson-artifact.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LA-001 | `LessonArtifact.create(StoryId('H12-04'))` | lessons=[], fingerprintSet が空の状態で生成される |
| UT-LA-002 | storyId='H12-01'（有効な HXX-XX 形式） | 正常に生成される |
| UT-LA-003 | storyId=''（空文字列） | HarnessError(INVALID_STORY_ID) がスローされる |
| UT-LA-004 | storyId='INVALID'（HXX-XX 形式でない） | HarnessError(INVALID_STORY_ID) がスローされる |

#### addLesson テスト（正常系）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LA-005 | 異なる content の Lesson を 3 件追加 | lessons.length=3 になる |
| UT-LA-006 | 1 件 Lesson を追加後に toJson() を呼ぶ | storyId・lessons が反映された JSON オブジェクトが返される |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-LA-007 | INV-5: LessonFingerprint の一意性 | 同一 content の Lesson を 2 件 addLesson する | 2 件目で HarnessError(DUPLICATE_LESSON_FINGERPRINT) がスローされる |
| UT-LA-008 | INV-5: content が異なれば追加できる | content が微妙に異なる（空白の差） 2 件を addLesson | 両方追加成功（lessons.length=2） |

#### toJson テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LA-009 | Lesson 2 件追加後に toJson() | 返却 JSON の lessons 配列が 2 件、各エントリに lessonId/content/source/timestamp が含まれる |
| UT-LA-010 | lessons=[] の状態で toJson() | lessons が空配列の JSON が返される |

---

## 3. 値オブジェクトテストケース

### CommitMessage

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/commit-message.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CM-001 | unit='skill-quality', storyId='H12-01', description='implement domain model' | 正常に生成される |
| UT-CM-002 | unit=''（空文字列） | HarnessError(EMPTY_COMMIT_FIELD) がスローされる |
| UT-CM-003 | storyId=''（空文字列） | HarnessError(EMPTY_COMMIT_FIELD) がスローされる |
| UT-CM-004 | description=''（空文字列） | HarnessError(EMPTY_COMMIT_FIELD) がスローされる |

#### format() テスト（INV-9）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CM-005 | unit='skill-quality', storyId='H12-01', description='add lesson collector' | `feat(skill-quality/H12-01): add lesson collector` が返される |
| UT-CM-005a | workItemId='WI-026' | `Work-Item: WI-026` trailer が付与される |
| UT-CM-006 | unit='harness-error', storyId='H09-03', description='fix error code' | `feat(harness-error/H09-03): fix error code` が返される |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CM-007 | 同一 unit/storyId/description を持つ 2 つの CommitMessage | equals() が true を返す |
| UT-CM-008 | description のみ異なる 2 つの CommitMessage | equals() が false を返す |
| UT-CM-008a | workItemId のみ異なる 2 つの CommitMessage | equals() が false を返す |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CM-009 | INV-8: 全フィールドが非空 | 有効な CommitMessage 生成後にプロパティ変更を試みる | プロパティが変更されない（Object.freeze() 済み） |
| UT-CM-010 | INV-9a: workItemId がWI形式ではない | workItemId='ISSUE-026' | HarnessError(INVALID_WORK_ITEM_ID) がスローされる |

---

### TddCycle

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/tdd-cycle.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-TC-001 | phase='RED', passed=false | 正常に生成される |
| UT-TC-002 | phase='GREEN', passed=true | 正常に生成される |
| UT-TC-003 | phase='REFACTOR', passed=true | 正常に生成される |

#### isReadyForCommit() テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-TC-004 | phase='REFACTOR', passed=true | isReadyForCommit() が true を返す |
| UT-TC-005 | phase='REFACTOR', passed=false | isReadyForCommit() が false を返す |
| UT-TC-006 | phase='GREEN', passed=true | isReadyForCommit() が false を返す |
| UT-TC-007 | phase='RED', passed=false | isReadyForCommit() が false を返す |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-TC-008 | 同一 phase/passed を持つ 2 つの TddCycle | equals() が true を返す |
| UT-TC-009 | phase が異なる 2 つの TddCycle | equals() が false を返す |

---

### CommitReadiness

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/commit-readiness.test.ts`

#### 生成テスト（go / noGo ファクトリ）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CR-001 | `CommitReadiness.go()` | ready=true, violations=[] のインスタンスが生成される |
| UT-CR-002 | `CommitReadiness.noGo([{ ruleId: 'L1-001', message: 'error' }])` | ready=false, violations に 1 件が含まれるインスタンスが生成される |
| UT-CR-003 | `CommitReadiness.noGo([])` | HarnessError(EMPTY_VIOLATIONS) がスローされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CR-004 | go() で生成した 2 つの CommitReadiness | equals() が true を返す |
| UT-CR-005 | go() と noGo() で生成した CommitReadiness | equals() が false を返す |

---

### CoverageReport

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/coverage-report.test.ts`

#### 生成テスト（INV-12）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CVR-001 | 有効な RequirementCoverageResult と CodeCoverageResult | 正常に生成される |
| UT-CVR-002 | requirementCoverage=null | HarnessError(INVALID_COVERAGE_REPORT) がスローされる |
| UT-CVR-003 | codeCoverage=null | HarnessError(INVALID_COVERAGE_REPORT) がスローされる |

#### meetsThreshold() テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CVR-004 | coverageRate=100%, lineCoverage=85%, requirementThreshold=100, codeThreshold=80 | meetsThreshold() が true を返す |
| UT-CVR-005 | coverageRate=95%, lineCoverage=85%, requirementThreshold=100, codeThreshold=80 | meetsThreshold() が false を返す（要件カバレッジ未達） |
| UT-CVR-006 | coverageRate=100%, lineCoverage=75%, requirementThreshold=100, codeThreshold=80 | meetsThreshold() が false を返す（コードカバレッジ未達） |
| UT-CVR-007 | coverageRate=100%, lineCoverage=80%, requirementThreshold=100, codeThreshold=80 | meetsThreshold() が true を返す（境界値：閾値と同値） |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CVR-008 | 同一 requirementCoverage/codeCoverage を持つ 2 つの CoverageReport | equals() が true を返す |

---

### RequirementCoverageResult

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/requirement-coverage-result.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RCR-001 | total=10, covered=10, uncoveredIds=[] | 正常に生成される |
| UT-RCR-002 | total=10, covered=8, uncoveredIds=['REQ-03', 'REQ-07'] | 正常に生成される |
| UT-RCR-003 | total=0, covered=0, uncoveredIds=[] | 正常に生成される（空の場合） |
| UT-RCR-004 | total=10, covered=11, uncoveredIds=[] | HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる（covered > total） |
| UT-RCR-005 | total=10, covered=8, uncoveredIds=['REQ-03']（length != total - covered） | HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる |
| UT-RCR-006 | total=-1 | HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる |

#### coverageRate getter テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-RCR-007 | total=10, covered=8 | coverageRate が 80 を返す |
| UT-RCR-008 | total=0, covered=0 | coverageRate が 100 を返す（total=0 の特殊ケース） |
| UT-RCR-009 | total=3, covered=1 | coverageRate が 約33.33 を返す |

---

### CodeCoverageResult

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/code-coverage-result.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CCR-001 | line=85, branch=70, fn=90 | 正常に生成される |
| UT-CCR-002 | line=0, branch=0, fn=0（境界値: 最小） | 正常に生成される |
| UT-CCR-003 | line=100, branch=100, fn=100（境界値: 最大） | 正常に生成される |
| UT-CCR-004 | line=-1 | HarnessError(INVALID_COVERAGE_RANGE) がスローされる |
| UT-CCR-005 | line=101 | HarnessError(INVALID_COVERAGE_RANGE) がスローされる |
| UT-CCR-006 | branch=101 | HarnessError(INVALID_COVERAGE_RANGE) がスローされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CCR-007 | 同一 line/branch/fn を持つ 2 つの CodeCoverageResult | equals() が true を返す |
| UT-CCR-008 | line のみ異なる 2 つの CodeCoverageResult | equals() が false を返す |

---

### LoopAttempt

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/loop-attempt.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LPA-001 | attemptNumber=1, coverageRate=80, gaps=[], revision='N/A' | 正常に生成される |
| UT-LPA-002 | attemptNumber=3, coverageRate=65, gaps=['gap1', 'gap2'], revision='fix this' | 正常に生成される |
| UT-LPA-003 | attemptNumber=0（1 未満） | HarnessError(INVALID_LOOP_ATTEMPT) がスローされる |
| UT-LPA-004 | coverageRate=101（範囲外） | HarnessError(INVALID_LOOP_ATTEMPT) がスローされる |
| UT-LPA-005 | coverageRate=-1（範囲外） | HarnessError(INVALID_LOOP_ATTEMPT) がスローされる |

#### isPassed() テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LPA-006 | gaps=[] | isPassed() が true を返す |
| UT-LPA-007 | gaps=['未達項目1'] | isPassed() が false を返す |

---

### Lesson

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/lesson.test.ts`

#### 生成テスト（INV-11）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LS-001 | content='有効な教訓テキスト', 有効な sourceContext, tags=[] | 正常に生成される（lessonId/fingerprint/timestamp が自動設定） |
| UT-LS-002 | content=''（空文字列） | HarnessError(EMPTY_LESSON_CONTENT) がスローされる |
| UT-LS-003 | 同一 content で 2 つの Lesson を生成 | 両者の fingerprint.value が同一になる |
| UT-LS-004 | content が空白のみ異なる 2 つの Lesson（正規化で同一になる） | 両者の fingerprint.value が同一になる |

#### 不変条件テスト（INV-11）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-LS-005 | fingerprint は content 正規化後の SHA-256 と一致 | 生成した Lesson の fingerprint を検証 | `LessonFingerprint.fromContent(content).value` と一致する |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-LS-006 | 同一 content から生成した 2 つの Lesson | equals() が true を返す（fingerprint ベースの等値性） |
| UT-LS-007 | 異なる content から生成した 2 つの Lesson | equals() が false を返す |

---

### LessonFingerprint

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/lesson-fingerprint.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LF-001 | content='教訓テキスト' | value が 64 文字の 16 進数文字列になる |
| UT-LF-002 | 同一 content を 2 回 fromContent() に渡す | 同一の value が生成される（決定論的） |
| UT-LF-003 | content に全角スペースを含む vs. 半角スペースに変換した同一 content | 両者の value が同一になる（正規化後の一致） |
| UT-LF-004 | content に連続空白を含む vs. 単一空白に変換した同一 content | 両者の value が同一になる |
| UT-LF-005 | 異なる content | 異なる value が生成される |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-LF-006 | 同一 content から生成した 2 つの LessonFingerprint | equals() が true を返す |
| UT-LF-007 | 異なる content から生成した 2 つの LessonFingerprint | equals() が false を返す |

---

### SourceContext

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/source-context.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SC-001 | description='scripts/harness/skill-quality/domain/aggregates/lesson-artifact.ts' | 正常に生成される |
| UT-SC-002 | description='commit メッセージから抽出' | 正常に生成される |
| UT-SC-003 | description=''（空文字列） | HarnessError(EMPTY_SOURCE_CONTEXT) がスローされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-SC-004 | 同一 description を持つ 2 つの SourceContext | equals() が true を返す |
| UT-SC-005 | 異なる description を持つ 2 つの SourceContext | equals() が false を返す |

---

### CascadeUpdateTarget

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/cascade-update-target.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CUT-001 | filePath='scripts/harness/config-foundation/domain/index.ts', storyId='H12-05' | 正常に生成される（storyIdTag='@story-id H12-05'） |
| UT-CUT-002 | filePath=''（空文字列） | HarnessError(EMPTY_FILE_PATH) がスローされる |

#### storyIdTag 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CUT-003 | storyId='H12-05' | storyIdTag が '@story-id H12-05' になる |
| UT-CUT-004 | storyId='H09-01' | storyIdTag が '@story-id H09-01' になる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CUT-005 | 同一 filePath/storyId から生成した 2 つの CascadeUpdateTarget | equals() が true を返す |
| UT-CUT-006 | filePath が異なる 2 つの CascadeUpdateTarget | equals() が false を返す |

---

### CascadeUpdateResult

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/cascade-update-result.test.ts`

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CURES-001 | updatedCount=3, appliedStoryIds=['@story-id H12-05'], errors=[] | 正常に生成される |
| UT-CURES-002 | updatedCount=0, appliedStoryIds=[], errors=[] | 正常に生成される（更新なし） |
| UT-CURES-003 | updatedCount=-1 | HarnessError(INVALID_UPDATED_COUNT) がスローされる |

#### hasErrors() テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CURES-004 | errors=[] | hasErrors() が false を返す |
| UT-CURES-005 | errors=['file not found: foo.ts'] | hasErrors() が true を返す |

---

### SkillStructure

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/skill-structure.test.ts`

#### 生成テスト（INV-10）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SS-001 | `SkillStructure.default()` | requiredSections に 'frontmatter', 'purpose', 'inputs', 'outputs', 'prerequisites', 'executionFlow' が含まれる（6 件） |
| UT-SS-002 | `SkillStructure.default()` を 2 回呼ぶ | 同一の requiredSections を返す（キャッシュ済み定数） |

#### 不変条件テスト（INV-10）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-SS-003 | INV-10: requiredSections は変更不可 | default() の requiredSections を変更しようとする | プロパティが変更されない（Object.freeze() 済み） |

#### getMissingSections() テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SS-004 | actualSections が全 6 セクションを含む | getMissingSections() が [] を返す |
| UT-SS-005 | actualSections から 'purpose' を除外 | getMissingSections() が ['purpose'] を返す |
| UT-SS-006 | actualSections=[]（全欠落） | getMissingSections() が全 6 セクションを返す |
| UT-SS-007 | actualSections に余分なセクションが含まれる（必須は全て含む） | getMissingSections() が [] を返す |

---

### SkillValidationResult

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/skill-validation-result.test.ts`

#### 生成テスト（passed / failed ファクトリ）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SVR-001 | `SkillValidationResult.passed(['frontmatter', 'purpose', ...])` | passed=true, missingSection=[] のインスタンスが生成される |
| UT-SVR-002 | `SkillValidationResult.failed(['purpose', 'inputs'], [...])` | passed=false, missingSection=['purpose', 'inputs'] のインスタンスが生成される |
| UT-SVR-003 | `SkillValidationResult.failed([], [...])` | HarnessError(EMPTY_MISSING_SECTIONS) がスローされる |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-SVR-004 | 同一 passed/missingSection/actualSections を持つ 2 つの SkillValidationResult | equals() が true を返す |
| UT-SVR-005 | passed=true と passed=false の SkillValidationResult | equals() が false を返す |

---

## 4. ドメインサービステストケース

### AtomicCommitService

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/atomic-commit-service.test.ts`

#### 正常系

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-ACS-001 | phase='REFACTOR', passed=true, 有効な CommitMessage | L1ValidatorPort: violations=[], L2ValidatorPort: violations=[], CommitExecutorPort: commit→成功 | CommitReadiness.go() が返される（ready=true） |

#### 異常系

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-ACS-002 | phase='GREEN', passed=true（REFACTOR でない） | モック不要 | HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる |
| UT-ACS-003 | phase='REFACTOR', passed=false | モック不要 | HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる |
| UT-ACS-004 | 有効な TddCycle | L1ValidatorPort: violations=[{ ruleId: 'L1-001', message: 'format error' }] | CommitReadiness.noGo(violations) が返される（commit は実行されない） |
| UT-ACS-005 | 有効な TddCycle（L1 通過） | L2ValidatorPort: violations=[{ ruleId: 'L2-001', message: 'lint error' }] | CommitReadiness.noGo(violations) が返される（commit は実行されない） |

#### ポート呼び出し順序テスト

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-ACS-006 | 有効な TddCycle と CommitMessage | 全ポートが成功 | L1 → L2 → CommitExecutor の順に各 1 回ずつ呼ばれる |
| UT-ACS-007 | 有効な TddCycle と CommitMessage（L1 違反） | L1: violations 非空 | L2ValidatorPort と CommitExecutorPort は呼ばれない |

---

### LessonCollector

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/lesson-collector.test.ts`

#### 正常系

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-LC-001 | sources=['path/to/file.ts'] | LessonSourceReaderPort: read→ [Agent-Lesson] タグ付き RawLessonEntry 2 件 | 2 件の Lesson が返される |
| UT-LC-002 | sources=['path1', 'path2'] | LessonSourceReaderPort: read→ 各 1 件 | 合計 2 件の Lesson が返される（フラット化） |
| UT-LC-003 | sources=[] | LessonSourceReaderPort: 呼ばれない | [] が返される |

#### 異常系

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-LC-004 | sources=['path/to/file.ts'] | LessonSourceReaderPort: read→ [Agent-Lesson] タグなしのエントリのみ | [] が返される（タグなしは除外） |

---

### LessonDeduplicator

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/lesson-deduplicator.test.ts`

> LessonDeduplicator はポート依存なしの純粋計算クラス。モック不要。

#### 正常系

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LD-001 | 重複なしの Lesson[] 3 件 | 3 件がそのまま返される |
| UT-LD-002 | 同一 content の Lesson 2 件（重複） | 1 件のみ返される（先着優先） |
| UT-LD-003 | 3 件中 1 件が重複 | 2 件が返される |
| UT-LD-004 | lessons=[] | [] が返される |

#### 先着優先テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LD-005 | 同一 content だが sourceContext が異なる Lesson 2 件（先着=sourceA） | 返される Lesson の sourceContext が sourceA である（先着優先） |

---

### CascadeUpdateService

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/cascade-update-service.test.ts`

#### 正常系（resolve）

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-CUS-001 | storyId='H12-05' | ConfigQueryPort: patterns=['scripts/**/*.ts'], ValidatorIdRegistryPort: validatorIds=['L1-001', 'L2-001'] | CascadeUpdateTarget[] が返される（filePath + storyIdTag を含む） |
| UT-CUS-002 | storyId='H12-05' | ConfigQueryPort: patterns=[], ValidatorIdRegistryPort: validatorIds=[] | [] が返される |

---

### SkillStructureValidator

**テスト配置**: `scripts/harness/__tests__/unit/skill-quality/skill-structure-validator.test.ts`

#### 正常系

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-SSV-001 | skillFilePath='skills/example.skill' | SkillFileReaderPort: read→ 全必須セクションを含む Markdown | SkillValidationResult(passed=true, missingSection=[]) が返される |
| UT-SSV-002 | skillFilePath='skills/example.skill' | SkillFileReaderPort: read→ 'purpose' セクションが欠落した Markdown | SkillValidationResult(passed=false, missingSection=['purpose']) が返される |

#### 異常系

| ケースID | 入力 | モックポート設定 | 期待結果 |
|---------|------|------------|---------|
| UT-SSV-003 | skillFilePath='skills/nonexistent.skill' | SkillFileReaderPort: read→ throw HarnessError(SKILL_FILE_NOT_FOUND) | HarnessError(SKILL_FILE_NOT_FOUND) が伝播する |

---

## 5. テストケース総数サマリー

| カテゴリ | クラス | ケース数 |
|---------|--------|---------|
| 集約ルート | PlanCheckerLoop | 11 |
| 集約ルート | LessonArtifact | 10 |
| 値オブジェクト | CommitMessage | 12 |
| 値オブジェクト | TddCycle | 9 |
| 値オブジェクト | CommitReadiness | 5 |
| 値オブジェクト | CoverageReport | 8 |
| 値オブジェクト | RequirementCoverageResult | 9 |
| 値オブジェクト | CodeCoverageResult | 8 |
| 値オブジェクト | LoopAttempt | 7 |
| 値オブジェクト | Lesson | 7 |
| 値オブジェクト | LessonFingerprint | 7 |
| 値オブジェクト | SourceContext | 5 |
| 値オブジェクト | CascadeUpdateTarget | 6 |
| 値オブジェクト | CascadeUpdateResult | 5 |
| 値オブジェクト | SkillStructure | 7 |
| 値オブジェクト | SkillValidationResult | 5 |
| ドメインサービス | AtomicCommitService | 7 |
| ドメインサービス | LessonCollector | 4 |
| ドメインサービス | LessonDeduplicator | 5 |
| ドメインサービス | CascadeUpdateService | 2 |
| ドメインサービス | SkillStructureValidator | 3 |
| **合計** | | **148** |

## WI-212 Skill Language Metadata Tests

<!-- @work-item-id WI-212 -->

- Skill frontmatter with `languages: [typescript]` is parsed as TypeScript-scoped.
- Missing bundled skill language metadata is reported as a structure validation gap.
- Language-scoped implementation skills without a matching project language produce applicability warnings instead of parse failures.
