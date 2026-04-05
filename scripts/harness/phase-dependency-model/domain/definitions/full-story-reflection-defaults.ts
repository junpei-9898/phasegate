/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { StoryReflectionConfig } from '../values/story-reflection-config.js';
import { StoryReflectionMapping } from '../values/story-reflection-mapping.js';

export const FULL_STORY_REFLECTION_DEFAULTS: StoryReflectionConfig = StoryReflectionConfig.create({
  enabled: true,
  mappings: [
    StoryReflectionMapping.create({
      inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
      product: 'docs/product/construction/{unit}/logical_design.md',
      required: true,
    }),
    StoryReflectionMapping.create({
      inception: 'docs/inception/{unit}/{storyId}/domain_model.md',
      product: 'docs/product/construction/{unit}/domain_model.md',
      required: true,
    }),
    StoryReflectionMapping.create({
      inception: 'docs/inception/{unit}/{storyId}/uiux_design.md',
      product: 'docs/product/construction/{unit}/uiux_design.md',
      required: false,
    }),
  ],
});
