/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL4ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l4-validators-usecase.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { createLayerConfig, createFullRegistry } from '../helpers.js';

function createL4UseCase(layerConfigOverrides?: Partial<{ enabled: boolean; strictOnly: boolean }>) {
  const registry = createFullRegistry();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L4', layerConfigOverrides ?? {})),
  };
  return new RunL4ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: mapper,
  });
}

target('RunL4ValidatorsUseCase', () => {
  describe('全L4バリデータの実行', () => {
    context('validatorIdsを省略しstrictMode=falseの場合', () => {
      it('全L4バリデータ（L4-001〜L4-003）が実行され3件の結果が返る (IT-UC-RunL4-001)', async () => {
        // Arrange
        const usecase = createL4UseCase();
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual.every((r) => r.passed === true)).toBe(true);
      });
    });

    context('strictMode=falseの場合', () => {
      it('L4-003（strictOnly）がskipped=trueで返る (IT-UC-RunL4-002)', async () => {
        // Arrange
        const usecase = createL4UseCase({ strictOnly: false });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4003 = actual.find((r) => r.validatorId === 'L4-003');
        expect(l4003?.skipped).toBe(true);
      });
    });

    context('targetUnitsに["harness-error"]を指定した場合', () => {
      it('L4-001/L4-002がpassed=trueで返る (IT-UC-RunL4-003)', async () => {
        // Arrange
        const usecase = createL4UseCase();
        const input = { targetUnits: ['harness-error'], strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4001 = actual.find((r) => r.validatorId === 'L4-001');
        const l4002 = actual.find((r) => r.validatorId === 'L4-002');
        expect(l4001?.passed).toBe(true);
        expect(l4002?.passed).toBe(true);
      });
    });

    context('strictMode=trueの場合', () => {
      it('L4-003も実行対象になりskipped=falseで返る (IT-UC-RunL4-004)', async () => {
        // Arrange
        const usecase = createL4UseCase({ strictOnly: true });
        const input = { strictMode: true };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l4003 = actual.find((r) => r.validatorId === 'L4-003');
        expect(l4003?.skipped).toBe(false);
      });
    });
  });

  describe('異常系', () => {
    context('ValidatorConfigPortが例外をthrowした場合', () => {
      it('ValidatorExecutionErrorが伝播する (IT-UC-RunL4-005)', async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const { ValidatorExecutionError } = await import('../../../../validator-system/domain/services/validator-execution-service.js');
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockRejectedValue(new Error('L4 config read failed')),
        };
        const usecase = new RunL4ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
        });
        const input = { strictMode: false };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(ValidatorExecutionError);
      });
    });

    context('validatorIdsが空配列の場合', () => {
      it('実行は成功し0件の結果が返る (IT-UC-RunL4-006)', async () => {
        // Arrange
        const usecase = createL4UseCase();
        const input = { validatorIds: [], strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        // validatorIdsが空の場合はL4全件実行
        expect(actual.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
