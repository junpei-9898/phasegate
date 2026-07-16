// @unit traceability-model
// @layer application
// @work-item-id WI-288

export const TRACEABILITY_WORLD_READ_SCHEMA_VERSION = "phasegate-traceability-world-read/v1" as const;

export type TraceabilityTestType = "unit" | "it" | "scenario";

export interface TraceabilityUnitDto {
  readonly unitId: string;
  readonly definitionPath: string;
  readonly constructionRoot: string | null;
}

export interface TraceabilityStoryDto {
  readonly storyId: string;
  readonly legacyIds: readonly string[];
  readonly sourcePath: string;
  readonly line: number;
}

export interface TraceabilityAcceptanceCriterionDto {
  readonly storyId: string;
  readonly acId: string;
  readonly sourcePath: string;
  readonly line: number;
}

export interface TraceabilityWorkItemDto {
  readonly workItemId: string;
  readonly legacyIds: readonly string[];
  readonly type: string;
  readonly severity: string | null;
  readonly status: string | null;
  readonly affects: readonly string[];
  readonly descriptionPath: string;
}

export interface TraceabilityTestReferenceDto {
  readonly storyId: string;
  readonly acId: string;
  readonly binding: "file";
  readonly testType: TraceabilityTestType;
  readonly filePath: string;
  readonly testName: null;
  readonly provenance: readonly {
    readonly sourcePath: string;
    readonly line: number;
  }[];
}

export interface TraceabilityReadDiagnosticDto {
  readonly code: string;
  readonly subjectId: string | null;
  readonly sourcePaths: readonly string[];
  readonly message: string;
}

export interface TraceabilityWorldReadDto {
  readonly schemaVersion: typeof TRACEABILITY_WORLD_READ_SCHEMA_VERSION;
  readonly units: readonly TraceabilityUnitDto[];
  readonly stories: readonly TraceabilityStoryDto[];
  readonly acceptanceCriteria: readonly TraceabilityAcceptanceCriterionDto[];
  readonly workItems: readonly TraceabilityWorkItemDto[];
  readonly testReferences: readonly TraceabilityTestReferenceDto[];
  readonly diagnostics: readonly TraceabilityReadDiagnosticDto[];
}
