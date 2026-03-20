/**
 * @layer application
 * @unit phase2-extensions
 */
import { E2EStrategyTemplate } from '../../domain/value-objects/e2e-strategy-template.js';
import { Phase2ExtensionsDomainError } from '../../domain/errors/phase2-extensions-domain-error.js';
import type { GenerateE2ETemplateInput } from '../dto/generate-e2e-template-input.js';
import type { GenerateE2ETemplateOutput } from '../dto/generate-e2e-template-output.js';

export class GenerateE2ETemplateUseCase {
  async execute(input: GenerateE2ETemplateInput): Promise<GenerateE2ETemplateOutput> {
    try {
      const template = E2EStrategyTemplate.create(input.targetPhase);
      return {
        templateContent: template.templateContent,
        targetPhase: template.targetPhase,
        generatedAt: template.generatedAt,
        outputPath: input.outputPath ?? null,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Phase2ExtensionsDomainError ? error.message : 'テンプレート生成に失敗しました';
      return {
        templateContent: '',
        targetPhase: input.targetPhase,
        generatedAt: new Date().toISOString(),
        outputPath: input.outputPath ?? null,
        errors: [
          {
            code: 'L4-297',
            severity: 'error',
            message,
            suggestion: 'targetPhase を確認してください',
          },
        ],
      };
    }
  }
}
