/**
 * @layer application
 * @unit ci-governance
 */

import type { TemplateType } from '../../domain/types/template-type.js';
import type { TriggerCondition } from '../../domain/types/trigger-condition.js';

export interface GenerateCiTemplateOutput {
  readonly templateType: TemplateType;
  readonly presetRef: string;
  readonly triggerCondition: TriggerCondition;
  readonly targetValidatorIds: string[];
  readonly failOnWarning: boolean;
  readonly validationErrors: Array<{ code: string; message: string }>;
}
