/**
 * @layer application
 * @unit traceability-model
 */

import type { TraceabilityChainOutput, TraceabilityLinkOutput } from '../dto/traceability-chain-output.js';
import type { TraceabilityChainBuilder } from '../../domain/services/traceability-chain-builder.js';
import type { ChainLink } from '../../domain/value-objects/chain-link.js';
import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

type TraceabilityBuilder = Pick<TraceabilityChainBuilder, 'build'>;

const toLinkOutput = (link: ChainLink): Readonly<TraceabilityLinkOutput> =>
  Object.freeze({
    from: link.from.toString(),
    to: link.to.toString(),
    linkType: link.linkType,
    resolved: link.resolved,
  });

export class TraceabilityChainBuildError extends Error {
  readonly origin: string;
  readonly cause: unknown;

  constructor(origin: string, cause: unknown) {
    super(`traceability chain build failed: ${origin}`);
    this.name = 'TraceabilityChainBuildError';
    this.origin = origin;
    this.cause = cause;
  }
}

export interface BuildTraceabilityChainUseCaseDeps {
  readonly builder: TraceabilityBuilder;
}

export class BuildTraceabilityChainUseCase {
  private readonly builder: TraceabilityBuilder;

  constructor(deps: BuildTraceabilityChainUseCaseDeps) {
    this.builder = deps.builder;
  }

  async execute(
    origin: ProjectRelativePath | string,
  ): Promise<Readonly<TraceabilityChainOutput>> {
    const originValue = typeof origin === 'string' ? origin : origin.toString();

    try {
      const chain = await this.builder.build(origin);
      const links = Object.freeze(chain.links.map(toLinkOutput));
      const brokenLinks = Object.freeze(chain.getBrokenLinks().map(toLinkOutput));

      return Object.freeze({
        origin: chain.origin.toString(),
        complete: chain.isComplete(),
        links,
        brokenLinks,
      });
    } catch (error) {
      throw new TraceabilityChainBuildError(originValue, error);
    }
  }
}
