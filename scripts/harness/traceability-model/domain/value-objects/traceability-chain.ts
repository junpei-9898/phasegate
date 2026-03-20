/**
 * @layer domain
 * @unit traceability-model
 */

import { ChainLink, type ChainLinkType, type ProjectRelativePathLike } from './chain-link.js';

const LINK_ORDER: Readonly<Record<ChainLinkType, number>> = Object.freeze({
  'implementation-to-unit': 1,
  'unit-to-design': 2,
  'design-to-story': 3,
  'story-to-plan': 4,
});

export interface TraceabilityChainArgs {
  readonly origin: ProjectRelativePathLike;
  readonly links: readonly ChainLink[];
}

export class TraceabilityChain {
  readonly origin: ProjectRelativePathLike;
  readonly links: readonly ChainLink[];

  private constructor(origin: ProjectRelativePathLike, links: readonly ChainLink[]) {
    this.origin = origin;
    this.links = Object.freeze([...links]);
    Object.freeze(this);
  }

  static create(args: TraceabilityChainArgs): TraceabilityChain {
    if (args.links.length > 0 && !args.origin.equals(args.links[0].from)) {
      throw new Error('origin must match the first link source');
    }

    let previousOrder = 0;
    for (const link of args.links) {
      const currentOrder = LINK_ORDER[link.linkType];
      if (currentOrder < previousOrder) {
        throw new Error('link order is invalid');
      }
      previousOrder = currentOrder;
    }

    return new TraceabilityChain(args.origin, args.links);
  }

  isComplete(): boolean {
    return this.links.every((link) => link.resolved);
  }

  getBrokenLinks(): readonly ChainLink[] {
    return Object.freeze(this.links.filter((link) => link.isBroken()));
  }

  getResolvedLinks(): readonly ChainLink[] {
    return Object.freeze(this.links.filter((link) => !link.isBroken()));
  }

  equals(other: TraceabilityChain): boolean {
    if (!this.origin.equals(other.origin) || this.links.length !== other.links.length) {
      return false;
    }

    return this.links.every((link, index) => link.equals(other.links[index]));
  }
}
