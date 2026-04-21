/**
 * @layer presentation
 * @unit quick-mode
 * @story H10-05
 *
 * phasegate check-change-category CLI のハンドラ
 */

import type { ClassifyChangeCategoryUseCase } from '../../application/usecases/classify-change-category-usecase.js';
import { ChangeCategoryFormatter, type ChangeCategoryOutputFormat } from '../formatters/change-category-formatter.js';

export interface CheckChangeCategoryHandlerDeps {
  useCase: Pick<ClassifyChangeCategoryUseCase, 'execute'>;
  writer?: (s: string) => void;
}

export interface CheckChangeCategoryHandlerOptions {
  paths?: string;
  format?: ChangeCategoryOutputFormat;
  failOnFullRequired?: boolean;
}

export interface CheckChangeCategoryHandlerResult {
  exitCode: number;
}

export class CheckChangeCategoryHandler {
  private readonly useCase: Pick<ClassifyChangeCategoryUseCase, 'execute'>;
  private readonly writer: (s: string) => void;
  private readonly formatter = new ChangeCategoryFormatter();

  constructor(deps: CheckChangeCategoryHandlerDeps) {
    this.useCase = deps.useCase;
    this.writer = deps.writer ?? ((s: string) => process.stdout.write(s));
  }

  async handle(options: CheckChangeCategoryHandlerOptions): Promise<CheckChangeCategoryHandlerResult> {
    const { paths: pathsRaw, format = 'human', failOnFullRequired = false } = options;

    const paths = pathsRaw
      ? pathsRaw.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
      : [];

    const contract = await this.useCase.execute({ paths });
    this.writer(this.formatter.format(contract, format));

    const exitCode = failOnFullRequired && contract.fullModeRequired ? 1 : 0;
    return { exitCode };
  }
}
