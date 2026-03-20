import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ExecuteTddCycleUseCase } from '../../../skill-quality/application/usecases/execute-tdd-cycle-usecase.js';
import { AtomicCommitService } from '../../../skill-quality/domain/services/atomic-commit-service.js';
import type { ValidationViolation } from '../../../skill-quality/domain/types/validation-violation.js';

function createMockCommitExecutorPort() {
  return { commit: vi.fn().mockResolvedValue(undefined) };
}

function createMockL1ValidatorPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

function createMockL2ValidatorPort(violations: ValidationViolation[] = []) {
  return { validate: vi.fn().mockResolvedValue(violations) };
}

function createUseCase(
  commitPort = createMockCommitExecutorPort(),
  l1Port = createMockL1ValidatorPort(),
  l2Port = createMockL2ValidatorPort(),
) {
  const atomicCommitService = new AtomicCommitService(commitPort, l1Port, l2Port);
  return { useCase: new ExecuteTddCycleUseCase(atomicCommitService), commitPort, l1Port, l2Port };
}

target('ExecuteTddCycleUseCase', () => {

  // IT-UC-ExecTdd-001
  describe('execute: REFACTOR+passed=true でコミットが成功すること', () => {
    context('L1/L2 違反なし・CommitExecutorPort が成功する場合', () => {
      it('output.ready=true, violations=[], committedMessage が返される', async () => {
        // Arrange
        const mockCommit = createMockCommitExecutorPort();
        const mockL1 = createMockL1ValidatorPort([]);
        const mockL2 = createMockL2ValidatorPort([]);
        const atomicCommitService = new AtomicCommitService(mockCommit, mockL1, mockL2);
        const usecase = new ExecuteTddCycleUseCase(atomicCommitService);
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
        const violations: ValidationViolation[] = [{ ruleId: 'L1-001', message: 'format error' }];
        const mockL1 = createMockL1ValidatorPort(violations);
        const mockL2 = createMockL2ValidatorPort([]);
        const mockCommit = createMockCommitExecutorPort();
        const atomicCommitService = new AtomicCommitService(mockCommit, mockL1, mockL2);
        const usecase = new ExecuteTddCycleUseCase(atomicCommitService);
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
        const { useCase } = createUseCase();
        // Act & Assert
        await expect(
          useCase.execute({ unit: 'sq', storyId: 'H12-01', description: 'd', phase: 'GREEN', passed: true }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }));
      });
    });
  });

  // IT-UC-ExecTdd-004
  describe('execute: phase=REFACTOR, passed=false の場合にエラーになること', () => {
    context("phase='REFACTOR', passed=false の場合", () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        // Arrange
        const { useCase } = createUseCase();
        // Act & Assert
        await expect(
          useCase.execute({ unit: 'sq', storyId: 'H12-01', description: 'd', phase: 'REFACTOR', passed: false }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }));
      });
    });
  });

  // IT-UC-ExecTdd-005
  describe("execute: storyId='' の場合に入力バリデーションエラーになること", () => {
    context("storyId='' の場合", () => {
      it('HarnessError(EMPTY_COMMIT_FIELD) がスローされる', async () => {
        // Arrange
        const { useCase } = createUseCase();
        // Act & Assert
        await expect(
          useCase.execute({ unit: 'sq', storyId: '', description: 'd', phase: 'REFACTOR', passed: true }),
        ).rejects.toThrow(expect.objectContaining({ code: expect.stringContaining('EMPTY_COMMIT_FIELD') }));
      });
    });
  });

  // IT-UC-ExecTdd-006
  describe('execute: L2 のみ違反がある場合にコミットが実行されないこと', () => {
    context('L1 は通過、L2ValidatorPort が violations 非空を返す場合', () => {
      it('output.ready=false, violations[0].ruleId=L2-001', async () => {
        // Arrange
        const l2Violations: ValidationViolation[] = [{ ruleId: 'L2-001', message: 'lint error' }];
        const mockL1 = createMockL1ValidatorPort([]);
        const mockL2 = createMockL2ValidatorPort(l2Violations);
        const mockCommit = createMockCommitExecutorPort();
        const atomicCommitService = new AtomicCommitService(mockCommit, mockL1, mockL2);
        const usecase = new ExecuteTddCycleUseCase(atomicCommitService);
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
