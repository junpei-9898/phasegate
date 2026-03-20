import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LessonDeduplicator } from '../../../skill-quality/domain/services/lesson-deduplicator.js';
import { Lesson } from '../../../skill-quality/domain/value-objects/lesson.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';

function createLesson(content: string): Lesson {
  return Lesson.create({
    content,
    sourceContext: SourceContext.create('scripts/harness/foo.ts'),
    tags: [],
  });
}

target('LessonDeduplicator', () => {

  describe('deduplicate: 重複なしの場合は全件返すこと', () => {
    context('fingerprint が全て異なる 3 件の Lesson を渡す場合', () => {
      it('3 件全件が返される', () => {
        const deduplicator = new LessonDeduplicator();
        const lessons = [createLesson('教訓A'), createLesson('教訓B'), createLesson('教訓C')];
        const actual = deduplicator.deduplicate(lessons);
        expect(actual).toHaveLength(3);
      });
    });
  });

  describe('deduplicate: 同一 content の 2 件は 1 件になること', () => {
    context('同一 content の Lesson が 2 件ある場合', () => {
      it('1 件に重複排除される', () => {
        const deduplicator = new LessonDeduplicator();
        const lessons = [createLesson('同じ教訓'), createLesson('同じ教訓')];
        const actual = deduplicator.deduplicate(lessons);
        expect(actual).toHaveLength(1);
      });
    });
  });

  describe('deduplicate: 先着優先で重複が排除されること', () => {
    context('重複する 2 件のうち先着を優先する場合', () => {
      it('先着の Lesson が残る', () => {
        const deduplicator = new LessonDeduplicator();
        const first = createLesson('同じ教訓');
        const second = createLesson('同じ教訓');
        const actual = deduplicator.deduplicate([first, second]);
        expect(actual[0]?.lessonId).toBe(first.lessonId);
      });
    });
  });

  describe('deduplicate: 空配列を渡すと空配列を返すこと', () => {
    context('lessons=[] の場合', () => {
      it('空配列が返される', () => {
        const deduplicator = new LessonDeduplicator();
        const actual = deduplicator.deduplicate([]);
        expect(actual).toHaveLength(0);
      });
    });
  });

  describe('deduplicate: 3件中2件が重複の場合は2件に排除されること', () => {
    context('重複が 2 件ある場合', () => {
      it('2 件に排除される', () => {
        const deduplicator = new LessonDeduplicator();
        const lessons = [createLesson('教訓A'), createLesson('教訓B'), createLesson('教訓A')];
        const actual = deduplicator.deduplicate(lessons);
        expect(actual).toHaveLength(2);
      });
    });
  });

});
