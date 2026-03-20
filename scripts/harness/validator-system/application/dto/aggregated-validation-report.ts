/**
 * @layer application
 * @unit validator-system
 *
 * AggregatedValidationReport — 統合集約レポートDTO
 */
import type { ValidationResultContract } from './validation-result-contract.js';

export interface AggregatedValidationReport {
  readonly overallPassed: boolean;
  readonly totalValidators: number;
  readonly passedValidators: number;
  readonly failedValidators: number;
  readonly skippedValidators: number;
  readonly allErrors: readonly {
    readonly code: string;
    readonly severity: string;
    readonly message: string;
    readonly suggestion: string;
    [key: string]: unknown;
  }[];
  readonly summary: {
    readonly totalErrors: number;
    readonly totalWarnings: number;
    readonly errorsByLayer: Record<'L2' | 'L3' | 'L4', number>;
  };
  readonly results: readonly ValidationResultContract[];
}
