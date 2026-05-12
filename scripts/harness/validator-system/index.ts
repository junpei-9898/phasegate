/**
 * @layer barrel
 * @unit validator-system
 *
 * validator-system ユニットの公開バレルエクスポート
 */

// --- Composition Root ---
export { createValidatorSystemModule } from './composition-root.js';
export type { ValidatorSystemModule } from './composition-root.js';

// --- Domain Value Objects ---
export { ValidatorId, InvalidValidatorIdError } from './domain/value-objects/validator-id.js';
export { ValidatorDefinition } from './domain/value-objects/validator-definition.js';
export { ValidationRule } from './domain/value-objects/validation-rule.js';
export { ValidationResult } from './domain/value-objects/validation-result.js';
export { LayerConfig } from './domain/value-objects/layer-config.js';
export { DriftReport } from './domain/value-objects/drift-report.js';
export { ConsistencyReport } from './domain/value-objects/consistency-report.js';
export { DeadCodeReport } from './domain/value-objects/dead-code-report.js';
export { SemanticDriftReport } from './domain/value-objects/semantic-drift-report.js';

// --- Domain Services ---
export { ValidatorRegistry, UnknownValidatorError } from './domain/services/validator-registry.js';
export { ValidatorExecutionService, ValidatorExecutionError } from './domain/services/validator-execution-service.js';
export { DriftDetectionService } from './domain/services/l4/drift-detection-service.js';
export { ConsistencyCheckService } from './domain/services/l4/consistency-check-service.js';
export { DeadCodeDetectionService } from './domain/services/l4/dead-code-detection-service.js';
export { SemanticDriftService } from './domain/services/l4/semantic-drift-service.js';

// --- Application DTOs ---
export type { ValidationResultContract } from './application/dto/validation-result-contract.js';
export type { ValidatorRelaxationProfile } from './application/dto/validator-relaxation-profile.js';
export type { AggregatedValidationReport } from './application/dto/aggregated-validation-report.js';

// --- Application Use Cases ---
export { RunL2ValidatorsUseCase } from './application/use-cases/run-l2-validators-usecase.js';
export { RunL3ValidatorsUseCase, CoverageReportNotFoundError } from './application/use-cases/run-l3-validators-usecase.js';
export { RunL4ValidatorsUseCase, DesignDocumentReadError } from './application/use-cases/run-l4-validators-usecase.js';
export { RunQuickModeUseCase, InvalidRelaxationProfileError } from './application/use-cases/run-quick-mode-usecase.js';
export { AggregateValidationResultsUseCase } from './application/use-cases/aggregate-validation-results-usecase.js';
export { RunFullValidationUseCase } from './application/use-cases/run-full-validation-usecase.js';

// --- Mappers ---
export { ValidationResultContractMapper } from './application/mappers/validation-result-contract-mapper.js';

// --- Presentation ---
export { RunValidatorsHandler } from './presentation/handlers/run-validators-handler.js';
export { RunQuickModeHandler } from './presentation/handlers/run-quick-mode-handler.js';
export { ReportValidationResultsHandler, isValidationResultContract } from './presentation/handlers/report-validation-results-handler.js';
export { HumanValidationResultFormatter } from './presentation/formatters/human-validation-result-formatter.js';
export { AgentValidationResultFormatter } from './presentation/formatters/agent-validation-result-formatter.js';
export { CiValidationResultFormatter } from './presentation/formatters/ci-validation-result-formatter.js';
