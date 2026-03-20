import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BuildRelaxationProfileUseCase } from '../../../../quick-mode/application/usecases/build-relaxation-profile-usecase.js';
import { ValidatorRelaxationService } from '../../../../quick-mode/domain/services/validator-relaxation-service.js';
import { QuickModeConfig } from '../../../../quick-mode/domain/value-objects/quick-mode-config.js';

function createDefaultQuickModeConfig() {
  return QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L3-001'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  });
}

const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
  'L2-001', 'L2-002', 'L2-003',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003',
];

target('BuildRelaxationProfileUseCase', () => {
  describe('eligible=trueのeligibilityからプロファイルを生成する', () => {
    // IT-UC-Build-001
    it('eligible=trueのeligibilityを渡すとデフォルト緩和プロファイルが生成される', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act
      const actual = await usecase.execute({
        eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' },
      });
      // Assert
      expect(actual.levelDependencyRelaxed).toBe(false);
      expect(actual.l1.all).toBe(true);
      expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
      expect(actual.l2.skipped).toEqual(expect.arrayContaining(['L2-001']));
      expect(actual.l3.maintained).toEqual(expect.arrayContaining(['L3-001']));
      expect(actual.l3.skipped).toEqual(expect.arrayContaining(['L3-002', 'L3-003', 'L3-004']));
      expect(actual.l4.all).toBe(false);
      expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
    });

    // IT-UC-Build-002
    it('返却されるDTOがINV-P1〜INV-P6の不変条件をすべて満たすこと', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act
      const actual = await usecase.execute({
        eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' },
      });
      // Assert: INV-P1
      expect(actual.levelDependencyRelaxed).toBe(false);
      // INV-P2
      expect(actual.l1.all).toBe(true);
      // INV-P3
      expect(actual.l4.all).toBe(false);
      // INV-P4
      expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      // INV-P5: l2.maintained ∪ l2.skipped = {L2-001,L2-002,L2-003}
      const l2All = [...actual.l2.maintained, ...actual.l2.skipped].sort();
      expect(l2All).toEqual(['L2-001', 'L2-002', 'L2-003'].sort());
      // INV-P6: l3.maintained ∪ l3.skipped = {L3-001,L3-002,L3-003,L3-004}
      const l3All = [...actual.l3.maintained, ...actual.l3.skipped].sort();
      expect(l3All).toEqual(['L3-001', 'L3-002', 'L3-003', 'L3-004'].sort());
    });

    // IT-UC-Build-003
    it('カスタムmaintainedLayers設定でプロファイルが正しく生成される', async () => {
      // Arrange
            const customConfig = QuickModeConfig.create({
        allowedCategories: ['bugfix', 'docs', 'test', 'config'],
        maintainedLayers: ['L1', 'L2-001', 'L2-002', 'L2-003', 'L3-001'],
        relaxedGates: ['L3-002', 'L3-003', 'L3-004', 'L4'],
      });
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockReturnValue(customConfig),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act
      const actual = await usecase.execute({
        eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' },
      });
      // Assert
      expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-001', 'L2-002', 'L2-003']));
      expect(actual.l2.skipped).toEqual([]);
      expect(actual.l3.maintained).toEqual(expect.arrayContaining(['L3-001']));
    });
  });

  describe('eligible=falseのeligibilityを渡した場合の異常系', () => {
    // IT-UC-Build-004
    it('eligible=falseのeligibilityを渡すとQuickModeNotEligibleErrorが投げられる', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn(),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn(),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act & Assert
      await expect(usecase.execute({
        eligibility: {
          eligible: false,
          reason: 'MIXED_CHANGES ルールにより拒否されました',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
        },
      })).rejects.toThrow();
    });

    // IT-UC-Build-005
    it('eligible=falseの場合、PortのgetConfigは呼ばれないこと', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn(),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn(),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act
      try {
        await usecase.execute({
          eligibility: {
            eligible: false,
            reason: '拒否',
            rejectionRule: 'MIXED_CHANGES',
            rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
          },
        });
      } catch {
        // エラーは期待通り
      }
      // Assert
      expect(mockQuickModeConfigPort.getConfig).not.toHaveBeenCalled();
    });
  });

  describe('Portエラーの伝播', () => {
    // IT-UC-Build-006
    it('quickModeConfigPortがエラーを投げた場合、そのエラーが伝播する', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockImplementation(() => {
          throw new Error('config not found');
        }),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act & Assert
      await expect(usecase.execute({
        eligibility: { eligible: true, reason: 'ok' },
      })).rejects.toThrow('config not found');
    });

    // IT-UC-Build-007
    it('validatorIdRegistryPortがエラーを投げた場合、そのエラーが伝播する', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const mockValidatorIdRegistryPort = {
        getAllIds: vi.fn().mockImplementation(() => {
          throw new Error('registry error');
        }),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });
      // Act & Assert
      await expect(usecase.execute({
        eligibility: { eligible: true, reason: 'ok' },
      })).rejects.toThrow('registry error');
    });
  });
});
