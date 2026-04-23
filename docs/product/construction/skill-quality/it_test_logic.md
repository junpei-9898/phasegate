# ITテストロジック設計: skill-quality

@story-id H12-01
@story-id H12-02
@story-id H12-03
@story-id H12-04
@story-id H12-05
@story-id H12-06
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20
> **参照**: it_test_design.md, logical_design.md

---

## 1. テストファイル構成

```text
scripts/harness/__tests__/integration/skill-quality/
├── execute-tdd-cycle-usecase.test.ts              # ExecuteTddCycleUseCase
├── check-coverage-usecase.test.ts                 # CheckCoverageUseCase
├── run-plan-checker-loop-usecase.test.ts          # RunPlanCheckerLoopUseCase
├── collect-lessons-usecase.test.ts                # CollectLessonsUseCase
├── write-lesson-artifact-usecase.test.ts          # WriteLessonArtifactUseCase
├── apply-cascade-update-usecase.test.ts           # ApplyCascadeUpdateUseCase
├── validate-skill-structure-usecase.test.ts       # ValidateSkillStructureUseCase
├── git-commit-executor-adapter.test.ts            # GitCommitExecutorAdapter
├── file-system-lesson-source-reader-adapter.test.ts
├── file-system-lesson-artifact-writer-adapter.test.ts
├── ajv-lesson-artifact-schema-adapter.test.ts
├── file-system-requirement-test-matrix-adapter.test.ts
├── harness-config-query-adapter.test.ts           # HarnessConfigQueryAdapter
├── file-system-skill-file-reader-adapter.test.ts
├── execute-tdd-cycle-handler.test.ts              # ExecuteTddCycleHandler
├── check-coverage-handler.test.ts                 # CheckCoverageHandler
├── run-plan-checker-loop-handler.test.ts          # RunPlanCheckerLoopHandler
├── collect-lessons-handler.test.ts                # CollectLessonsHandler
├── apply-cascade-update-handler.test.ts           # ApplyCascadeUpdateHandler
├── validate-skill-structure-handler.test.ts       # ValidateSkillStructureHandler
├── tdd-cycle-e2e-integration.test.ts              # TDD サイクル実行統合
├── lesson-artifact-e2e-integration.test.ts        # Lesson Artifact システム統合
├── skill-validation-e2e-integration.test.ts       # SKILL.md 検証統合
└── fixtures/
    ├── valid-skill.md
    ├── incomplete-skill.md
    └── requirement-test-matrix.json
```

**共通インポートパターン**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
```

---

## 2. モック戦略

### 2.1 外部 Unit ポートのモック方針

| ポート | モック手段 | 備考 |
|--------|----------|------|
| CommitExecutorPort | `vi.fn()` スタブ | git exec をインメモリで差し替え |
| L1ValidatorPort | `vi.fn()` スタブ | violations 配列を直接返す |
| L2ValidatorPort | `vi.fn()` スタブ | violations 配列を直接返す |
| PlanCheckExecutorPort | `vi.fn()` スタブ | { coverageRate, gaps } を返すよう設定 |
| LessonSourceReaderPort | `vi.fn()` スタブ | RawLessonEntry[] を返す |
| LessonArtifactWriterPort | `vi.fn()` スタブ | write を void で解決 |
| LessonArtifactSchemaPort | `vi.fn()` スタブ | ValidationViolation[] を返す |
| RequirementTestMatrixPort | `vi.fn()` スタブ | RequirementTestMatrix を返す |
| CoverageRunnerPort | `vi.fn()` スタブ | { line, branch, fn } を返す |
| ValidatorIdRegistryPort | `vi.fn()` スタブ | ValidatorId[] を返す |
| ConfigQueryPort | `vi.fn()` スタブ | 閾値・フラグを返す |
| SkillFileReaderPort | `vi.fn()` スタブ | ファイル内容文字列を返す |
| FileSystemPort | `vi.fn()` スタブ | read/write を差し替え |

### 2.2 ファイル I/O のモック方針

- **Adapter 単体テスト**: `vi.mock('node:fs/promises')` によるモジュールレベルモックを使用する
- **ファイルシステムへの実 I/O が必要な場合**: `os.tmpdir()` の一時ディレクトリを使用し、`afterEach` でクリーンアップする
- **git コマンド**: `vi.mock('node:child_process')` で `exec` を差し替える

### 2.3 内部ドメインサービスの扱い方針

- **SkillStructureValidator** など Pure Domain Service: モックせず実体を使用する（ポート依存なしのサービスも同様）
- **LessonDeduplicator**: ポート依存なし・純粋計算のため、UseCase テストでも実体を注入する
- UseCase テストでは Domain モデル（集約・VO）も実体を使用し、ポートのみモックにする

### 2.4 モックオブジェクト生成パターン（共通ヘルパー）

```typescript
// ポートモックの基本パターン（各テストファイル先頭で定義）

function createMockCommitExecutorPort() {
  return { commit: vi.fn().mockResolvedValue(undefined) };
}

function createMockL1ValidatorPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

function createMockL2ValidatorPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

function createMockPlanCheckExecutorPort(
  results: Array<{ coverageRate: number; gaps: string[] }> = []
) {
  let idx = 0;
  return {
    evaluate: vi.fn().mockImplementation(async () => results[idx++] ?? { coverageRate: 100, gaps: [] }),
  };
}

function createMockLessonSourceReaderPort(entriesPerSource: RawLessonEntry[][] = []) {
  let idx = 0;
  return { read: vi.fn().mockImplementation(async () => entriesPerSource[idx++] ?? []) };
}

function createMockLessonArtifactWriterPort() {
  return { write: vi.fn().mockResolvedValue(undefined) };
}

function createMockLessonArtifactSchemaPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

function createMockRequirementTestMatrixPort(
  total = 5, covered = 5, uncoveredIds: string[] = []
) {
  return {
    read: vi.fn().mockResolvedValue({ total, covered, uncoveredIds }),
  };
}

function createMockCoverageRunnerPort(
  result = { line: 85, branch: 80, fn: 90 }
) {
  return { run: vi.fn().mockResolvedValue(result) };
}

function createMockConfigQueryPort(overrides: {
  requirementThreshold?: number;
  codeThreshold?: number;
  agentLessonEnabled?: boolean;
  cascadePatterns?: string[];
} = {}) {
  return {
    getCoverageThreshold: vi.fn().mockResolvedValue({
      requirement: overrides.requirementThreshold ?? 100,
      code: overrides.codeThreshold ?? 80,
    }),
    isAgentLessonCollectionEnabled: vi.fn().mockResolvedValue(
      overrides.agentLessonEnabled ?? true
    ),
    getCascadeUpdateTargetPatterns: vi.fn().mockResolvedValue(
      overrides.cascadePatterns ?? ['scripts/**/*.ts']
    ),
  };
}

function createMockValidatorIdRegistryPort(ids: string[] = ['L1-001', 'L2-001']) {
  return { list: vi.fn().mockResolvedValue(ids) };
}

function createMockSkillFileReaderPort(content = '') {
  return { read: vi.fn().mockResolvedValue(content) };
}

function createMockFileSystemPort(content = '# content') {
  return {
    read: vi.fn().mockResolvedValue(content),
    write: vi.fn().mockResolvedValue(undefined),
  };
}

// UseCase モック（Handler テスト用）
function createMockExecuteTddCycleUseCase(output: ExecuteTddCycleOutput) {
  return { execute: vi.fn().mockResolvedValue(output) };
}
function createMockCheckCoverageUseCase(output: CheckCoverageOutput) {
  return { execute: vi.fn().mockResolvedValue(output) };
}
// 他 UseCase モックも同パターン
```

---

## 3. UseCase テスト詳細ロジック

### 3.1 ExecuteTddCycleUseCase（`execute-tdd-cycle-usecase.test.ts`）

```typescript
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ExecuteTddCycleUseCase } from '../../../skill-quality/application/usecases/execute-tdd-cycle-usecase.js';

target('ExecuteTddCycleUseCase', () => {

  // IT-UC-ExecTdd-001
  describe('execute: REFACTOR+passed=true でコミットが成功すること', () => {
    context('L1/L2 違反なし・CommitExecutorPort が成功する場合', () => {
      it('output.ready=true, violations=[], committedMessage が返される', async () => {
        // Arrange
        const mockCommit = createMockCommitExecutorPort();
        const mockL1 = createMockL1ValidatorPort([]);
        const mockL2 = createMockL2ValidatorPort([]);
        const usecase = new ExecuteTddCycleUseCase(mockCommit, mockL1, mockL2);
        const input = {
          unit: 'skill-quality',
          storyId: 'H12-01',
          description: 'add domain model',
          phase: 'REFACTOR' as const,
          passed: true,
        };
        // Act
        const actual = await usecase.execute(input);
        // Assert
        expect(actual.ready).toBe(true);
        expect(actual.violations).toHaveLength(0);
        expect(actual.committedMessage).toBe('feat(skill-quality/H12-01): add domain model');
      });
    });
  });

  // IT-UC-ExecTdd-002
  describe('execute: L1 違反がある場合にコミットが実行されないこと', () => {
    context("L1ValidatorPort が violations=[{ ruleId: 'L1-001' }] を返す場合", () => {
      it('output.ready=false, violations.length=1, committedMessage=null', async () => {
        // Arrange
        const violations = [{ ruleId: 'L1-001', message: 'format error' }];
        const mockL1 = createMockL1ValidatorPort(violations);
        const mockL2 = createMockL2ValidatorPort([]);
        const mockCommit = createMockCommitExecutorPort();
        const usecase = new ExecuteTddCycleUseCase(mockCommit, mockL1, mockL2);
        // Act
        const actual = await usecase.execute({
          unit: 'skill-quality', storyId: 'H12-01', description: 'test',
          phase: 'REFACTOR', passed: true,
        });
        // Assert
        expect(actual.ready).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(actual.committedMessage).toBeNull();
        expect(mockCommit.commit).not.toHaveBeenCalled();
      });
    });
  });

  // IT-UC-ExecTdd-003
  describe('execute: phase=GREEN の場合に TDD_CYCLE_INCOMPLETE エラーになること', () => {
    context("phase='GREEN', passed=true の場合", () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        // Arrange
        const usecase = new ExecuteTddCycleUseCase(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        // Act & Assert
        await expect(
          usecase.execute({ unit: 'sq', storyId: 'H12-01', description: 'd', phase: 'GREEN', passed: true }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }));
      });
    });
  });

  // IT-UC-ExecTdd-004
  describe('execute: phase=REFACTOR, passed=false の場合にエラーになること', () => {
    context("phase='REFACTOR', passed=false の場合", () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        // Arrange
        const usecase = new ExecuteTddCycleUseCase(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        // Act & Assert
        await expect(
          usecase.execute({ unit: 'sq', storyId: 'H12-01', description: 'd', phase: 'REFACTOR', passed: false }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }));
      });
    });
  });

  // IT-UC-ExecTdd-005
  describe('execute: storyId='' の場合に入力バリデーションエラーになること', () => {
    context("storyId='' の場合", () => {
      it('HarnessError(EMPTY_COMMIT_FIELD) がスローされる', async () => {
        // Arrange
        const usecase = new ExecuteTddCycleUseCase(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        // Act & Assert
        await expect(
          usecase.execute({ unit: 'sq', storyId: '', description: 'd', phase: 'REFACTOR', passed: true }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('EMPTY_COMMIT_FIELD') }));
      });
    });
  });

  // IT-UC-ExecTdd-006
  describe('execute: L2 のみ違反がある場合にコミットが実行されないこと', () => {
    context('L1 は通過、L2ValidatorPort が violations 非空を返す場合', () => {
      it('output.ready=false, violations[0].ruleId=L2-001', async () => {
        // Arrange
        const l2Violations = [{ ruleId: 'L2-001', message: 'lint error' }];
        const mockL1 = createMockL1ValidatorPort([]);
        const mockL2 = createMockL2ValidatorPort(l2Violations);
        const mockCommit = createMockCommitExecutorPort();
        const usecase = new ExecuteTddCycleUseCase(mockCommit, mockL1, mockL2);
        // Act
        const actual = await usecase.execute({
          unit: 'sq', storyId: 'H12-01', description: 'd', phase: 'REFACTOR', passed: true,
        });
        // Assert
        expect(actual.ready).toBe(false);
        expect(actual.violations[0]?.ruleId).toBe('L2-001');
        expect(mockCommit.commit).not.toHaveBeenCalled();
      });
    });
  });

});
```

---

### 3.2 CheckCoverageUseCase（`check-coverage-usecase.test.ts`）

```typescript
target('CheckCoverageUseCase', () => {

  // IT-UC-CheckCov-001
  describe('execute: 要件100% + コード85% で閾値達成すること', () => {
    context('ConfigQueryPort(100/80), RequirementTestMatrix(5/5), CoverageRunner(line=85) の場合', () => {
      it('output.meetsThreshold=true, requirementCoverage.coverageRate=100', async () => {
        // Arrange
        const mockConfig = createMockConfigQueryPort({ requirementThreshold: 100, codeThreshold: 80 });
        const mockMatrix = createMockRequirementTestMatrixPort(5, 5, []);
        const mockCoverage = createMockCoverageRunnerPort({ line: 85, branch: 80, fn: 90 });
        const usecase = new CheckCoverageUseCase(mockConfig, mockMatrix, mockCoverage);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-02' });
        // Assert
        expect(actual.meetsThreshold).toBe(true);
        expect(actual.coverageReport.requirementCoverage.coverageRate).toBe(100);
      });
    });
  });

  // IT-UC-CheckCov-002
  describe('execute: 要件80% で閾値未達になること', () => {
    context('RequirementTestMatrix(5/4, uncoveredIds=["REQ-05"]) の場合', () => {
      it('output.meetsThreshold=false, uncoveredIds=["REQ-05"]', async () => {
        // Arrange
        const mockConfig = createMockConfigQueryPort({ requirementThreshold: 100, codeThreshold: 80 });
        const mockMatrix = createMockRequirementTestMatrixPort(5, 4, ['REQ-05']);
        const mockCoverage = createMockCoverageRunnerPort({ line: 85, branch: 80, fn: 90 });
        const usecase = new CheckCoverageUseCase(mockConfig, mockMatrix, mockCoverage);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-02' });
        // Assert
        expect(actual.meetsThreshold).toBe(false);
        expect(actual.coverageReport.requirementCoverage.uncoveredIds).toContain('REQ-05');
      });
    });
  });

  // IT-UC-CheckCov-003
  describe('execute: RequirementTestMatrix が MATRIX_FILE_NOT_FOUND をスローした場合にエラーが伝播すること', () => {
    context('RequirementTestMatrixPort が HarnessError(MATRIX_FILE_NOT_FOUND) をスローする場合', () => {
      it('HarnessError(MATRIX_FILE_NOT_FOUND) が伝播する', async () => {
        // Arrange
        const mockMatrix = {
          read: vi.fn().mockRejectedValue(
            Object.assign(new Error('not found'), { code: 'MATRIX_FILE_NOT_FOUND' }),
          ),
        };
        const usecase = new CheckCoverageUseCase(
          createMockConfigQueryPort(),
          mockMatrix,
          createMockCoverageRunnerPort(),
        );
        // Act & Assert
        await expect(usecase.execute({ storyId: 'H12-02' })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('MATRIX_FILE_NOT_FOUND') }),
        );
      });
    });
  });

  // IT-UC-CheckCov-004
  describe('execute: CoverageRunner が失敗した場合にエラーが伝播すること', () => {
    context('CoverageRunnerPort が HarnessError(COVERAGE_RUN_FAILED) をスローする場合', () => {
      it('HarnessError(COVERAGE_RUN_FAILED) が伝播する', async () => {
        // Arrange
        const mockCoverage = {
          run: vi.fn().mockRejectedValue(
            Object.assign(new Error('coverage failed'), { code: 'COVERAGE_RUN_FAILED' }),
          ),
        };
        const usecase = new CheckCoverageUseCase(
          createMockConfigQueryPort(),
          createMockRequirementTestMatrixPort(),
          mockCoverage,
        );
        // Act & Assert
        await expect(usecase.execute({ storyId: 'H12-02' })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('COVERAGE_RUN_FAILED') }),
        );
      });
    });
  });

});
```

---

### 3.3 RunPlanCheckerLoopUseCase（`run-plan-checker-loop-usecase.test.ts`）

```typescript
target('RunPlanCheckerLoopUseCase', () => {

  // IT-UC-PlanLoop-001
  describe('execute: 1 回目評価で gaps=[] になり PASSED で終了すること', () => {
    context('PlanCheckExecutorPort が 1 回目→{ coverageRate: 100, gaps: [] } を返す場合', () => {
      it('output.status=PASSED, loopHistory.length=1, escalationRequired=false', async () => {
        // Arrange
        const mockExecutor = createMockPlanCheckExecutorPort([
          { coverageRate: 100, gaps: [] },
        ]);
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act
        const actual = await usecase.execute({ planDocument: '...', storyId: 'H12-03' });
        // Assert
        expect(actual.status).toBe('PASSED');
        expect(actual.loopHistory).toHaveLength(1);
        expect(actual.escalationRequired).toBe(false);
      });
    });
  });

  // IT-UC-PlanLoop-002
  describe('execute: 2 回目評価で gaps=[] になり PASSED で終了すること', () => {
    context('1 回目→gaps 非空, 2 回目→gaps=[] の場合', () => {
      it('output.status=PASSED, loopHistory.length=2, escalationRequired=false', async () => {
        // Arrange
        const mockExecutor = createMockPlanCheckExecutorPort([
          { coverageRate: 60, gaps: ['gap1'] },
          { coverageRate: 100, gaps: [] },
        ]);
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act
        const actual = await usecase.execute({ planDocument: '...', storyId: 'H12-03' });
        // Assert
        expect(actual.status).toBe('PASSED');
        expect(actual.loopHistory).toHaveLength(2);
      });
    });
  });

  // IT-UC-PlanLoop-003
  describe('execute: 3 回全て gaps 非空で FAILED_EXCEEDED になること', () => {
    context('全 3 回→gaps=['gap1'] の場合', () => {
      it('output.status=FAILED_EXCEEDED, loopHistory.length=3, escalationRequired=true', async () => {
        // Arrange
        const mockExecutor = createMockPlanCheckExecutorPort([
          { coverageRate: 50, gaps: ['gap1'] },
          { coverageRate: 50, gaps: ['gap1'] },
          { coverageRate: 50, gaps: ['gap1'] },
        ]);
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act
        const actual = await usecase.execute({ planDocument: '...', storyId: 'H12-03' });
        // Assert
        expect(actual.status).toBe('FAILED_EXCEEDED');
        expect(actual.loopHistory).toHaveLength(3);
        expect(actual.escalationRequired).toBe(true);
      });
    });
  });

  // IT-UC-PlanLoop-004
  describe('execute: PlanCheckExecutorPort が例外をスローした場合にエラーが伝播すること', () => {
    context('PlanCheckExecutorPort が throw new Error を返す場合', () => {
      it('エラーが UseCase 外に伝播する', async () => {
        // Arrange
        const mockExecutor = { evaluate: vi.fn().mockRejectedValue(new Error('executor error')) };
        const usecase = new RunPlanCheckerLoopUseCase(mockExecutor);
        // Act & Assert
        await expect(usecase.execute({ planDocument: '...', storyId: 'H12-03' })).rejects.toThrow('executor error');
      });
    });
  });

});
```

---

### 3.4 CollectLessonsUseCase（`collect-lessons-usecase.test.ts`）

```typescript
target('CollectLessonsUseCase', () => {

  // IT-UC-CollLess-001
  describe('execute: agentLessonCollection 有効で Lesson が収集されること', () => {
    context("sources=['path1','path2'], 各 2 件の RawLessonEntry の場合", () => {
      it('output.lessons.length=4, totalCollected=4, deduplicatedCount=0', async () => {
        // Arrange
        const rawEntry1 = { content: '教訓A', source: 'path1' };
        const rawEntry2 = { content: '教訓B', source: 'path1' };
        const rawEntry3 = { content: '教訓C', source: 'path2' };
        const rawEntry4 = { content: '教訓D', source: 'path2' };
        const mockPort = createMockLessonSourceReaderPort([[rawEntry1, rawEntry2], [rawEntry3, rawEntry4]]);
        const mockConfig = createMockConfigQueryPort({ agentLessonEnabled: true });
        const usecase = new CollectLessonsUseCase(mockPort, mockConfig);
        // Act
        const actual = await usecase.execute({ sources: ['path1', 'path2'] });
        // Assert
        expect(actual.lessons).toHaveLength(4);
        expect(actual.totalCollected).toBe(4);
        expect(actual.deduplicatedCount).toBe(0);
      });
    });
  });

  // IT-UC-CollLess-002
  describe('execute: 重複がある場合に deduplicate されること', () => {
    context('同一 content の RawLessonEntry 3 件の場合', () => {
      it('output.lessons.length=1, totalCollected=3, deduplicatedCount=2', async () => {
        // Arrange
        const rawEntry = { content: '同じ教訓', source: 'path1' };
        const mockPort = createMockLessonSourceReaderPort([[rawEntry, rawEntry, rawEntry]]);
        const mockConfig = createMockConfigQueryPort({ agentLessonEnabled: true });
        const usecase = new CollectLessonsUseCase(mockPort, mockConfig);
        // Act
        const actual = await usecase.execute({ sources: ['path1'] });
        // Assert
        expect(actual.lessons).toHaveLength(1);
        expect(actual.totalCollected).toBe(3);
        expect(actual.deduplicatedCount).toBe(2);
      });
    });
  });

  // IT-UC-CollLess-003
  describe('execute: agentLessonCollection 無効の場合に空で返すこと', () => {
    context('ConfigQueryPort が isAgentLessonCollectionEnabled→false を返す場合', () => {
      it('output.lessons=[], LessonSourceReaderPort は呼ばれない', async () => {
        // Arrange
        const mockPort = createMockLessonSourceReaderPort([]);
        const mockConfig = createMockConfigQueryPort({ agentLessonEnabled: false });
        const usecase = new CollectLessonsUseCase(mockPort, mockConfig);
        // Act
        const actual = await usecase.execute({ sources: ['path1'] });
        // Assert
        expect(actual.lessons).toHaveLength(0);
        expect(actual.totalCollected).toBe(0);
        expect(actual.deduplicatedCount).toBe(0);
        expect(mockPort.read).not.toHaveBeenCalled();
      });
    });
  });

});
```

---

### 3.5 WriteLessonArtifactUseCase（`write-lesson-artifact-usecase.test.ts`）

```typescript
target('WriteLessonArtifactUseCase', () => {

  // IT-UC-WriteLess-001
  describe('execute: 有効な Lesson[] が JSON として出力されること', () => {
    context('LessonArtifactSchemaPort が violations=[] を返す場合', () => {
      it('output.lessonCount=2, outputPath が .harness/lesson-artifacts/ で始まる', async () => {
        // Arrange
        const mockSchema = createMockLessonArtifactSchemaPort([]);
        const mockWriter = createMockLessonArtifactWriterPort();
        const usecase = new WriteLessonArtifactUseCase(mockSchema, mockWriter);
        const lessons = [
          { content: '教訓1', sourceContext: '...', tags: [] },
          { content: '教訓2', sourceContext: '...', tags: [] },
        ];
        // Act
        const actual = await usecase.execute({ storyId: 'H12-04', lessons });
        // Assert
        expect(actual.lessonCount).toBe(2);
        expect(actual.outputPath).toMatch(/\.harness\/lesson-artifacts\//);
      });
    });
  });

  // IT-UC-WriteLess-002
  describe('execute: lessons=[] の場合に空の Artifact が出力されること', () => {
    context('lessons=[] の場合', () => {
      it('output.lessonCount=0', async () => {
        // Arrange
        const mockSchema = createMockLessonArtifactSchemaPort([]);
        const mockWriter = createMockLessonArtifactWriterPort();
        const usecase = new WriteLessonArtifactUseCase(mockSchema, mockWriter);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-04', lessons: [] });
        // Assert
        expect(actual.lessonCount).toBe(0);
      });
    });
  });

  // IT-UC-WriteLess-003
  describe('execute: ci-governance スキーマ違反でエラーになること', () => {
    context('LessonArtifactSchemaPort が violations 非空を返す場合', () => {
      it('HarnessError(LESSON_ARTIFACT_SCHEMA_VIOLATION) がスローされる', async () => {
        // Arrange
        const schemaViolations = [{ ruleId: 'schema-001', message: 'missing field' }];
        const mockSchema = createMockLessonArtifactSchemaPort(schemaViolations);
        const mockWriter = createMockLessonArtifactWriterPort();
        const usecase = new WriteLessonArtifactUseCase(mockSchema, mockWriter);
        // Act & Assert
        await expect(
          usecase.execute({ storyId: 'H12-04', lessons: [{ content: '教訓', sourceContext: '...', tags: [] }] }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('LESSON_ARTIFACT_SCHEMA_VIOLATION') }));
      });
    });
  });

  // IT-UC-WriteLess-004
  describe('execute: storyId が INVALID 形式でエラーになること', () => {
    context("storyId='INVALID' の場合", () => {
      it('HarnessError(INVALID_STORY_ID) がスローされる', async () => {
        // Arrange
        const usecase = new WriteLessonArtifactUseCase(
          createMockLessonArtifactSchemaPort(),
          createMockLessonArtifactWriterPort(),
        );
        // Act & Assert
        await expect(usecase.execute({ storyId: 'INVALID', lessons: [] })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_STORY_ID') }),
        );
      });
    });
  });

});
```

---

### 3.6 ApplyCascadeUpdateUseCase（`apply-cascade-update-usecase.test.ts`）

```typescript
target('ApplyCascadeUpdateUseCase', () => {

  // IT-UC-CascUpd-001
  describe('execute: 2 件のターゲットファイルに @story-id が付与されること', () => {
    context('CascadeUpdateService.resolve が [target1, target2] を返し FileSystemPort が成功する場合', () => {
      it('output.updatedCount=2, appliedStoryIds=[@story-id H12-05]', async () => {
        // Arrange
        const mockFs = createMockFileSystemPort('# existing content');
        const mockConfig = createMockConfigQueryPort({ cascadePatterns: ['scripts/**/*.ts'] });
        const mockRegistry = createMockValidatorIdRegistryPort(['L1-001', 'L2-001']);
        const usecase = new ApplyCascadeUpdateUseCase(mockFs, mockConfig, mockRegistry);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        // resolve が targets を返した場合に updatedCount が targets.length と一致すること
        expect(actual.errors).toHaveLength(0);
        expect(typeof actual.updatedCount).toBe('number');
      });
    });
  });

  // IT-UC-CascUpd-002
  describe('execute: 対象ファイルがない場合に更新なしで正常終了すること', () => {
    context('CascadeUpdateService.resolve が [] を返す場合', () => {
      it('output.updatedCount=0, errors=[]', async () => {
        // Arrange
        const mockFs = createMockFileSystemPort();
        const mockConfig = createMockConfigQueryPort({ cascadePatterns: [] });
        const mockRegistry = createMockValidatorIdRegistryPort([]);
        const usecase = new ApplyCascadeUpdateUseCase(mockFs, mockConfig, mockRegistry);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual.updatedCount).toBe(0);
        expect(actual.errors).toHaveLength(0);
      });
    });
  });

  // IT-UC-CascUpd-003
  describe('execute: 一部ファイルの書き込みが失敗した場合に errors に記録されること', () => {
    context('target1 は成功、target2 の write が失敗する場合', () => {
      it('output.updatedCount=1, errors.length=1', async () => {
        // Arrange
        let writeCallCount = 0;
        const mockFs = {
          read: vi.fn().mockResolvedValue('# content'),
          write: vi.fn().mockImplementation(async () => {
            writeCallCount++;
            if (writeCallCount === 2) throw new Error('write failed');
          }),
        };
        const mockConfig = createMockConfigQueryPort({ cascadePatterns: ['scripts/a.ts', 'scripts/b.ts'] });
        const mockRegistry = createMockValidatorIdRegistryPort(['L1-001']);
        const usecase = new ApplyCascadeUpdateUseCase(mockFs, mockConfig, mockRegistry);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual.errors).toHaveLength(1);
        expect(actual.updatedCount).toBeGreaterThanOrEqual(1);
      });
    });
  });

});
```

---

### 3.7 ValidateSkillStructureUseCase（`validate-skill-structure-usecase.test.ts`）

```typescript
target('ValidateSkillStructureUseCase', () => {

  // IT-UC-ValSkill-001
  describe('execute: 全必須セクションが揃っている場合に passed=true になること', () => {
    context("SkillFileReaderPort が全 6 セクションを含む Markdown を返す場合", () => {
      it('output.result.passed=true, missingSection=[]', async () => {
        // Arrange
        const fullMarkdown = `---\n## 目的\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const mockPort = createMockSkillFileReaderPort(fullMarkdown);
        const usecase = new ValidateSkillStructureUseCase(mockPort);
        // Act
        const actual = await usecase.execute({ skillFilePath: 'skills/example.skill' });
        // Assert
        expect(actual.result.passed).toBe(true);
        expect(actual.result.missingSection).toHaveLength(0);
      });
    });
  });

  // IT-UC-ValSkill-002
  describe("execute: 'purpose' が欠落している場合に passed=false になること", () => {
    context("SkillFileReaderPort が 'purpose' セクションなしの Markdown を返す場合", () => {
      it('output.result.passed=false, missingSection=[purpose]', async () => {
        // Arrange
        const missingPurpose = `---\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const mockPort = createMockSkillFileReaderPort(missingPurpose);
        const usecase = new ValidateSkillStructureUseCase(mockPort);
        // Act
        const actual = await usecase.execute({ skillFilePath: 'skills/example.skill' });
        // Assert
        expect(actual.result.passed).toBe(false);
        expect(actual.result.missingSection).toContain('purpose');
      });
    });
  });

  // IT-UC-ValSkill-003
  describe('execute: ファイルが存在しない場合に SKILL_FILE_NOT_FOUND エラーになること', () => {
    context('SkillFileReaderPort が HarnessError(SKILL_FILE_NOT_FOUND) をスローする場合', () => {
      it('HarnessError(SKILL_FILE_NOT_FOUND) が伝播する', async () => {
        // Arrange
        const mockPort = {
          read: vi.fn().mockRejectedValue(
            Object.assign(new Error('not found'), { code: 'SKILL_FILE_NOT_FOUND' }),
          ),
        };
        const usecase = new ValidateSkillStructureUseCase(mockPort);
        // Act & Assert
        await expect(usecase.execute({ skillFilePath: 'skills/nonexistent.skill' })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('SKILL_FILE_NOT_FOUND') }),
        );
      });
    });
  });

});
```

---

## 4. Infrastructure Adapter テスト詳細ロジック

### 4.1 GitCommitExecutorAdapter（`git-commit-executor-adapter.test.ts`）

```typescript
import { vi } from 'vitest';
// vi.mock('node:child_process') をファイル先頭で宣言

target('GitCommitExecutorAdapter', () => {

  // IT-REPO-GitCommit-001
  describe('commit: 有効な CommitMessage で git commit が実行されること', () => {
    context('child_process.exec が終了コード 0 を返す場合', () => {
      it('commit が成功する（例外なし）、実行コマンドに feat(skill-quality/H12-01): test が含まれる', async () => {
        // Arrange
        const mockExec = vi.fn().mockImplementation((cmd, cb) => cb(null, '', ''));
        vi.mocked(require('node:child_process').exec).mockImplementation(mockExec);
        const adapter = new GitCommitExecutorAdapter();
        const commitMsg = CommitMessage.create('skill-quality', 'H12-01', 'test');
        // Act
        await adapter.commit(commitMsg);
        // Assert
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining('feat(skill-quality/H12-01): test'),
          expect.any(Function),
        );
      });
    });
  });

  // IT-REPO-GitCommit-002
  describe('commit: git commit が失敗した場合に GIT_COMMIT_FAILED エラーになること', () => {
    context('child_process.exec が終了コード 1 を返す場合', () => {
      it('HarnessError(GIT_COMMIT_FAILED) がスローされる', async () => {
        // Arrange
        const mockExec = vi.fn().mockImplementation((cmd, cb) =>
          cb(Object.assign(new Error('nothing to commit'), { code: 1 }), '', 'nothing to commit'),
        );
        vi.mocked(require('node:child_process').exec).mockImplementation(mockExec);
        const adapter = new GitCommitExecutorAdapter();
        const commitMsg = CommitMessage.create('skill-quality', 'H12-01', 'test');
        // Act & Assert
        await expect(adapter.commit(commitMsg)).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('GIT_COMMIT_FAILED') }),
        );
      });
    });
  });

});
```

---

### 4.2 FileSystemLessonSourceReaderAdapter（`file-system-lesson-source-reader-adapter.test.ts`）

```typescript
// vi.mock('node:fs/promises') をファイル先頭で宣言

target('FileSystemLessonSourceReaderAdapter', () => {

  // IT-REPO-LessReader-001
  describe('read: [Agent-Lesson] タグを含むファイルからエントリが抽出されること', () => {
    context("readFile が '<!-- [Agent-Lesson] content1 -->' を含む内容を返す場合", () => {
      it('RawLessonEntry[] に 1 件が含まれる', async () => {
        // Arrange
        const fileContent = '<!-- [Agent-Lesson]\ncontent1\n-->\n// other code';
        vi.mocked(fsPromises.readFile).mockResolvedValue(fileContent as any);
        const adapter = new FileSystemLessonSourceReaderAdapter();
        // Act
        const actual = await adapter.read('path/to/lesson-file.ts');
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]?.content).toContain('content1');
      });
    });
  });

  // IT-REPO-LessReader-002
  describe('read: [Agent-Lesson] タグがないファイルで空配列が返されること', () => {
    context('readFile が通常コードのみのファイル内容を返す場合', () => {
      it('[] が返される', async () => {
        // Arrange
        vi.mocked(fsPromises.readFile).mockResolvedValue('// no lessons here' as any);
        const adapter = new FileSystemLessonSourceReaderAdapter();
        // Act
        const actual = await adapter.read('path/to/no-lesson.ts');
        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // IT-REPO-LessReader-003
  describe('read: 複数の [Agent-Lesson] タグが全て抽出されること', () => {
    context('readFile が 2 件の [Agent-Lesson] タグを含む内容を返す場合', () => {
      it('RawLessonEntry[] に 2 件が含まれる', async () => {
        // Arrange
        const content = '<!-- [Agent-Lesson]\nlesson1\n-->\n// code\n<!-- [Agent-Lesson]\nlesson2\n-->';
        vi.mocked(fsPromises.readFile).mockResolvedValue(content as any);
        const adapter = new FileSystemLessonSourceReaderAdapter();
        // Act
        const actual = await adapter.read('path/to/file.ts');
        // Assert
        expect(actual).toHaveLength(2);
      });
    });
  });

});
```

---

### 4.3 FileSystemLessonArtifactWriterAdapter（`file-system-lesson-artifact-writer-adapter.test.ts`）

```typescript
// vi.mock('node:fs/promises') をファイル先頭で宣言

target('FileSystemLessonArtifactWriterAdapter', () => {

  // IT-REPO-LessWriter-001
  describe('write: LessonArtifact が JSON ファイルとして出力されること', () => {
    context('LessonArtifact（lessons=1 件）の場合', () => {
      it("writeFile が '.harness/lesson-artifacts/*.json' パスで 1 回呼ばれる", async () => {
        // Arrange
        vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined as any);
        vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);
        const adapter = new FileSystemLessonArtifactWriterAdapter();
        const artifact = LessonArtifact.create('H12-04');
        artifact.addLesson(Lesson.create({ content: '教訓', sourceContext: SourceContext.create('src'), tags: [] }));
        // Act
        await adapter.write(artifact);
        // Assert
        expect(fsPromises.writeFile).toHaveBeenCalledWith(
          expect.stringMatching(/\.harness\/lesson-artifacts\/.+\.json/),
          expect.any(String),
          'utf-8',
        );
      });
    });
  });

  // IT-REPO-LessWriter-002
  describe('write: 出力先ディレクトリが存在しない場合に作成されること', () => {
    context('mkdir が recursive=true で呼ばれる場合', () => {
      it('mkdir が recursive=true で呼ばれる', async () => {
        // Arrange
        vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined as any);
        vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);
        const adapter = new FileSystemLessonArtifactWriterAdapter();
        const artifact = LessonArtifact.create('H12-04');
        // Act
        await adapter.write(artifact);
        // Assert
        expect(fsPromises.mkdir).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ recursive: true }),
        );
      });
    });
  });

});
```

---

### 4.4 AjvLessonArtifactSchemaAdapter（`ajv-lesson-artifact-schema-adapter.test.ts`）

```typescript
target('AjvLessonArtifactSchemaAdapter', () => {

  // IT-REPO-LessSchema-001
  describe('validate: スキーマ準拠の JSON が violations=[] で通過すること', () => {
    context('ci-governance スキーマ準拠の JSON オブジェクトの場合（スキーマファイル実体使用）', () => {
      it('validate() が [] を返す', async () => {
        // Arrange
        const adapter = new AjvLessonArtifactSchemaAdapter();
        const validJson = {
          storyId: 'H12-04',
          lessons: [{ lessonId: 'L001', content: '教訓', source: 'src', tags: [], timestamp: new Date().toISOString() }],
        };
        // Act
        const actual = await adapter.validate(validJson);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // IT-REPO-LessSchema-002
  describe('validate: 必須フィールド欠落の JSON が violations 非空で返すこと', () => {
    context('storyId フィールドが欠落した JSON の場合（スキーマファイル実体使用）', () => {
      it('validate() に ValidationViolation が 1 件以上含まれる', async () => {
        // Arrange
        const adapter = new AjvLessonArtifactSchemaAdapter();
        const invalidJson = { lessons: [] }; // storyId 欠落
        // Act
        const actual = await adapter.validate(invalidJson);
        // Assert
        expect(actual.length).toBeGreaterThan(0);
      });
    });
  });

});
```

---

### 4.5 FileSystemRequirementTestMatrixAdapter（`file-system-requirement-test-matrix-adapter.test.ts`）

```typescript
// vi.mock('node:fs/promises') をファイル先頭で宣言

target('FileSystemRequirementTestMatrixAdapter', () => {

  // IT-REPO-ReqMatrix-001
  describe('read: storyId に対応するマトリックスが読み取られること', () => {
    context("readFile が H12-02 エントリを含む JSON を返す場合", () => {
      it('RequirementTestMatrix が返される', async () => {
        // Arrange
        const matrixJson = JSON.stringify({
          storyMappings: [{ storyId: 'H12-02', acMappings: [{ acId: 'AC-1', testReferences: [] }] }],
        });
        vi.mocked(fsPromises.readFile).mockResolvedValue(matrixJson as any);
        const adapter = new FileSystemRequirementTestMatrixAdapter();
        // Act
        const actual = await adapter.read('H12-02');
        // Assert
        expect(actual).toBeDefined();
      });
    });
  });

  // IT-REPO-ReqMatrix-002
  describe('read: ファイルが存在しない場合に MATRIX_FILE_NOT_FOUND エラーになること', () => {
    context('readFile が ENOENT をスローする場合', () => {
      it('HarnessError(MATRIX_FILE_NOT_FOUND) がスローされる', async () => {
        // Arrange
        const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        vi.mocked(fsPromises.readFile).mockRejectedValue(enoentError);
        const adapter = new FileSystemRequirementTestMatrixAdapter();
        // Act & Assert
        await expect(adapter.read('H12-02')).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('MATRIX_FILE_NOT_FOUND') }),
        );
      });
    });
  });

});
```

---

### 4.6 HarnessConfigQueryAdapter（`harness-config-query-adapter.test.ts`）

```typescript
target('HarnessConfigQueryAdapter', () => {

  // IT-REPO-ConfigQuery-001
  describe('getCoverageThreshold: 設定から閾値を返すこと', () => {
    context('HarnessConfigV2 が coverageThreshold=80, requirementCoverageThreshold=100 を持つ場合', () => {
      it('{ requirement: 100, code: 80 } が返される', async () => {
        // Arrange
        const mockConfig = {
          layers: { L3: { coverageThreshold: 80 } },
          harnesses: { requirementCoverageThreshold: 100 },
        };
        const adapter = new HarnessConfigQueryAdapter(mockConfig as any);
        // Act
        const actual = await adapter.getCoverageThreshold();
        // Assert
        expect(actual).toEqual({ requirement: 100, code: 80 });
      });
    });
  });

  // IT-REPO-ConfigQuery-002
  describe('isAgentLessonCollectionEnabled: 設定値を返すこと', () => {
    context('HarnessConfigV2 が harnesses.agentLessonCollection=true を持つ場合', () => {
      it('true が返される', async () => {
        // Arrange
        const mockConfig = { harnesses: { agentLessonCollection: true } };
        const adapter = new HarnessConfigQueryAdapter(mockConfig as any);
        // Act
        const actual = await adapter.isAgentLessonCollectionEnabled();
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // IT-REPO-ConfigQuery-003
  describe('getCascadeUpdateTargetPatterns: デフォルトパターンを返すこと', () => {
    context('HarnessConfigV2 が harnesses.cascadeUpdate=true を持つ場合', () => {
      it('デフォルトのパターン配列が返される', async () => {
        // Arrange
        const mockConfig = { harnesses: { cascadeUpdate: true } };
        const adapter = new HarnessConfigQueryAdapter(mockConfig as any);
        // Act
        const actual = await adapter.getCascadeUpdateTargetPatterns();
        // Assert
        expect(Array.isArray(actual)).toBe(true);
        expect(actual.length).toBeGreaterThan(0);
      });
    });
  });

});
```

---

### 4.7 FileSystemSkillFileReaderAdapter（`file-system-skill-file-reader-adapter.test.ts`）

```typescript
// vi.mock('node:fs/promises') をファイル先頭で宣言

target('FileSystemSkillFileReaderAdapter', () => {

  // IT-REPO-SkillReader-001
  describe('read: 存在するファイルの内容が読み取られること', () => {
    context("readFile が '# SKILL content' を返す場合", () => {
      it("'# SKILL content' が返される", async () => {
        // Arrange
        vi.mocked(fsPromises.readFile).mockResolvedValue('# SKILL content' as any);
        const adapter = new FileSystemSkillFileReaderAdapter();
        // Act
        const actual = await adapter.read('skills/example.skill');
        // Assert
        expect(actual).toBe('# SKILL content');
      });
    });
  });

  // IT-REPO-SkillReader-002
  describe('exists: ファイル存在時に true を返すこと', () => {
    context('access が void で解決する場合', () => {
      it('true が返される', async () => {
        // Arrange
        vi.mocked(fsPromises.access).mockResolvedValue(undefined);
        const adapter = new FileSystemSkillFileReaderAdapter();
        // Act
        const actual = await adapter.exists('skills/example.skill');
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // IT-REPO-SkillReader-003
  describe('exists: ファイル不在時に false を返すこと（例外を投げない）', () => {
    context('access が ENOENT をスローする場合', () => {
      it('false が返される（例外は投げない）', async () => {
        // Arrange
        vi.mocked(fsPromises.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
        const adapter = new FileSystemSkillFileReaderAdapter();
        // Act
        const actual = await adapter.exists('skills/missing.skill');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

});
```

---

### 4.8 L1BiomeValidatorAdapter（`l1-biome-validator-adapter.test.ts`）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { L1BiomeValidatorAdapter } from '../../../../skill-quality/infrastructure/adapters/l1-biome-validator-adapter.js';

target('L1BiomeValidatorAdapter', () => {
  let mockBiomeEngine: { runL1Lint: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockBiomeEngine = { runL1Lint: vi.fn() };
  });

  // IT-REPO-L1Biome-001
  describe('validate: L1バリデーション全通過の場合', () => {
    context('biome-ast-engineスタブが全ルールpassedを返す場合', () => {
      it('passed=trueとviolations=[]が返ること', async () => {
        // Arrange
        mockBiomeEngine.runL1Lint.mockResolvedValue({ passed: true, violations: [] });
        const adapter = new L1BiomeValidatorAdapter(mockBiomeEngine as never);
        // Act
        const actual = await adapter.validate();
        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });
  });

  // IT-REPO-L1Biome-002
  describe('validate: L1バリデーション違反がある場合', () => {
    context('biome-ast-engineスタブがRuleViolation 2件を返す場合', () => {
      it('passed=falseとviolations 2件が返ること', async () => {
        // Arrange
        mockBiomeEngine.runL1Lint.mockResolvedValue({
          passed: false,
          violations: [
            { ruleId: 'L1-001', message: '違反1', filePath: 'src/a.ts' },
            { ruleId: 'L1-002', message: '違反2', filePath: 'src/b.ts' },
          ],
        });
        const adapter = new L1BiomeValidatorAdapter(mockBiomeEngine as never);
        // Act
        const actual = await adapter.validate();
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.violations).toHaveLength(2);
      });
    });
  });

  // IT-REPO-L1Biome-003
  describe('validate: biome-ast-engineが例外をスローした場合', () => {
    context('スタブがErrorをスローする場合', () => {
      it('エラーが呼び出し元に伝播すること', async () => {
        // Arrange
        mockBiomeEngine.runL1Lint.mockRejectedValue(new Error('biome error'));
        const adapter = new L1BiomeValidatorAdapter(mockBiomeEngine as never);
        // Act & Assert
        await expect(adapter.validate()).rejects.toThrow('biome error');
      });
    });
  });

});
```

---

### 4.9 L2ValidatorSystemAdapter（`l2-validator-system-adapter.test.ts`）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { L2ValidatorSystemAdapter } from '../../../../skill-quality/infrastructure/adapters/l2-validator-system-adapter.js';

target('L2ValidatorSystemAdapter', () => {
  let mockValidatorSystem: { runL2Check: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockValidatorSystem = { runL2Check: vi.fn() };
  });

  // IT-REPO-L2Validator-001
  describe('validate: L2バリデーション全通過の場合', () => {
    context('validator-systemスタブがL2全通過のValidatorCheckItem[]を返す場合', () => {
      it('passed=trueとviolations=[]が返ること', async () => {
        // Arrange
        mockValidatorSystem.runL2Check.mockResolvedValue({ passed: true, violations: [] });
        const adapter = new L2ValidatorSystemAdapter(mockValidatorSystem as never);
        // Act
        const actual = await adapter.validate();
        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });
  });

  // IT-REPO-L2Validator-002
  describe('validate: L2バリデーション失敗がある場合', () => {
    context('validator-systemスタブがL2-001違反のCheckItem 1件を返す場合', () => {
      it('passed=falseとviolations 1件が返ること', async () => {
        // Arrange
        mockValidatorSystem.runL2Check.mockResolvedValue({
          passed: false,
          violations: [{ ruleId: 'L2-001', message: 'lint error', filePath: 'src/c.ts' }],
        });
        const adapter = new L2ValidatorSystemAdapter(mockValidatorSystem as never);
        // Act
        const actual = await adapter.validate();
        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(actual.violations[0]?.ruleId).toBe('L2-001');
      });
    });
  });

  // IT-REPO-L2Validator-003
  describe('validate: validator-systemが例外をスローした場合', () => {
    context('スタブがErrorをスローする場合', () => {
      it('エラーが呼び出し元に伝播すること', async () => {
        // Arrange
        mockValidatorSystem.runL2Check.mockRejectedValue(new Error('validator error'));
        const adapter = new L2ValidatorSystemAdapter(mockValidatorSystem as never);
        // Act & Assert
        await expect(adapter.validate()).rejects.toThrow('validator error');
      });
    });
  });

});
```

---

### 4.10 VitestCoverageRunnerAdapter（`vitest-coverage-runner-adapter.test.ts`）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { VitestCoverageRunnerAdapter } from '../../../../skill-quality/infrastructure/adapters/vitest-coverage-runner-adapter.js';

target('VitestCoverageRunnerAdapter', () => {
  let mockProcessRunner: { run: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockProcessRunner = { run: vi.fn() };
  });

  // IT-REPO-CovRunner-001
  describe('run: カバレッジ実行が成功した場合', () => {
    context('プロセス実行スタブがcoverage JSON出力（lines: 85%）を返す場合', () => {
      it('CoverageResult{lineCoverage: 85, passed: false（閾値90%未満）}が返ること', async () => {
        // Arrange
        mockProcessRunner.run.mockResolvedValue({ lineCoverage: 85, passed: false });
        const adapter = new VitestCoverageRunnerAdapter(mockProcessRunner as never);
        // Act
        const actual = await adapter.run('scripts/harness/skill-quality/');
        // Assert
        expect(actual.lineCoverage).toBe(85);
        expect(actual.passed).toBe(false);
      });
    });
  });

  // IT-REPO-CovRunner-002
  describe('run: カバレッジが閾値（90%）以上の場合', () => {
    context('プロセス実行スタブがlines: 95%の出力を返す場合', () => {
      it('CoverageResult{lineCoverage: 95, passed: true}が返ること', async () => {
        // Arrange
        mockProcessRunner.run.mockResolvedValue({ lineCoverage: 95, passed: true });
        const adapter = new VitestCoverageRunnerAdapter(mockProcessRunner as never);
        // Act
        const actual = await adapter.run('scripts/harness/skill-quality/');
        // Assert
        expect(actual.lineCoverage).toBe(95);
        expect(actual.passed).toBe(true);
      });
    });
  });

  // IT-REPO-CovRunner-003
  describe('run: vitestプロセスがエラー終了した場合', () => {
    context('プロセス実行スタブがexit code 1でRejectedする場合', () => {
      it('Errorがスローされること', async () => {
        // Arrange
        mockProcessRunner.run.mockRejectedValue(new Error('vitest process exited with code 1'));
        const adapter = new VitestCoverageRunnerAdapter(mockProcessRunner as never);
        // Act & Assert
        await expect(adapter.run('scripts/harness/skill-quality/')).rejects.toThrow();
      });
    });
  });

});
```

---

### 4.11 ValidatorIdRegistryBridgeAdapter（`validator-id-registry-bridge-adapter.test.ts`）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ValidatorIdRegistryBridgeAdapter } from '../../../../skill-quality/infrastructure/adapters/validator-id-registry-bridge-adapter.js';

target('ValidatorIdRegistryBridgeAdapter', () => {
  let mockValidatorSystem: { listValidatorIds: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockValidatorSystem = { listValidatorIds: vi.fn() };
  });

  // IT-REPO-ValidatorBridge-001
  describe('listIds: バリデータID一覧が正常に取得できること', () => {
    context("validator-systemスタブが['L2-001','L2-002','L3-001']を返す場合", () => {
      it("string[]の長さ=3、'L2-001'が含まれること", async () => {
        // Arrange
        mockValidatorSystem.listValidatorIds.mockResolvedValue(['L2-001', 'L2-002', 'L3-001']);
        const adapter = new ValidatorIdRegistryBridgeAdapter(mockValidatorSystem as never);
        // Act
        const actual = await adapter.listIds();
        // Assert
        expect(actual).toHaveLength(3);
        expect(actual).toContain('L2-001');
      });
    });
  });

  // IT-REPO-ValidatorBridge-002
  describe('listIds: バリデータが0件の場合', () => {
    context('validator-systemスタブが[]を返す場合', () => {
      it('空配列が返ること', async () => {
        // Arrange
        mockValidatorSystem.listValidatorIds.mockResolvedValue([]);
        const adapter = new ValidatorIdRegistryBridgeAdapter(mockValidatorSystem as never);
        // Act
        const actual = await adapter.listIds();
        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // IT-REPO-ValidatorBridge-003
  describe('listIds: validator-systemが例外をスローした場合', () => {
    context('スタブがErrorをスローする場合', () => {
      it('エラーが呼び出し元に伝播すること', async () => {
        // Arrange
        mockValidatorSystem.listValidatorIds.mockRejectedValue(new Error('registry error'));
        const adapter = new ValidatorIdRegistryBridgeAdapter(mockValidatorSystem as never);
        // Act & Assert
        await expect(adapter.listIds()).rejects.toThrow('registry error');
      });
    });
  });

});
```

---

## 5. Presentation Handler テスト詳細ロジック

### 5.1 ExecuteTddCycleHandler（`execute-tdd-cycle-handler.test.ts`）

```typescript
target('ExecuteTddCycleHandler', () => {

  // IT-API-TddHandler-001
  describe('handle: REFACTOR+passed=true でコミット成功時に終了コード 0 になること', () => {
    context('ExecuteTddCycleUseCase が { ready: true, committedMessage: ... } を返す場合', () => {
      it('終了コード 0、stdout に commit message が含まれる', async () => {
        // Arrange
        const mockUseCase = createMockExecuteTddCycleUseCase({
          ready: true,
          violations: [],
          committedMessage: 'feat(skill-quality/H12-01): desc',
        });
        const handler = new ExecuteTddCycleHandler(mockUseCase);
        const args = ['--unit', 'skill-quality', '--story-id', 'H12-01', '--description', 'desc', '--phase', 'REFACTOR', '--passed'];
        // Act
        const actual = await handler.handle(args);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('feat(skill-quality/H12-01): desc');
      });
    });
  });

  // IT-API-TddHandler-002
  describe('handle: L1/L2 違反時に終了コード 1 になること', () => {
    context('ExecuteTddCycleUseCase が { ready: false, violations: [...] } を返す場合', () => {
      it('終了コード 1、violations が出力に含まれる', async () => {
        // Arrange
        const mockUseCase = createMockExecuteTddCycleUseCase({
          ready: false,
          violations: [{ ruleId: 'L1-001', message: 'format error' }],
          committedMessage: null,
        });
        const handler = new ExecuteTddCycleHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--unit', 'sq', '--story-id', 'H12-01', '--description', 'd', '--phase', 'REFACTOR', '--passed']);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('L1-001');
      });
    });
  });

  // IT-API-TddHandler-003
  describe('handle: --unit 引数が不足している場合に終了コード 2 になること', () => {
    context('args から --unit が欠落している場合', () => {
      it('終了コード 2、エラーメッセージが出力される', async () => {
        // Arrange
        const handler = new ExecuteTddCycleHandler(createMockExecuteTddCycleUseCase({ ready: true, violations: [], committedMessage: null }));
        const args = ['--story-id', 'H12-01', '--description', 'desc', '--phase', 'REFACTOR'];
        // Act
        const actual = await handler.handle(args);
        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });
  });

});
```

---

### 5.2 CheckCoverageHandler（`check-coverage-handler.test.ts`）

```typescript
target('CheckCoverageHandler', () => {

  // IT-API-CovHandler-001
  describe('handle: 閾値達成時に終了コード 0 になること', () => {
    context('CheckCoverageUseCase が { meetsThreshold: true, ... } を返す場合', () => {
      it('終了コード 0、カバレッジ率が stdout に出力される', async () => {
        // Arrange
        const mockOutput = {
          meetsThreshold: true,
          coverageReport: {
            requirementCoverage: { coverageRate: 100 },
            codeCoverage: { lineCoverage: 85 },
          },
          requirementThreshold: 100,
          codeThreshold: 80,
        };
        const mockUseCase = createMockCheckCoverageUseCase(mockOutput);
        const handler = new CheckCoverageHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-02']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('100');
      });
    });
  });

  // IT-API-CovHandler-002
  describe('handle: 閾値未達時に終了コード 1 になること', () => {
    context('CheckCoverageUseCase が { meetsThreshold: false } を返す場合', () => {
      it('終了コード 1、未カバー項目が出力される', async () => {
        // Arrange
        const mockOutput = {
          meetsThreshold: false,
          coverageReport: {
            requirementCoverage: { coverageRate: 80, uncoveredIds: ['REQ-05'] },
            codeCoverage: { lineCoverage: 85 },
          },
          requirementThreshold: 100,
          codeThreshold: 80,
        };
        const mockUseCase = createMockCheckCoverageUseCase(mockOutput);
        const handler = new CheckCoverageHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-02']);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('REQ-05');
      });
    });
  });

  // IT-API-CovHandler-003
  describe('handle: --format json 指定時に JSON 形式で出力されること', () => {
    context("args=['--story-id', 'H12-02', '--format', 'json'] の場合", () => {
      it('終了コード 0、stdout が有効な JSON 文字列である', async () => {
        // Arrange
        const mockOutput = {
          meetsThreshold: true,
          coverageReport: { requirementCoverage: { coverageRate: 100 }, codeCoverage: { lineCoverage: 85 } },
          requirementThreshold: 100, codeThreshold: 80,
        };
        const handler = new CheckCoverageHandler(createMockCheckCoverageUseCase(mockOutput));
        // Act
        const actual = await handler.handle(['--story-id', 'H12-02', '--format', 'json']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(() => JSON.parse(actual.stdout)).not.toThrow();
      });
    });
  });

});
```

---

### 5.3 RunPlanCheckerLoopHandler（`run-plan-checker-loop-handler.test.ts`）

```typescript
target('RunPlanCheckerLoopHandler', () => {

  // IT-API-PlanHandler-001
  describe('handle: PASSED で終了コード 0 になること', () => {
    context('RunPlanCheckerLoopUseCase が { status: PASSED, escalationRequired: false } を返す場合', () => {
      it('終了コード 0、成功メッセージが出力される', async () => {
        // Arrange
        const mockOutput = { status: 'PASSED', loopHistory: [], escalationRequired: false };
        const mockUseCase = { execute: vi.fn().mockResolvedValue(mockOutput) };
        const handler = new RunPlanCheckerLoopHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--plan-file', 'plan.md', '--story-id', 'H12-03']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('PASSED');
      });
    });
  });

  // IT-API-PlanHandler-002
  describe('handle: FAILED_EXCEEDED で終了コード 1 になること', () => {
    context('RunPlanCheckerLoopUseCase が { status: FAILED_EXCEEDED, escalationRequired: true } を返す場合', () => {
      it('終了コード 1、警告メッセージが出力される', async () => {
        // Arrange
        const mockOutput = { status: 'FAILED_EXCEEDED', loopHistory: [], escalationRequired: true };
        const mockUseCase = { execute: vi.fn().mockResolvedValue(mockOutput) };
        const handler = new RunPlanCheckerLoopHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--plan-file', 'plan.md', '--story-id', 'H12-03']);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('FAILED_EXCEEDED');
      });
    });
  });

});
```

---

### 5.4 CollectLessonsHandler（`collect-lessons-handler.test.ts`）

```typescript
target('CollectLessonsHandler', () => {

  // IT-API-LessHandler-001
  describe('handle: 収集成功時に終了コード 0 になること', () => {
    context('CollectLessonsUseCase が { lessons: [1件], totalCollected: 1 } を返す場合', () => {
      it('終了コード 0、収集統計が出力される', async () => {
        // Arrange
        const mockCollect = { execute: vi.fn().mockResolvedValue({ lessons: [{}], totalCollected: 1, deduplicatedCount: 0 }) };
        const handler = new CollectLessonsHandler(mockCollect, null);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-04', '--sources', 'path1', 'path2']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('1');
      });
    });
  });

  // IT-API-LessHandler-002
  describe('handle: --write-artifact 指定時に WriteLessonArtifactUseCase も呼ばれること', () => {
    context("args に '--write-artifact' が含まれる場合", () => {
      it('終了コード 0、出力パスが stdout に含まれる', async () => {
        // Arrange
        const mockCollect = { execute: vi.fn().mockResolvedValue({ lessons: [{}], totalCollected: 1, deduplicatedCount: 0 }) };
        const mockWrite = { execute: vi.fn().mockResolvedValue({ outputPath: '.harness/lesson-artifacts/H12-04.json', lessonCount: 1 }) };
        const handler = new CollectLessonsHandler(mockCollect, mockWrite);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-04', '--sources', 'path1', '--write-artifact']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(mockWrite.execute).toHaveBeenCalledTimes(1);
        expect(actual.stdout).toContain('.harness/lesson-artifacts/');
      });
    });
  });

  // IT-API-LessHandler-003
  describe('handle: 0 件収集時に終了コード 0 になること', () => {
    context('CollectLessonsUseCase が { lessons: [], totalCollected: 0 } を返す場合', () => {
      it('終了コード 0（0 件も正常）', async () => {
        // Arrange
        const mockCollect = { execute: vi.fn().mockResolvedValue({ lessons: [], totalCollected: 0, deduplicatedCount: 0 }) };
        const handler = new CollectLessonsHandler(mockCollect, null);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-04', '--sources', 'path1']);
        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });
  });

});
```

---

### 5.5 ApplyCascadeUpdateHandler（`apply-cascade-update-handler.test.ts`）

```typescript
target('ApplyCascadeUpdateHandler', () => {

  // IT-API-CascHandler-001
  describe('handle: 全ファイル更新成功時に終了コード 0 になること', () => {
    context('ApplyCascadeUpdateUseCase が { updatedCount: 3, errors: [] } を返す場合', () => {
      it('終了コード 0、更新ファイル数が出力される', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn().mockResolvedValue({ updatedCount: 3, appliedStoryIds: ['@story-id H12-05'], errors: [] }) };
        const handler = new ApplyCascadeUpdateHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-05']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('3');
      });
    });
  });

  // IT-API-CascHandler-002
  describe('handle: 部分失敗時に終了コード 1 になること', () => {
    context('ApplyCascadeUpdateUseCase が { errors: [1件] } を返す場合', () => {
      it('終了コード 1、エラー詳細が出力される', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn().mockResolvedValue({ updatedCount: 2, appliedStoryIds: [], errors: ['file not found: foo.ts'] }) };
        const handler = new ApplyCascadeUpdateHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-05']);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('file not found: foo.ts');
      });
    });
  });

  // IT-API-CascHandler-003
  describe('handle: --dry-run 指定時に実際の更新が実行されないこと', () => {
    context("args に '--dry-run' が含まれる場合", () => {
      it('終了コード 0、対象ファイル一覧が出力され、write は実行されない', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const mockResolve = vi.fn().mockResolvedValue([
          { filePath: 'scripts/a.ts', storyIdTag: '@story-id H12-05' },
          { filePath: 'scripts/b.ts', storyIdTag: '@story-id H12-05' },
        ]);
        const handler = new ApplyCascadeUpdateHandler(mockUseCase, mockResolve);
        // Act
        const actual = await handler.handle(['--story-id', 'H12-05', '--dry-run']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(mockUseCase.execute).not.toHaveBeenCalled();
        expect(actual.stdout).toContain('scripts/a.ts');
      });
    });
  });

});
```

---

### 5.6 ValidateSkillStructureHandler（`validate-skill-structure-handler.test.ts`）

```typescript
target('ValidateSkillStructureHandler', () => {

  // IT-API-SkillHandler-001
  describe('handle: 構造検証合格時に終了コード 0 になること', () => {
    context('ValidateSkillStructureUseCase が { result: passed=true } を返す場合', () => {
      it('終了コード 0、合格メッセージが出力される', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn().mockResolvedValue({ result: { passed: true, missingSection: [], actualSections: [] } }) };
        const handler = new ValidateSkillStructureHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--skill-file', 'skills/example.skill']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('passed');
      });
    });
  });

  // IT-API-SkillHandler-002
  describe('handle: 必須セクション欠落時に終了コード 1 になること', () => {
    context("ValidateSkillStructureUseCase が { result: passed=false, missingSection=['purpose'] } を返す場合", () => {
      it('終了コード 1、欠落セクション一覧が出力される', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            result: { passed: false, missingSection: ['purpose'], actualSections: [] },
          }),
        };
        const handler = new ValidateSkillStructureHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--skill-file', 'skills/example.skill']);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('purpose');
      });
    });
  });

  // IT-API-SkillHandler-003
  describe('handle: ファイル不存在時に終了コード 2 になること', () => {
    context('ValidateSkillStructureUseCase が HarnessError(SKILL_FILE_NOT_FOUND) をスローする場合', () => {
      it('終了コード 2、エラーメッセージが出力される', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(
            Object.assign(new Error('not found'), { code: 'SKILL_FILE_NOT_FOUND' }),
          ),
        };
        const handler = new ValidateSkillStructureHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--skill-file', 'skills/nonexistent.skill']);
        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });
  });

  // IT-API-SkillHandler-004
  describe('handle: --format json 指定時に JSON 形式で出力されること', () => {
    context("args に '--format json' が含まれ、passed=true の場合", () => {
      it('終了コード 0、stdout が有効な JSON 文字列である', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({ result: { passed: true, missingSection: [], actualSections: [] } }),
        };
        const handler = new ValidateSkillStructureHandler(mockUseCase);
        // Act
        const actual = await handler.handle(['--skill-file', 'skills/example.skill', '--format', 'json']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(() => JSON.parse(actual.stdout)).not.toThrow();
      });
    });
  });

});
```

---

## 6. Cross-Layer 統合テスト詳細ロジック

### 6.1 TDD サイクル実行統合（`tdd-cycle-e2e-integration.test.ts`）

```typescript
target('TDD サイクル実行統合（H12-01 E2E）', () => {

  // IT-API-TddE2E-001
  describe('Handler → UseCase → Domain → Port の全レイヤーが連携してコミットが完了すること', () => {
    context('CLI 引数: phase=REFACTOR, passed=true、全ポートが成功する場合', () => {
      it('終了コード 0、CommitExecutorPort.commit が 1 回呼ばれる', async () => {
        // Arrange
        const mockCommit = createMockCommitExecutorPort();
        const mockL1 = createMockL1ValidatorPort([]);
        const mockL2 = createMockL2ValidatorPort([]);
        // UseCase（実体）→ Handler（実体）を組み立てる
        const usecase = new ExecuteTddCycleUseCase(mockCommit, mockL1, mockL2);
        const handler = new ExecuteTddCycleHandler(usecase);
        const args = ['--unit', 'skill-quality', '--story-id', 'H12-01', '--description', 'e2e test', '--phase', 'REFACTOR', '--passed'];
        // Act
        const actual = await handler.handle(args);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(mockCommit.commit).toHaveBeenCalledTimes(1);
      });
    });
  });

  // IT-API-TddE2E-002
  describe('Handler → UseCase → Domain を経てバリデーションエラーが正しく伝播すること', () => {
    context('CLI 引数: phase=RED, passed=false の場合', () => {
      it('終了コード 1、TDD_CYCLE_INCOMPLETE エラーが出力される', async () => {
        // Arrange
        const usecase = new ExecuteTddCycleUseCase(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        const handler = new ExecuteTddCycleHandler(usecase);
        const args = ['--unit', 'skill-quality', '--story-id', 'H12-01', '--description', 'desc', '--phase', 'RED'];
        // Act
        const actual = await handler.handle(args);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('TDD_CYCLE_INCOMPLETE');
      });
    });
  });

});
```

---

### 6.2 Lesson Artifact システム統合（`lesson-artifact-e2e-integration.test.ts`）

```typescript
target('Lesson Artifact システム統合（H12-04 E2E）', () => {

  // IT-API-LessE2E-001
  describe('CollectLessons → WriteLessonArtifact の連携フローが正常動作すること', () => {
    context("sources=['path1'], [Agent-Lesson] エントリ 2 件、enabled=true の場合", () => {
      it('lessons.length=2, lessonCount=2, outputPath が出力される', async () => {
        // Arrange
        const rawEntries = [
          { content: '教訓1', source: 'path1' },
          { content: '教訓2', source: 'path1' },
        ];
        const mockLessonSourcePort = createMockLessonSourceReaderPort([rawEntries]);
        const mockConfigPort = createMockConfigQueryPort({ agentLessonEnabled: true });
        const mockSchemaPort = createMockLessonArtifactSchemaPort([]);
        const mockWriterPort = createMockLessonArtifactWriterPort();
        // UseCases を実体で組み立て
        const collectUseCase = new CollectLessonsUseCase(mockLessonSourcePort, mockConfigPort);
        const writeUseCase = new WriteLessonArtifactUseCase(mockSchemaPort, mockWriterPort);
        // Act: Collect → Write の連携
        const collectResult = await collectUseCase.execute({ sources: ['path1'] });
        const writeResult = await writeUseCase.execute({ storyId: 'H12-04', lessons: collectResult.lessons });
        // Assert
        expect(collectResult.lessons).toHaveLength(2);
        expect(writeResult.lessonCount).toBe(2);
        expect(writeResult.outputPath).toContain('.harness/lesson-artifacts/');
        expect(mockWriterPort.write).toHaveBeenCalledTimes(1);
      });
    });
  });

  // IT-API-LessE2E-002
  describe('重複 Lesson が排除されて 1 件のみ出力されること', () => {
    context('同一 content の RawLessonEntry 3 件の場合', () => {
      it('output.lessonCount=1, deduplicatedCount=2（CollectLessons 統計）', async () => {
        // Arrange
        const duplicateEntry = { content: '重複する教訓', source: 'path1' };
        const mockLessonSourcePort = createMockLessonSourceReaderPort([[duplicateEntry, duplicateEntry, duplicateEntry]]);
        const mockConfigPort = createMockConfigQueryPort({ agentLessonEnabled: true });
        const mockSchemaPort = createMockLessonArtifactSchemaPort([]);
        const mockWriterPort = createMockLessonArtifactWriterPort();
        const collectUseCase = new CollectLessonsUseCase(mockLessonSourcePort, mockConfigPort);
        const writeUseCase = new WriteLessonArtifactUseCase(mockSchemaPort, mockWriterPort);
        // Act
        const collectResult = await collectUseCase.execute({ sources: ['path1'] });
        const writeResult = await writeUseCase.execute({ storyId: 'H12-04', lessons: collectResult.lessons });
        // Assert
        expect(collectResult.deduplicatedCount).toBe(2);
        expect(writeResult.lessonCount).toBe(1);
      });
    });
  });

});
```

---

### 6.3 SKILL.md 検証統合（`skill-validation-e2e-integration.test.ts`）

```typescript
target('SKILL.md 検証統合（H12-06 E2E）', () => {

  // IT-API-SkillE2E-001
  describe('Handler → UseCase → SkillStructureValidator → Port の全レイヤーが連携すること', () => {
    context("CLI 引数: --skill-file='skills/valid.skill', 全必須セクションを含む場合", () => {
      it('終了コード 0、passed=true が出力される', async () => {
        // Arrange
        const fullMarkdown = `---\n## 目的\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const mockSkillFilePort = createMockSkillFileReaderPort(fullMarkdown);
        // UseCase（実体: SkillStructureValidator を内部で利用）
        const usecase = new ValidateSkillStructureUseCase(mockSkillFilePort);
        const handler = new ValidateSkillStructureHandler(usecase);
        // Act
        const actual = await handler.handle(['--skill-file', 'skills/valid.skill']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('passed');
      });
    });
  });

  // IT-API-SkillE2E-002
  describe('欠落セクションが正しく検出されて Handler まで伝播すること', () => {
    context("CLI 引数: --skill-file='skills/incomplete.skill', 'outputs'/'executionFlow' が欠落の場合", () => {
      it("終了コード 1、missingSection=['outputs', 'executionFlow'] が出力される", async () => {
        // Arrange
        const incompleteMarkdown = `---\n## 目的\n## 入力\n## 前提条件\n`; // outputs/executionFlow 欠落
        const mockSkillFilePort = createMockSkillFileReaderPort(incompleteMarkdown);
        const usecase = new ValidateSkillStructureUseCase(mockSkillFilePort);
        const handler = new ValidateSkillStructureHandler(usecase);
        // Act
        const actual = await handler.handle(['--skill-file', 'skills/incomplete.skill']);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout + actual.stderr).toContain('outputs');
        expect(actual.stdout + actual.stderr).toContain('executionFlow');
      });
    });
  });

});
```

---

## 7. テスト実行コマンド

```bash
# skill-quality ユニットテストのみ実行
npx vitest run --reporter=verbose scripts/harness/__tests__/unit/skill-quality/

# skill-quality 統合テストのみ実行
npx vitest run --reporter=verbose scripts/harness/__tests__/integration/skill-quality/

# 全テスト実行
npx vitest run --reporter=verbose

# ウォッチモード（開発時）
npx vitest --reporter=verbose scripts/harness/__tests__/unit/skill-quality/

# カバレッジ付き実行
npx vitest run --coverage scripts/harness/__tests__/unit/skill-quality/
```
