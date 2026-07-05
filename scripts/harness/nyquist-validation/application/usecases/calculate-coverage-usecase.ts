/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-03: AC網羅率算出
 */
import type { MatrixFilePort } from '../../domain/ports/matrix-file-port.js';
import type { CoverageThresholdPort } from '../../domain/ports/coverage-threshold-port.js';
import type { AjvValidatorPort } from './validate-matrix-usecase.js';
import type { MatrixValidationService } from '../../domain/services/matrix-validation-service.js';
import type { CoverageCalculationService } from '../../domain/services/coverage-calculation-service.js';
import { RequirementTestMatrix } from '../../domain/aggregates/requirement-test-matrix.js';
import { StoryMapping } from '../../domain/entities/story-mapping.js';
import { AcMapping } from '../../domain/value-objects/ac-mapping.js';
import { TestReference } from '../../domain/value-objects/test-reference.js';
import { toCalculateCoverageOutput } from '../mappers/coverage-result-mapper.js';
import type { CalculateCoverageInput } from '../dto/calculate-coverage-input.js';
import type { CalculateCoverageOutput } from '../dto/calculate-coverage-output.js';

export interface CalculateCoverageUseCaseDeps {
  readonly matrixFilePort: MatrixFilePort;
  readonly ajvValidator: AjvValidatorPort;
  readonly matrixValidationService: MatrixValidationService;
  readonly coverageCalculationService: CoverageCalculationService;
  readonly coverageThresholdPort: CoverageThresholdPort;
}

function buildMatrix(data: unknown): RequirementTestMatrix {
  const obj = data as Record<string, unknown>;
  const rawStories = Array.isArray(obj.stories) ? obj.stories : (Array.isArray(obj.storyMappings) ? obj.storyMappings : []);

  const storyMappings = (rawStories as unknown[]).map((s) => {
    const story = s as Record<string, unknown>;
    const rawAcMappings = Array.isArray(story.storyMappings)
      ? story.storyMappings
      : (Array.isArray(story.acMappings) ? story.acMappings : []);

    const acMappings = (rawAcMappings as unknown[]).map((a) => {
      const acm = a as Record<string, unknown>;
      const rawRefs = Array.isArray(acm.testReferences) ? acm.testReferences : [];
      const testReferences = (rawRefs as unknown[]).map((r) => {
        const ref = r as Record<string, unknown>;
        return TestReference.create({
          filePath: String(ref.filePath ?? ''),
          testType: String(ref.testType ?? ''),
        });
      });
      return AcMapping.create({ acId: String(acm.acId ?? ''), testReferences });
    });

    return StoryMapping.create({
      storyId: String(story.storyId ?? ''),
      acMappings,
    });
  });

  return RequirementTestMatrix.create({ storyMappings });
}

export class CalculateCoverageUseCase {
  private readonly matrixFilePort: MatrixFilePort;
  private readonly ajvValidator: AjvValidatorPort;
  private readonly matrixValidationService: MatrixValidationService;
  private readonly coverageCalculationService: CoverageCalculationService;
  private readonly coverageThresholdPort: CoverageThresholdPort;

  constructor(deps: CalculateCoverageUseCaseDeps) {
    this.matrixFilePort = deps.matrixFilePort;
    this.ajvValidator = deps.ajvValidator;
    this.matrixValidationService = deps.matrixValidationService;
    this.coverageCalculationService = deps.coverageCalculationService;
    this.coverageThresholdPort = deps.coverageThresholdPort;
  }

  async execute(input: CalculateCoverageInput): Promise<CalculateCoverageOutput> {
    const rawData = await this.matrixFilePort.read(input.matrixFilePath);

    await this.ajvValidator.validate(rawData);
    await this.matrixValidationService.validate(rawData);

    const matrix = buildMatrix(rawData);
    const coverageResult = this.coverageCalculationService.calculate(matrix);

    let threshold: { standard: number; strict: number; active: number } | null = null;
    if (input.checkThreshold === true) {
      threshold = await this.coverageThresholdPort.getThreshold();
    }

    return toCalculateCoverageOutput(coverageResult, threshold);
  }
}
