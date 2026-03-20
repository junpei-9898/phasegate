import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LessonArtifact } from '../../../skill-quality/domain/aggregates/lesson-artifact.js';
import { Lesson } from '../../../skill-quality/domain/value-objects/lesson.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';

function createSourceContext(description = 'scripts/harness/skill-quality/domain/lesson-artifact.ts'): SourceContext {
  return SourceContext.create(description);
}

function createLesson(overrides: Partial<{ content: string }> = {}): Lesson {
  return Lesson.create({
    content: overrides.content ?? '有効な教訓テキスト',
    sourceContext: createSourceContext(),
    tags: [],
  });
}

function createLessonArtifact(storyId = 'H12-04'): LessonArtifact {
  return LessonArtifact.create(storyId);
}

target('LessonArtifact', () => {

  describe('create: 初期状態が正しいこと', () => {
    context('有効な storyId で create() を呼ぶ場合', () => {
      it('lessons=[], fingerprintSet が空の状態で生成される', () => {
        const actual = LessonArtifact.create('H12-04');
        expect(actual.lessons).toHaveLength(0);
      });
    });
  });

  describe('create: 有効な HXX-XX 形式の storyId で正常生成', () => {
    context("storyId='H12-01' で create() を呼ぶ場合", () => {
      it('正常に生成される', () => {
        expect(() => LessonArtifact.create('H12-01')).not.toThrow();
      });
    });
  });

  describe('create: storyId が空文字列の場合 INVALID_STORY_ID エラー', () => {
    context("storyId='' で create() を呼ぶ場合", () => {
      it('HarnessError(INVALID_STORY_ID) がスローされる', () => {
        expect(() => LessonArtifact.create('')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_STORY_ID') }),
        );
      });
    });
  });

  describe('create: HXX-XX 形式でない storyId で INVALID_STORY_ID エラー', () => {
    context("storyId='INVALID' で create() を呼ぶ場合", () => {
      it('HarnessError(INVALID_STORY_ID) がスローされる', () => {
        expect(() => LessonArtifact.create('INVALID')).toThrow(
          expect.objectContaining({ code: expect.stringContaining('INVALID_STORY_ID') }),
        );
      });
    });
  });

  describe('addLesson: 異なる content の Lesson を 3 件追加できること', () => {
    context('異なる content の Lesson を 3 件 addLesson する場合', () => {
      it('lessons.length=3 になる', () => {
        const artifact = createLessonArtifact();
        artifact.addLesson(createLesson({ content: '教訓A' }));
        artifact.addLesson(createLesson({ content: '教訓B' }));
        artifact.addLesson(createLesson({ content: '教訓C' }));
        const actual = artifact;
        expect(actual.lessons).toHaveLength(3);
      });
    });
  });

  describe('addLesson→toJson: 追加した Lesson が JSON に反映されること', () => {
    context('1 件 Lesson を追加後に toJson() を呼ぶ場合', () => {
      it('storyId・lessons が反映された JSON オブジェクトが返される', () => {
        const artifact = createLessonArtifact('H12-04');
        artifact.addLesson(createLesson({ content: '教訓テキスト' }));
        const actual = artifact.toJson();
        expect(actual.storyId).toBe('H12-04');
        expect(actual.lessons).toHaveLength(1);
      });
    });
  });

  describe('addLesson: 同一 content の Lesson を 2 件追加すると DUPLICATE_LESSON_FINGERPRINT（INV-5）', () => {
    context('同一 content の Lesson を 2 件 addLesson する場合', () => {
      it('2 件目で HarnessError(DUPLICATE_LESSON_FINGERPRINT) がスローされる', () => {
        const artifact = createLessonArtifact();
        artifact.addLesson(createLesson({ content: '重複する教訓' }));
        expect(() => artifact.addLesson(createLesson({ content: '重複する教訓' }))).toThrow(
          expect.objectContaining({ code: expect.stringContaining('DUPLICATE_LESSON_FINGERPRINT') }),
        );
      });
    });
  });

  describe('addLesson: content が異なれば両方追加できること（INV-5）', () => {
    context('content が微妙に異なる 2 件を addLesson する場合', () => {
      it('両方追加成功（lessons.length=2）', () => {
        const artifact = createLessonArtifact();
        artifact.addLesson(createLesson({ content: '教訓テキスト A' }));
        artifact.addLesson(createLesson({ content: '教訓テキスト B' }));
        const actual = artifact;
        expect(actual.lessons).toHaveLength(2);
      });
    });
  });

  describe('toJson: Lesson 2 件追加後の JSON 構造が正しいこと', () => {
    context('Lesson 2 件追加後に toJson() を呼ぶ場合', () => {
      it('返却 JSON の lessons 配列が 2 件、各エントリに lessonId/content が含まれる', () => {
        const artifact = createLessonArtifact();
        artifact.addLesson(createLesson({ content: '教訓1' }));
        artifact.addLesson(createLesson({ content: '教訓2' }));
        const actual = artifact.toJson();
        expect(actual.lessons).toHaveLength(2);
        expect(actual.lessons[0]).toMatchObject(
          expect.objectContaining({ lessonId: expect.any(String), content: expect.any(String) }),
        );
      });
    });
  });

  describe('toJson: lessons=[] の状態で toJson() を呼ぶと lessons が空配列', () => {
    context('lessons=[] の状態で toJson() を呼ぶ場合', () => {
      it('lessons が空配列の JSON が返される', () => {
        const artifact = createLessonArtifact();
        const actual = artifact.toJson();
        expect(actual.lessons).toEqual([]);
      });
    });
  });

});
