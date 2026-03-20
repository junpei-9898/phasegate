/**
 * @layer application
 * @unit skill-quality
 */
import type { LessonCollector } from '../../domain/services/lesson-collector.js';
import type { LessonDeduplicator } from '../../domain/services/lesson-deduplicator.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { CollectLessonsInput } from '../dto/collect-lessons-input.js';
import type { CollectLessonsOutput } from '../dto/collect-lessons-output.js';

export class CollectLessonsUseCase {
  constructor(
    private readonly lessonCollector: LessonCollector,
    private readonly lessonDeduplicator: LessonDeduplicator,
    private readonly configQueryPort: ConfigQueryPort,
  ) {}

  async execute(input: CollectLessonsInput): Promise<CollectLessonsOutput> {
    const enabled = await this.configQueryPort.isAgentLessonCollectionEnabled();
    if (!enabled) {
      return { lessons: [], totalCollected: 0, deduplicatedCount: 0 };
    }

    const collected = await this.lessonCollector.collect(input.sources);
    const deduplicated = this.lessonDeduplicator.deduplicate(collected);
    const deduplicatedCount = collected.length - deduplicated.length;

    return {
      lessons: deduplicated,
      totalCollected: collected.length,
      deduplicatedCount,
    };
  }
}
