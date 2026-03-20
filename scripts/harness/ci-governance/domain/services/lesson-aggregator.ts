/**
 * @layer domain
 * @unit ci-governance
 *
 * LessonAggregatorドメインサービス
 */

import type { LessonArtifact } from '../types/lesson-artifact.js';
import { PointerEntry } from '../value-objects/pointer-entry.js';
import type { Result } from '../result.js';
import { ok, fail } from '../result.js';

export class LessonAggregator {
  aggregate(artifacts: LessonArtifact[]): Result<PointerEntry[], Array<{ code: string; message: string }>> {
    if (artifacts.length === 0) {
      return ok([]);
    }

    // 重複lessonId検出
    const idCounts = new Map<string, number>();
    for (const artifact of artifacts) {
      idCounts.set(artifact.lessonId, (idCounts.get(artifact.lessonId) ?? 0) + 1);
    }

    const duplicates = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      return fail(
        duplicates.map(([id]) => ({
          code: 'DUPLICATE_LESSON_ID',
          message: `Duplicate lessonId found: ${id}`,
        })),
      );
    }

    // LessonArtifact → PointerEntry変換
    const pointerEntries = artifacts.map((artifact) =>
      PointerEntry.createFile({
        key: `lesson-${artifact.lessonId}`,
        filePath: `.harness/lessons/${artifact.lessonId}.md`,
        description: artifact.content,
      }),
    );

    return ok(pointerEntries);
  }
}
