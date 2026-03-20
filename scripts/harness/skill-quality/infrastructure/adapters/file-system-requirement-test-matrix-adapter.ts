/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { readFile } from 'node:fs/promises';
import type { RequirementTestMatrixPort, RequirementTestMatrix } from '../../domain/ports/requirement-test-matrix-port.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

export class FileSystemRequirementTestMatrixAdapter implements RequirementTestMatrixPort {
  constructor(private readonly matrixFilePath: string = '.harness/requirement-test-matrix.json') {}

  async read(storyId: string): Promise<RequirementTestMatrix> {
    let raw: string;
    try {
      raw = await readFile(this.matrixFilePath, 'utf-8');
    } catch {
      throw new SkillQualityError('MATRIX_FILE_NOT_FOUND', `requirement-test-matrix.json not found at ${this.matrixFilePath}`);
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    const entry = (data[storyId] ?? data) as { total: number; covered: number; uncoveredIds: string[] };
    return {
      storyId,
      total: entry.total ?? 0,
      covered: entry.covered ?? 0,
      uncoveredIds: entry.uncoveredIds ?? [],
    };
  }
}
