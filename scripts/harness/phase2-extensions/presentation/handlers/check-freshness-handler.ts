/**
 * @layer presentation
 * @unit phase2-extensions
 */
import type { CheckDocFreshnessUseCase } from '../../application/usecases/check-doc-freshness-usecase.js';
import { FreshnessResultFormatter } from '../formatters/freshness-result-formatter.js';

export class CheckFreshnessHandler {
  private readonly formatter = new FreshnessResultFormatter();

  constructor(private readonly useCase: CheckDocFreshnessUseCase) {}

  async handle(args: string[]): Promise<{ exitCode: number; stdout: string }> {
    let targetPattern: string | undefined;
    let format: 'text' | 'json' = 'text';
    let dryRun = false;

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === '--pattern') {
        targetPattern = args[index + 1];
        index += 1;
      } else if (arg === '--format') {
        format = (args[index + 1] as 'text' | 'json') ?? 'text';
        index += 1;
      } else if (arg === '--dry-run') {
        dryRun = true;
      }
    }

    const result = await this.useCase.execute({ targetPattern, format, dryRun });
    return {
      exitCode: result.summary.error > 0 ? 1 : 0,
      stdout: format === 'json' ? this.formatter.formatJson(result) : this.formatter.formatText(result),
    };
  }
}
