import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { AtomicCommitService } from '../../../skill-quality/domain/services/atomic-commit-service.js';
import { TddCycle } from '../../../skill-quality/domain/value-objects/tdd-cycle.js';
import { CommitMessage } from '../../../skill-quality/domain/value-objects/commit-message.js';
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

function createCommitMessage(): CommitMessage {
  return CommitMessage.create('skill-quality', 'H12-01', 'implement domain model');
}

target('AtomicCommitService', () => {

  describe('execute: REFACTOR+passed=true の場合に commit が実行され CommitReadiness.go() が返ること', () => {
    context('L1/L2 ともに違反なしの場合', () => {
      it('CommitReadiness.ready=true が返され commit() が呼ばれる', async () => {
        const commitPort = createMockCommitExecutorPort();
        const l1Port = createMockL1ValidatorPort([]);
        const l2Port = createMockL2ValidatorPort([]);
        const service = new AtomicCommitService(commitPort, l1Port, l2Port);
        const tddCycle = TddCycle.create('REFACTOR', true);
        const commitMessage = createCommitMessage();
        const actual = await service.execute(tddCycle, commitMessage);
        expect(actual.ready).toBe(true);
        expect(commitPort.commit).toHaveBeenCalledOnce();
      });
    });
  });

  describe('execute: TDD_CYCLE_INCOMPLETE エラー（phase が REFACTOR でない場合）', () => {
    context("phase='GREEN', passed=true の場合", () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        const service = new AtomicCommitService(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        const tddCycle = TddCycle.create('GREEN', true);
        await expect(service.execute(tddCycle, createCommitMessage())).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }),
        );
      });
    });
  });

  describe('execute: TDD_CYCLE_INCOMPLETE エラー（passed=false の場合）', () => {
    context("phase='REFACTOR', passed=false の場合", () => {
      it('HarnessError(TDD_CYCLE_INCOMPLETE) がスローされる', async () => {
        const service = new AtomicCommitService(
          createMockCommitExecutorPort(),
          createMockL1ValidatorPort(),
          createMockL2ValidatorPort(),
        );
        const tddCycle = TddCycle.create('REFACTOR', false);
        await expect(service.execute(tddCycle, createCommitMessage())).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('TDD_CYCLE_INCOMPLETE') }),
        );
      });
    });
  });

  describe('execute: L1 違反がある場合は commit を実行せず noGo を返すこと', () => {
    context('L1 に 1 件違反がある場合', () => {
      it('CommitReadiness.ready=false、commit() が呼ばれない', async () => {
        const commitPort = createMockCommitExecutorPort();
        const l1Port = createMockL1ValidatorPort([{ ruleId: 'L1-001', message: 'L1 error' }]);
        const l2Port = createMockL2ValidatorPort([]);
        const service = new AtomicCommitService(commitPort, l1Port, l2Port);
        const tddCycle = TddCycle.create('REFACTOR', true);
        const actual = await service.execute(tddCycle, createCommitMessage());
        expect(actual.ready).toBe(false);
        expect(actual.violations[0]?.ruleId).toBe('L1-001');
        expect(commitPort.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe('execute: L2 違反がある場合は commit を実行せず noGo を返すこと', () => {
    context('L1 は通過、L2 に 1 件違反がある場合', () => {
      it('CommitReadiness.ready=false、commit() が呼ばれない', async () => {
        const commitPort = createMockCommitExecutorPort();
        const l1Port = createMockL1ValidatorPort([]);
        const l2Port = createMockL2ValidatorPort([{ ruleId: 'L2-001', message: 'L2 error' }]);
        const service = new AtomicCommitService(commitPort, l1Port, l2Port);
        const tddCycle = TddCycle.create('REFACTOR', true);
        const actual = await service.execute(tddCycle, createCommitMessage());
        expect(actual.ready).toBe(false);
        expect(actual.violations[0]?.ruleId).toBe('L2-001');
        expect(commitPort.commit).not.toHaveBeenCalled();
      });
    });
  });

});
