/**
 * @layer application
 * @unit traceability-model
 */

import type { TraceabilityCoverageOutput } from '../dto/traceability-coverage-output.js';
import type { BuildTraceabilityChainUseCase } from './build-traceability-chain-usecase.js';
import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

type TraceabilityChainExecutor = Pick<BuildTraceabilityChainUseCase, 'execute'>;

export class TraceabilityCoverageApplicationError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('traceability coverage verification failed');
    this.name = 'TraceabilityCoverageApplicationError';
    this.cause = cause;
  }
}

export interface VerifyTraceabilityCoverageUseCaseDeps {
  readonly buildTraceabilityChainUseCase: TraceabilityChainExecutor;
}

export class VerifyTraceabilityCoverageUseCase {
  private readonly buildTraceabilityChainUseCase: TraceabilityChainExecutor;

  constructor(deps: VerifyTraceabilityCoverageUseCaseDeps) {
    this.buildTraceabilityChainUseCase = deps.buildTraceabilityChainUseCase;
  }

  async execute(
    filePaths: readonly ProjectRelativePath[],
  ): Promise<Readonly<TraceabilityCoverageOutput>> {
    try {
      const results = [];
      for (const filePath of filePaths) {
        results.push(await this.buildTraceabilityChainUseCase.execute(filePath));
      }

      const completeChains = results.filter((result) => result.complete).length;
      const incompleteChains = results.length - completeChains;
      const brokenLinks = results.reduce(
        (total, result) => total + result.brokenLinks.length,
        0,
      );

      return Object.freeze({
        totalFiles: filePaths.length,
        completeChains,
        incompleteChains,
        brokenLinks,
        results: Object.freeze(results),
      });
    } catch (error) {
      throw new TraceabilityCoverageApplicationError(error);
    }
  }
}
