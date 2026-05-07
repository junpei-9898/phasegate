/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { PhaseCustomizationPolicy } from '../values/phase-customization-policy.js';
import type { PlanningMode } from '../values/planning-mode.js';
import type { StoryReflectionConfig } from '../values/story-reflection-config.js';
import type { PathRoots } from '../values/artifact.js';

export interface PhaseConfigProviderPort {
  getPlanningMode(scope: { unitId?: string; storyId?: string }): Promise<PlanningMode>;
  getCustomizationPolicy(): Promise<PhaseCustomizationPolicy>;
  getReportingOutputDir(): Promise<string>;
  getStoryReflectionConfig(): Promise<StoryReflectionConfig>;
  getPathRoots(): Promise<PathRoots>;
}
