/**
 * @layer application
 * @unit ci-governance
 *
 * AggregateLessonsUseCase - H13-03
 */

import type { LessonArtifactReaderPort } from '../../domain/ports/lesson-artifact-reader-port.js';
import type { LessonAggregator } from '../../domain/services/lesson-aggregator.js';
import type { AggregateLessonsInput } from '../dto/aggregate-lessons-input.js';
import type { AggregateLessonsOutput } from '../dto/aggregate-lessons-output.js';

export class AggregateLessonsUseCase {
  constructor(
    private readonly lessonArtifactReaderPort: LessonArtifactReaderPort,
    private readonly lessonAggregator: LessonAggregator,
  ) {}

  async execute(input: AggregateLessonsInput): Promise<AggregateLessonsOutput> {
    const { source } = input;

    let artifacts;
    if (source !== undefined && this.lessonArtifactReaderPort.readBySource) {
      artifacts = await this.lessonArtifactReaderPort.readBySource(source);
    } else {
      artifacts = await this.lessonArtifactReaderPort.readAll();
    }

    const result = this.lessonAggregator.aggregate(artifacts);

    if (!result.isOk()) {
      return {
        pointerEntries: [],
        totalArtifacts: artifacts.length,
        errors: result.error,
      };
    }

    const pointerEntries = result.value.map((entry) => ({
      key: entry.key,
      type: entry.type,
      filePath: entry.filePath,
      description: entry.description,
    }));

    return {
      pointerEntries,
      totalArtifacts: artifacts.length,
      errors: [],
    };
  }
}
