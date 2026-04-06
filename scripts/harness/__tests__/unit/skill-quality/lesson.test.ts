// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { Lesson } from '../../../skill-quality/domain/value-objects/lesson.js';
import { LessonFingerprint } from '../../../skill-quality/domain/value-objects/lesson-fingerprint.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';

function createSourceContext(description = 'scripts/harness/skill-quality/domain/lesson-artifact.ts'): SourceContext {
  return SourceContext.create(description);
}

function createLesson(overrides: Partial<{
  content: string;
  sourceContext: SourceContext;
  tags: string[];
}> = {}): Lesson {
  return Lesson.create({
    content: overrides.content ?? '有効な教訓テキスト',
    sourceContext: overrides.sourceContext ?? createSourceContext(),
    tags: overrides.tags ?? [],
  });
}

target('Lesson', () => {

  describe('create: 有効な content で正常生成（INV-11）', () => {
    context("content='有効な教訓テキスト' で create() を呼ぶ場合", () => {
      it('lessonId/fingerprint/timestamp が自動設定される', () => {
        const actual = createLesson();
        expect(actual.lessonId).toBeTruthy();
        expect(actual.fingerprint).toBeTruthy();
        expect(actual.timestamp).toBeTruthy();
      });
    });
  });

  describe("create: content='' で EMPTY_LESSON_CONTENT エラー", () => {
    context("content='' の場合", () => {
      it('HarnessError(EMPTY_LESSON_CONTENT) がスローされる', () => {
        expect(() => createLesson({ content: '' })).toThrow(
          expect.objectContaining({ code: expect.stringContaining('EMPTY_LESSON_CONTENT') }),
        );
      });
    });
  });

  describe('create: 同一 content から生成した 2 つの Lesson の fingerprint が同一', () => {
    context('同一 content で 2 つの Lesson を生成する場合', () => {
      it('両者の fingerprint.value が同一になる', () => {
        const a = createLesson({ content: '同じ教訓' });
        const b = createLesson({ content: '同じ教訓' });
        expect(a.fingerprint.value).toBe(b.fingerprint.value);
      });
    });
  });

  describe('create: 空白のみ異なる content（正規化で同一）は同一 fingerprint', () => {
    context('content が空白のみ異なる 2 つの Lesson の場合', () => {
      it('両者の fingerprint.value が同一になる', () => {
        const a = createLesson({ content: '教訓 テキスト' }); // 単一空白
        const b = createLesson({ content: '教訓  テキスト' }); // 連続空白
        expect(a.fingerprint.value).toBe(b.fingerprint.value);
      });
    });
  });

  describe('fingerprint: content 正規化後の SHA-256 と一致（INV-11）', () => {
    context('生成した Lesson の fingerprint を検証する場合', () => {
      it('LessonFingerprint.fromContent(content).value と一致する', () => {
        const content = '教訓テキスト';
        const lesson = createLesson({ content });
        const expected = LessonFingerprint.fromContent(content).value;
        const actual = lesson.fingerprint.value;
        expect(actual).toBe(expected);
      });
    });
  });

  describe('equals: 同一 content から生成した 2 つは等値', () => {
    context('同一 content から生成した 2 つの Lesson の場合', () => {
      it('equals() が true を返す（fingerprint ベースの等値性）', () => {
        const a = createLesson({ content: '同じ教訓' });
        const b = createLesson({ content: '同じ教訓' });
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('equals: 異なる content から生成した 2 つは非等値', () => {
    context('異なる content から生成した 2 つの Lesson の場合', () => {
      it('equals() が false を返す', () => {
        const a = createLesson({ content: '教訓A' });
        const b = createLesson({ content: '教訓B' });
        expect(a.equals(b)).toBe(false);
      });
    });
  });

});
