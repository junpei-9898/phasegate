/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL3ValidatorsUseCase, CoverageReportNotFoundError } from '../../../../validator-system/application/use-cases/run-l3-validators-usecase.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { createLayerConfig, createFullRegistry } from '../helpers.js';

function createL3UseCase(
  layerConfigOverrides?: Partial<{ enabled: boolean; strictOnly: boolean; thresholds: Record<string, number> }>,
  coveragePort?: { getCoverage: () => Promise<{ overallCoverage: number; perFileCoverage: readonly { filePath: string; coverage: number }[] }> }
) {
  const registry = createFullRegistry();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L3', layerConfigOverrides ?? {})),
  };
  return new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: mapper,
    coverageReportPort: coveragePort,
  });
}

target('RunL3ValidatorsUseCase', () => {
  describe('全L3バリデータの実行', () => {
    context('validatorIdsを省略した場合', () => {
      it('全L3バリデータ（L3-001〜L3-004）が実行され4件の結果が返る (IT-UC-RunL3-001)', async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase({}, mockCoverageReportPort);
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(4);
        expect(actual.every((r) => r.passed === true)).toBe(true);
      });
    });

    context('preset="standard"でstrictOnly=falseの場合', () => {
      it('L3-002（strictOnly）がskipped=trueで返る (IT-UC-RunL3-002)', async () => {
        // Arrange
        const usecase = createL3UseCase({ strictOnly: false });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3002 = actual.find((r) => r.validatorId === 'L3-002');
        expect(l3002?.skipped).toBe(true);
      });
    });

    context('preset="strict"でstrictOnly=trueの場合', () => {
      it('L3-002も実行対象になりskipped=falseで返る (IT-UC-RunL3-003)', async () => {
        // Arrange
        const usecase = createL3UseCase({ strictOnly: true });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3002 = actual.find((r) => r.validatorId === 'L3-002');
        expect(l3002?.skipped).toBe(false);
      });
    });

    context('LayerConfig.enabled=falseの場合', () => {
      it('空のValidationResultContract[]が返る (IT-UC-RunL3-004)', async () => {
        // Arrange
        const usecase = createL3UseCase({ enabled: false });
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('coverageReportPathを指定した場合', () => {
      it('L3-003がpassする (IT-UC-RunL3-005)', async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase({ thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } }, mockCoverageReportPort);
        const input = { targetPaths: ['src/'], coverageReportPath: 'coverage/summary.json' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(4);
        const l3003 = actual.find((r) => r.validatorId === 'L3-003');
        expect(l3003?.passed).toBe(true);
      });
    });
  });

  describe('異常系', () => {
    context('カバレッジレポートが存在しない場合', () => {
      it('CoverageReportNotFoundErrorが送出される (IT-UC-RunL3-006)', async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockRejectedValue(new CoverageReportNotFoundError('nonexistent/coverage.json')),
        };
        const usecase = createL3UseCase({}, mockCoverageReportPort);
        const input = { targetPaths: ['src/'], coverageReportPath: 'nonexistent/coverage.json' };

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(CoverageReportNotFoundError);
      });
    });

    context('coverageThreshold=90に対してoverallCoverage=75の場合', () => {
      it('L3-003のpassed=falseかつerrorsに現在値（75）と不足分（15）が含まれる (IT-UC-RunL3-007)', async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 75, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase(
          { thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } },
          mockCoverageReportPort
        );
        const input = { targetPaths: ['src/'], coverageReportPath: 'coverage/summary.json' };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3003 = actual.find((r) => r.validatorId === 'L3-003');
        expect(l3003?.passed).toBe(false);
        const errorMsg = l3003?.errors[0]?.message ?? '';
        expect(errorMsg).toContain('75');
        expect(errorMsg).toContain('15');
      });
    });
  });
});
