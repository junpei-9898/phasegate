/**
 * @layer presentation
 * @unit phase2-extensions
 */
import * as fs from 'node:fs/promises';
import type { GenerateE2ETemplateUseCase } from '../../application/usecases/generate-e2e-template-usecase.js';

export class GenerateE2ETemplateHandler {
  constructor(private readonly useCase: GenerateE2ETemplateUseCase) {}

  async handle(args: string[]): Promise<{ exitCode: number; stdout: string }> {
    let targetPhase: string | undefined;
    let outputPath: string | undefined;

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === '--phase') {
        targetPhase = args[index + 1];
        index += 1;
      } else if (arg === '--output') {
        outputPath = args[index + 1];
        index += 1;
      }
    }

    if (!targetPhase) {
      return {
        exitCode: 2,
        stdout: 'missing required --phase',
      };
    }

    const result = await this.useCase.execute({ targetPhase, outputPath });
    if (outputPath) {
      await fs.writeFile(outputPath, result.templateContent, 'utf8');
    }

    return {
      exitCode: result.errors.length > 0 ? 1 : 0,
      stdout: result.templateContent,
    };
  }
}
