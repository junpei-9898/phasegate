/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-02: AcCoverageGatePolicy チェック
 */
import type { MatrixFilePort } from '../../domain/ports/matrix-file-port.js';
import type { AjvValidatorPort } from './validate-matrix-usecase.js';
import type { MatrixValidationService } from '../../domain/services/matrix-validation-service.js';
import type { AcCoverageGatePolicy } from '../../domain/services/ac-coverage-gate-policy.js';
import { RequirementTestMatrix } from '../../domain/aggregates/requirement-test-matrix.js';
import { StoryMapping } from '../../domain/entities/story-mapping.js';
import { AcMapping } from '../../domain/value-objects/ac-mapping.js';
import { TestReference } from '../../domain/value-objects/test-reference.js';
import type { CheckAcCoverageGateInput } from '../dto/check-ac-coverage-gate-input.js';
import type { CheckAcCoverageGateOutput } from '../dto/check-ac-coverage-gate-output.js';

export interface CheckAcCoverageGateUseCaseDeps {
  readonly matrixFilePort: MatrixFilePort;
  readonly ajvValidator: AjvValidatorPort;
  readonly matrixValidationService: MatrixValidationService;
  readonly acCoverageGatePolicy: AcCoverageGatePolicy;
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

export class CheckAcCoverageGateUseCase {
  private readonly matrixFilePort: MatrixFilePort;
  private readonly ajvValidator: AjvValidatorPort;
  private readonly matrixValidationService: MatrixValidationService;
  private readonly acCoverageGatePolicy: AcCoverageGatePolicy;

  constructor(deps: CheckAcCoverageGateUseCaseDeps) {
    this.matrixFilePort = deps.matrixFilePort;
    this.ajvValidator = deps.ajvValidator;
    this.matrixValidationService = deps.matrixValidationService;
    this.acCoverageGatePolicy = deps.acCoverageGatePolicy;
  }

  async execute(input: CheckAcCoverageGateInput): Promise<CheckAcCoverageGateOutput> {
    const rawData = await this.matrixFilePort.read(input.matrixFilePath);

    const schemaResult = await this.ajvValidator.validate(rawData);
    if (!schemaResult.valid) {
      return {
        passed: false,
        errors: [...schemaResult.errors],
        matrix: null,
      };
    }

    const integrityResult = await this.matrixValidationService.validate(rawData);
    if (!integrityResult.passed) {
      return {
        passed: false,
        errors: [...integrityResult.errors],
        matrix: null,
      };
    }

    const matrix = buildMatrix(rawData);
    const gateResult = this.acCoverageGatePolicy.check(matrix);

    return {
      passed: gateResult.passed,
      errors: [...gateResult.errors],
      matrix,
    };
  }
}
