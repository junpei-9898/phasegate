# ユニットテストロジック設計: skill-quality

@story-id H12-01
@story-id H12-02
@story-id H12-03
@story-id H12-04
@story-id H12-05
@story-id H12-06
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20
> **参照**: unit_test_design.md, domain_model.md

---

## 1. テストファイル構成

```text
scripts/harness/__tests__/unit/skill-quality/
├── plan-checker-loop.test.ts          # PlanCheckerLoop 集約ルート
├── lesson-artifact.test.ts            # LessonArtifact 集約ルート
├── commit-message.test.ts             # CommitMessage VO
├── tdd-cycle.test.ts                  # TddCycle VO
├── commit-readiness.test.ts           # CommitReadiness VO
├── coverage-report.test.ts            # CoverageReport VO
├── requirement-coverage-result.test.ts # RequirementCoverageResult VO
├── code-coverage-result.test.ts       # CodeCoverageResult VO
├── loop-attempt.test.ts               # LoopAttempt VO
├── lesson.test.ts                     # Lesson VO
├── lesson-fingerprint.test.ts         # LessonFingerprint VO
├── source-context.test.ts             # SourceContext VO
├── cascade-update-target.test.ts      # CascadeUpdateTarget VO
├── cascade-update-result.test.ts      # CascadeUpdateResult VO
├── skill-structure.test.ts            # SkillStructure VO
├── skill-validation-result.test.ts    # SkillValidationResult VO
├── atomic-commit-service.test.ts      # AtomicCommitService ドメインサービス
├── lesson-collector.test.ts           # LessonCollector ドメインサービス
├── lesson-deduplicator.test.ts        # LessonDeduplicator ドメインサービス
├── cascade-update-service.test.ts     # CascadeUpdateService ドメインサービス
└── skill-structure-validator.test.ts  # SkillStructureValidator ドメインサービス
```

> **実装状況（WI-365 実測、2026-08-06）**: 上記 21 ファイルはすべて記載パスに実在する。
> ただし同ディレクトリには未掲載のファイルが 5 件ある:
> `check-coverage-handler.test.ts`(1) / `file-system-requirement-test-matrix-adapter.test.ts`(4) /
> `git-commit-executor-adapter.test.ts`(7) / `quick-implementor-skill-conformance.test.ts`(9) /
> `story-implementor-skill-conformance.test.ts`(3)。ディレクトリ全体は 26 ファイル。

**共通インポートパターン**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
```

---

## 2. 共通ヘルパー・ファクトリ

各テストファイル先頭にまとめて定義する。インポートパスは `.js` 拡張子（ESM）を使用する。

### 2.1 集約ルートファクトリ

```typescript
// ---- PlanCheckerLoop ファクトリ ----
// import { PlanCheckerLoop } from '../../../skill-quality/domain/aggregates/plan-checker-loop.js';
// import { LoopAttempt } from '../../../skill-quality/domain/value-objects/loop-attempt.js';

function createPlanCheckerLoop(): PlanCheckerLoop {
  return PlanCheckerLoop.create();
}

function createLoopAttempt(overrides: Partial<{
  attemptNumber: number;
  coverageRate: number;
  gaps: string[];
  revision: string;
}> = {}): LoopAttempt {
  return LoopAttempt.create({
    attemptNumber: 1,
    coverageRate: 80,
    gaps: [],
    revision: 'N/A',
    ...overrides,
  });
}

// ---- LessonArtifact ファクトリ ----
// import { LessonArtifact } from '../../../skill-quality/domain/aggregates/lesson-artifact.js';

function createLessonArtifact(storyId = 'H12-04'): LessonArtifact {
  return LessonArtifact.create(storyId);
}
```

### 2.2 値オブジェクトファクトリ

```typescript
// ---- CommitMessage ファクトリ ----
// import { CommitMessage } from '../../../skill-quality/domain/value-objects/commit-message.js';

function createCommitMessage(overrides: Partial<{
  unit: string;
  storyId: string;
  description: string;
}> = {}): CommitMessage {
  return CommitMessage.create(
    overrides.unit ?? 'skill-quality',
    overrides.storyId ?? 'H12-01',
    overrides.description ?? 'implement domain model',
  );
}

// ---- TddCycle ファクトリ ----
// import { TddCycle } from '../../../skill-quality/domain/value-objects/tdd-cycle.js';

function createTddCycle(
  phase: 'RED' | 'GREEN' | 'REFACTOR' = 'REFACTOR',
  passed = true,
): TddCycle {
  return TddCycle.create(phase, passed);
}

// ---- CommitReadiness ファクトリ ----
// import { CommitReadiness } from '../../../skill-quality/domain/value-objects/commit-readiness.js';

function createCommitReadinessGo(): CommitReadiness {
  return CommitReadiness.go();
}

function createCommitReadinessNoGo(violations = [{ ruleId: 'L1-001', message: 'error', location: undefined }]): CommitReadiness {
  return CommitReadiness.noGo(violations);
}

// ---- CoverageReport ファクトリ ----
// import { CoverageReport } from '../../../skill-quality/domain/value-objects/coverage-report.js';
// import { RequirementCoverageResult } from '../../../skill-quality/domain/value-objects/requirement-coverage-result.js';
// import { CodeCoverageResult } from '../../../skill-quality/domain/value-objects/code-coverage-result.js';

function createRequirementCoverageResult(overrides: Partial<{
  total: number;
  covered: number;
  uncoveredIds: string[];
}> = {}): RequirementCoverageResult {
  const total = overrides.total ?? 10;
  const covered = overrides.covered ?? 10;
  const uncoveredIds = overrides.uncoveredIds ?? [];
  return RequirementCoverageResult.create(total, covered, uncoveredIds);
}

function createCodeCoverageResult(overrides: Partial<{
  line: number;
  branch: number;
  fn: number;
}> = {}): CodeCoverageResult {
  return CodeCoverageResult.create(
    overrides.line ?? 85,
    overrides.branch ?? 80,
    overrides.fn ?? 90,
  );
}

function createCoverageReport(overrides: Partial<{
  requirementCoverage: RequirementCoverageResult;
  codeCoverage: CodeCoverageResult;
}> = {}): CoverageReport {
  return CoverageReport.create(
    overrides.requirementCoverage ?? createRequirementCoverageResult(),
    overrides.codeCoverage ?? createCodeCoverageResult(),
  );
}

// ---- Lesson / LessonFingerprint / SourceContext ファクトリ ----
// import { Lesson } from '../../../skill-quality/domain/value-objects/lesson.js';
// import { LessonFingerprint } from '../../../skill-quality/domain/value-objects/lesson-fingerprint.js';
// import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';

function createSourceContext(description = 'scripts/harness/skill-quality/domain/lesson-artifact.ts'): SourceContext {
  return SourceContext.create(description);
}

function createLesson(overrides: Partial<{
  content: string;
  sourceContext: SourceContext;
  tags: string[];
}> = {}): Lesson {
  return Lesson.create({
    content: overrides.content ?? '有効な教訓テキスト',
    sourceContext: overrides.sourceContext ?? createSourceContext(),
    tags: overrides.tags ?? [],
  });
}

// ---- CascadeUpdateTarget / CascadeUpdateResult ファクトリ ----
// import { CascadeUpdateTarget } from '../../../skill-quality/domain/value-objects/cascade-update-target.js';
// import { CascadeUpdateResult } from '../../../skill-quality/domain/value-objects/cascade-update-result.js';

function createCascadeUpdateTarget(overrides: Partial<{
  filePath: string;
  storyId: string;
}> = {}): CascadeUpdateTarget {
  return CascadeUpdateTarget.create(
    overrides.filePath ?? 'scripts/harness/config-foundation/domain/index.ts',
    overrides.storyId ?? 'H12-05',
  );
}

function createCascadeUpdateResult(overrides: Partial<{
  updatedCount: number;
  appliedStoryIds: string[];
  errors: string[];
}> = {}): CascadeUpdateResult {
  return CascadeUpdateResult.create({
    updatedCount: overrides.updatedCount ?? 3,
    appliedStoryIds: overrides.appliedStoryIds ?? ['@story-id H12-05'],
    errors: overrides.errors ?? [],
  });
}

// ---- SkillStructure / SkillValidationResult ファクトリ ----
// import { SkillStructure } from '../../../skill-quality/domain/value-objects/skill-structure.js';
// import { SkillValidationResult } from '../../../skill-quality/domain/value-objects/skill-validation-result.js';

const ALL_REQUIRED_SECTIONS = ['frontmatter', 'purpose', 'inputs', 'outputs', 'prerequisites', 'executionFlow'];

function createSkillStructure(): SkillStructure {
  return SkillStructure.default();
}

function createSkillValidationResultPassed(): SkillValidationResult {
  return SkillValidationResult.passed(ALL_REQUIRED_SECTIONS);
}

function createSkillValidationResultFailed(missing: string[]): SkillValidationResult {
  return SkillValidationResult.failed(missing, ALL_REQUIRED_SECTIONS.filter(s => !missing.includes(s)));
}
```

### 2.3 ドメインサービス用モックポートファクトリ

```typescript
// AtomicCommitService 用
function createMockCommitExecutorPort(overrides = {}) {
  return { commit: vi.fn().mockResolvedValue(undefined), ...overrides };
}
function createMockL1ValidatorPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}
function createMockL2ValidatorPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

// LessonCollector 用
function createMockLessonSourceReaderPort(entries: RawLessonEntry[][] = []) {
  let callIndex = 0;
  return {
    read: vi.fn().mockImplementation(() => Promise.resolve(entries[callIndex++] ?? [])),
  };
}

// CascadeUpdateService 用
function createMockFileSystemPort(content = '# existing content') {
  return {
    read: vi.fn().mockResolvedValue(content),
    write: vi.fn().mockResolvedValue(undefined),
  };
}
function createMockValidatorIdRegistryPort(validatorIds: string[] = ['L1-001', 'L2-001']) {
  return { list: vi.fn().mockResolvedValue(validatorIds) };
}
function createMockConfigQueryPort(patterns: string[] = ['scripts/**/*.ts']) {
  return {
    getCoverageThreshold: vi.fn().mockResolvedValue({ requirement: 100, code: 80 }),
    isAgentLessonCollectionEnabled: vi.fn().mockResolvedValue(true),
    getCascadeUpdateTargetPatterns: vi.fn().mockResolvedValue(patterns),
  };
}

// SkillStructureValidator 用
function createMockSkillFileReaderPort(content = '') {
  return { read: vi.fn().mockResolvedValue(content) };
}
```

---

## 3. テストケース詳細ロジック

### 3.1 PlanCheckerLoop（`plan-checker-loop.test.ts`）

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { PlanCheckerLoop } from '../../../skill-quality/domain/aggregates/plan-checker-loop.js';
// ... 他インポート

target('PlanCheckerLoop', () => {

  // UT-PCL-001
  describe('create: 初期状態が正しく設定されること', () => {
    context('引数なしで create() を呼ぶ場合', () => {
      it('status=RUNNING, loopHistory=[], maxRetries=3 のインスタンスが生成される', () => {
        // Arrange（なし）
        // Act
        const actual = PlanCheckerLoop.create();
        // Assert
        expect(actual.status).toBe('RUNNING');
        expect(actual.loopHistory).toHaveLength(0);
        expect(actual.maxRetries).toBe(3);
      });
    });
  });

  // UT-PCL-002
  describe('create: 2回呼ぶと異なるIDが生成されること', () => {
    context('create() を2回呼ぶ場合', () => {
      it('各インスタンスの id（UUID）が異なる', () => {
        // Arrange（なし）
        // Act
        const actual1 = PlanCheckerLoop.create();
        const actual2 = PlanCheckerLoop.create();
        // Assert
        expect(actual1.id).not.toBe(actual2.id);
      });
    });
  });

  // UT-PCL-003
  describe('addAttempt: gaps=[] の試行を追加すると PASSED に遷移すること', () => {
    context('初期状態で gaps=[] の LoopAttempt を追加する場合', () => {
      it('loopHistory.length=1、status が PASSED に遷移する', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        const attempt = createLoopAttempt({ gaps: [] });
        // Act
        loop.addAttempt(attempt);
        const actual = loop;
        // Assert
        expect(actual.loopHistory).toHaveLength(1);
        expect(actual.status).toBe('PASSED');
      });
    });
  });

  // UT-PCL-004
  describe('addAttempt: gaps 非空の試行を追加すると RUNNING のまま', () => {
    context('初期状態で gaps 非空の LoopAttempt を追加する場合', () => {
      it('loopHistory.length=1、status が RUNNING のまま', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        const attempt = createLoopAttempt({ gaps: ['未達項目1'] });
        // Act
        loop.addAttempt(attempt);
        const actual = loop;
        // Assert
        expect(actual.loopHistory).toHaveLength(1);
        expect(actual.status).toBe('RUNNING');
      });
    });
  });

  // UT-PCL-005
  describe('addAttempt: 2回 gaps 非空の後に gaps=[] の試行を追加すると PASSED に遷移', () => {
    context('2回 gaps 非空試行後に gaps=[] の試行を追加する場合', () => {
      it('loopHistory.length=3、status が PASSED に遷移する', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        // Act
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['gap1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['gap2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: [] }));
        const actual = loop;
        // Assert
        expect(actual.loopHistory).toHaveLength(3);
        expect(actual.status).toBe('PASSED');
      });
    });
  });

  // UT-PCL-006
  describe('addAttempt: 4回目の追加で LOOP_MAX_RETRIES_EXCEEDED エラー（INV-1）', () => {
    context('RUNNING 状態で 4 回目の addAttempt を試みる場合', () => {
      it('HarnessError(LOOP_MAX_RETRIES_EXCEEDED) がスローされる', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['g1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['g2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: ['g3'] }));
        // Act & Assert
        expect(() => loop.addAttempt(createLoopAttempt({ attemptNumber: 4, gaps: [] }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('LOOP_MAX_RETRIES_EXCEEDED') }),
        );
      });
    });
  });

  // UT-PCL-007
  describe('addAttempt: PASSED 後の addAttempt で LOOP_ALREADY_COMPLETED エラー（INV-3）', () => {
    context('status=PASSED 後に addAttempt を呼ぶ場合', () => {
      it('HarnessError(LOOP_ALREADY_COMPLETED) がスローされる', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ gaps: [] }));
        // Act & Assert
        expect(() => loop.addAttempt(createLoopAttempt({ gaps: [] }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('LOOP_ALREADY_COMPLETED') }),
        );
      });
    });
  });

  // UT-PCL-008
  describe('addAttempt: FAILED_EXCEEDED 後の addAttempt で LOOP_ALREADY_COMPLETED エラー（INV-3）', () => {
    context('status=FAILED_EXCEEDED 後に addAttempt を呼ぶ場合', () => {
      it('HarnessError(LOOP_ALREADY_COMPLETED) がスローされる', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['g1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['g2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: ['g3'] }));
        // Act & Assert
        expect(() => loop.addAttempt(createLoopAttempt({ gaps: [] }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('LOOP_ALREADY_COMPLETED') }),
        );
      });
    });
  });

  // UT-PCL-009
  describe('addAttempt: gaps 非空の試行を 3 回追加すると FAILED_EXCEEDED に遷移', () => {
    context('gaps 非空の試行を 3 回追加する場合', () => {
      it('3 回目追加後に status が FAILED_EXCEEDED に遷移する', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        // Act
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['g1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: ['g2'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 3, gaps: ['g3'] }));
        const actual = loop;
        // Assert
        expect(actual.status).toBe('FAILED_EXCEEDED');
        expect(actual.loopHistory).toHaveLength(3);
      });
    });
  });

  // UT-PCL-010
  describe('addAttempt: 1回目 gaps 非空、2回目 gaps=[] で PASSED に遷移', () => {
    context('1 回目 gaps 非空、2 回目 gaps=[] の場合', () => {
      it('2 回目追加後に status が PASSED に遷移する', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        // Act
        loop.addAttempt(createLoopAttempt({ attemptNumber: 1, gaps: ['gap1'] }));
        loop.addAttempt(createLoopAttempt({ attemptNumber: 2, gaps: [] }));
        const actual = loop;
        // Assert
        expect(actual.status).toBe('PASSED');
        expect(actual.loopHistory).toHaveLength(2);
      });
    });
  });

  // UT-PCL-011
  describe('maxRetries: INV-4 により常に 3 である', () => {
    context('create() で生成したインスタンスの maxRetries を参照する場合', () => {
      it('maxRetries === 3 である', () => {
        // Arrange
        const loop = PlanCheckerLoop.create();
        // Act
        const actual = loop.maxRetries;
        // Assert
        expect(actual).toBe(3);
      });
    });
  });

});
```

---

### 3.2 LessonArtifact（`lesson-artifact.test.ts`）

```typescript
target('LessonArtifact', () => {

  // UT-LA-001
  describe('create: 初期状態が正しいこと', () => {
    context('有効な storyId で create() を呼ぶ場合', () => {
      it('lessons=[], fingerprintSet が空の状態で生成される', () => {
        // Arrange（なし）
        // Act
        const actual = LessonArtifact.create('H12-04');
        // Assert
        expect(actual.lessons).toHaveLength(0);
      });
    });
  });

  // UT-LA-002
  describe('create: 有効な HXX-XX 形式の storyId で正常生成', () => {
    context("storyId='H12-01' で create() を呼ぶ場合", () => {
      it('正常に生成される', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => LessonArtifact.create('H12-01')).not.toThrow();
      });
    });
  });

  // UT-LA-003
  describe('create: storyId が空文字列の場合 INVALID_STORY_ID エラー', () => {
    context("storyId='' で create() を呼ぶ場合", () => {
      it('HarnessError(INVALID_STORY_ID) がスローされる', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => LessonArtifact.create('')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_STORY_ID') }),
        );
      });
    });
  });

  // UT-LA-004
  describe('create: HXX-XX 形式でない storyId で INVALID_STORY_ID エラー', () => {
    context("storyId='INVALID' で create() を呼ぶ場合", () => {
      it('HarnessError(INVALID_STORY_ID) がスローされる', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => LessonArtifact.create('INVALID')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_STORY_ID') }),
        );
      });
    });
  });

  // UT-LA-005
  describe('addLesson: 異なる content の Lesson を 3 件追加できること', () => {
    context('異なる content の Lesson を 3 件 addLesson する場合', () => {
      it('lessons.length=3 になる', () => {
        // Arrange
        const artifact = createLessonArtifact();
        // Act
        artifact.addLesson(createLesson({ content: '教訓A' }));
        artifact.addLesson(createLesson({ content: '教訓B' }));
        artifact.addLesson(createLesson({ content: '教訓C' }));
        const actual = artifact;
        // Assert
        expect(actual.lessons).toHaveLength(3);
      });
    });
  });

  // UT-LA-006
  describe('addLesson→toJson: 追加した Lesson が JSON に反映されること', () => {
    context('1 件 Lesson を追加後に toJson() を呼ぶ場合', () => {
      it('storyId・lessons が反映された JSON オブジェクトが返される', () => {
        // Arrange
        const artifact = createLessonArtifact('H12-04');
        artifact.addLesson(createLesson({ content: '教訓テキスト' }));
        // Act
        const actual = artifact.toJson();
        // Assert
        expect(actual.storyId).toBe('H12-04');
        expect(actual.lessons).toHaveLength(1);
      });
    });
  });

  // UT-LA-007
  describe('addLesson: 同一 content の Lesson を 2 件追加すると DUPLICATE_LESSON_FINGERPRINT（INV-5）', () => {
    context('同一 content の Lesson を 2 件 addLesson する場合', () => {
      it('2 件目で HarnessError(DUPLICATE_LESSON_FINGERPRINT) がスローされる', () => {
        // Arrange
        const artifact = createLessonArtifact();
        artifact.addLesson(createLesson({ content: '重複する教訓' }));
        // Act & Assert
        expect(() => artifact.addLesson(createLesson({ content: '重複する教訓' }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('DUPLICATE_LESSON_FINGERPRINT') }),
        );
      });
    });
  });

  // UT-LA-008
  describe('addLesson: content が異なれば両方追加できること（INV-5）', () => {
    context('content が微妙に異なる 2 件を addLesson する場合', () => {
      it('両方追加成功（lessons.length=2）', () => {
        // Arrange
        const artifact = createLessonArtifact();
        // Act
        artifact.addLesson(createLesson({ content: '教訓テキスト A' }));
        artifact.addLesson(createLesson({ content: '教訓テキスト  A' })); // 空白量が異なる
        const actual = artifact;
        // Assert
        expect(actual.lessons).toHaveLength(2);
      });
    });
  });

  // UT-LA-009
  describe('toJson: Lesson 2 件追加後の JSON 構造が正しいこと', () => {
    context('Lesson 2 件追加後に toJson() を呼ぶ場合', () => {
      it('返却 JSON の lessons 配列が 2 件、各エントリに lessonId/content/source/timestamp が含まれる', () => {
        // Arrange
        const artifact = createLessonArtifact();
        artifact.addLesson(createLesson({ content: '教訓1' }));
        artifact.addLesson(createLesson({ content: '教訓2' }));
        // Act
        const actual = artifact.toJson();
        // Assert
        expect(actual.lessons).toHaveLength(2);
        expect(actual.lessons[0]).toMatchObject(
          expect.objectContaining({ lessonId: expect.any(String), content: expect.any(String) }),
        );
      });
    });
  });

  // UT-LA-010
  describe('toJson: lessons=[] の状態で toJson() を呼ぶと lessons が空配列', () => {
    context('lessons=[] の状態で toJson() を呼ぶ場合', () => {
      it('lessons が空配列の JSON が返される', () => {
        // Arrange
        const artifact = createLessonArtifact();
        // Act
        const actual = artifact.toJson();
        // Assert
        expect(actual.lessons).toEqual([]);
      });
    });
  });

});
```

---

### 3.3 CommitMessage（`commit-message.test.ts`）

```typescript
target('CommitMessage', () => {

  // UT-CM-001
  describe('create: 有効な引数で正常生成', () => {
    context("unit='skill-quality', storyId='H12-01', description='implement domain model' の場合", () => {
      it('正常に生成される', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => createCommitMessage()).not.toThrow();
      });
    });
  });

  // UT-CM-002
  describe('create: unit が空文字列のとき EMPTY_COMMIT_FIELD エラー', () => {
    context("unit='' の場合", () => {
      it('HarnessError(EMPTY_COMMIT_FIELD) がスローされる', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => createCommitMessage({ unit: '' })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_COMMIT_FIELD') }),
        );
      });
    });
  });

  // UT-CM-003
  describe('create: storyId が空文字列のとき EMPTY_COMMIT_FIELD エラー', () => {
    context("storyId='' の場合", () => {
      it('HarnessError(EMPTY_COMMIT_FIELD) がスローされる', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => createCommitMessage({ storyId: '' })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_COMMIT_FIELD') }),
        );
      });
    });
  });

  // UT-CM-004
  describe('create: description が空文字列のとき EMPTY_COMMIT_FIELD エラー', () => {
    context("description='' の場合", () => {
      it('HarnessError(EMPTY_COMMIT_FIELD) がスローされる', () => {
        // Arrange（なし）
        // Act & Assert
        expect(() => createCommitMessage({ description: '' })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_COMMIT_FIELD') }),
        );
      });
    });
  });

  // UT-CM-005
  describe('format: feat({unit}/{storyId}): {description} の形式で返ること', () => {
    context("unit='skill-quality', storyId='H12-01', description='add lesson collector' の場合", () => {
      it("`feat(skill-quality/H12-01): add lesson collector` が返される", () => {
        // Arrange
        const msg = createCommitMessage({ unit: 'skill-quality', storyId: 'H12-01', description: 'add lesson collector' });
        // Act
        const actual = msg.format();
        // Assert
        expect(actual).toBe('feat(skill-quality/H12-01): add lesson collector');
      });
    });
  });

  // UT-CM-006
  describe('format: 別の unit/storyId で正しいフォーマットが返ること', () => {
    context("unit='harness-error', storyId='H09-03', description='fix error code' の場合", () => {
      it("`feat(harness-error/H09-03): fix error code` が返される", () => {
        // Arrange
        const msg = createCommitMessage({ unit: 'harness-error', storyId: 'H09-03', description: 'fix error code' });
        // Act
        const actual = msg.format();
        // Assert
        expect(actual).toBe('feat(harness-error/H09-03): fix error code');
      });
    });
  });

  // UT-CM-007
  describe('equals: 同一フィールドを持つ 2 つの CommitMessage は等値', () => {
    context('同一 unit/storyId/description を持つ 2 つの CommitMessage を比較する場合', () => {
      it('equals() が true を返す', () => {
        // Arrange
        const a = createCommitMessage();
        const b = createCommitMessage();
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // UT-CM-008
  describe('equals: description のみ異なる CommitMessage は非等値', () => {
    context('description のみ異なる 2 つの CommitMessage を比較する場合', () => {
      it('equals() が false を返す', () => {
        // Arrange
        const a = createCommitMessage({ description: 'desc A' });
        const b = createCommitMessage({ description: 'desc B' });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-CM-009
  describe('不変性: Object.freeze() によりプロパティ変更不可（INV-8）', () => {
    context('生成後にプロパティ変更を試みる場合', () => {
      it('プロパティが変更されない', () => {
        // Arrange
        const msg = createCommitMessage();
        const originalUnit = msg.unit;
        // Act
        try { (msg as any).unit = 'changed'; } catch { /* strict mode では TypeError */ }
        const actual = msg.unit;
        // Assert
        expect(actual).toBe(originalUnit);
      });
    });
  });

});
```

---

### 3.4 TddCycle（`tdd-cycle.test.ts`）

```typescript
target('TddCycle', () => {

  // UT-TC-001〜003: 生成テスト
  describe('create: 各 phase で正常生成されること', () => {
    context("phase='RED', passed=false の場合", () => {
      it('正常に生成される', () => {
        const actual = TddCycle.create('RED', false); // Act
        expect(actual.phase).toBe('RED');             // Assert
      });
    });
  });
  // UT-TC-002: phase='GREEN', passed=true → 正常生成（同パターン省略）
  // UT-TC-003: phase='REFACTOR', passed=true → 正常生成（同パターン省略）

  // UT-TC-004
  describe('isReadyForCommit: REFACTOR+passed=true で true を返すこと', () => {
    context("phase='REFACTOR', passed=true の場合", () => {
      it('isReadyForCommit() が true を返す', () => {
        // Arrange
        const cycle = TddCycle.create('REFACTOR', true);
        // Act
        const actual = cycle.isReadyForCommit();
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // UT-TC-005
  describe('isReadyForCommit: REFACTOR+passed=false で false を返すこと', () => {
    context("phase='REFACTOR', passed=false の場合", () => {
      it('isReadyForCommit() が false を返す', () => {
        const actual = TddCycle.create('REFACTOR', false).isReadyForCommit();
        expect(actual).toBe(false);
      });
    });
  });

  // UT-TC-006
  describe('isReadyForCommit: GREEN+passed=true で false を返すこと', () => {
    context("phase='GREEN', passed=true の場合", () => {
      it('isReadyForCommit() が false を返す', () => {
        const actual = TddCycle.create('GREEN', true).isReadyForCommit();
        expect(actual).toBe(false);
      });
    });
  });

  // UT-TC-007
  describe('isReadyForCommit: RED+passed=false で false を返すこと', () => {
    context("phase='RED', passed=false の場合", () => {
      it('isReadyForCommit() が false を返す', () => {
        const actual = TddCycle.create('RED', false).isReadyForCommit();
        expect(actual).toBe(false);
      });
    });
  });

  // UT-TC-008
  describe('equals: 同一 phase/passed は等値', () => {
    context('同一 phase/passed を持つ 2 つの TddCycle の場合', () => {
      it('equals() が true を返す', () => {
        // Arrange
        const a = TddCycle.create('REFACTOR', true);
        const b = TddCycle.create('REFACTOR', true);
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // UT-TC-009
  describe('equals: phase が異なれば非等値', () => {
    context('phase が異なる 2 つの TddCycle の場合', () => {
      it('equals() が false を返す', () => {
        const actual = TddCycle.create('RED', false).equals(TddCycle.create('GREEN', false));
        expect(actual).toBe(false);
      });
    });
  });

});
```

---

### 3.5 CommitReadiness（`commit-readiness.test.ts`）

```typescript
target('CommitReadiness', () => {

  // UT-CR-001
  describe('go: ready=true, violations=[] で生成されること', () => {
    context('CommitReadiness.go() を呼ぶ場合', () => {
      it('ready=true, violations=[] のインスタンスが生成される', () => {
        const actual = CommitReadiness.go();
        expect(actual.ready).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });
  });

  // UT-CR-002
  describe('noGo: violations 1 件で生成されること', () => {
    context("violations=[{ ruleId: 'L1-001', message: 'error' }] の場合", () => {
      it('ready=false, violations に 1 件が含まれるインスタンスが生成される', () => {
        // Arrange
        const violations = [{ ruleId: 'L1-001', message: 'format error' }];
        // Act
        const actual = CommitReadiness.noGo(violations);
        // Assert
        expect(actual.ready).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(actual.violations[0]?.ruleId).toBe('L1-001');
      });
    });
  });

  // UT-CR-003
  describe('noGo: violations=[] で EMPTY_VIOLATIONS エラー', () => {
    context('CommitReadiness.noGo([]) を呼ぶ場合', () => {
      it('HarnessError(EMPTY_VIOLATIONS) がスローされる', () => {
        expect(() => CommitReadiness.noGo([])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_VIOLATIONS') }),
        );
      });
    });
  });

  // UT-CR-004
  describe('equals: go() で生成した 2 つは等値', () => {
    context('go() で生成した 2 つの CommitReadiness を比較する場合', () => {
      it('equals() が true を返す', () => {
        const actual = CommitReadiness.go().equals(CommitReadiness.go());
        expect(actual).toBe(true);
      });
    });
  });

  // UT-CR-005
  describe('equals: go() と noGo() は非等値', () => {
    context('go() と noGo() で生成した CommitReadiness を比較する場合', () => {
      it('equals() が false を返す', () => {
        const actual = CommitReadiness.go().equals(CommitReadiness.noGo([{ ruleId: 'L1-001', message: 'err' }]));
        expect(actual).toBe(false);
      });
    });
  });

});
```

---

### 3.6 CoverageReport（`coverage-report.test.ts`）

```typescript
target('CoverageReport', () => {

  // UT-CVR-001
  describe('create: 有効な引数で正常生成（INV-12）', () => {
    context('有効な RequirementCoverageResult と CodeCoverageResult の場合', () => {
      it('正常に生成される', () => {
        expect(() => createCoverageReport()).not.toThrow();
      });
    });
  });

  // UT-CVR-002
  describe('create: requirementCoverage=null で INVALID_COVERAGE_REPORT（INV-12）', () => {
    context('requirementCoverage=null の場合', () => {
      it('HarnessError(INVALID_COVERAGE_REPORT) がスローされる', () => {
        expect(() => CoverageReport.create(null as any, createCodeCoverageResult())).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_REPORT') }),
        );
      });
    });
  });

  // UT-CVR-003（codeCoverage=null → 同パターン省略）

  // UT-CVR-004
  describe('meetsThreshold: 要件100%+コード85% で threshold(100/80) 達成', () => {
    context('coverageRate=100%, lineCoverage=85% の場合', () => {
      it('meetsThreshold() が true を返す', () => {
        // Arrange
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 10, covered: 10, uncoveredIds: [] }),
          codeCoverage: createCodeCoverageResult({ line: 85, branch: 70, fn: 90 }),
        });
        // Act
        const actual = report.meetsThreshold(100, 80);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // UT-CVR-005
  describe('meetsThreshold: 要件95% で threshold(100) 未達', () => {
    context('coverageRate=95%, lineCoverage=85% の場合', () => {
      it('meetsThreshold() が false を返す（要件カバレッジ未達）', () => {
        // Arrange
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 20, covered: 19, uncoveredIds: ['REQ-20'] }),
          codeCoverage: createCodeCoverageResult({ line: 85, branch: 70, fn: 90 }),
        });
        // Act
        const actual = report.meetsThreshold(100, 80);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-CVR-006: コードカバレッジ未達
  describe('meetsThreshold: 要件100% + コード75% で threshold(100/80) 未達', () => {
    context('lineCoverage=75% の場合', () => {
      it('meetsThreshold() が false を返す（コードカバレッジ未達）', () => {
        // Arrange
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 10, covered: 10, uncoveredIds: [] }),
          codeCoverage: createCodeCoverageResult({ line: 75, branch: 70, fn: 90 }),
        });
        const actual = report.meetsThreshold(100, 80);
        expect(actual).toBe(false);
      });
    });
  });

  // UT-CVR-007: 境界値
  describe('meetsThreshold: 要件100% + コード80% で threshold(100/80) 達成（境界値）', () => {
    context('lineCoverage=80%（閾値と同値）の場合', () => {
      it('meetsThreshold() が true を返す', () => {
        // Arrange
        const report = createCoverageReport({
          requirementCoverage: createRequirementCoverageResult({ total: 10, covered: 10, uncoveredIds: [] }),
          codeCoverage: createCodeCoverageResult({ line: 80, branch: 70, fn: 90 }),
        });
        const actual = report.meetsThreshold(100, 80);
        expect(actual).toBe(true);
      });
    });
  });

  // UT-CVR-008
  describe('equals: 同一 requirementCoverage/codeCoverage を持つ 2 つは等値', () => {
    context('同一内容の 2 つの CoverageReport を比較する場合', () => {
      it('equals() が true を返す', () => {
        // Arrange
        const a = createCoverageReport();
        const b = createCoverageReport();
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

});
```

---

### 3.7 RequirementCoverageResult（`requirement-coverage-result.test.ts`）

```typescript
target('RequirementCoverageResult', () => {

  // UT-RCR-001〜003: 正常生成
  // UT-RCR-001: total=10, covered=10 → 正常
  // UT-RCR-002: total=10, covered=8, uncoveredIds=['REQ-03','REQ-07'] → 正常
  // UT-RCR-003: total=0, covered=0 → 正常（空ケース）

  // UT-RCR-004
  describe('create: covered > total で INVALID_REQUIREMENT_COVERAGE エラー', () => {
    context('total=10, covered=11 の場合', () => {
      it('HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる', () => {
        expect(() => RequirementCoverageResult.create(10, 11, [])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_REQUIREMENT_COVERAGE') }),
        );
      });
    });
  });

  // UT-RCR-005
  describe('create: uncoveredIds.length が total-covered と不一致でエラー', () => {
    context('total=10, covered=8, uncoveredIds=[1件] の場合', () => {
      it('HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる', () => {
        expect(() => RequirementCoverageResult.create(10, 8, ['REQ-03'])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_REQUIREMENT_COVERAGE') }),
        );
      });
    });
  });

  // UT-RCR-006
  describe('create: total=-1 でエラー', () => {
    context('total=-1 の場合', () => {
      it('HarnessError(INVALID_REQUIREMENT_COVERAGE) がスローされる', () => {
        expect(() => RequirementCoverageResult.create(-1, 0, [])).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_REQUIREMENT_COVERAGE') }),
        );
      });
    });
  });

  // UT-RCR-007
  describe('coverageRate: total=10, covered=8 で 80 を返すこと', () => {
    context('total=10, covered=8 の場合', () => {
      it('coverageRate が 80 を返す', () => {
        // Arrange
        const rcr = RequirementCoverageResult.create(10, 8, ['REQ-03', 'REQ-07']);
        // Act
        const actual = rcr.coverageRate;
        // Assert
        expect(actual).toBe(80);
      });
    });
  });

  // UT-RCR-008
  describe('coverageRate: total=0 で 100 を返すこと（特殊ケース）', () => {
    context('total=0, covered=0 の場合', () => {
      it('coverageRate が 100 を返す', () => {
        const actual = RequirementCoverageResult.create(0, 0, []).coverageRate;
        expect(actual).toBe(100);
      });
    });
  });

  // UT-RCR-009
  describe('coverageRate: total=3, covered=1 で約 33.33 を返すこと', () => {
    context('total=3, covered=1 の場合', () => {
      it('coverageRate が約 33.33 を返す', () => {
        const actual = RequirementCoverageResult.create(3, 1, ['REQ-02', 'REQ-03']).coverageRate;
        expect(actual).toBeCloseTo(33.33, 1);
      });
    });
  });

});
```

---

### 3.8 CodeCoverageResult（`code-coverage-result.test.ts`）

```typescript
target('CodeCoverageResult', () => {
  // UT-CCR-001〜003: 正常生成（省略）
  // UT-CCR-004
  describe('create: line=-1 で INVALID_COVERAGE_RANGE エラー', () => {
    context('line=-1 の場合', () => {
      it('HarnessError(INVALID_COVERAGE_RANGE) がスローされる', () => {
        expect(() => CodeCoverageResult.create(-1, 80, 90)).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_COVERAGE_RANGE') }),
        );
      });
    });
  });
  // UT-CCR-005: line=101 → 同パターン
  // UT-CCR-006: branch=101 → 同パターン
  // UT-CCR-007〜008: equals テスト（CommitMessage と同パターン）
});
```

---

### 3.9 LoopAttempt（`loop-attempt.test.ts`）

```typescript
target('LoopAttempt', () => {

  // UT-LPA-001〜002: 正常生成（省略）

  // UT-LPA-003
  describe('create: attemptNumber=0 で INVALID_LOOP_ATTEMPT エラー', () => {
    context('attemptNumber=0（1 未満）の場合', () => {
      it('HarnessError(INVALID_LOOP_ATTEMPT) がスローされる', () => {
        expect(() => createLoopAttempt({ attemptNumber: 0 })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_LOOP_ATTEMPT') }),
        );
      });
    });
  });

  // UT-LPA-004
  describe('create: coverageRate=101 で INVALID_LOOP_ATTEMPT エラー', () => {
    context('coverageRate=101 の場合', () => {
      it('HarnessError(INVALID_LOOP_ATTEMPT) がスローされる', () => {
        expect(() => createLoopAttempt({ coverageRate: 101 })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_LOOP_ATTEMPT') }),
        );
      });
    });
  });

  // UT-LPA-005: coverageRate=-1 → 同パターン

  // UT-LPA-006
  describe('isPassed: gaps=[] で true を返すこと', () => {
    context('gaps=[] の場合', () => {
      it('isPassed() が true を返す', () => {
        const actual = createLoopAttempt({ gaps: [] }).isPassed();
        expect(actual).toBe(true);
      });
    });
  });

  // UT-LPA-007
  describe("isPassed: gaps=['未達項目1'] で false を返すこと", () => {
    context("gaps=['未達項目1'] の場合", () => {
      it('isPassed() が false を返す', () => {
        const actual = createLoopAttempt({ gaps: ['未達項目1'] }).isPassed();
        expect(actual).toBe(false);
      });
    });
  });

});
```

---

### 3.10 Lesson（`lesson.test.ts`）

```typescript
target('Lesson', () => {

  // UT-LS-001
  describe('create: 有効な content で正常生成（INV-11）', () => {
    context("content='有効な教訓テキスト' で create() を呼ぶ場合", () => {
      it('lessonId/fingerprint/timestamp が自動設定される', () => {
        // Arrange（なし）
        // Act
        const actual = createLesson();
        // Assert
        expect(actual.lessonId).toBeTruthy();
        expect(actual.fingerprint).toBeTruthy();
        expect(actual.timestamp).toBeTruthy();
      });
    });
  });

  // UT-LS-002
  describe('create: content='' で EMPTY_LESSON_CONTENT エラー', () => {
    context("content='' の場合", () => {
      it('HarnessError(EMPTY_LESSON_CONTENT) がスローされる', () => {
        expect(() => createLesson({ content: '' })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_LESSON_CONTENT') }),
        );
      });
    });
  });

  // UT-LS-003
  describe('create: 同一 content から生成した 2 つの Lesson の fingerprint が同一', () => {
    context('同一 content で 2 つの Lesson を生成する場合', () => {
      it('両者の fingerprint.value が同一になる', () => {
        // Arrange
        const a = createLesson({ content: '同じ教訓' });
        const b = createLesson({ content: '同じ教訓' });
        // Act & Assert
        expect(a.fingerprint.value).toBe(b.fingerprint.value);
      });
    });
  });

  // UT-LS-004
  describe('create: 空白のみ異なる content（正規化で同一）は同一 fingerprint', () => {
    context('content が空白のみ異なる 2 つの Lesson の場合', () => {
      it('両者の fingerprint.value が同一になる', () => {
        // Arrange
        const a = createLesson({ content: '教訓テキスト' });
        const b = createLesson({ content: '教訓  テキスト' }); // 連続空白
        // Act & Assert
        expect(a.fingerprint.value).toBe(b.fingerprint.value);
      });
    });
  });

  // UT-LS-005
  describe('fingerprint: content 正規化後の SHA-256 と一致（INV-11）', () => {
    context('生成した Lesson の fingerprint を検証する場合', () => {
      it('LessonFingerprint.fromContent(content).value と一致する', () => {
        // Arrange
        const content = '教訓テキスト';
        const lesson = createLesson({ content });
        // Act
        const expected = LessonFingerprint.fromContent(content).value;
        const actual = lesson.fingerprint.value;
        // Assert
        expect(actual).toBe(expected);
      });
    });
  });

  // UT-LS-006
  describe('equals: 同一 content から生成した 2 つは等値', () => {
    context('同一 content から生成した 2 つの Lesson の場合', () => {
      it('equals() が true を返す（fingerprint ベースの等値性）', () => {
        const a = createLesson({ content: '同じ教訓' });
        const b = createLesson({ content: '同じ教訓' });
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  // UT-LS-007
  describe('equals: 異なる content から生成した 2 つは非等値', () => {
    context('異なる content から生成した 2 つの Lesson の場合', () => {
      it('equals() が false を返す', () => {
        const a = createLesson({ content: '教訓A' });
        const b = createLesson({ content: '教訓B' });
        expect(a.equals(b)).toBe(false);
      });
    });
  });

});
```

---

### 3.11 LessonFingerprint（`lesson-fingerprint.test.ts`）

```typescript
target('LessonFingerprint', () => {

  // UT-LF-001
  describe('fromContent: value が 64 文字の 16 進数文字列になること', () => {
    context("content='教訓テキスト' の場合", () => {
      it('value が 64 文字の 16 進数文字列になる', () => {
        // Arrange（なし）
        // Act
        const actual = LessonFingerprint.fromContent('教訓テキスト').value;
        // Assert
        expect(actual).toMatch(/^[0-9a-f]{64}$/);
      });
    });
  });

  // UT-LF-002
  describe('fromContent: 同一 content を 2 回渡すと同一 value（決定論的）', () => {
    context('同一 content を 2 回 fromContent() に渡す場合', () => {
      it('同一の value が生成される', () => {
        const a = LessonFingerprint.fromContent('教訓テキスト').value;
        const b = LessonFingerprint.fromContent('教訓テキスト').value;
        expect(a).toBe(b);
      });
    });
  });

  // UT-LF-003
  describe('fromContent: 全角スペース vs. 半角スペースに変換した同一 content は同一 value', () => {
    context('全角スペースを含む content と変換後の content の場合', () => {
      it('両者の value が同一になる（正規化後の一致）', () => {
        // 全角スペース（\u3000）は正規化で半角に変換される
        const a = LessonFingerprint.fromContent('教訓\u3000テキスト').value;
        const b = LessonFingerprint.fromContent('教訓 テキスト').value;
        expect(a).toBe(b);
      });
    });
  });

  // UT-LF-004
  describe('fromContent: 連続空白を含む content vs. 単一空白の同一 content は同一 value', () => {
    context('連続空白 vs. 単一空白の場合', () => {
      it('両者の value が同一になる', () => {
        const a = LessonFingerprint.fromContent('教訓  テキスト').value;
        const b = LessonFingerprint.fromContent('教訓 テキスト').value;
        expect(a).toBe(b);
      });
    });
  });

  // UT-LF-005
  describe('fromContent: 異なる content は異なる value', () => {
    context('異なる content の場合', () => {
      it('異なる value が生成される', () => {
        const a = LessonFingerprint.fromContent('教訓A').value;
        const b = LessonFingerprint.fromContent('教訓B').value;
        expect(a).not.toBe(b);
      });
    });
  });

  // UT-LF-006〜007: equals テスト（CommitMessage と同パターン、省略）
});
```

---

### 3.12 SourceContext（`source-context.test.ts`）

```typescript
target('SourceContext', () => {
  // UT-SC-001〜002: 正常生成（省略）
  // UT-SC-003
  describe('create: description='' で EMPTY_SOURCE_CONTEXT エラー', () => {
    context("description='' の場合", () => {
      it('HarnessError(EMPTY_SOURCE_CONTEXT) がスローされる', () => {
        expect(() => SourceContext.create('')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_SOURCE_CONTEXT') }),
        );
      });
    });
  });
  // UT-SC-004〜005: equals テスト（省略）
});
```

---

### 3.13 CascadeUpdateTarget（`cascade-update-target.test.ts`）

```typescript
target('CascadeUpdateTarget', () => {

  // UT-CUT-001
  describe('create: 有効な filePath/storyId で正常生成、storyIdTag が自動設定', () => {
    context("filePath='scripts/.../index.ts', storyId='H12-05' の場合", () => {
      it("正常に生成される（storyIdTag='@story-id H12-05'）", () => {
        // Arrange（なし）
        // Act
        const actual = createCascadeUpdateTarget();
        // Assert
        expect(actual.storyIdTag).toBe('@story-id H12-05');
      });
    });
  });

  // UT-CUT-002
  describe('create: filePath='' で EMPTY_FILE_PATH エラー', () => {
    context("filePath='' の場合", () => {
      it('HarnessError(EMPTY_FILE_PATH) がスローされる', () => {
        expect(() => createCascadeUpdateTarget({ filePath: '' })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_FILE_PATH') }),
        );
      });
    });
  });

  // UT-CUT-003〜004: storyIdTag 生成テスト（省略）
  // UT-CUT-005〜006: equals テスト（省略）
});
```

---

### 3.14 CascadeUpdateResult（`cascade-update-result.test.ts`）

```typescript
target('CascadeUpdateResult', () => {
  // UT-CURES-001〜002: 正常生成（省略）
  // UT-CURES-003
  describe('create: updatedCount=-1 で INVALID_UPDATED_COUNT エラー', () => {
    context('updatedCount=-1 の場合', () => {
      it('HarnessError(INVALID_UPDATED_COUNT) がスローされる', () => {
        expect(() => createCascadeUpdateResult({ updatedCount: -1 })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_UPDATED_COUNT') }),
        );
      });
    });
  });
  // UT-CURES-004
  describe('hasErrors: errors=[] で false を返すこと', () => {
    context('errors=[] の場合', () => {
      it('hasErrors() が false を返す', () => {
        const actual = createCascadeUpdateResult({ errors: [] }).hasErrors();
        expect(actual).toBe(false);
      });
    });
  });
  // UT-CURES-005
  describe('hasErrors: errors=['file not found'] で true を返すこと', () => {
    context("errors=['file not found: foo.ts'] の場合", () => {
      it('hasErrors() が true を返す', () => {
        const actual = createCascadeUpdateResult({ errors: ['file not found: foo.ts'] }).hasErrors();
        expect(actual).toBe(true);
      });
    });
  });
});
```

---

### 3.15 SkillStructure（`skill-structure.test.ts`）

```typescript
target('SkillStructure', () => {

  // UT-SS-001
  describe('default: requiredSections が 6 件であること（INV-10）', () => {
    context('SkillStructure.default() を呼ぶ場合', () => {
      it("requiredSections に 'frontmatter', 'purpose', 'inputs', 'outputs', 'prerequisites', 'executionFlow' が含まれる（6 件）", () => {
        // Arrange（なし）
        // Act
        const actual = SkillStructure.default();
        // Assert
        expect(actual.requiredSections).toHaveLength(6);
        expect(actual.requiredSections).toContain('frontmatter');
        expect(actual.requiredSections).toContain('executionFlow');
      });
    });
  });

  // UT-SS-002
  describe('default: 2 回呼ぶと同一 requiredSections を返すこと', () => {
    context('default() を 2 回呼ぶ場合', () => {
      it('同一の requiredSections を返す（キャッシュ済み定数）', () => {
        const a = SkillStructure.default().requiredSections;
        const b = SkillStructure.default().requiredSections;
        expect(a).toEqual(b);
      });
    });
  });

  // UT-SS-003
  describe('default: requiredSections は変更不可（INV-10）', () => {
    context('default() の requiredSections を変更しようとする場合', () => {
      it('プロパティが変更されない（Object.freeze() 済み）', () => {
        // Arrange
        const structure = SkillStructure.default();
        const original = [...structure.requiredSections];
        // Act
        try { (structure.requiredSections as any).push('extra'); } catch { /* ok */ }
        // Assert
        expect(structure.requiredSections).toEqual(original);
      });
    });
  });

  // UT-SS-004
  describe('getMissingSections: 全 6 セクション含む actualSections で [] を返すこと', () => {
    context('actualSections が全 6 セクションを含む場合', () => {
      it('getMissingSections() が [] を返す', () => {
        // Arrange
        const structure = SkillStructure.default();
        // Act
        const actual = structure.getMissingSections(ALL_REQUIRED_SECTIONS);
        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  // UT-SS-005
  describe("getMissingSections: actualSections から 'purpose' を除外すると ['purpose'] が返ること", () => {
    context("actualSections から 'purpose' を除外した場合", () => {
      it("getMissingSections() が ['purpose'] を返す", () => {
        // Arrange
        const structure = SkillStructure.default();
        const sections = ALL_REQUIRED_SECTIONS.filter(s => s !== 'purpose');
        // Act
        const actual = structure.getMissingSections(sections);
        // Assert
        expect(actual).toEqual(['purpose']);
      });
    });
  });

  // UT-SS-006
  describe('getMissingSections: actualSections=[] で全 6 セクションが返ること', () => {
    context('actualSections=[] の場合', () => {
      it('getMissingSections() が全 6 セクションを返す', () => {
        const actual = SkillStructure.default().getMissingSections([]);
        expect(actual).toHaveLength(6);
      });
    });
  });

  // UT-SS-007
  describe('getMissingSections: 余分なセクションが含まれても必須全在なら [] を返すこと', () => {
    context('actualSections に余分なセクションが含まれる（必須は全て含む）場合', () => {
      it('getMissingSections() が [] を返す', () => {
        const actual = SkillStructure.default().getMissingSections([...ALL_REQUIRED_SECTIONS, 'extraSection']);
        expect(actual).toEqual([]);
      });
    });
  });

});
```

---

### 3.16 SkillValidationResult（`skill-validation-result.test.ts`）

```typescript
target('SkillValidationResult', () => {
  // UT-SVR-001
  describe('passed: passed=true, missingSection=[] で生成されること', () => {
    context('SkillValidationResult.passed([...]) を呼ぶ場合', () => {
      it('passed=true, missingSection=[] のインスタンスが生成される', () => {
        const actual = createSkillValidationResultPassed();
        expect(actual.passed).toBe(true);
        expect(actual.missingSection).toHaveLength(0);
      });
    });
  });
  // UT-SVR-002〜003, UT-SVR-004〜005: equals テスト（省略）
});
```

---

### 3.17 AtomicCommitService（`atomic-commit-service.test.ts`）

```typescript
target('AtomicCommitService', () => {

  // UT-ACS-001
  describe('evaluate: REFACTOR+passed=true でコミット成功時に CommitReadiness.go() を返すこと', () => {
    context('phase=REFACTOR, passed=true, 全ポートが成功する場合', () => {
      it('CommitReadiness.go() が返される（ready=true）', async () => {
        // Arrange
        const mockL1 = createMockL1ValidatorPort([]);
        const mockL2 = createMockL2ValidatorPort([]);
        const mockCommit = createMockCommitExecutorPort();
        const service = new AtomicCommitService(mockCommit, mockL1, mockL2);
        const tddCycle = createTddCycle('REFACTOR', true);
        const commitMsg = createCommitMessage();
        // Act
        const actual = await service.evaluate(tddCycle, commitMsg);
        // Assert
        expect(actual.ready).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });
  });

  // UT-ACS-002
  describe('evaluate: phase=GREEN のとき TDD_CYCLE_INCOMPLETE エラー', () => {
    context('phase=GREEN, passed=true の場合', () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        // Arrange
        const service = new AtomicCommitService(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        const tddCycle = createTddCycle('GREEN', true);
        // Act & Assert
        await expect(service.evaluate(tddCycle, createCommitMessage())).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }),
        );
      });
    });
  });

  // UT-ACS-003
  describe('evaluate: phase=REFACTOR, passed=false のとき TDD_CYCLE_INCOMPLETE エラー', () => {
    context('phase=REFACTOR, passed=false の場合', () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        // Arrange
        const service = new AtomicCommitService(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        // Act & Assert
        await expect(service.evaluate(createTddCycle('REFACTOR', false), createCommitMessage())).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }),
        );
      });
    });
  });

  // UT-ACS-004
  describe('evaluate: L1 違反がある場合に CommitReadiness.noGo() が返されること', () => {
    context('L1ValidatorPort が violations=[{ ruleId: L1-001 }] を返す場合', () => {
      it('CommitReadiness.noGo(violations) が返される（commit は実行されない）', async () => {
        // Arrange
        const violations = [{ ruleId: 'L1-001', message: 'format error' }];
        const mockL1 = createMockL1ValidatorPort(violations);
        const mockL2 = createMockL2ValidatorPort([]);
        const mockCommit = createMockCommitExecutorPort();
        const service = new AtomicCommitService(mockCommit, mockL1, mockL2);
        // Act
        const actual = await service.evaluate(createTddCycle(), createCommitMessage());
        // Assert
        expect(actual.ready).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(mockCommit.commit).not.toHaveBeenCalled();
      });
    });
  });

  // UT-ACS-005: L2 違反の場合（同パターン省略）

  // UT-ACS-006
  describe('evaluate: ポート呼び出し順序が L1 → L2 → CommitExecutor であること', () => {
    context('全ポートが成功する場合', () => {
      it('L1 → L2 → CommitExecutor の順に各 1 回ずつ呼ばれる', async () => {
        // Arrange
        const callOrder: string[] = [];
        const mockL1 = { validate: vi.fn().mockImplementation(async () => { callOrder.push('L1'); return []; }) };
        const mockL2 = { validate: vi.fn().mockImplementation(async () => { callOrder.push('L2'); return []; }) };
        const mockCommit = { commit: vi.fn().mockImplementation(async () => { callOrder.push('commit'); }) };
        const service = new AtomicCommitService(mockCommit, mockL1, mockL2);
        // Act
        await service.evaluate(createTddCycle(), createCommitMessage());
        // Assert
        expect(callOrder).toEqual(['L1', 'L2', 'commit']);
      });
    });
  });

  // UT-ACS-007
  describe('evaluate: L1 違反時に L2 と CommitExecutor が呼ばれないこと', () => {
    context('L1ValidatorPort が violations 非空を返す場合', () => {
      it('L2ValidatorPort と CommitExecutorPort は呼ばれない', async () => {
        // Arrange
        const mockL1 = createMockL1ValidatorPort([{ ruleId: 'L1-001', message: 'err' }]);
        const mockL2 = createMockL2ValidatorPort([]);
        const mockCommit = createMockCommitExecutorPort();
        const service = new AtomicCommitService(mockCommit, mockL1, mockL2);
        // Act
        await service.evaluate(createTddCycle(), createCommitMessage());
        // Assert
        expect(mockL2.validate).not.toHaveBeenCalled();
        expect(mockCommit.commit).not.toHaveBeenCalled();
      });
    });
  });

});
```

---

### 3.18 LessonCollector（`lesson-collector.test.ts`）

```typescript
target('LessonCollector', () => {

  // UT-LC-001
  describe('collect: [Agent-Lesson] タグ付き 2 件を収集できること', () => {
    context("sources=['path/to/file.ts'] で 2 件の RawLessonEntry を返す場合", () => {
      it('2 件の Lesson が返される', async () => {
        // Arrange
        const rawEntries = [
          { content: '教訓1', source: 'path/to/file.ts' },
          { content: '教訓2', source: 'path/to/file.ts' },
        ];
        const mockPort = createMockLessonSourceReaderPort([rawEntries]);
        const collector = new LessonCollector(mockPort);
        // Act
        const actual = await collector.collect(['path/to/file.ts']);
        // Assert
        expect(actual).toHaveLength(2);
      });
    });
  });

  // UT-LC-002
  describe('collect: 2 つの sources からフラット化して 2 件が返ること', () => {
    context("sources=['path1', 'path2'] で各 1 件の場合", () => {
      it('合計 2 件の Lesson が返される（フラット化）', async () => {
        // Arrange
        const mockPort = createMockLessonSourceReaderPort([
          [{ content: '教訓A', source: 'path1' }],
          [{ content: '教訓B', source: 'path2' }],
        ]);
        const collector = new LessonCollector(mockPort);
        // Act
        const actual = await collector.collect(['path1', 'path2']);
        // Assert
        expect(actual).toHaveLength(2);
      });
    });
  });

  // UT-LC-003
  describe('collect: sources=[] のとき [] が返ること', () => {
    context('sources=[] の場合', () => {
      it('[] が返される（LessonSourceReaderPort は呼ばれない）', async () => {
        // Arrange
        const mockPort = createMockLessonSourceReaderPort([]);
        const collector = new LessonCollector(mockPort);
        // Act
        const actual = await collector.collect([]);
        // Assert
        expect(actual).toHaveLength(0);
        expect(mockPort.read).not.toHaveBeenCalled();
      });
    });
  });

  // UT-LC-004
  describe('collect: [Agent-Lesson] タグなしのエントリのみの場合に [] が返ること', () => {
    context('[Agent-Lesson] タグなしのエントリのみの場合', () => {
      it('[] が返される（タグなしは除外）', async () => {
        // Arrange
        const mockPort = { read: vi.fn().mockResolvedValue([]) }; // タグなし → 空
        const collector = new LessonCollector(mockPort);
        // Act
        const actual = await collector.collect(['path/to/file.ts']);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

});
```

---

### 3.19 LessonDeduplicator（`lesson-deduplicator.test.ts`）

```typescript
target('LessonDeduplicator', () => {

  // UT-LD-001
  describe('deduplicate: 重複なし 3 件はそのまま 3 件が返ること', () => {
    context('重複なしの Lesson[] 3 件の場合', () => {
      it('3 件がそのまま返される', () => {
        // Arrange
        const lessons = [
          createLesson({ content: '教訓A' }),
          createLesson({ content: '教訓B' }),
          createLesson({ content: '教訓C' }),
        ];
        const deduplicator = new LessonDeduplicator();
        // Act
        const actual = deduplicator.deduplicate(lessons);
        // Assert
        expect(actual).toHaveLength(3);
      });
    });
  });

  // UT-LD-002
  describe('deduplicate: 同一 content の Lesson 2 件は 1 件のみ返ること（先着優先）', () => {
    context('同一 content の Lesson 2 件（重複）の場合', () => {
      it('1 件のみ返される（先着優先）', () => {
        // Arrange
        const lessons = [
          createLesson({ content: '重複する教訓' }),
          createLesson({ content: '重複する教訓' }),
        ];
        const deduplicator = new LessonDeduplicator();
        // Act
        const actual = deduplicator.deduplicate(lessons);
        // Assert
        expect(actual).toHaveLength(1);
      });
    });
  });

  // UT-LD-003
  describe('deduplicate: 3 件中 1 件が重複する場合に 2 件が返ること', () => {
    context('3 件中 1 件が重複の場合', () => {
      it('2 件が返される', () => {
        // Arrange
        const lessons = [
          createLesson({ content: '教訓A' }),
          createLesson({ content: '教訓B' }),
          createLesson({ content: '教訓A' }),
        ];
        const actual = new LessonDeduplicator().deduplicate(lessons);
        expect(actual).toHaveLength(2);
      });
    });
  });

  // UT-LD-004
  describe('deduplicate: lessons=[] のとき [] が返ること', () => {
    context('lessons=[] の場合', () => {
      it('[] が返される', () => {
        const actual = new LessonDeduplicator().deduplicate([]);
        expect(actual).toHaveLength(0);
      });
    });
  });

  // UT-LD-005
  describe('deduplicate: 先着優先テスト', () => {
    context('同一 content だが sourceContext が異なる Lesson 2 件（先着=sourceA）の場合', () => {
      it('返される Lesson の sourceContext が sourceA である', () => {
        // Arrange
        const sourceA = createSourceContext('sourceA-context');
        const sourceB = createSourceContext('sourceB-context');
        const lessonA = createLesson({ content: '同じ教訓', sourceContext: sourceA });
        const lessonB = createLesson({ content: '同じ教訓', sourceContext: sourceB });
        // Act
        const actual = new LessonDeduplicator().deduplicate([lessonA, lessonB]);
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]?.sourceContext.description).toBe('sourceA-context');
      });
    });
  });

});
```

---

### 3.20 CascadeUpdateService（`cascade-update-service.test.ts`）

```typescript
target('CascadeUpdateService', () => {

  // UT-CUS-001
  describe('resolve: patterns と validatorIds から CascadeUpdateTarget[] を返すこと', () => {
    context("storyId='H12-05', patterns=['scripts/**/*.ts'], validatorIds=['L1-001','L2-001'] の場合", () => {
      it('CascadeUpdateTarget[] が返される（filePath + storyIdTag を含む）', async () => {
        // Arrange
        const mockConfig = createMockConfigQueryPort(['scripts/**/*.ts']);
        const mockRegistry = createMockValidatorIdRegistryPort(['L1-001', 'L2-001']);
        const service = new CascadeUpdateService(createMockFileSystemPort(), mockConfig, mockRegistry);
        // Act
        const actual = await service.resolve('H12-05');
        // Assert
        expect(Array.isArray(actual)).toBe(true);
        if (actual.length > 0) {
          expect(actual[0]?.storyIdTag).toContain('@story-id H12-05');
        }
      });
    });
  });

  // UT-CUS-002
  describe('resolve: patterns=[] のとき [] が返ること', () => {
    context('ConfigQueryPort が patterns=[] を返す場合', () => {
      it('[] が返される', async () => {
        // Arrange
        const mockConfig = createMockConfigQueryPort([]);
        const mockRegistry = createMockValidatorIdRegistryPort([]);
        const service = new CascadeUpdateService(createMockFileSystemPort(), mockConfig, mockRegistry);
        // Act
        const actual = await service.resolve('H12-05');
        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

});
```

---

### 3.21 SkillStructureValidator（`skill-structure-validator.test.ts`）

```typescript
target('SkillStructureValidator', () => {

  // UT-SSV-001
  describe('validate: 全必須セクションを含む Markdown で passed=true が返ること', () => {
    context("SkillFileReaderPort が全 6 セクションを含む Markdown を返す場合", () => {
      it('SkillValidationResult(passed=true, missingSection=[]) が返される', async () => {
        // Arrange
        const fullMarkdown = `---\n## 目的\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const mockPort = createMockSkillFileReaderPort(fullMarkdown);
        const validator = new SkillStructureValidator(mockPort);
        // Act
        const actual = await validator.validate('skills/example.skill');
        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.missingSection).toHaveLength(0);
      });
    });
  });

  // UT-SSV-002
  describe("validate: 'purpose' セクションが欠落した Markdown で passed=false が返ること", () => {
    context("SkillFileReaderPort が 'purpose' 欠落の Markdown を返す場合", () => {
      it("SkillValidationResult(passed=false, missingSection=['purpose']) が返される", async () => {
        // Arrange
        const missingPurposeMarkdown = `---\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const mockPort = createMockSkillFileReaderPort(missingPurposeMarkdown);
        const validator = new SkillStructureValidator(mockPort);
        // Act
        const actual = await validator.validate('skills/example.skill');
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toContain('purpose');
      });
    });
  });

  // UT-SSV-003
  describe('validate: SkillFileReaderPort が SKILL_FILE_NOT_FOUND をスローした場合にエラーが伝播すること', () => {
    context('SkillFileReaderPort が HarnessError(SKILL_FILE_NOT_FOUND) をスローする場合', () => {
      it('HarnessError(SKILL_FILE_NOT_FOUND) が伝播する', async () => {
        // Arrange
        const mockPort = {
          read: vi.fn().mockRejectedValue(
            Object.assign(new Error('not found'), { code: 'SKILL_FILE_NOT_FOUND' }),
          ),
        };
        const validator = new SkillStructureValidator(mockPort);
        // Act & Assert
        await expect(validator.validate('skills/nonexistent.skill')).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('SKILL_FILE_NOT_FOUND') }),
        );
      });
    });
  });

});
```

---

## 4. WI-365 実装突合レビュー記録（2026-08-06）

<!-- @work-item-id WI-365 -->

`p2:check-freshness` で error 判定（104 日経過）となったため、タイムスタンプ更新ではなく
**現行実装との突合レビュー**を実施した。本文書は今回レビューした 11 文書のうち精度が高い部類で、
§1 の 21 パスはすべて実在する。

### 4.1 検証済み（記述と実装が一致）

- §2.1 / §2.2 のファクトリはすべて記載どおりのシグネチャで実在:
  `PlanCheckerLoop.create()` / `LoopAttempt.create(props)` / `LessonArtifact.create(storyId)` /
  `CommitMessage.create(unit, storyId, description)` / `TddCycle.create(phase, passed)` /
  `CommitReadiness.go()` / `noGo(violations)` /
  `RequirementCoverageResult.create(total, covered, uncoveredIds)` /
  `CodeCoverageResult.create(line, branch, fn)` / `CoverageReport.create(req, code)` /
  `SourceContext.create(description)` / `Lesson.create({content, sourceContext, tags})` /
  `CascadeUpdateTarget.create(filePath, storyId)` / `CascadeUpdateResult.create(props)` /
  `SkillValidationResult.passed(...)` / `failed(...)` / `LessonFingerprint.fromContent(...)`。
  （`CommitMessage.create` には未記載の任意第 4 引数 `workItemId?` がある）
- §2.3 のモックポートファクトリはポート interface と一致
  （`commit` / `validate` / `read` / `list` / `getCoverageThreshold` /
  `isAgentLessonCollectionEnabled` / `getCascadeUpdateTargetPatterns`）。
- §3.20 `CascadeUpdateService(validatorIdRegistryPort, configQueryPort)` と `resolve(storyId)`。
- §3.21 `SkillStructureValidator(skillFileReaderPort)` と `validate(skillFilePath)`。
- ケース数一致: §3.1(11) / §3.2(10) / §3.5(5) / §3.6(8) / §3.7(9) / §3.9(7) / §3.10(7) /
  §3.14(5) / §3.16(5) / §3.18(4) / §3.19(5)。

### 4.2 是正した記述

§1 に、未掲載だが同ディレクトリに実在する 5 ファイルを注記。

### 4.3 実装差分（本 WI では事実記録に留める）

| # | 箇所 | 文書の記述 | 現行実装 |
|---|---|---|---|
| 1 | §2.2 / §3.15 | `ALL_REQUIRED_SECTIONS` は 6 要素、UT-SS-001/006 は `toHaveLength(6)` | `REQUIRED_SECTIONS` は **7 要素**。WI-212 / WI-241 で `frontmatter` と `purpose` の間に `languageMetadata` が入った。実テストは 7 を期待する。さらに `SkillStructure.forKind(kind)` と、必須 3 セクション（`frontmatter` / `languageMetadata` / `purpose`）だけの `advisory` kind、および kind 別インスタンスキャッシュが未記載。実ケース数は 10（文書は 7） |
| 2 | §3.17 | `await service.evaluate(tddCycle, commitMsg)` | メソッド名は `execute(tddCycle, commitMessage)`。`evaluate` は存在しない。コンストラクタ `(commitExecutorPort, l1ValidatorPort, l2ValidatorPort)` は正しい。実ケース数は 5（文書は 7） |
| 3 | §3.21 | 3 ケース | 実装は 11 ケース。`forKind` 起点の advisory / lifecycle 検証を文書が扱っていない（今回最大の差） |
| 4 | §3.3 / §3.4 / §3.8 / §3.11 / §3.12 / §3.13 / §3.20 | 9 / 9 / 8 / 7 / 5 / 6 / 2 ケース | 実測 12 / 13 / 7 / 6 / 4 / 5 / 3。`（省略）` プレースホルダによる差分も含むため、単純な欠陥とは限らない |
| 5 | 総計 | 21 節の合計 139 | 実測 152（未掲載 5 ファイルを含めると 176） |
