/**
 * @layer application
 * @unit traceability-model
 */

import type { TraceabilityChainOutput } from './traceability-chain-output.js';

export interface TraceabilityCoverageOutput {
  readonly totalFiles: number;
  readonly completeChains: number;
  readonly incompleteChains: number;
  readonly brokenLinks: number;
  readonly results: readonly TraceabilityChainOutput[];
}
