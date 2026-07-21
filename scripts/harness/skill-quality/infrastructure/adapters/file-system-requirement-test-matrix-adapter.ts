/**
 * @layer infrastructure
 * @unit skill-quality
 * @work-item-id WI-188
 * @work-item-id WI-341
 */
import { readFile } from "node:fs/promises";
import { SkillQualityError } from "../../domain/errors/skill-quality-error.js";
import type {
  RequirementTestMatrix,
  RequirementTestMatrixPort,
} from "../../domain/ports/requirement-test-matrix-port.js";

interface GeneratedMatrixAcMapping {
  readonly acId: string;
  readonly testReferences: readonly unknown[];
}

interface GeneratedMatrixStory {
  readonly storyId: string;
  readonly storyMappings: readonly GeneratedMatrixAcMapping[];
}

export class FileSystemRequirementTestMatrixAdapter implements RequirementTestMatrixPort {
  constructor(private readonly matrixFilePath: string = ".harness/requirement-test-matrix.json") {}

  async read(storyId: string): Promise<RequirementTestMatrix> {
    let raw: string;
    try {
      raw = await readFile(this.matrixFilePath, "utf-8");
    } catch {
      throw new SkillQualityError(
        "MATRIX_FILE_NOT_FOUND",
        `requirement-test-matrix.json not found at ${this.matrixFilePath}`,
      );
    }
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new SkillQualityError(
        "MATRIX_FILE_NOT_FOUND",
        `requirement-test-matrix.json could not be parsed at ${this.matrixFilePath}`,
      );
    }

    if (Array.isArray(data.stories)) {
      const story = (data.stories as GeneratedMatrixStory[]).find((candidate) => candidate.storyId === storyId);
      if (story === undefined) {
        throw new SkillQualityError("STORY_NOT_FOUND", `Story ${storyId} not found in ${this.matrixFilePath}`);
      }

      const uncoveredIds = story.storyMappings
        .filter((mapping) => !Array.isArray(mapping.testReferences) || mapping.testReferences.length === 0)
        .map((mapping) => mapping.acId);
      return {
        storyId,
        total: story.storyMappings.length,
        covered: story.storyMappings.length - uncoveredIds.length,
        uncoveredIds,
      };
    }

    const rootEntry = data as { total?: unknown; covered?: unknown; uncoveredIds?: unknown };
    const explicitEntry = data[storyId];
    if (explicitEntry === undefined && rootEntry.total === undefined) {
      throw new SkillQualityError("STORY_NOT_FOUND", `Story ${storyId} not found in ${this.matrixFilePath}`);
    }
    const entry = (explicitEntry ?? data) as { total: number; covered: number; uncoveredIds: string[] };
    return {
      storyId,
      total: entry.total ?? 0,
      covered: entry.covered ?? 0,
      uncoveredIds: entry.uncoveredIds ?? [],
    };
  }
}
