/**
 * @layer presentation
 * @unit adr-foundation
 */

import type { ValidateAllAdrsUseCase, ValidateAllAdrsInput } from '../../application/usecases/validate-all-adrs-use-case.js';
import type { ValidateAdrFrontmatterUseCase } from '../../application/usecases/validate-adr-frontmatter-use-case.js';
import type { AdrValidationResultDto } from '../../application/dto/adr-validation-result-dto.js';

export interface ValidateAdrCommandInput {
  readonly adrRef?: string;
  readonly all?: boolean;
  readonly json?: boolean;
}

export interface ValidateAdrCommandOutput {
  readonly exitCode: 0 | 1 | 2;
  readonly results: readonly AdrValidationResultDto[];
  readonly text: string;
}

export interface ValidateAdrCommandHandlerDeps {
  readonly validateAllAdrsUseCase: Pick<ValidateAllAdrsUseCase, 'execute'>;
  readonly validateAdrFrontmatterUseCase: Pick<ValidateAdrFrontmatterUseCase, 'execute'>;
}

export class ValidateAdrCommandHandler {
  private readonly validateAllUseCase: Pick<ValidateAllAdrsUseCase, 'execute'>;
  private readonly validateOneUseCase: Pick<ValidateAdrFrontmatterUseCase, 'execute'>;

  constructor(deps: ValidateAdrCommandHandlerDeps) {
    this.validateAllUseCase = deps.validateAllAdrsUseCase;
    this.validateOneUseCase = deps.validateAdrFrontmatterUseCase;
  }

  async execute(
    input: ValidateAdrCommandInput,
  ): Promise<Readonly<ValidateAdrCommandOutput>> {
    if (!input.all && !input.adrRef) {
      return Object.freeze({
        exitCode: 2,
        results: Object.freeze([]),
        text: 'Error: specify --all or <adrRef>',
      });
    }

    try {
      if (input.all) {
        return await this.executeAll(input);
      }
      return await this.executeOne(input.adrRef!, input);
    } catch {
      return Object.freeze({
        exitCode: 2,
        results: Object.freeze([]),
        text: 'Error: ADR validation failed unexpectedly',
      });
    }
  }

  private async executeAll(
    input: ValidateAdrCommandInput,
  ): Promise<Readonly<ValidateAdrCommandOutput>> {
    const validateInput: ValidateAllAdrsInput = {};
    const output = await this.validateAllUseCase.execute(validateInput);
    const text = input.json
      ? JSON.stringify({ valid: output.valid, results: output.results }, null, 2)
      : this.formatResults(output.results, output.valid);

    return Object.freeze({
      exitCode: output.valid ? 0 : 1,
      results: output.results,
      text,
    });
  }

  private async executeOne(
    adrRef: string,
    input: ValidateAdrCommandInput,
  ): Promise<Readonly<ValidateAdrCommandOutput>> {
    const result = await this.validateOneUseCase.execute({ adrRef });
    const results = Object.freeze([result]);
    const text = input.json
      ? JSON.stringify({ valid: result.valid, results }, null, 2)
      : this.formatResults(results, result.valid);

    return Object.freeze({
      exitCode: result.valid ? 0 : 1,
      results,
      text,
    });
  }

  private formatResults(
    results: readonly AdrValidationResultDto[],
    valid: boolean,
  ): string {
    const lines: string[] = [];

    for (const r of results) {
      const status = r.valid ? 'PASS' : 'FAIL';
      lines.push(`[${status}] ${r.adrRef}`);
      for (const v of r.violations) {
        lines.push(`  ${v.code}: ${v.message}`);
      }
    }

    lines.push('---');
    lines.push(valid ? 'All ADRs valid' : 'Validation failures detected');

    return lines.join('\n');
  }
}
