// @layer test
// @unit skill-quality
// @story H12-02
// @work-item-id WI-188
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { CheckCoverageUseCase } from '../../../skill-quality/application/usecases/check-coverage-usecase.js';
import { SkillQualityError } from '../../../skill-quality/domain/errors/skill-quality-error.js';
import { CodeCoverageResult } from '../../../skill-quality/domain/value-objects/code-coverage-result.js';

class FailingCoverageRunner {
  async run(_storyId: string): Promise<CodeCoverageResult> {
    throw new Error('Coverage runner should not launch before prerequisites pass');
  }
}

const configPort = {
  getCoverageThreshold: async () => ({ requirement: 100, code: 80 }),
  isAgentLessonCollectionEnabled: async () => true,
  getCascadeUpdateTargetPatterns: async () => [],
};

target('WI-188 CheckCoverageUseCase guard', () => {
  describe('story validation', () => {
    context('指定 story が matrix に存在しない場合', () => {
      it('story not found error を返し coverage runner を起動しないこと', async () => {
        // Arrange
        const coverageRunner = new FailingCoverageRunner();
        const useCase = new CheckCoverageUseCase(
          {
            read: async () => {
              throw new SkillQualityError('STORY_NOT_FOUND', 'Story NONEXISTENT-99 not found');
            },
          },
          coverageRunner,
          configPort,
        );

        // Act
        const actual = await useCase.execute({ storyId: 'NONEXISTENT-99' }).catch((error: unknown) => error);

        // Assert
        expect(actual).toMatchObject({
          name: 'SkillQualityError',
          code: 'STORY_NOT_FOUND',
          message: 'Story NONEXISTENT-99 not found',
        });
      });
    });
  });

  describe('no-tests handling', () => {
    context('指定 story の matrix entry が total=0 の場合', () => {
      it('no-tests skipped result を返し coverage runner を起動しないこと', async () => {
        // Arrange
        const coverageRunner = new FailingCoverageRunner();
        const useCase = new CheckCoverageUseCase(
          {
            read: async () => ({ storyId: 'H12-02', total: 0, covered: 0, uncoveredIds: [] }),
          },
          coverageRunner,
          configPort,
        );

        // Act
        const actual = await useCase.execute({ storyId: 'H12-02' });

        // Assert
        expect(actual).toEqual({
          skipped: true,
          skipReason: 'no-tests',
          meetsThreshold: true,
          requirementThreshold: 100,
          codeThreshold: 80,
          coverageReport: {
            requirementCoverage: { total: 0, covered: 0, uncoveredIds: [] },
            codeCoverage: { lineCoverage: 100, branchCoverage: 100, functionCoverage: 100 },
          },
        });
      });
    });
  });
});
