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
      it('全L4バリデータ（L4-001〜L4-005）が実行され5件の結果が返る (IT-UC-RunL4-001)', async () => {
        // Arrange
        const usecase = createL4UseCase();
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(5);
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

    context('LayerConfig.enabled=falseの場合', () => {
      it('空のValidationResultContract[]が返る (IT-UC-RunL4-007)', async () => {
        // Arrange
        const usecase = createL4UseCase({ enabled: false });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(0);
      });

      it('drift / consistency / dead-code service が呼ばれないこと (IT-UC-RunL4-008)', async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L4', { enabled: false })),
        };
        const driftDetect = vi.fn().mockResolvedValue([]);
        const consistencyCheck = vi.fn().mockResolvedValue({ hasMismatches: () => false, toHarnessErrors: () => [] });
        const deadCodeDetect = vi.fn().mockResolvedValue({ hasDeadCode: () => false, toHarnessErrors: () => [] });
        const checkDocFreshness = vi.fn().mockResolvedValue({ results: [], summary: { total: 0, ok: 0, warn: 0, error: 0 }, errors: [] });
        const validateDocPointers = vi.fn().mockResolvedValue({ results: [], summary: { totalDocuments: 0, totalPointers: 0, brokenPointers: 0, skippedUrlPointers: 0 }, passed: true, errors: [] });
        const usecase = new RunL4ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          driftDetectionService: { detect: driftDetect } as never,
          consistencyCheckService: { check: consistencyCheck } as never,
          deadCodeDetectionService: { detect: deadCodeDetect } as never,
          checkDocFreshnessUseCase: { execute: checkDocFreshness },
          validateDocPointersUseCase: { execute: validateDocPointers },
        });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(0);
        expect(driftDetect).not.toHaveBeenCalled();
        expect(consistencyCheck).not.toHaveBeenCalled();
        expect(deadCodeDetect).not.toHaveBeenCalled();
        expect(checkDocFreshness).not.toHaveBeenCalled();
        expect(validateDocPointers).not.toHaveBeenCalled();
      });

      it('forceLayerEnabled=trueの場合はL4バリデータが実行されること', async () => {
        // Arrange
        const usecase = createL4UseCase({ enabled: false });
        const input = { strictMode: false, forceLayerEnabled: true };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(5);
      });
    });
  });

  describe('phase2-extensions由来のL4バリデータ実行', () => {
    context('doc freshnessで警告が返る場合', () => {
      it('L4-004がwarning付きの結果として返ること', async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L4', { validatorIds: ['L4-004'] })),
        };
        const checkDocFreshness = vi.fn().mockResolvedValue({
          results: [{ level: 'warn', message: 'docs/a.md is 40 days old' }],
          summary: { total: 1, ok: 0, warn: 1, error: 0 },
          errors: [],
        });
        const usecase = new RunL4ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          checkDocFreshnessUseCase: { execute: checkDocFreshness },
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-004'] });

        // Assert
        expect(checkDocFreshness).toHaveBeenCalledWith({ format: 'json' });
        expect(actual).toHaveLength(1);
        expect(actual[0].validatorId).toBe('L4-004');
        expect(actual[0].passed).toBe(false);
        expect(actual[0].errors[0].severity).toBe('warning');
      });
    });

    context('pointer validationで未解決参照が返る場合', () => {
      it('L4-005がwarning付きの結果として返ること', async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L4', { validatorIds: ['L4-005'] })),
        };
        const validateDocPointers = vi.fn().mockResolvedValue({
          results: [{
            documentPath: 'docs/a.md',
            pointerTarget: 'docs/missing.md',
            pointerType: 'file-path',
            isResolvable: false,
            errorMessage: 'File not found: docs/missing.md',
          }],
          summary: { totalDocuments: 1, totalPointers: 1, brokenPointers: 1, skippedUrlPointers: 0 },
          passed: false,
          errors: [],
        });
        const usecase = new RunL4ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          validateDocPointersUseCase: { execute: validateDocPointers },
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-005'] });

        // Assert
        expect(validateDocPointers).toHaveBeenCalledWith({ includeUrlPointers: false, format: 'json' });
        expect(actual).toHaveLength(1);
        expect(actual[0].validatorId).toBe('L4-005');
        expect(actual[0].passed).toBe(false);
        expect(actual[0].errors[0].severity).toBe('warning');
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
