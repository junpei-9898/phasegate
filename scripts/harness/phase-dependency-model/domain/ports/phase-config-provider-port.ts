/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { PhaseCustomizationPolicy } from '../values/phase-customization-policy.js';
import type { PlanningMode } from '../values/planning-mode.js';

export interface PhaseConfigProviderPort {
  getPlanningMode(scope: { unitId?: string; storyId?: string }): Promise<PlanningMode>;
  getCustomizationPolicy(): Promise<PhaseCustomizationPolicy>;
  getReportingOutputDir(): Promise<string>;
}
