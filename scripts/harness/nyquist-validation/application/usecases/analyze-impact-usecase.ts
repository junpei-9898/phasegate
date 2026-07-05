/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-04: テストケース逆引き
 */
import type { MatrixFilePort } from '../../domain/ports/matrix-file-port.js';
import type { AjvValidatorPort } from './validate-matrix-usecase.js';
import type { MatrixValidationService } from '../../domain/services/matrix-validation-service.js';
import type { ImpactAnalysisService } from '../../domain/services/impact-analysis-service.js';
import { RequirementTestMatrix } from '../../domain/aggregates/requirement-test-matrix.js';
import { StoryMapping } from '../../domain/entities/story-mapping.js';
import { AcMapping } from '../../domain/value-objects/ac-mapping.js';
import { TestReference } from '../../domain/value-objects/test-reference.js';
import { toAnalyzeImpactOutput } from '../mappers/impact-analysis-result-mapper.js';
import type { AnalyzeImpactInput } from '../dto/analyze-impact-input.js';
import type { AnalyzeImpactOutput } from '../dto/analyze-impact-output.js';

export interface AnalyzeImpactUseCaseDeps {
  readonly matrixFilePort: MatrixFilePort;
  readonly ajvValidator: AjvValidatorPort;
  readonly matrixValidationService: MatrixValidationService;
  readonly impactAnalysisService: ImpactAnalysisService;
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

export class AnalyzeImpactUseCase {
  private readonly matrixFilePort: MatrixFilePort;
  private readonly ajvValidator: AjvValidatorPort;
  private readonly matrixValidationService: MatrixValidationService;
  private readonly impactAnalysisService: ImpactAnalysisService;

  constructor(deps: AnalyzeImpactUseCaseDeps) {
    this.matrixFilePort = deps.matrixFilePort;
    this.ajvValidator = deps.ajvValidator;
    this.matrixValidationService = deps.matrixValidationService;
    this.impactAnalysisService = deps.impactAnalysisService;
  }

  async execute(input: AnalyzeImpactInput): Promise<AnalyzeImpactOutput> {
    const rawData = await this.matrixFilePort.read(input.matrixFilePath);

    await this.ajvValidator.validate(rawData);
    await this.matrixValidationService.validate(rawData);

    const matrix = buildMatrix(rawData);
    const result = this.impactAnalysisService.analyze(matrix, input.storyId);

    return toAnalyzeImpactOutput(result);
  }
}
