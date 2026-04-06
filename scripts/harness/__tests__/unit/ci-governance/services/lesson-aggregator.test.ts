// @layer test
import { target, context, createLessonArtifact } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { LessonAggregator } from '../../../../ci-governance/domain/services/lesson-aggregator.js';

target('LessonAggregator', () => {
  describe('aggregateテスト', () => {
    // UT-LA-001
    context('重複なしのLessonArtifact[] 3件を渡した場合', () => {
      it('Result.ok(PointerEntry[])が返り・PointerEntries.length=3', () => {
        const aggregator = new LessonAggregator();
        const artifacts = [
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440001' }),
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440002' }),
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440003' }),
        ];
        const actual = aggregator.aggregate(artifacts);
        expect(actual.isOk()).toBe(true);
        expect(actual.value).toHaveLength(3);
      });
    });

    // UT-LA-002
    context('同一lessonId（UUID）が2件含まれるLessonArtifact[]を渡した場合', () => {
      it('Result.fail([DUPLICATE_LESSON_ID HarnessError])が返る', () => {
        const aggregator = new LessonAggregator();
        const duplicateId = '550e8400-e29b-41d4-a716-446655440001';
        const artifacts = [
          createLessonArtifact({ lessonId: duplicateId }),
          createLessonArtifact({ lessonId: duplicateId }),
        ];
        const actual = aggregator.aggregate(artifacts);
        expect(actual.isOk()).toBe(false);
        expect(actual.error[0].code).toContain('DUPLICATE_LESSON_ID');
      });
    });

    // UT-LA-003
    context('空のLessonArtifact[]を渡した場合', () => {
      it('Result.ok([])が返る', () => {
        const aggregator = new LessonAggregator();
        const actual = aggregator.aggregate([]);
        expect(actual.isOk()).toBe(true);
        expect(actual.value).toHaveLength(0);
      });
    });

    // UT-LA-004
    context('正常な1件のLessonArtifactに対するPointerEntry変換を確認した場合', () => {
      it('key="lesson-{lessonId}"形式・type="file"のPointerEntryが返る', () => {
        const aggregator = new LessonAggregator();
        const lessonId = '550e8400-e29b-41d4-a716-446655440001';
        const artifacts = [createLessonArtifact({ lessonId })];
        const actual = aggregator.aggregate(artifacts);
        expect(actual.value[0].key).toBe(`lesson-${lessonId}`);
        expect(actual.value[0].type).toBe('file');
      });
    });

    // UT-LA-005
    context('3件のうち2件が同一lessonIdを持つLessonArtifact[]を渡した場合', () => {
      it('Result.fail()が返り・重複検出エラーが含まれる', () => {
        const aggregator = new LessonAggregator();
        const duplicateId = '550e8400-e29b-41d4-a716-446655440001';
        const artifacts = [
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440000' }),
          createLessonArtifact({ lessonId: duplicateId }),
          createLessonArtifact({ lessonId: duplicateId }),
        ];
        const actual = aggregator.aggregate(artifacts);
        expect(actual.isOk()).toBe(false);
        expect(actual.error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PointerEntry変換ルールテスト', () => {
    // UT-LA-006
    context('lessonId="abc-123-def"のLessonArtifactを変換した場合', () => {
      it('key="lesson-abc-123-def"のPointerEntryが生成される', () => {
        const aggregator = new LessonAggregator();
        const artifacts = [createLessonArtifact({ lessonId: 'abc-123-def-0000-000000000001' })];
        const actual = aggregator.aggregate(artifacts);
        expect(actual.value[0].key).toBe('lesson-abc-123-def-0000-000000000001');
      });
    });

    // UT-LA-007
    context('source="domain-designer"のLessonArtifactを変換した場合', () => {
      it('type="file"のPointerEntryが生成される', () => {
        const aggregator = new LessonAggregator();
        const artifacts = [createLessonArtifact({
          lessonId: '550e8400-e29b-41d4-a716-446655440001',
          source: 'domain-designer',
        })];
        const actual = aggregator.aggregate(artifacts);
        expect(actual.value[0].type).toBe('file');
      });
    });
  });
});
