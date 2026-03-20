/**
 * @layer test
 * @unit validator-system
 * @story H08-04
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunQuickModeUseCase, InvalidRelaxationProfileError } from '../../../../validator-system/application/use-cases/run-quick-mode-usecase.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import type { ValidatorRelaxationProfile } from '../../../../validator-system/application/dto/validator-relaxation-profile.js';
import { createLayerConfig, createFullRegistry } from '../helpers.js';

const BASE_PROFILE: ValidatorRelaxationProfile = {
  levelDependencyRelaxed: false,
  l1: { all: true },
  l2: { maintained: ['L2-002'], skipped: ['L2-001', 'L2-003'] },
  l3: { maintained: [], skipped: ['L3-001', 'L3-002', 'L3-003', 'L3-004'] },
  l4: { all: false },
  phaseExecution: { twoPhaseRequired: false },
};

function createQuickModeUseCase() {
  const registry = createFullRegistry();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L2')),
  };
  return new RunQuickModeUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: mapper,
  });
}

target('RunQuickModeUseCase', () => {
  describe('緩和プロファイルによる選択実行', () => {
    context('l2.maintained=["L2-002"]のrelaxationProfileを渡した場合', () => {
      it('L2-002のみが実行されL2-001/L2-003はskipped=trueで返る (IT-UC-RunQuick-001)', async () => {
        // Arrange
        const usecase = createQuickModeUseCase();
        const input = {
          relaxationProfile: BASE_PROFILE,
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l2Results = actual.filter((r) => r.validatorId.startsWith('L2'));
        const l2002 = l2Results.find((r) => r.validatorId === 'L2-002');
        const l2Skipped = l2Results.filter((r) => r.validatorId !== 'L2-002');
        expect(l2002?.skipped).toBe(false);
        expect(l2Skipped.every((r) => r.skipped === true)).toBe(true);
      });
    });

    context('l4.all=falseのrelaxationProfileを渡した場合', () => {
      it('L4バリデータが実行されず結果に含まれないかすべてskippedになる (IT-UC-RunQuick-002)', async () => {
        // Arrange
        const usecase = createQuickModeUseCase();
        const input = {
          relaxationProfile: BASE_PROFILE,
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4Results = actual.filter((r) => r.validatorId.startsWith('L4'));
        expect(l4Results.every((r) => r.skipped === true)).toBe(true);
      });
    });

    context('twoPhaseRequired=falseの場合', () => {
      it('L2-001がskipped=trueで返る（L2-001はmaintainedから除外） (IT-UC-RunQuick-003)', async () => {
        // Arrange
        const usecase = createQuickModeUseCase();
        const input = {
          relaxationProfile: BASE_PROFILE,
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l2001 = actual.find((r) => r.validatorId === 'L2-001');
        expect(l2001?.skipped).toBe(true);
      });
    });
  });

  describe('異常系', () => {
    context('relaxationProfile.l4.allがtrue（false以外）の場合', () => {
      it('InvalidRelaxationProfileErrorが送出される (IT-UC-RunQuick-004)', async () => {
        // Arrange
        const usecase = createQuickModeUseCase();
        const badProfile = { ...BASE_PROFILE, l4: { all: true } } as unknown as ValidatorRelaxationProfile;
        const input = {
          relaxationProfile: badProfile,
          targetPaths: ['src/'] as readonly string[],
          unitName: 'unit-a',
          currentPhase: 'impl',
        };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(InvalidRelaxationProfileError);
      });
    });

    context('relaxationProfileがnullの場合', () => {
      it('エラーが送出される (IT-UC-RunQuick-005)', async () => {
        // Arrange
        const usecase = createQuickModeUseCase();
        const input = {
          relaxationProfile: null as unknown as ValidatorRelaxationProfile,
          targetPaths: [] as readonly string[],
          unitName: '',
          currentPhase: '',
        };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow();
      });
    });
  });
});
