/**
 * @layer application
 * @unit ci-governance
 *
 * GenerateCiTemplateUseCase - H13-01
 */

import type { TemplateGenerator } from '../../domain/services/template-generator.js';
import type { GenerateCiTemplateInput } from '../dto/generate-ci-template-input.js';
import type { GenerateCiTemplateOutput } from '../dto/generate-ci-template-output.js';
import { CiTemplate } from '../../domain/aggregates/ci-template.js';
import { isTemplateType, TEMPLATE_TYPES, type TemplateType } from '../../domain/types/template-type.js';

export class GenerateCiTemplateUseCase {
  constructor(private readonly templateGenerator: TemplateGenerator) {}

  async execute(input: GenerateCiTemplateInput): Promise<GenerateCiTemplateOutput> {
    const { presetId, templateType } = input;

    if (!isTemplateType(templateType)) {
      const validValues = TEMPLATE_TYPES.map((t) => `'${t}'`).join(', ');
      const hint = /github|gitlab|circle|jenkins|travis|actions/i.test(String(templateType))
        ? ` (Hint: --type specifies the template purpose, not the CI platform. Use one of: ${validValues})`
        : ` (valid: ${validValues})`;
      return {
        templateType: templateType as TemplateType,
        presetRef: presetId,
        triggerCondition: 'pull_request',
        targetValidatorIds: [],
        failOnWarning: false,
        validationErrors: [{
          code: 'CI_TEMPLATE_INVALID_TYPE',
          message: `INV-1: Invalid templateType: ${templateType}${hint}`,
        }],
      };
    }

    const configResult = await this.templateGenerator.generateConfig(presetId, templateType);

    if (!configResult.isOk()) {
      return {
        templateType,
        presetRef: presetId,
        triggerCondition: 'pull_request',
        targetValidatorIds: [],
        failOnWarning: false,
        validationErrors: configResult.error,
      };
    }

    const config = configResult.value;
    const template = CiTemplate.create(templateType, presetId).withConfig(config);
    const validationErrors = template.validate();

    return {
      templateType,
      presetRef: presetId,
      triggerCondition: config.triggerCondition,
      targetValidatorIds: [...config.targetValidatorIds],
      failOnWarning: config.failOnWarning,
      validationErrors,
    };
  }
}
