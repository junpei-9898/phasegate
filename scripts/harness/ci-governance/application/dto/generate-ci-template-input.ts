/**
 * @layer application
 * @unit ci-governance
 */

import type { TemplateType } from '../../domain/types/template-type.js';

export interface GenerateCiTemplateInput {
  readonly presetId: string;
  readonly templateType: TemplateType;
}
