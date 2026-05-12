// @layer domain
// @unit nyquist-validation
// @work-item-id WI-131

import type {
  IntentCoverageItemDto,
  MatrixStoryDto,
} from '../../application/dto/generate-matrix-output.js';

export class RequirementIntentCoverageService {
  evaluate(stories: readonly MatrixStoryDto[]): readonly IntentCoverageItemDto[] {
    return stories.flatMap((story) => story.storyMappings.map((mapping) => {
      if (mapping.testReferences.length === 0) {
        return {
          storyId: story.storyId,
          acId: mapping.acId,
          status: 'unobserved' as const,
          warnings: ['No test reference observes this acceptance criterion.'],
        };
      }

      const hasNamedReference = mapping.testReferences.some((reference) => (
        typeof reference.testName === 'string' && reference.testName.trim().length > 0
      ));
      if (!hasNamedReference) {
        return {
          storyId: story.storyId,
          acId: mapping.acId,
          status: 'weakly-observed' as const,
          warnings: ['Test reference exists, but testName is missing; observation intent is weak.'],
        };
      }

      return {
        storyId: story.storyId,
        acId: mapping.acId,
        status: 'weakly-observed' as const,
        warnings: ['Test reference and testName exist, but assertion target / expected outcome evidence is not yet attached.'],
      };
    }));
  }
}
