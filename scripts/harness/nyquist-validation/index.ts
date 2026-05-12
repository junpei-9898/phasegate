/**
 * @layer public-api
 * @unit nyquist-validation
 *
 * nyquist-validation ユニットのバレルエクスポート。
 */

// Composition Root
export { createNyquistValidationModule } from './composition-root.js';
export type { NyquistValidationModuleDeps } from './composition-root.js';
export { ValidateMatrixHandler } from './presentation/handlers/validate-matrix-handler.js';
export type { ValidateMatrixHandlerArgs, ValidateMatrixHandlerDeps } from './presentation/handlers/validate-matrix-handler.js';
export { CheckAcCoverageGateHandler } from './presentation/handlers/check-ac-coverage-gate-handler.js';
export type {
  CheckAcCoverageGateHandlerArgs,
  CheckAcCoverageGateHandlerDeps,
} from './presentation/handlers/check-ac-coverage-gate-handler.js';
export { CalculateCoverageHandler } from './presentation/handlers/calculate-coverage-handler.js';
export type {
  CalculateCoverageHandlerArgs,
  CalculateCoverageHandlerDeps,
} from './presentation/handlers/calculate-coverage-handler.js';
export { AnalyzeImpactHandler } from './presentation/handlers/analyze-impact-handler.js';
export type { AnalyzeImpactHandlerArgs, AnalyzeImpactHandlerDeps } from './presentation/handlers/analyze-impact-handler.js';
export { GenerateMatrixHandler } from './presentation/handlers/generate-matrix-handler.js';
export { GenerateRequirementTestMatrixUseCase } from './application/usecases/generate-requirement-test-matrix-usecase.js';
export { RequirementIntentCoverageService } from './domain/services/requirement-intent-coverage-service.js';
export type {
  GenerateMatrixOutput,
  RequirementTestMatrixDto,
  MatrixGenerationReportDto,
} from './application/dto/generate-matrix-output.js';

// @story-id H08-07
