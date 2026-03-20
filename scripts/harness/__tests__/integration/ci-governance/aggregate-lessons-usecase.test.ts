import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { AggregateLessonsUseCase } from '../../../ci-governance/application/usecases/aggregate-lessons-usecase.js';
import { LessonAggregator } from '../../../ci-governance/domain/services/lesson-aggregator.js';

const createLesson = (lessonId: string, source = 'story-implementor') => ({
  lessonId,
  source,
  content: 'テストlesson',
  tags: ['best-practice'] as any[],
  timestamp: '2026-03-20T00:00:00Z',
});

target('AggregateLessonsUseCase', () => {
  describe('正常系', () => {
    // IT-UC-AggregateLessons-001
    describe('sourceフィルタなしで全lesson artifactを変換できること', () => {
      context('LessonArtifactReaderPort.readAll()→3件のLessonArtifact[]が返る場合', () => {
        it('pointerEntries.length=3・totalArtifacts=3・errors=[]が返る', async () => {
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([
              createLesson('550e8400-e29b-41d4-a716-446655440001'),
              createLesson('550e8400-e29b-41d4-a716-446655440002'),
              createLesson('550e8400-e29b-41d4-a716-446655440003'),
            ]),
          };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          const actual = await useCase.execute({ source: undefined });
          expect(actual.pointerEntries).toHaveLength(3);
          expect(actual.totalArtifacts).toBe(3);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-AggregateLessons-002
    describe('sourceフィルタ指定で特定スキルのlesson artifactのみ変換できること', () => {
      context('LessonArtifactReaderPort.readBySource("story-implementor")→2件が返る場合', () => {
        it('pointerEntries.length=2・totalArtifacts=2が返る', async () => {
          const lessonReaderPort = {
            readAll: vi.fn(),
            readBySource: vi.fn().mockResolvedValue([
              createLesson('550e8400-e29b-41d4-a716-446655440001', 'story-implementor'),
              createLesson('550e8400-e29b-41d4-a716-446655440002', 'story-implementor'),
            ]),
          };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          const actual = await useCase.execute({ source: 'story-implementor' });
          expect(actual.pointerEntries).toHaveLength(2);
          expect(actual.totalArtifacts).toBe(2);
        });
      });
    });

    // IT-UC-AggregateLessons-003
    describe('lesson artifactが0件の場合はpointerEntries=[]が返ること', () => {
      context('LessonArtifactReaderPort.readAll()→[]が返る場合', () => {
        it('pointerEntries=[]・totalArtifacts=0・errors=[]が返る', async () => {
          const lessonReaderPort = { readAll: vi.fn().mockResolvedValue([]) };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          const actual = await useCase.execute({ source: undefined });
          expect(actual.pointerEntries).toHaveLength(0);
          expect(actual.totalArtifacts).toBe(0);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-AggregateLessons-004
    describe('重複lessonIdがある場合にerrorsにDUPLICATE_LESSON_IDが含まれること', () => {
      context('LessonArtifactReaderPort.readAll()→同一lessonIdを持つ2件が返る場合', () => {
        it('errors[]にDUPLICATE_LESSON_IDエラーが含まれる', async () => {
          const dupId = '550e8400-e29b-41d4-a716-446655440001';
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson(dupId), createLesson(dupId)]),
          };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          const actual = await useCase.execute({ source: undefined });
          expect(actual.errors.some((e: any) => e.code.includes('DUPLICATE_LESSON_ID'))).toBe(true);
        });
      });
    });
  });
});
