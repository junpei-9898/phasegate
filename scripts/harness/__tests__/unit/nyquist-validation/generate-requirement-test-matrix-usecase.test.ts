// @layer test
// @unit nyquist-validation
// @story H12-02
// @work-item-id WI-125
// @work-item-id WI-131

import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { RequirementIntentCoverageService } from '../../../nyquist-validation/domain/services/requirement-intent-coverage-service.js';
import {
  GenerateRequirementTestMatrixUseCase,
  type ExistingMatrixPort,
  type RequirementSourcePort,
  type TestReferenceSourcePort,
} from '../../../nyquist-validation/application/usecases/generate-requirement-test-matrix-usecase.js';
import type { RequirementTestMatrixDto } from '../../../nyquist-validation/application/dto/generate-matrix-output.js';

function createSut(options: {
  requirements: Awaited<ReturnType<RequirementSourcePort['readRequirements']>>;
  references: Awaited<ReturnType<TestReferenceSourcePort['readTestReferences']>>;
  existing?: RequirementTestMatrixDto | null;
}) {
  let written: RequirementTestMatrixDto | null = null;
  const matrixPort: ExistingMatrixPort = {
    readExistingMatrix: async () => options.existing ?? null,
    writeMatrix: async (_path, matrix) => {
      written = matrix;
    },
  };
  const sut = new GenerateRequirementTestMatrixUseCase({
    requirementSourcePort: { readRequirements: async () => options.requirements },
    testReferenceSourcePort: { readTestReferences: async () => options.references },
    matrixPort,
    intentCoverageService: new RequirementIntentCoverageService(),
    now: () => new Date('2026-05-12T00:00:00.000Z'),
  });
  return { sut, getWritten: () => written };
}

target('GenerateRequirementTestMatrixUseCase', () => {
  describe('requirement-test matrixを生成する', () => {
    it('product docsのACとstory metadata付きtestからschema互換matrixを生成すること', async () => {
      // Arrange
      const { sut, getWritten } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1', 'AC-2'] }],
        references: [{
          storyId: 'H07-01',
          filePath: 'scripts/harness/__tests__/unit/example.test.ts',
          testType: 'unit',
          testName: 'matrixを生成できること',
        }],
      });

      // Act
      const actual = await sut.execute({
        requirementsPath: 'docs/product/user_stories.md',
        testRoot: 'scripts/harness/__tests__',
        matrixFilePath: '.harness/requirement-test-matrix.json',
        write: true,
      });

      // Assert
      expect(actual.matrix.generatedAt).toBe('2026-05-12T00:00:00.000Z');
      expect(actual.matrix.stories[0].storyId).toBe('H07-01');
      expect(actual.matrix.stories[0].storyMappings).toHaveLength(2);
      expect(actual.matrix.stories[0].storyMappings[0].testReferences[0].testName).toBe('matrixを生成できること');
      expect(actual.report.intentCoverage.every((item) => item.status === 'weakly-observed')).toBe(true);
      expect(getWritten()).not.toBeNull();
    });

    it('既存matrixの手動test referenceを失わずに保持すること', async () => {
      // Arrange
      const existing: RequirementTestMatrixDto = {
        version: '1.0',
        generatedAt: '2026-05-11T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{
            acId: 'AC-1',
            testReferences: [{ filePath: 'manual.test.ts', testType: 'unit', testName: '手動補足' }],
          }],
        }],
      };
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1'] }],
        references: [{
          storyId: 'H07-01',
          filePath: 'generated.test.ts',
          testType: 'unit',
          testName: '自動抽出',
        }],
        existing,
      });

      // Act
      const actual = await sut.execute({
        requirementsPath: 'docs/product/user_stories.md',
        testRoot: 'scripts/harness/__tests__',
        matrixFilePath: '.harness/requirement-test-matrix.json',
        write: false,
      });

      // Assert
      expect(actual.matrix.stories[0].storyMappings[0].testReferences.map((item) => item.filePath)).toEqual([
        'generated.test.ts',
        'manual.test.ts',
      ]);
      expect(actual.report.preservedReferences).toBe(1);
    });

    it('testがないACとunknown storyのtestをreportすること', async () => {
      // Arrange
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1'] }],
        references: [{ storyId: 'H99-99', filePath: 'orphan.test.ts', testType: 'unit', testName: '孤立test' }],
      });

      // Act
      const actual = await sut.execute({
        requirementsPath: 'docs/product/user_stories.md',
        testRoot: 'scripts/harness/__tests__',
        matrixFilePath: '.harness/requirement-test-matrix.json',
        write: false,
      });

      // Assert
      expect(actual.report.missingTests).toEqual([{ storyId: 'H07-01', acId: 'AC-1' }]);
      expect(actual.report.orphanTests).toEqual([{ storyId: 'H99-99', filePath: 'orphan.test.ts', testName: '孤立test' }]);
      expect(actual.report.unknownStories).toEqual(['H99-99']);
      expect(actual.report.intentCoverage[0].status).toBe('unobserved');
    });
  });
});
