/**
 * @layer presentation
 * @unit quick-mode
 * @story H10-05
 *
 * phasegate check-change-category CLI のハンドラ
 */

import type { ClassifyChangeCategoryUseCase } from '../../application/usecases/classify-change-category-usecase.js';
import type { ChangeRiskAdvisoryPort } from '../../application/ports/change-risk-advisory-port.js';
import { ChangeCategoryFormatter, type ChangeCategoryOutputFormat } from '../formatters/change-category-formatter.js';

export interface CheckChangeCategoryHandlerDeps {
  useCase: Pick<ClassifyChangeCategoryUseCase, 'execute'>;
  writer?: (s: string) => void;
  riskAdvisoryPort?: ChangeRiskAdvisoryPort;
}

export interface CheckChangeCategoryHandlerOptions {
  paths?: string;
  format?: ChangeCategoryOutputFormat;
  failOnFullRequired?: boolean;
  riskSnapshots?: string;
}

export interface CheckChangeCategoryHandlerResult {
  exitCode: number;
}

export class CheckChangeCategoryHandler {
  private readonly useCase: Pick<ClassifyChangeCategoryUseCase, 'execute'>;
  private readonly writer: (s: string) => void;
  private readonly formatter = new ChangeCategoryFormatter();
  private readonly riskAdvisoryPort?: ChangeRiskAdvisoryPort;

  constructor(deps: CheckChangeCategoryHandlerDeps) {
    this.useCase = deps.useCase;
    this.riskAdvisoryPort = deps.riskAdvisoryPort;
    this.writer = deps.writer ?? ((s: string) => process.stdout.write(s));
  }

  async handle(options: CheckChangeCategoryHandlerOptions): Promise<CheckChangeCategoryHandlerResult> {
    const { paths: pathsRaw, format = 'human', failOnFullRequired = false } = options;

    const paths = pathsRaw
      ? pathsRaw.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
      : [];

    const classification = await this.useCase.execute({ paths });
    if (options.riskSnapshots !== undefined && this.riskAdvisoryPort === undefined) {
      throw new Error('Risk advisory is not available in this handler configuration.');
    }
    const contract = options.riskSnapshots !== undefined
      ? { ...classification, riskAdvice: await this.riskAdvisoryPort!.assess(paths, options.riskSnapshots) }
      : classification;
    this.writer(this.formatter.format(contract, format));

    const exitCode = failOnFullRequired && contract.fullModeRequired ? 1 : 0;
    return { exitCode };
  }
}
