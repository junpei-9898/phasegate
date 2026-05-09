/**
 * @layer presentation
 * @unit ci-governance
 *
 * GenerateCiTemplateHandler - CLIハンドラー
 */

import type { GenerateCiTemplateUseCase } from '../../application/usecases/generate-ci-template-usecase.js';
import type { RenderCiTemplateUseCase } from '../../application/usecases/render-ci-template-usecase.js';
import { CiTemplateFormatter } from '../formatters/ci-template-formatter.js';
import type { TemplateType } from '../../domain/types/template-type.js';

export interface GenerateCiTemplateHandlerArgs {
  presetId: string;
  templateType: string;
  render?: boolean;
  format?: 'human' | 'json';
}

export interface GenerateCiTemplateHandlerResult {
  exitCode: number;
  output: string;
}

export class GenerateCiTemplateHandler {
  private readonly formatter = new CiTemplateFormatter();

  constructor(
    private readonly generateUseCase: GenerateCiTemplateUseCase,
    private readonly renderUseCase: RenderCiTemplateUseCase,
  ) {}

  async handle(args: GenerateCiTemplateHandlerArgs): Promise<GenerateCiTemplateHandlerResult> {
    const { presetId, templateType, render = false, format = 'human' } = args;

    if (render) {
      const result = await this.renderUseCase.execute({
        presetId,
        templateType: templateType as TemplateType,
      });
      const hasErrors = result.errors.length > 0;
      const output = format === 'json'
        ? JSON.stringify(result, null, 2)
        : hasErrors
          ? result.errors.map((err) => `[${err.code}] ${err.message}`).join('\n')
          : result.content;

      return {
        exitCode: hasErrors ? 1 : 0,
        output,
      };
    }

    const result = await this.generateUseCase.execute({
      presetId,
      templateType: templateType as TemplateType,
    });

    const hasErrors = result.validationErrors.length > 0;
    const output = format === 'json'
      ? this.formatter.formatJson(result)
      : this.formatter.formatHuman(result);

    return {
      exitCode: hasErrors ? 1 : 0,
      output,
    };
  }
}
