// @layer application
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-131
// @work-item-id WI-292

import type { RequirementIntentCoverageService } from '../../domain/services/requirement-intent-coverage-service.js';
import type {
  AcLevelCoverageDto,
  GenerateMatrixOutput,
  MatrixAcMappingDto,
  MatrixStoryDto,
  MatrixTestReferenceDto,
  OrphanAcTagDto,
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

// HF2-05: dedup キーは binding を含める。1.0 マトリクス（binding undefined）は
// "file" に正規化するため、binding を持たない既存参照と file-fallback 生成参照が
// 同一キーに畳まれ、意図しない重複（＝L3-004 の testReferences 件数変化）を防ぐ。
function referenceKey(reference: MatrixTestReferenceDto): string {
  const binding = reference.binding ?? 'file';
  return `${reference.filePath}\0${reference.testType}\0${reference.testName ?? ''}\0${binding}`;
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
    // HF2-05: 各 AC の ac-bound 判定を集計するためのアキュムレータ。
    let acLevelTotal = 0;
    let acLevelBound = 0;
    let acLevelFileFallbackOnly = 0;
    const orphanAcTags: OrphanAcTagDto[] = [];
    const stories: MatrixStoryDto[] = requirements.map((requirement) => {
      const storyReferences = referencesByStory.get(requirement.storyId) ?? [];
      const storyMappings: MatrixAcMappingDto[] = requirement.acIds.map((acId) => {
        // HF2-05:
        // - acIds を持つ参照は、その acId を含むときだけ binding="ac" で紐づく（ファンアウトしない）。
        // - acIds を持たない参照は従来どおり全 AC へ binding="file" でファンアウトする（L3-004 不変）。
        const generatedReferences: MatrixTestReferenceDto[] = [];
        let hasAcBound = false;
        for (const reference of storyReferences) {
          const acIds = reference.acIds;
          if (acIds && acIds.length > 0) {
            if (acIds.includes(acId)) {
              generatedReferences.push({
                filePath: reference.filePath,
                testType: reference.testType,
                testName: reference.testName,
                binding: 'ac',
              });
              hasAcBound = true;
            }
            continue;
          }
          generatedReferences.push({
            filePath: reference.filePath,
            testType: reference.testType,
            testName: reference.testName,
            binding: 'file',
          });
        }
        const existingReferences = normalizeExistingReferences(existingMatrix, requirement.storyId, acId);
        const merged = mergeReferences(generatedReferences, existingReferences);
        preservedReferences += merged.preserved;
        // AC 単位カバレッジ集計（advisory）: linked（参照 1 件以上）な AC のみ分母に数える。
        if (merged.references.length > 0) {
          acLevelTotal += 1;
          if (hasAcBound) {
            acLevelBound += 1;
          } else {
            acLevelFileFallbackOnly += 1;
          }
        }
        return {
          acId,
          testReferences: merged.references,
        };
      });
      // 解決に失敗した @ac タグを advisory として集約する。
      for (const reference of storyReferences) {
        if (reference.orphanAcTags) orphanAcTags.push(...reference.orphanAcTags);
      }
      return {
        storyId: requirement.storyId,
        coverageStatus: requirement.coverageStatus ?? 'required',
        coverageLifecycle: Object.freeze([
          ...(requirement.coverageLifecycle ?? [requirement.coverageStatus ?? 'required']),
        ]),
        storyMappings: Object.freeze(storyMappings),
      };
    });
    const acLevelCoverage: AcLevelCoverageDto = {
      total: acLevelTotal,
      acBound: acLevelBound,
      fileFallbackOnly: acLevelFileFallbackOnly,
    };

    const matrix: RequirementTestMatrixDto = {
      // WI-292: Story coverage status/lifecycle を owner-derived field として追加する。
      // schema 1.0/1.1 の読み取りは required へ正規化して後方互換を維持する。
      version: '1.2',
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
      acLevelCoverage,
      orphanAcTags: Object.freeze(orphanAcTags),
    };

    if (input.write) {
      await this.matrixPort.writeMatrix(input.matrixFilePath, matrix);
    }

    return { matrix, report };
  }
}
