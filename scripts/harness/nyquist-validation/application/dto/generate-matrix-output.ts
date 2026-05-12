// @layer application
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-131

export interface RequirementSourceDto {
  readonly storyId: string;
  readonly acIds: readonly string[];
}

export interface TestReferenceSourceDto {
  readonly storyId: string;
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
  readonly testName?: string;
}

export interface MatrixTestReferenceDto {
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
  readonly testName?: string;
}

export interface MatrixAcMappingDto {
  readonly acId: string;
  readonly testReferences: readonly MatrixTestReferenceDto[];
}

export interface MatrixStoryDto {
  readonly storyId: string;
  readonly storyMappings: readonly MatrixAcMappingDto[];
}

export interface RequirementTestMatrixDto {
  readonly version: string;
  readonly generatedAt: string;
  readonly stories: readonly MatrixStoryDto[];
}

export interface MissingTestDto {
  readonly storyId: string;
  readonly acId: string;
}

export interface OrphanTestDto {
  readonly storyId: string;
  readonly filePath: string;
  readonly testName?: string;
}

export type IntentCoverageStatus = 'observed' | 'weakly-observed' | 'unobserved';

export interface IntentCoverageItemDto {
  readonly storyId: string;
  readonly acId: string;
  readonly status: IntentCoverageStatus;
  readonly warnings: readonly string[];
}

export interface MatrixGenerationReportDto {
  readonly missingTests: readonly MissingTestDto[];
  readonly orphanTests: readonly OrphanTestDto[];
  readonly unknownStories: readonly string[];
  readonly preservedReferences: number;
  readonly intentCoverage: readonly IntentCoverageItemDto[];
}

export interface GenerateMatrixOutput {
  readonly matrix: RequirementTestMatrixDto;
  readonly report: MatrixGenerationReportDto;
}
