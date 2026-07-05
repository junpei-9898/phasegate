// @layer test
// @unit nyquist-validation
// @story HF2-05
// @work-item-id WI-222

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
  const matrixPort: ExistingMatrixPort = {
    readExistingMatrix: async () => options.existing ?? null,
    writeMatrix: async () => {},
  };
  const sut = new GenerateRequirementTestMatrixUseCase({
    requirementSourcePort: { readRequirements: async () => options.requirements },
    testReferenceSourcePort: { readTestReferences: async () => options.references },
    matrixPort,
    intentCoverageService: new RequirementIntentCoverageService(),
    now: () => new Date('2026-07-05T00:00:00.000Z'),
  });
  return { sut };
}

const runInput = {
  requirementsPath: 'docs/product/user_stories.md',
  testRoot: 'scripts/harness/__tests__',
  matrixFilePath: '.harness/requirement-test-matrix.json',
  write: false,
} as const;

target('GenerateRequirementTestMatrixUseCase — AC-level binding', () => {
  describe('AC 単位 binding を計算する', () => {
    // @ac AC-4
    it('acIdsが一致する参照はbinding=acで紐づくこと', async () => {
      // Arrange
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1', 'AC-2'] }],
        references: [{
          storyId: 'H07-01',
          filePath: 'a.test.ts',
          testType: 'unit',
          testName: 'AC-1 検証',
          acIds: ['AC-1'],
        }],
      });

      // Act
      const actual = await sut.execute(runInput);

      // Assert
      const ac1 = actual.matrix.stories[0].storyMappings.find((m) => m.acId === 'AC-1');
      const ac2 = actual.matrix.stories[0].storyMappings.find((m) => m.acId === 'AC-2');
      expect(ac1?.testReferences).toHaveLength(1);
      expect(ac1?.testReferences[0].binding).toBe('ac');
      // AC-2 は acIds に含まれないため、この AC-bound 参照はファンアウトしない
      expect(ac2?.testReferences).toHaveLength(0);
    });

    it('acIds無しの参照は全ACへbinding=fileでファンアウトすること', async () => {
      // Arrange
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1', 'AC-2'] }],
        references: [{
          storyId: 'H07-01',
          filePath: 'legacy.test.ts',
          testType: 'unit',
          testName: '注釈なし',
        }],
      });

      // Act
      const actual = await sut.execute(runInput);

      // Assert
      const ac1 = actual.matrix.stories[0].storyMappings.find((m) => m.acId === 'AC-1');
      const ac2 = actual.matrix.stories[0].storyMappings.find((m) => m.acId === 'AC-2');
      expect(ac1?.testReferences.map((r) => r.binding)).toEqual(['file']);
      expect(ac2?.testReferences.map((r) => r.binding)).toEqual(['file']);
    });

    it('binding付き参照でもdedupが正常に働くこと', async () => {
      // Arrange: 同一 file/testType/testName で ac-bound と file-fallback が混在
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1'] }],
        references: [
          { storyId: 'H07-01', filePath: 'a.test.ts', testType: 'unit', testName: 'dup', acIds: ['AC-1'] },
          { storyId: 'H07-01', filePath: 'b.test.ts', testType: 'unit', testName: 'legacy' },
        ],
      });

      // Act
      const actual = await sut.execute(runInput);

      // Assert: AC-1 には ac-bound(a.test.ts) と file-fallback(b.test.ts) の 2 件、重複なし
      const ac1 = actual.matrix.stories[0].storyMappings.find((m) => m.acId === 'AC-1');
      expect(ac1?.testReferences).toHaveLength(2);
      const keys = ac1?.testReferences.map((r) => `${r.filePath}:${r.binding}`);
      expect(new Set(keys).size).toBe(2);
    });

    it('acLevelCoverage集計が正しいこと', async () => {
      // Arrange: AC-1 は ac-bound、AC-2 は file-fallback のみ
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1', 'AC-2'] }],
        references: [
          { storyId: 'H07-01', filePath: 'a.test.ts', testType: 'unit', testName: 'ac1', acIds: ['AC-1'] },
          { storyId: 'H07-01', filePath: 'b.test.ts', testType: 'unit', testName: 'legacy' },
        ],
      });

      // Act
      const actual = await sut.execute(runInput);

      // Assert
      expect(actual.report.acLevelCoverage).toEqual({ total: 2, acBound: 1, fileFallbackOnly: 1 });
    });

    // @ac AC-3
    it('orphanAcTagsがreportに集約されること', async () => {
      // Arrange
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1'] }],
        references: [{
          storyId: 'H07-01',
          filePath: 'a.test.ts',
          testType: 'unit',
          testName: 'orphan',
          orphanAcTags: [{ storyId: 'H07-01', filePath: 'a.test.ts', testName: 'orphan', rawTag: 'H99-99-1', reason: 'ac-not-in-story' }],
        }],
      });

      // Act
      const actual = await sut.execute(runInput);

      // Assert
      expect(actual.report.orphanAcTags).toHaveLength(1);
      expect(actual.report.orphanAcTags[0].rawTag).toBe('H99-99-1');
    });
  });

  describe('L3-004 不変性', () => {
    // @ac AC-4
    it('acIds無し1.0マトリクスのマージでbinding正規化により重複が生まれないこと', async () => {
      // Arrange: 既存 1.0 マトリクス（binding 無し）と同一の生成参照
      const existing: RequirementTestMatrixDto = {
        version: '1.0',
        generatedAt: '2026-07-04T00:00:00.000Z',
        stories: [{
          storyId: 'H07-01',
          storyMappings: [{
            acId: 'AC-1',
            testReferences: [{ filePath: 'legacy.test.ts', testType: 'unit', testName: '注釈なし' }],
          }],
        }],
      };
      const { sut } = createSut({
        requirements: [{ storyId: 'H07-01', acIds: ['AC-1'] }],
        references: [{ storyId: 'H07-01', filePath: 'legacy.test.ts', testType: 'unit', testName: '注釈なし' }],
        existing,
      });

      // Act
      const actual = await sut.execute(runInput);

      // Assert: 既存(binding 無し)と生成(binding="file")が同一キーに正規化され重複しない
      const ac1 = actual.matrix.stories[0].storyMappings.find((m) => m.acId === 'AC-1');
      expect(ac1?.testReferences).toHaveLength(1);
      expect(actual.report.preservedReferences).toBe(0);
    });
  });
});
