/**
 * @layer application
 * @unit quick-mode
 *
 * BuildRelaxationProfileUseCase の入力 DTO
 */

import type { QuickModeEligibilityContract } from './quick-mode-eligibility-contract.js';

export interface BuildRelaxationProfileInput {
  readonly eligibilityContract: QuickModeEligibilityContract;
}
