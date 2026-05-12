// @layer application
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-131

import type { RequirementIntentCoverageService } from '../../domain/services/requirement-intent-coverage-service.js';
import type {
  GenerateMatrixOutput,
  MatrixAcMappingDto,
  MatrixStoryDto,
  MatrixTestReferenceDto,
  RequirementSourceDto,
  RequirementTestMatrixDto,
  TestReferenceSourceDto,
} from '../dto/generate-matrix-output.js';

export interface RequirementSourcePort {
  readRequirements(sourcePath: string): Promise<readonly RequirementSourceDto[]>;
}

export interface TestReferenceSourcePort {
  readTestReferences(testRoot: string): Promise<readonly TestReferenceSourceDto[]>;
}

export interface ExistingMatrixPort {
  readExistingMatrix(matrixFilePath: string): Promise<RequirementTestMatrixDto | null>;
  writeMatrix(matrixFilePath: string, matrix: RequirementTestMatrixDto): Promise<void>;
}

export interface GenerateRequirementTestMatrixInput {
  readonly requirementsPath: string;
  readonly testRoot: string;
  readonly matrixFilePath: string;
  readonly write: boolean;
}

export interface GenerateRequirementTestMatrixUseCaseDeps {
  readonly requirementSourcePort: RequirementSourcePort;
  readonly testReferenceSourcePort: TestReferenceSourcePort;
  readonly matrixPort: ExistingMatrixPort;
  readonly intentCoverageService: RequirementIntentCoverageService;
  readonly now?: () => Date;
}

function referenceKey(reference: MatrixTestReferenceDto): string {
  return `${reference.filePath}\0${reference.testType}\0${reference.testName ?? ''}`;
}

function mergeReferences(
  generated: readonly MatrixTestReferenceDto[],
  existing: readonly MatrixTestReferenceDto[],
): { references: readonly MatrixTestReferenceDto[]; preserved: number } {
  const result = [...generated];
  const keys = new Set(result.map(referenceKey));
  let preserved = 0;
  for (const reference of existing) {
    if (!keys.has(referenceKey(reference))) {
      result.push(reference);
      keys.add(referenceKey(reference));
      preserved += 1;
    }
  }
  return { references: Object.freeze(result), preserved };
}

function normalizeExistingReferences(
  existingMatrix: RequirementTestMatrixDto | null,
  storyId: string,
  acId: string,
): readonly MatrixTestReferenceDto[] {
  const story = existingMatrix?.stories.find((item) => item.storyId === storyId);
  const mapping = story?.storyMappings.find((item) => item.acId === acId);
  return mapping?.testReferences ?? [];
}

export class GenerateRequirementTestMatrixUseCase {
  private readonly requirementSourcePort: RequirementSourcePort;
  private readonly testReferenceSourcePort: TestReferenceSourcePort;
  private readonly matrixPort: ExistingMatrixPort;
  private readonly intentCoverageService: RequirementIntentCoverageService;
  private readonly now: () => Date;

  constructor(deps: GenerateRequirementTestMatrixUseCaseDeps) {
    this.requirementSourcePort = deps.requirementSourcePort;
    this.testReferenceSourcePort = deps.testReferenceSourcePort;
    this.matrixPort = deps.matrixPort;
    this.intentCoverageService = deps.intentCoverageService;
    this.now = deps.now ?? (() => new Date());
  }

  async execute(input: GenerateRequirementTestMatrixInput): Promise<GenerateMatrixOutput> {
    const [requirements, testReferences, existingMatrix] = await Promise.all([
      this.requirementSourcePort.readRequirements(input.requirementsPath),
      this.testReferenceSourcePort.readTestReferences(input.testRoot),
      this.matrixPort.readExistingMatrix(input.matrixFilePath),
    ]);

    const knownStories = new Set(requirements.map((requirement) => requirement.storyId));
    const orphanTests = testReferences
      .filter((reference) => !knownStories.has(reference.storyId))
      .map((reference) => ({
        storyId: reference.storyId,
        filePath: reference.filePath,
        testName: reference.testName,
      }));
    const referencesByStory = new Map<string, TestReferenceSourceDto[]>();
    for (const reference of testReferences) {
      if (!knownStories.has(reference.storyId)) continue;
      const current = referencesByStory.get(reference.storyId) ?? [];
      current.push(reference);
      referencesByStory.set(reference.storyId, current);
    }

    let preservedReferences = 0;
    const stories: MatrixStoryDto[] = requirements.map((requirement) => {
      const storyReferences = referencesByStory.get(requirement.storyId) ?? [];
      const storyMappings: MatrixAcMappingDto[] = requirement.acIds.map((acId) => {
        const generatedReferences = storyReferences.map((reference) => ({
          filePath: reference.filePath,
          testType: reference.testType,
          testName: reference.testName,
        }));
        const existingReferences = normalizeExistingReferences(existingMatrix, requirement.storyId, acId);
        const merged = mergeReferences(generatedReferences, existingReferences);
        preservedReferences += merged.preserved;
        return {
          acId,
          testReferences: merged.references,
        };
      });
      return {
        storyId: requirement.storyId,
        storyMappings: Object.freeze(storyMappings),
      };
    });

    const matrix: RequirementTestMatrixDto = {
      version: '1.0',
      generatedAt: this.now().toISOString(),
      stories: Object.freeze(stories),
    };
    const intentCoverage = this.intentCoverageService.evaluate(matrix.stories);
    const missingTests = matrix.stories.flatMap((story) => story.storyMappings
      .filter((mapping) => mapping.testReferences.length === 0)
      .map((mapping) => ({ storyId: story.storyId, acId: mapping.acId })));

    const report = {
      missingTests,
      orphanTests,
      unknownStories: [...new Set(orphanTests.map((test) => test.storyId))],
      preservedReferences,
      intentCoverage,
    };

    if (input.write) {
      await this.matrixPort.writeMatrix(input.matrixFilePath, matrix);
    }

    return { matrix, report };
  }
}
