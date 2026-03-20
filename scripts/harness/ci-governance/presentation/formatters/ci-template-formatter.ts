/**
 * @layer presentation
 * @unit ci-governance
 */

import type { GenerateCiTemplateOutput } from '../../application/dto/generate-ci-template-output.js';

export class CiTemplateFormatter {
  formatHuman(output: GenerateCiTemplateOutput): string {
    const lines: string[] = [];

    if (output.validationErrors.length > 0) {
      lines.push('❌ CI Template Generation Failed');
      for (const err of output.validationErrors) {
        lines.push(`  [${err.code}] ${err.message}`);
      }
    } else {
      lines.push('✓ CI Template Generated');
      lines.push(`  Template Type: ${output.templateType}`);
      lines.push(`  Preset: ${output.presetRef}`);
      lines.push(`  Trigger: ${output.triggerCondition}`);
      lines.push(`  Validators: ${output.targetValidatorIds.join(', ')}`);
      lines.push(`  Fail on Warning: ${output.failOnWarning}`);
    }

    return lines.join('\n');
  }

  formatJson(output: GenerateCiTemplateOutput): string {
    return JSON.stringify(output, null, 2);
  }
}
