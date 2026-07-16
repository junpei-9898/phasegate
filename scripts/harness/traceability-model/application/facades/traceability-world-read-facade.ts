// @unit traceability-model
// @layer application
// @work-item-id WI-288

import {
  TRACEABILITY_WORLD_READ_SCHEMA_VERSION,
  type TraceabilityAcceptanceCriterionDto,
  type TraceabilityReadDiagnosticDto,
  type TraceabilityStoryDto,
  type TraceabilityTestReferenceDto,
  type TraceabilityUnitDto,
  type TraceabilityWorkItemDto,
  type TraceabilityWorldReadDto,
} from "../dto/traceability-world-read-dto.js";
import type {
  RawTraceabilityStory,
  RawTraceabilityTestAnnotation,
  TraceabilityWorldReadSourcePort,
} from "../ports/traceability-world-read-source-port.js";

const STORY_ID_PATTERN = /^H(?:F\d+|\d{2})-\d{2}$/;
const WORK_ITEM_ID_PATTERN = /^WI-\d+$/;
const AC_ID_PATTERN = /^AC-(\d+)$/;

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const compareAcIds = (left: string, right: string): number => {
  const leftMatch = AC_ID_PATTERN.exec(left);
  const rightMatch = AC_ID_PATTERN.exec(right);
  if (leftMatch && rightMatch) {
    const difference = Number(leftMatch[1]) - Number(rightMatch[1]);
    if (difference !== 0) return difference;
  }
  return compareStrings(left, right);
};

const compareTuples = (
  left: readonly (string | number | null)[],
  right: readonly (string | number | null)[],
): number => {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? "";
    const rightValue = right[index] ?? "";
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      if (leftValue !== rightValue) return leftValue - rightValue;
      continue;
    }
    const difference = compareStrings(String(leftValue), String(rightValue));
    if (difference !== 0) return difference;
  }
  return 0;
};

const groupBy = <T>(values: readonly T[], keyOf: (value: T) => string): ReadonlyMap<string, readonly T[]> => {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = keyOf(value);
    const current = groups.get(key) ?? [];
    current.push(value);
    groups.set(key, current);
  }
  return groups;
};

const diagnostic = (
  code: string,
  subjectId: string | null,
  sourcePaths: readonly string[],
  message: string,
): TraceabilityReadDiagnosticDto => ({
  code,
  subjectId,
  sourcePaths: [...sourcePaths].sort(compareStrings),
  message,
});

export interface TraceabilityWorldReadFacadeDeps {
  readonly sourcePort: TraceabilityWorldReadSourcePort;
}

export class TraceabilityWorldReadFacade {
  private readonly sourcePort: TraceabilityWorldReadSourcePort;

  constructor(deps: TraceabilityWorldReadFacadeDeps) {
    this.sourcePort = deps.sourcePort;
  }

  async read(): Promise<TraceabilityWorldReadDto> {
    const source = await this.sourcePort.read();
    const diagnostics: TraceabilityReadDiagnosticDto[] = source.diagnostics.map((entry) =>
      diagnostic(entry.code, entry.subjectId, entry.sourcePaths, entry.message),
    );

    const units = this.admitUnits(source.units, diagnostics);
    const admittedStories = this.admitStories(source.stories, diagnostics);
    const { stories, acceptanceCriteria } = this.projectStories(admittedStories, diagnostics);
    const workItems = this.admitWorkItems(source.workItems, diagnostics);
    const testReferences = this.projectTestReferences(
      source.testAnnotations,
      admittedStories,
      acceptanceCriteria,
      diagnostics,
    );

    return {
      schemaVersion: TRACEABILITY_WORLD_READ_SCHEMA_VERSION,
      units: units.sort((left, right) =>
        compareTuples([left.unitId, left.definitionPath], [right.unitId, right.definitionPath]),
      ),
      stories: stories.sort((left, right) =>
        compareTuples([left.storyId, left.sourcePath], [right.storyId, right.sourcePath]),
      ),
      acceptanceCriteria: acceptanceCriteria.sort((left, right) => {
        const storyDifference = compareStrings(left.storyId, right.storyId);
        if (storyDifference !== 0) return storyDifference;
        const acDifference = compareAcIds(left.acId, right.acId);
        if (acDifference !== 0) return acDifference;
        return compareStrings(left.sourcePath, right.sourcePath);
      }),
      workItems: workItems.sort((left, right) =>
        compareTuples([left.workItemId, left.descriptionPath], [right.workItemId, right.descriptionPath]),
      ),
      testReferences: testReferences.sort((left, right) => {
        const storyDifference = compareStrings(left.storyId, right.storyId);
        if (storyDifference !== 0) return storyDifference;
        const acDifference = compareAcIds(left.acId, right.acId);
        if (acDifference !== 0) return acDifference;
        return compareTuples(
          [left.binding, left.testType, left.filePath, left.testName],
          [right.binding, right.testType, right.filePath, right.testName],
        );
      }),
      diagnostics: diagnostics.sort((left, right) =>
        compareTuples(
          [left.code, left.subjectId, left.sourcePaths.join("\u0000")],
          [right.code, right.subjectId, right.sourcePaths.join("\u0000")],
        ),
      ),
    };
  }

  private admitUnits(
    rawUnits: Awaited<ReturnType<TraceabilityWorldReadSourcePort["read"]>>["units"],
    diagnostics: TraceabilityReadDiagnosticDto[],
  ): TraceabilityUnitDto[] {
    const result: TraceabilityUnitDto[] = [];
    for (const [unitId, candidates] of groupBy(rawUnits, (entry) => entry.unitId)) {
      if (candidates.length !== 1) {
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-DUPLICATE-UNIT",
            unitId,
            candidates.map((entry) => entry.definitionPath),
            `Unit ID ${unitId} has ${candidates.length} owners`,
          ),
        );
        continue;
      }
      const candidate = candidates[0];
      result.push({
        unitId: candidate.unitId,
        definitionPath: candidate.definitionPath,
        constructionRoot: candidate.constructionRoot,
      });
    }
    return result;
  }

  private admitStories(
    rawStories: readonly RawTraceabilityStory[],
    diagnostics: TraceabilityReadDiagnosticDto[],
  ): readonly RawTraceabilityStory[] {
    const result: RawTraceabilityStory[] = [];
    for (const [storyId, candidates] of groupBy(rawStories, (entry) => entry.storyId)) {
      if (!STORY_ID_PATTERN.test(storyId)) {
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-MALFORMED-STORY-ID",
            storyId,
            candidates.map((entry) => entry.sourcePath),
            `Story ID is not canonical: ${storyId}`,
          ),
        );
        continue;
      }
      if (candidates.length !== 1) {
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-DUPLICATE-STORY",
            storyId,
            candidates.map((entry) => entry.sourcePath),
            `Story ID ${storyId} has ${candidates.length} owners`,
          ),
        );
        continue;
      }
      result.push(candidates[0]);
    }
    return result;
  }

  private projectStories(
    rawStories: readonly RawTraceabilityStory[],
    diagnostics: TraceabilityReadDiagnosticDto[],
  ): {
    readonly stories: TraceabilityStoryDto[];
    readonly acceptanceCriteria: TraceabilityAcceptanceCriterionDto[];
  } {
    const stories: TraceabilityStoryDto[] = [];
    const acceptanceCriteria: TraceabilityAcceptanceCriterionDto[] = [];
    for (const story of rawStories) {
      stories.push({
        storyId: story.storyId,
        legacyIds: [...new Set(story.legacyIds)].sort(compareStrings),
        sourcePath: story.sourcePath,
        line: story.line,
      });
      for (const [acId, candidates] of groupBy(story.acceptanceCriteria, (entry) => entry.acId)) {
        if (!AC_ID_PATTERN.test(acId)) {
          diagnostics.push(
            diagnostic(
              "TM-WORLD-READ-MALFORMED-AC-ID",
              `${story.storyId}:${acId}`,
              [story.sourcePath],
              `Acceptance Criterion ID is not canonical: ${acId}`,
            ),
          );
          continue;
        }
        if (candidates.length !== 1) {
          diagnostics.push(
            diagnostic(
              "TM-WORLD-READ-DUPLICATE-AC",
              `${story.storyId}:${acId}`,
              [story.sourcePath],
              `Acceptance Criterion ${story.storyId}:${acId} has ${candidates.length} owners`,
            ),
          );
          continue;
        }
        acceptanceCriteria.push({
          storyId: story.storyId,
          acId,
          sourcePath: story.sourcePath,
          line: candidates[0].line,
        });
      }
    }
    return { stories, acceptanceCriteria };
  }

  private admitWorkItems(
    rawWorkItems: Awaited<ReturnType<TraceabilityWorldReadSourcePort["read"]>>["workItems"],
    diagnostics: TraceabilityReadDiagnosticDto[],
  ): TraceabilityWorkItemDto[] {
    const candidatesById = groupBy(rawWorkItems, (entry) => entry.workItemId);
    const result: TraceabilityWorkItemDto[] = [];
    for (const [workItemId, candidates] of candidatesById) {
      if (!WORK_ITEM_ID_PATTERN.test(workItemId)) {
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-MALFORMED-WORK-ITEM-ID",
            workItemId,
            candidates.map((entry) => entry.descriptionPath),
            `WorkItem ID is not canonical: ${workItemId}`,
          ),
        );
        continue;
      }
      const matchingCandidates = candidates.filter((entry) => entry.directoryId === entry.workItemId);
      for (const candidate of candidates) {
        if (candidate.directoryId !== candidate.workItemId) {
          diagnostics.push(
            diagnostic(
              "TM-WORLD-READ-WORK-ITEM-ID-MISMATCH",
              workItemId,
              [candidate.descriptionPath],
              `WorkItem directory ${candidate.directoryId} does not match frontmatter ${candidate.workItemId}`,
            ),
          );
        }
      }
      if (matchingCandidates.length === 0) continue;
      if (candidates.length !== 1) {
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-DUPLICATE-WORK-ITEM",
            workItemId,
            candidates.map((entry) => entry.descriptionPath),
            `WorkItem ID ${workItemId} has ${candidates.length} owners`,
          ),
        );
        continue;
      }
      const candidate = matchingCandidates[0];
      result.push({
        workItemId,
        legacyIds: candidate.legacyId ? [candidate.legacyId] : [],
        type: candidate.type,
        severity: candidate.severity,
        status: candidate.status,
        affects: [...new Set(candidate.affects)].sort(compareStrings),
        descriptionPath: candidate.descriptionPath,
      });
    }
    return result;
  }

  private projectTestReferences(
    annotations: readonly RawTraceabilityTestAnnotation[],
    stories: readonly RawTraceabilityStory[],
    acceptanceCriteria: readonly TraceabilityAcceptanceCriterionDto[],
    diagnostics: TraceabilityReadDiagnosticDto[],
  ): TraceabilityTestReferenceDto[] {
    const knownStories = new Map(stories.map((story) => [story.storyId, story]));
    const criteriaByStory = groupBy(acceptanceCriteria, (entry) => entry.storyId);
    const candidates: TraceabilityTestReferenceDto[] = [];

    for (const annotation of annotations) {
      if (!knownStories.has(annotation.storyId)) {
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-UNKNOWN-TEST-STORY",
            annotation.storyId,
            [annotation.filePath],
            `Test annotation references unknown Story ${annotation.storyId}`,
          ),
        );
        continue;
      }
      for (const criterion of criteriaByStory.get(annotation.storyId) ?? []) {
        candidates.push({
          storyId: annotation.storyId,
          acId: criterion.acId,
          binding: "file",
          testType: annotation.testType,
          filePath: annotation.filePath,
          testName: null,
          provenance: [
            {
              sourcePath: annotation.filePath,
              line: annotation.line,
            },
          ],
        });
      }
    }

    const result: TraceabilityTestReferenceDto[] = [];
    for (const [identity, references] of groupBy(candidates, (entry) =>
      [entry.storyId, entry.acId, entry.binding, entry.testType, entry.filePath, entry.testName ?? "none"].join(
        "\u0000",
      ),
    )) {
      if (references.length !== 1) {
        const first = references[0];
        diagnostics.push(
          diagnostic(
            "TM-WORLD-READ-DUPLICATE-TEST-REFERENCE",
            `${first.storyId}:${first.acId}`,
            references.map((entry) => entry.filePath),
            `TestReference identity ${identity} has ${references.length} owners`,
          ),
        );
        continue;
      }
      result.push(references[0]);
    }
    return result;
  }
}
