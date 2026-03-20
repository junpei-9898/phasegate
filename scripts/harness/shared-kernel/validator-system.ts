/**
 * @layer shared-kernel
 * @unit validator-system
 *
 * Cross-Unit Contract 再エクスポート
 * ValidatorRegistry インターフェース + ValidationResult Contract
 */
export type { ValidationResultContract } from '../validator-system/application/dto/validation-result-contract.js';
export type { ValidatorRelaxationProfile } from '../validator-system/application/dto/validator-relaxation-profile.js';
export type { AggregatedValidationReport } from '../validator-system/application/dto/aggregated-validation-report.js';
export { ValidatorId, InvalidValidatorIdError } from '../validator-system/domain/value-objects/validator-id.js';
export { ValidatorRegistry, UnknownValidatorError } from '../validator-system/domain/services/validator-registry.js';
export { createValidatorSystemModule } from '../validator-system/composition-root.js';
export type { ValidatorSystemModule } from '../validator-system/composition-root.js';
