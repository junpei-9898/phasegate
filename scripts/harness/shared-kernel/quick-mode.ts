/**
 * @layer application
 * @unit quick-mode
 *
 * quick-mode ユニットの Shared Kernel 公開面（Cross-Unit Contract 再エクスポート）
 */

// Public DTOs (Shared Kernel contracts)
export type { QuickModeDecisionContract } from '../quick-mode/application/dto/quick-mode-decision-contract.js';
export type { QuickModeEligibilityContract } from '../quick-mode/application/dto/quick-mode-eligibility-contract.js';
export type { ValidatorRelaxationProfileContract } from '../quick-mode/application/dto/validator-relaxation-profile-contract.js';

// Composition Root
export { createQuickModeCompositionRoot } from '../quick-mode/composition-root.js';
export type { QuickModeCompositionRoot } from '../quick-mode/composition-root.js';
