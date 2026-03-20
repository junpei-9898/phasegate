/**
 * @layer application
 * @unit traceability-model
 */

import type { ChainLinkType } from '../../domain/value-objects/chain-link.js';

export interface TraceabilityLinkOutput {
  readonly from: string;
  readonly to: string;
  readonly linkType: ChainLinkType;
  readonly resolved: boolean;
}

export interface TraceabilityChainOutput {
  readonly origin: string;
  readonly complete: boolean;
  readonly links: readonly TraceabilityLinkOutput[];
  readonly brokenLinks: readonly TraceabilityLinkOutput[];
}
