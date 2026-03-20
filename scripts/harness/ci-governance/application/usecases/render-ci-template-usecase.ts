/**
 * @layer application
 * @unit ci-governance
 *
 * RenderCiTemplateUseCase - H13-01
 */

import type { TemplateGenerator } from '../../domain/services/template-generator.js';
import type { TemplateRendererPort } from '../../domain/ports/template-renderer-port.js';
import type { RenderCiTemplateInput } from '../dto/render-ci-template-input.js';
import type { RenderCiTemplateOutput } from '../dto/render-ci-template-output.js';
import { CiTemplate } from '../../domain/aggregates/ci-template.js';
import { isTemplateType } from '../../domain/types/template-type.js';

export class RenderCiTemplateUseCase {
  constructor(
    private readonly templateGenerator: TemplateGenerator,
    private readonly templateRendererPort: TemplateRendererPort,
  ) {}

  async execute(input: RenderCiTemplateInput): Promise<RenderCiTemplateOutput> {
    const { presetId, templateType } = input;

    if (!isTemplateType(templateType)) {
      return {
        outputPath: '',
        content: '',
        errors: [{ code: 'CI_TEMPLATE_INVALID_TYPE', message: `INV-1: Invalid templateType: ${templateType}` }],
      };
    }

    const configResult = await this.templateGenerator.generateConfig(presetId, templateType);

    if (!configResult.isOk()) {
      return {
        outputPath: '',
        content: '',
        errors: configResult.error,
      };
    }

    const config = configResult.value;
    const template = CiTemplate.create(templateType, presetId).withConfig(config);
    const validationErrors = template.validate();

    if (validationErrors.length > 0) {
      return {
        outputPath: '',
        content: '',
        errors: validationErrors,
      };
    }

    const rendered = await this.templateRendererPort.render(template);

    return {
      outputPath: rendered.outputPath,
      content: rendered.content,
      errors: [],
    };
  }
}
