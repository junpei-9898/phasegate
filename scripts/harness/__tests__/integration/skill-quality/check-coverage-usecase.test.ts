import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckCoverageUseCase } from '../../../skill-quality/application/usecases/check-coverage-usecase.js';
import { CodeCoverageResult } from '../../../skill-quality/domain/value-objects/code-coverage-result.js';

function createMockRequirementTestMatrixPort(
  total = 5, covered = 5, uncoveredIds: string[] = []
) {
  return {
    read: vi.fn().mockResolvedValue({ total, covered, uncoveredIds }),
  };
}

function createMockCoverageRunnerPort(
  result = { line: 85, branch: 80, fn: 90 }
) {
  return {
    run: vi.fn().mockResolvedValue(CodeCoverageResult.create(result.line, result.branch, result.fn)),
  };
}

function createMockConfigQueryPort(overrides: {
  requirementThreshold?: number;
  codeThreshold?: number;
} = {}) {
  return {
    getCoverageThreshold: vi.fn().mockResolvedValue({
      requirement: overrides.requirementThreshold ?? 100,
      code: overrides.codeThreshold ?? 80,
    }),
    isAgentLessonCollectionEnabled: vi.fn().mockResolvedValue(true),
    getCascadeUpdateTargetPatterns: vi.fn().mockResolvedValue(['scripts/**/*.ts']),
  };
}

target('CheckCoverageUseCase', () => {

  // IT-UC-CheckCov-001
  describe('execute: 要件100% + コード85% で閾値達成すること', () => {
    context('ConfigQueryPort(100/80), RequirementTestMatrix(5/5), CoverageRunner(line=85) の場合', () => {
      it('output.meetsThreshold=true, requirementCoverage.coverageRate=100', async () => {
        // Arrange
        const mockMatrix = createMockRequirementTestMatrixPort(5, 5, []);
        const mockCoverage = createMockCoverageRunnerPort({ line: 85, branch: 80, fn: 90 });
        const mockConfig = createMockConfigQueryPort({ requirementThreshold: 100, codeThreshold: 80 });
        const usecase = new CheckCoverageUseCase(mockMatrix, mockCoverage, mockConfig);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-02' });
        // Assert
        expect(actual.meetsThreshold).toBe(true);
        expect(actual.coverageReport.requirementCoverage.coverageRate).toBe(100);
      });
    });
  });

  // IT-UC-CheckCov-002
  describe('execute: 要件80% で閾値未達になること', () => {
    context('RequirementTestMatrix(5/4, uncoveredIds=["REQ-05"]) の場合', () => {
      it('output.meetsThreshold=false, uncoveredIds=["REQ-05"]', async () => {
        // Arrange
        const mockMatrix = createMockRequirementTestMatrixPort(5, 4, ['REQ-05']);
        const mockCoverage = createMockCoverageRunnerPort({ line: 85, branch: 80, fn: 90 });
        const mockConfig = createMockConfigQueryPort({ requirementThreshold: 100, codeThreshold: 80 });
        const usecase = new CheckCoverageUseCase(mockMatrix, mockCoverage, mockConfig);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-02' });
        // Assert
        expect(actual.meetsThreshold).toBe(false);
        expect(actual.coverageReport.requirementCoverage.uncoveredIds).toContain('REQ-05');
      });
    });
  });

  // IT-UC-CheckCov-003
  describe('execute: RequirementTestMatrix が MATRIX_FILE_NOT_FOUND をスローした場合にエラーが伝播すること', () => {
    context('RequirementTestMatrixPort が HarnessError(MATRIX_FILE_NOT_FOUND) をスローする場合', () => {
      it('HarnessError(MATRIX_FILE_NOT_FOUND) が伝播する', async () => {
        // Arrange
        const mockMatrix = {
          read: vi.fn().mockRejectedValue(
            Object.assign(new Error('not found'), { code: 'MATRIX_FILE_NOT_FOUND' }),
          ),
        };
        const usecase = new CheckCoverageUseCase(
          mockMatrix,
          createMockCoverageRunnerPort(),
          createMockConfigQueryPort(),
        );
        // Act & Assert
        await expect(usecase.execute({ storyId: 'H12-02' })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('MATRIX_FILE_NOT_FOUND') }),
        );
      });
    });
  });

  // IT-UC-CheckCov-004
  describe('execute: CoverageRunner が失敗した場合にエラーが伝播すること', () => {
    context('CoverageRunnerPort が HarnessError(COVERAGE_RUN_FAILED) をスローする場合', () => {
      it('HarnessError(COVERAGE_RUN_FAILED) が伝播する', async () => {
        // Arrange
        const mockCoverage = {
          run: vi.fn().mockRejectedValue(
            Object.assign(new Error('coverage failed'), { code: 'COVERAGE_RUN_FAILED' }),
          ),
        };
        const usecase = new CheckCoverageUseCase(
          createMockRequirementTestMatrixPort(),
          mockCoverage,
          createMockConfigQueryPort(),
        );
        // Act & Assert
        await expect(usecase.execute({ storyId: 'H12-02' })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('COVERAGE_RUN_FAILED') }),
        );
      });
    });
  });

});
