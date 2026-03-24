/**
 * @layer composition
 * @unit nyquist-validation
 *
 * nyquist-validation ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、UseCase群を外部に公開する。
 */
import { FileSystemMatrixFileAdapter } from './infrastructure/adapters/file-system-matrix-file-adapter.js';
import { AjvJsonSchemaValidatorAdapter } from './infrastructure/adapters/ajv-json-schema-validator-adapter.js';
import { ConfigFoundationCoverageThresholdAdapter } from './infrastructure/adapters/config-foundation-coverage-threshold-adapter.js';
import { TraceabilityModelStoryRegistryAdapter } from './infrastructure/adapters/traceability-model-story-registry-adapter.js';
import { MatrixValidationService } from './domain/services/matrix-validation-service.js';
import { AcCoverageGatePolicy } from './domain/services/ac-coverage-gate-policy.js';
import { CoverageCalculationService } from './domain/services/coverage-calculation-service.js';
import { ImpactAnalysisService } from './domain/services/impact-analysis-service.js';
import { ValidateMatrixUseCase } from './application/usecases/validate-matrix-usecase.js';
import { CheckAcCoverageGateUseCase } from './application/usecases/check-ac-coverage-gate-usecase.js';
import { CalculateCoverageUseCase } from './application/usecases/calculate-coverage-usecase.js';
import { AnalyzeImpactUseCase } from './application/usecases/analyze-impact-usecase.js';
import { ValidateMatrixHandler } from './presentation/handlers/validate-matrix-handler.js';
import { CheckAcCoverageGateHandler } from './presentation/handlers/check-ac-coverage-gate-handler.js';
import { CalculateCoverageHandler } from './presentation/handlers/calculate-coverage-handler.js';
import { AnalyzeImpactHandler } from './presentation/handlers/analyze-impact-handler.js';

export interface NyquistValidationModuleDeps {
  /** traceability-model の storyCatalog.getAllStoryIds() を渡す */
  readonly getStoryIds: () => Promise<readonly string[]>;
  /** config-foundation の preset 文字列を取得するコールバック（省略時は standard） */
  readonly getPreset?: () => Promise<string>;
}

export function createNyquistValidationModule(deps: NyquistValidationModuleDeps) {
  // Infrastructure adapters
  const matrixFilePort = new FileSystemMatrixFileAdapter();
  const ajvValidator = new AjvJsonSchemaValidatorAdapter();
  const coverageThresholdPort = new ConfigFoundationCoverageThresholdAdapter({
    getPreset: deps.getPreset,
  });
  const storyRegistryPort = new TraceabilityModelStoryRegistryAdapter({
    getStoryIds: deps.getStoryIds,
  });

  // Domain services
  const matrixValidationService = new MatrixValidationService({ storyRegistryPort });
  const acCoverageGatePolicy = new AcCoverageGatePolicy();
  const coverageCalculationService = new CoverageCalculationService();
  const impactAnalysisService = new ImpactAnalysisService();

  // Application UseCases
  const validateMatrixUseCase = new ValidateMatrixUseCase({
    matrixFilePort,
    ajvValidator,
    matrixValidationService,
  });

  const checkAcCoverageGateUseCase = new CheckAcCoverageGateUseCase({
    matrixFilePort,
    ajvValidator,
    matrixValidationService,
    acCoverageGatePolicy,
  });

  const calculateCoverageUseCase = new CalculateCoverageUseCase({
    matrixFilePort,
    ajvValidator,
    matrixValidationService,
    coverageCalculationService,
    coverageThresholdPort,
  });

  const analyzeImpactUseCase = new AnalyzeImpactUseCase({
    matrixFilePort,
    ajvValidator,
    matrixValidationService,
    impactAnalysisService,
  });

  const validateMatrixHandler = new ValidateMatrixHandler({
    validateMatrixUseCase,
  });

  const checkAcCoverageGateHandler = new CheckAcCoverageGateHandler({
    checkAcCoverageGateUseCase,
  });

  const calculateCoverageHandler = new CalculateCoverageHandler({
    calculateCoverageUseCase,
  });

  const analyzeImpactHandler = new AnalyzeImpactHandler({
    analyzeImpactUseCase,
  });

  return {
    validateMatrixUseCase,
    checkAcCoverageGateUseCase,
    calculateCoverageUseCase,
    analyzeImpactUseCase,
    handlers: {
      validateMatrixHandler,
      checkAcCoverageGateHandler,
      calculateCoverageHandler,
      analyzeImpactHandler,
    },
  } as const;
}

// @story-id H08-07