import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CollectLessonsUseCase } from '../../../skill-quality/application/usecases/collect-lessons-usecase.js';
import { LessonCollector } from '../../../skill-quality/domain/services/lesson-collector.js';
import { LessonDeduplicator } from '../../../skill-quality/domain/services/lesson-deduplicator.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';
import type { RawLessonEntry } from '../../../skill-quality/domain/ports/lesson-source-reader-port.js';

function createRawEntry(content: string, source = 'path1'): RawLessonEntry {
  return { content, sourceContext: SourceContext.create(source), tags: [] };
}

function createMockLessonSourceReaderPort(entriesPerSource: RawLessonEntry[][] = []) {
  let idx = 0;
  return { read: vi.fn().mockImplementation(async () => entriesPerSource[idx++] ?? []) };
}

function createMockConfigQueryPort(agentLessonEnabled = true) {
  return {
    getCoverageThreshold: vi.fn().mockResolvedValue({ requirement: 100, code: 80 }),
    isAgentLessonCollectionEnabled: vi.fn().mockResolvedValue(agentLessonEnabled),
    getCascadeUpdateTargetPatterns: vi.fn().mockResolvedValue(['scripts/**/*.ts']),
  };
}

target('CollectLessonsUseCase', () => {

  // IT-UC-CollLess-001
  describe('execute: agentLessonCollection 有効で Lesson が収集されること', () => {
    context("sources=['path1','path2'], 各 2 件の RawLessonEntry の場合", () => {
      it('output.lessons.length=4, totalCollected=4, deduplicatedCount=0', async () => {
        // Arrange
        const rawEntry1 = createRawEntry('教訓A', 'path1');
        const rawEntry2 = createRawEntry('教訓B', 'path1');
        const rawEntry3 = createRawEntry('教訓C', 'path2');
        const rawEntry4 = createRawEntry('教訓D', 'path2');
        const mockPort = createMockLessonSourceReaderPort([[rawEntry1, rawEntry2], [rawEntry3, rawEntry4]]);
        const mockConfig = createMockConfigQueryPort(true);
        const lessonCollector = new LessonCollector(mockPort);
        const lessonDeduplicator = new LessonDeduplicator();
        const usecase = new CollectLessonsUseCase(lessonCollector, lessonDeduplicator, mockConfig);
        // Act
        const actual = await usecase.execute({ sources: ['path1', 'path2'] });
        // Assert
        expect(actual.lessons).toHaveLength(4);
        expect(actual.totalCollected).toBe(4);
        expect(actual.deduplicatedCount).toBe(0);
      });
    });
  });

  // IT-UC-CollLess-002
  describe('execute: 重複がある場合に deduplicate されること', () => {
    context('同一 content の RawLessonEntry 3 件の場合', () => {
      it('output.lessons.length=1, totalCollected=3, deduplicatedCount=2', async () => {
        // Arrange
        const rawEntry = createRawEntry('同じ教訓', 'path1');
        const mockPort = createMockLessonSourceReaderPort([[rawEntry, rawEntry, rawEntry]]);
        const mockConfig = createMockConfigQueryPort(true);
        const lessonCollector = new LessonCollector(mockPort);
        const lessonDeduplicator = new LessonDeduplicator();
        const usecase = new CollectLessonsUseCase(lessonCollector, lessonDeduplicator, mockConfig);
        // Act
        const actual = await usecase.execute({ sources: ['path1'] });
        // Assert
        expect(actual.lessons).toHaveLength(1);
        expect(actual.totalCollected).toBe(3);
        expect(actual.deduplicatedCount).toBe(2);
      });
    });
  });

  // IT-UC-CollLess-003
  describe('execute: agentLessonCollection 無効の場合に空で返すこと', () => {
    context('ConfigQueryPort が isAgentLessonCollectionEnabled→false を返す場合', () => {
      it('output.lessons=[], LessonSourceReaderPort は呼ばれない', async () => {
        // Arrange
        const mockPort = createMockLessonSourceReaderPort([]);
        const mockConfig = createMockConfigQueryPort(false);
        const lessonCollector = new LessonCollector(mockPort);
        const lessonDeduplicator = new LessonDeduplicator();
        const usecase = new CollectLessonsUseCase(lessonCollector, lessonDeduplicator, mockConfig);
        // Act
        const actual = await usecase.execute({ sources: ['path1'] });
        // Assert
        expect(actual.lessons).toHaveLength(0);
        expect(actual.totalCollected).toBe(0);
        expect(actual.deduplicatedCount).toBe(0);
        expect(mockPort.read).not.toHaveBeenCalled();
      });
    });
  });

});
