// @layer application
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-131

// Intent coverage 系の型は domain 層（value-objects/intent-coverage）を正準とし、
// application 層はそれを参照・再エクスポートする（domain ← application の正しい依存方向）。
import type {
  IntentCoverageStatus as DomainIntentCoverageStatus,
  IntentCoverageItem as DomainIntentCoverageItem,
} from '../../domain/value-objects/intent-coverage.js';

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

export type IntentCoverageStatus = DomainIntentCoverageStatus;

export type IntentCoverageItemDto = DomainIntentCoverageItem;

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
