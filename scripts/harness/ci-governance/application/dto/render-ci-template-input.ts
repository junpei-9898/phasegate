/**
 * @layer application
 * @unit ci-governance
 */

import type { TemplateType } from '../../domain/types/template-type.js';

export interface RenderCiTemplateInput {
  readonly presetId: string;
  readonly templateType: TemplateType;
}
