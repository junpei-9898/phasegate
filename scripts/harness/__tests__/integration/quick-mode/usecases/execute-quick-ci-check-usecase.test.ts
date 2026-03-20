import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ExecuteQuickCiCheckUseCase } from '../../../../quick-mode/application/usecases/execute-quick-ci-check-usecase.js';

function createApprovedDecision() {
  return {
    eligibility: {
      eligible: true,
      reason: 'すべてのファイルが許可カテゴリ内です',
    },
    relaxationProfile: {
      levelDependencyRelaxed: false,
      l1: { all: true },
      l2: {
        maintained: ['L2-002', 'L2-003'],
        skipped: ['L2-001'],
      },
      l3: {
        maintained: ['L3-001'],
        skipped: ['L3-002', 'L3-003', 'L3-004'],
      },
      l4: { all: false },
      phaseExecution: { twoPhaseRequired: false },
    },
  };
}

target('ExecuteQuickCiCheckUseCase', () => {
  describe('正常系：判定とプロファイル生成が連携する', () => {
    // IT-UC-Execute-001
    it('eligible=trueかつdryRun=falseで判定+プロファイル生成が実行される', async () => {
      // Arrange
      const approvedEligibility = { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' };
      const defaultProfile = createApprovedDecision().relaxationProfile;
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(approvedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockResolvedValue(defaultProfile),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
      });
      // Act
      const actual = await usecase.execute({ changedFiles: undefined, dryRun: false });
      // Assert
      expect(actual.eligibility.eligible).toBe(true);
      expect(actual.relaxationProfile).toBeDefined();
      expect(actual.relaxationProfile!.levelDependencyRelaxed).toBe(false);
    });

    // IT-UC-Execute-002
    it('eligible=falseのとき、relaxationProfile=undefinedのDecisionContractが返る', async () => {
      // Arrange
      const rejectedEligibility = {
        eligible: false,
        reason: 'MIXED_CHANGES ルールにより拒否されました',
        rejectionRule: 'MIXED_CHANGES',
        rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
      };
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(rejectedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
      });
      // Act
      const actual = await usecase.execute({ changedFiles: undefined, dryRun: false });
      // Assert
      expect(actual.eligibility.eligible).toBe(false);
      expect(actual.relaxationProfile).toBeUndefined();
    });

    // IT-UC-Execute-003
    it('eligible=falseのとき、buildUseCaseは呼ばれないこと', async () => {
      // Arrange
      const rejectedEligibility = {
        eligible: false,
        reason: '拒否',
        rejectionRule: 'MIXED_CHANGES',
        rejectedFiles: [],
      };
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(rejectedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
      });
      // Act
      await usecase.execute({ changedFiles: undefined, dryRun: false });
      // Assert
      expect(mockBuildUseCase.execute).not.toHaveBeenCalled();
    });

    // IT-UC-Execute-004
    it('dryRun=trueのとき、validator-systemへの実行指示がスキップされる', async () => {
      // Arrange
      const approvedEligibility = { eligible: true, reason: 'ok' };
      const defaultProfile = createApprovedDecision().relaxationProfile;
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(approvedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockResolvedValue(defaultProfile),
      };
      const mockValidatorExecutionPort = {
        executeWithProfile: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
        validatorExecutionPort: mockValidatorExecutionPort,
      });
      // Act
      await usecase.execute({ changedFiles: undefined, dryRun: true });
      // Assert
      expect(mockValidatorExecutionPort.executeWithProfile).not.toHaveBeenCalled();
    });

    // IT-UC-Execute-005
    it('changedFilesを明示指定したとき、judgeUseCaseに正しく渡される', async () => {
      // Arrange
      const changedFiles = [{ filePath: 'src/foo.ts', changeKind: 'MODIFY' }];
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue({
          eligible: false,
          reason: '拒否',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [],
        }),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
      });
      // Act
      await usecase.execute({ changedFiles, dryRun: false });
      // Assert
      expect(mockJudgeUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ changedFiles }),
      );
    });

    // IT-UC-Execute-008
    it('eligible=trueかつdryRun=trueのとき、relaxationProfile含むDecisionContractが返り、実行Portは呼ばれない', async () => {
      // Arrange
      const approvedEligibility = { eligible: true, reason: 'ok' };
      const defaultProfile = createApprovedDecision().relaxationProfile;
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(approvedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockResolvedValue(defaultProfile),
      };
      const mockValidatorExecutionPort = {
        executeWithProfile: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
        validatorExecutionPort: mockValidatorExecutionPort,
      });
      // Act
      const actual = await usecase.execute({ changedFiles: undefined, dryRun: true });
      // Assert
      expect(actual.eligibility.eligible).toBe(true);
      expect(actual.relaxationProfile).toBeDefined();
      expect(mockValidatorExecutionPort.executeWithProfile).not.toHaveBeenCalled();
    });
  });

  describe('異常系：エラー伝播', () => {
    // IT-UC-Execute-006
    it('judgeUseCaseがエラーを投げた場合、そのエラーが伝播する', async () => {
      // Arrange
      const mockJudgeUseCase = {
        execute: vi.fn().mockRejectedValue(new Error('judge failed')),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
      });
      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined, dryRun: false }))
        .rejects.toThrow('judge failed');
    });

    // IT-UC-Execute-007
    it('buildUseCaseがエラーを投げた場合（eligible=true後）、そのエラーが伝播する', async () => {
      // Arrange
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue({ eligible: true, reason: 'ok' }),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockRejectedValue(new Error('build failed')),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase as never,
        buildUseCase: mockBuildUseCase as never,
      });
      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined, dryRun: false }))
        .rejects.toThrow('build failed');
    });
  });
});
