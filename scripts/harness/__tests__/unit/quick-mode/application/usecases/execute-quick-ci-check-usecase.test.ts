// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context, createChangedFile } from '../../../../helpers/test-helpers.js';
import { ExecuteQuickCiCheckUseCase } from '../../../../../quick-mode/application/usecases/execute-quick-ci-check-usecase.js';
import type { ValidatorExecutionPort } from '../../../../../quick-mode/application/ports/validator-execution-port.js';

// テストダブル用の型定義
type JudgeDouble = { execute: ReturnType<typeof vi.fn> };
type BuildDouble = { execute: ReturnType<typeof vi.fn> };

const ELIGIBLE_CONTRACT = {
  eligible: true as const,
  reason: 'OK',
};

const NOT_ELIGIBLE_CONTRACT = {
  eligible: false as const,
  reason: 'domain detected',
  rejectionRule: 'MIXED_CHANGES' as const,
  rejectedFiles: [{ filePath: 'scripts/harness/quick-mode/domain/vo.ts', changeKind: 'MODIFY' as const }],
};

const PROFILE_CONTRACT = {
  levelDependencyRelaxed: false as const,
  l1: { all: true as const },
  l2: { maintained: ['L2-002', 'L2-003'], skipped: ['L2-001'] },
  l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
  l4: { all: false as const },
  phaseExecution: { twoPhaseRequired: false as const },
};

const buildSut = (overrides?: {
  judgeExecute?: ReturnType<typeof vi.fn>;
  buildExecute?: ReturnType<typeof vi.fn>;
  validatorExecutionPort?: ValidatorExecutionPort;
}) => {
  const judgeUseCase: JudgeDouble = {
    execute: overrides?.judgeExecute ?? vi.fn().mockResolvedValue(ELIGIBLE_CONTRACT),
  };
  const buildUseCase: BuildDouble = {
    execute: overrides?.buildExecute ?? vi.fn().mockResolvedValue(PROFILE_CONTRACT),
  };
  const validatorExecutionPort: ValidatorExecutionPort = overrides?.validatorExecutionPort ?? {
    executeWithProfile: vi.fn().mockResolvedValue(undefined),
  };
  const sut = new ExecuteQuickCiCheckUseCase({
    judgeUseCase: judgeUseCase as never,
    buildUseCase: buildUseCase as never,
    validatorExecutionPort,
  });
  return { sut, judgeUseCase, buildUseCase, validatorExecutionPort };
};

target('ExecuteQuickCiCheckUseCase', () => {
  target('execute', () => {
    describe('H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す', () => {
      // UT-EUC-001
      it('eligible=falseの判定結果が返ってきた場合にrelaxationProfile=undefinedのQuickModeDecisionContractが返ること', async () => {
        // Arrange
        const { sut } = buildSut({
          judgeExecute: vi.fn().mockResolvedValue(NOT_ELIGIBLE_CONTRACT),
        });
        // Act
        const actual = await sut.execute({ dryRun: false });
        // Assert
        expect(actual.eligibility.eligible).toBe(false);
        expect(actual.relaxationProfile).toBeUndefined();
      });

      // UT-EUC-002
      it('eligible=falseの場合にBuildRelaxationProfileUseCaseが呼ばれないこと', async () => {
        // Arrange
        const { sut, buildUseCase } = buildSut({
          judgeExecute: vi.fn().mockResolvedValue(NOT_ELIGIBLE_CONTRACT),
        });
        // Act
        await sut.execute({ dryRun: false });
        // Assert
        expect(buildUseCase.execute).not.toHaveBeenCalled();
      });

      // UT-EUC-003
      it('eligible=trueの判定結果が返ってきた場合にrelaxationProfileを含むQuickModeDecisionContractが返ること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ dryRun: false });
        // Assert
        expect(actual.eligibility.eligible).toBe(true);
        expect(actual.relaxationProfile).toBeDefined();
      });

      // UT-EUC-004
      it("eligible=trueかつdryRun=falseの場合に`validatorExecutionPort.executeWithProfile(relaxationProfile)`が1回呼ばれること（DIP保証）", async () => {
        // Arrange
        const { sut, validatorExecutionPort } = buildSut();
        // Act
        await sut.execute({ dryRun: false });
        // Assert
        expect(validatorExecutionPort.executeWithProfile).toHaveBeenCalledOnce();
      });

      // UT-EUC-005
      it('eligible=trueかつdryRun=trueの場合に`validatorExecutionPort.executeWithProfile`が呼ばれないこと', async () => {
        // Arrange
        const { sut, validatorExecutionPort } = buildSut();
        // Act
        await sut.execute({ dryRun: true });
        // Assert
        expect(validatorExecutionPort.executeWithProfile).not.toHaveBeenCalled();
      });

      // UT-EUC-006
      it('dryRun=trueかつeligible=trueの場合にrelaxationProfileが含まれたcontractが返ること（dryRunでもProfileは生成される）', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ dryRun: true });
        // Assert
        expect(actual.relaxationProfile).toBeDefined();
      });

      // UT-EUC-007
      it('changedFilesを省略した場合にJudgeQuickModeEligibilityUseCaseにchangedFiles=undefinedで渡されること', async () => {
        // Arrange
        const { sut, judgeUseCase } = buildSut();
        // Act
        await sut.execute({ dryRun: false });
        // Assert
        expect(judgeUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({ changedFiles: undefined })
        );
      });

      // UT-EUC-008
      it('changedFilesを明示指定した場合に指定のchangedFilesがJudgeQuickModeEligibilityUseCaseに渡されること', async () => {
        // Arrange
        const { sut, judgeUseCase } = buildSut();
        const changedFiles = [createChangedFile()];
        // Act
        await sut.execute({ dryRun: false, changedFiles });
        // Assert
        expect(judgeUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({ changedFiles })
        );
      });
    });

    describe('異常系', () => {
      // UT-EUC-009
      it('JudgeQuickModeEligibilityUseCaseがエラーを投げる場合にUseCaseエラーがExecuteQuickCiCheckUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          judgeExecute: vi.fn().mockRejectedValue(new Error('judge error')),
        });
        // Act
        const actual = sut.execute({ dryRun: false });
        // Assert
        await expect(actual).rejects.toThrow('judge error');
      });

      // UT-EUC-010
      it('BuildRelaxationProfileUseCaseがエラーを投げる場合にUseCaseエラーがExecuteQuickCiCheckUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          buildExecute: vi.fn().mockRejectedValue(new Error('build error')),
        });
        // Act
        const actual = sut.execute({ dryRun: false });
        // Assert
        await expect(actual).rejects.toThrow('build error');
      });
    });
  });
});
