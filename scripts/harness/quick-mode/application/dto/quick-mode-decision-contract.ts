/**
 * @layer application
 * @unit quick-mode
 *
 * Shared Kernel公開用 readonly DTO（harness-api向け）
 */

import type { QuickModeEligibilityContract } from './quick-mode-eligibility-contract.js';
import type { ValidatorRelaxationProfileContract } from './validator-relaxation-profile-contract.js';

export interface QuickModeDecisionContract {
  readonly eligibility: QuickModeEligibilityContract;
  readonly relaxationProfile?: ValidatorRelaxationProfileContract;
}
