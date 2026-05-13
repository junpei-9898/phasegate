/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-156
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
      it('全L4バリデータ（L4-001〜L4-006）が実行され6件の結果が返る (IT-UC-RunL4-001)', async () => {
        // Arrange
        const usecase = createL4UseCase();
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.map((r) => [r.validatorId, r.passed, r.skipped])).toEqual([
          ['L4-001', true, false],
          ['L4-002', true, false],
          ['L4-003', true, true],
          ['L4-004', true, false],
          ['L4-005', true, false],
          ['L4-006', true, false],
        ]);
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
        expect(actual).toContainEqual(expect.objectContaining({ validatorId: 'L4-003', skipped: true }));
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
        expect(actual).toEqual(expect.arrayContaining([
          expect.objectContaining({ validatorId: 'L4-001', passed: true }),
          expect.objectContaining({ validatorId: 'L4-002', passed: true }),
        ]));
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
        expect(actual).toContainEqual(expect.objectContaining({ validatorId: 'L4-003', skipped: false }));
      });
    });

    context('LayerConfig.enabled=falseの場合', () => {
      it('全L4バリデータがskipped=trueで返る (IT-UC-RunL4-007)', async () => {
        // Arrange
        const usecase = createL4UseCase({ enabled: false });
        const input = { strictMode: false };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.map((r) => [r.validatorId, r.skipped])).toEqual([
          ['L4-001', true],
          ['L4-002', true],
          ['L4-003', true],
          ['L4-004', true],
          ['L4-005', true],
          ['L4-006', true],
        ]);
      });

      it('L4 service依存を渡してもdisabled layerでは全結果がskippedになること (IT-UC-RunL4-008)', async () => {
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
        expect(actual.map((r) => [r.validatorId, r.skipped])).toEqual([
          ['L4-001', true],
          ['L4-002', true],
          ['L4-003', true],
          ['L4-004', true],
          ['L4-005', true],
          ['L4-006', true],
        ]);
      });

      it('forceLayerEnabled=trueの場合はL4バリデータが実行されること', async () => {
        // Arrange
        const usecase = createL4UseCase({ enabled: false });
        const input = { strictMode: false, forceLayerEnabled: true };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.map((r) => r.validatorId)).toEqual(['L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006']);
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
        expect(actual).toEqual([
          expect.objectContaining({
            validatorId: 'L4-004',
            passed: false,
            errors: [expect.objectContaining({ severity: 'warning' })],
          }),
        ]);
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
        expect(actual).toEqual([
          expect.objectContaining({
            validatorId: 'L4-005',
            passed: false,
            errors: [expect.objectContaining({ severity: 'warning' })],
          }),
        ]);
      });
    });

    context('skill catalog driftで宣言数ずれが返る場合', () => {
      it('L4-006がwarning付きの結果として返ること', async () => {
        // Arrange
        const registry = createFullRegistry();
        const executionService = new ValidatorExecutionService({});
        const mapper = new ValidationResultContractMapper();
        const mockValidatorConfigPort = {
          getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L4', { validatorIds: ['L4-006'] })),
        };
        const collect = vi.fn().mockResolvedValue({
          actualSkillNames: ['alpha', 'beta', 'gamma'],
          countDeclarations: [{ sourcePath: 'README.md', declaredCount: 2, line: 10 }],
          categoryDeclarations: [],
        });
        const usecase = new RunL4ValidatorsUseCase({
          validatorRegistry: registry,
          validatorExecutionService: executionService,
          validatorConfigPort: mockValidatorConfigPort,
          contractMapper: mapper,
          skillCatalogDriftPort: { collect },
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-006'] });

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            validatorId: 'L4-006',
            passed: false,
            errors: [expect.objectContaining({
              severity: 'warning',
              kind: 'skill-count-mismatch',
              sourcePath: 'README.md',
              expectedCount: 3,
              actualCount: 2,
            })],
          }),
        ]);
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

        // Act
        const actual = usecase.execute(input);

        // Assert
        await expect(actual).rejects.toThrow(ValidatorExecutionError);
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
        expect(actual.map((r) => r.validatorId)).toEqual(['L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006']);
      });
    });
  });
});
