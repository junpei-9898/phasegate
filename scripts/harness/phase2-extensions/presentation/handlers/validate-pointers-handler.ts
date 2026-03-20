/**
 * @layer presentation
 * @unit phase2-extensions
 */
import type { ValidateDocPointersUseCase } from '../../application/usecases/validate-doc-pointers-usecase.js';
import { PointerResultFormatter } from '../formatters/pointer-result-formatter.js';

export class ValidatePointersHandler {
  private readonly formatter = new PointerResultFormatter();

  constructor(private readonly useCase: ValidateDocPointersUseCase) {}

  async handle(args: string[]): Promise<{ exitCode: number; stdout: string }> {
    let includeUrlPointers = false;
    let format: 'text' | 'json' = 'text';

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === '--include-urls') {
        includeUrlPointers = true;
      } else if (arg === '--format') {
        format = (args[index + 1] as 'text' | 'json') ?? 'text';
        index += 1;
      }
    }

    const result = await this.useCase.execute({ includeUrlPointers, format });
    return {
      exitCode: result.passed ? 0 : 1,
      stdout: format === 'json' ? this.formatter.formatJson(result) : this.formatter.formatText(result),
    };
  }
}
