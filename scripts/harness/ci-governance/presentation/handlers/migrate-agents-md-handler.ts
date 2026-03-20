/**
 * @layer presentation
 * @unit ci-governance
 *
 * MigrateAgentsMdHandler - CLIハンドラー
 */

import type { MigrateAgentsMdUseCase } from '../../application/usecases/migrate-agents-md-usecase.js';
import type { ValidatePointersUseCase } from '../../application/usecases/validate-pointers-usecase.js';

export interface MigrateAgentsMdHandlerArgs {
  dryRun?: boolean;
  validateOnly?: boolean;
  format?: 'human' | 'json';
}

export interface MigrateAgentsMdHandlerResult {
  exitCode: number;
  output: string;
  errors?: Array<{ code: string; message: string }>;
}

export class MigrateAgentsMdHandler {
  constructor(
    private readonly useCase: MigrateAgentsMdUseCase,
    private readonly validateUseCase?: ValidatePointersUseCase,
  ) {}

  async handle(args: MigrateAgentsMdHandlerArgs): Promise<MigrateAgentsMdHandlerResult> {
    const { dryRun = false, validateOnly = false, format = 'human' } = args;

    if (validateOnly && this.validateUseCase) {
      const vResult = await this.validateUseCase.execute();
      if (format === 'json') {
        return { exitCode: vResult.passed ? 0 : 1, output: JSON.stringify(vResult, null, 2), errors: vResult.errors };
      }
      const lines = vResult.passed
        ? ['✓ All pointers are valid']
        : ['❌ Dead pointers detected', ...vResult.errors.map((e: any) => `  [${e.code}] ${e.message}`)];
      return { exitCode: vResult.passed ? 0 : 1, output: lines.join('\n'), errors: vResult.errors };
    }

    const result = await this.useCase.execute({ dryRun });

    if (format === 'json') {
      const jsonExitCode = (!result.success || result.kpiMet === false) ? 1 : 0;
      return { exitCode: jsonExitCode, output: JSON.stringify(result, null, 2), errors: result.errors };
    }

    const lines: string[] = [];
    if (result.success) {
      lines.push(`✓ Migration ${dryRun ? '(dry-run) ' : ''}complete`);
      lines.push(`  Added pointers: ${result.addedPointers}`);
      if (result.linesBefore !== null && result.linesAfter !== null) {
        lines.push(`  Lines: ${result.linesBefore} → ${result.linesAfter}`);
        lines.push(`  KPI met: ${result.kpiMet ? 'YES' : 'NO'}`);
      }
    } else {
      lines.push('❌ Migration failed');
      for (const err of result.errors) {
        lines.push(`  [${err.code}] ${err.message}`);
      }
    }

    const exitCode = (!result.success || result.kpiMet === false) ? 1 : 0;
    return { exitCode, output: lines.join('\n'), errors: result.errors };
  }
}
