/**
 * @layer application
 * @unit validator-system
 *
 * AggregateResultsInput — H08-05 UseCase入力DTO
 */
import type { ValidationResultContract } from './validation-result-contract.js';

export interface AggregateResultsInput {
  readonly results: readonly ValidationResultContract[];
  readonly failOnWarning?: boolean;
}
