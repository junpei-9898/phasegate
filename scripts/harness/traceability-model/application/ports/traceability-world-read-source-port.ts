// @unit traceability-model
// @layer application
// @work-item-id WI-288

import type { TraceabilityTestType } from "../dto/traceability-world-read-dto.js";

export interface RawTraceabilityUnit {
  readonly unitId: string;
  readonly definitionPath: string;
  readonly constructionRoot: string | null;
}

export interface RawTraceabilityAcceptanceCriterion {
  readonly acId: string;
  readonly line: number;
}

export interface RawTraceabilityStory {
  readonly storyId: string;
  readonly legacyIds: readonly string[];
  readonly sourcePath: string;
  readonly line: number;
  readonly acceptanceCriteria: readonly RawTraceabilityAcceptanceCriterion[];
}

export interface RawTraceabilityWorkItem {
  readonly directoryId: string;
  readonly workItemId: string;
  readonly legacyId: string | null;
  readonly type: string;
  readonly severity: string | null;
  readonly status: string | null;
  readonly affects: readonly string[];
  readonly descriptionPath: string;
}

export interface RawTraceabilityTestAnnotation {
  readonly storyId: string;
  readonly filePath: string;
  readonly line: number;
  readonly testType: TraceabilityTestType;
}

export interface RawTraceabilityDiagnostic {
  readonly code: string;
  readonly subjectId: string | null;
  readonly sourcePaths: readonly string[];
  readonly message: string;
}

export interface TraceabilityWorldReadSourceDto {
  readonly units: readonly RawTraceabilityUnit[];
  readonly stories: readonly RawTraceabilityStory[];
  readonly workItems: readonly RawTraceabilityWorkItem[];
  readonly testAnnotations: readonly RawTraceabilityTestAnnotation[];
  readonly diagnostics: readonly RawTraceabilityDiagnostic[];
}

export interface TraceabilityWorldReadSourcePort {
  read(): Promise<TraceabilityWorldReadSourceDto>;
}
