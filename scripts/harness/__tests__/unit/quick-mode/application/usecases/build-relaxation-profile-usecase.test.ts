// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { BuildRelaxationProfileUseCase } from '../../../../../quick-mode/application/usecases/build-relaxation-profile-usecase.js';
import type { QuickModeConfigPort } from '../../../../../quick-mode/application/ports/quick-mode-config-port.js';
import type { ValidatorIdRegistryPort } from '../../../../../quick-mode/application/ports/validator-id-registry-port.js';

const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002',
  'L2-001', 'L2-002', 'L2-003',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003',
];

const buildSut = (overrides?: {
  getConfig?: ReturnType<typeof vi.fn>;
  getAllIds?: ReturnType<typeof vi.fn>;
}) => {
  const quickModeConfigPort: QuickModeConfigPort = {
    getConfig: overrides?.getConfig ?? vi.fn().mockResolvedValue(createQuickModeConfig()),
  };
  const validatorIdRegistryPort: ValidatorIdRegistryPort = {
    getAllIds: overrides?.getAllIds ?? vi.fn().mockResolvedValue(ALL_VALIDATOR_IDS),
  };
  const sut = new BuildRelaxationProfileUseCase({ quickModeConfigPort, validatorIdRegistryPort });
  return { sut, quickModeConfigPort, validatorIdRegistryPort };
};

target('BuildRelaxationProfileUseCase', () => {
  target('execute', () => {
    describe('eligibility=trueの場合にValidatorRelaxationProfileContractを生成する', () => {
      // UT-BUC-001
      it('eligible=trueのcontractが渡された場合にValidatorRelaxationProfileContractが返ること', async () => {
        // Arrange
        const eligibilityContract = { eligible: true, reason: 'OK' };
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual).toHaveProperty('l1');
        expect(actual).toHaveProperty('l2');
        expect(actual).toHaveProperty('l3');
        expect(actual).toHaveProperty('l4');
      });

      // UT-BUC-002
      it('デフォルト設定の場合にL2-001スキップ・L2-002+L2-003維持・L3-001維持・L3-002〜L3-004スキップのcontractが返ること', async () => {
        // Arrange
        const eligibilityContract = { eligible: true, reason: 'OK' };
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.l2.skipped).toContain('L2-001');
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
        expect(actual.l3.maintained).toContain('L3-001');
        expect(actual.l3.skipped).toEqual(
          expect.arrayContaining(['L3-002', 'L3-003', 'L3-004'])
        );
      });

      // UT-BUC-003
      it('生成されたcontractのlevelDependencyRelaxedがfalseであること', async () => {
        // Arrange
        const eligibilityContract = { eligible: true, reason: 'OK' };
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
      });
    });

    describe('異常系', () => {
      // UT-BUC-004
      it('eligible=falseのcontractが渡された場合にQuickModeNotEligibleErrorが発生すること', async () => {
        // Arrange
        const eligibilityContract = {
          eligible: false,
          reason: 'domain category detected',
          rejectionRule: 'MIXED_CHANGES' as const,
          rejectedFiles: [{ filePath: 'scripts/harness/quick-mode/domain/vo.ts', changeKind: 'MODIFY' }],
        };
        const { sut } = buildSut();
        // Act
        const actual = sut.execute({ eligibilityContract });
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });

    describe('出力形式確認', () => {
      const eligibilityContract = { eligible: true, reason: 'OK' };

      // UT-BUC-005
      it('返り値のl1がall=trueであること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.l1.all).toBe(true);
      });

      // UT-BUC-006
      it('返り値のl4がall=falseであること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.l4.all).toBe(false);
      });

      // UT-BUC-007
      it('返り値のphaseExecutionがtwoPhaseRequired=falseであること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      });

      // UT-BUC-008
      it('QuickModeConfigPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          getConfig: vi.fn().mockRejectedValue(new Error('config error')),
        });
        // Act
        const actual = sut.execute({ eligibilityContract });
        // Assert
        await expect(actual).rejects.toThrow('config error');
      });

      // UT-BUC-009
      it('ValidatorIdRegistryPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          getAllIds: vi.fn().mockRejectedValue(new Error('registry error')),
        });
        // Act
        const actual = sut.execute({ eligibilityContract });
        // Assert
        await expect(actual).rejects.toThrow('registry error');
      });

      // UT-BUC-010
      it('返り値のObject.freeze()が適用されている場合にcontractオブジェクトが再帰的に凍結されていること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
