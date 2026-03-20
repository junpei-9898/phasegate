/**
 * @layer domain
 * @unit skill-quality
 *
 * LessonArtifact 集約ルート
 */
import type { Lesson } from '../value-objects/lesson.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export interface LessonArtifactJson {
  readonly storyId: string;
  readonly lessons: readonly {
    readonly lessonId: string;
    readonly content: string;
    readonly source: string;
    readonly tags: readonly string[];
    readonly timestamp: string;
  }[];
}

export class LessonArtifact {
  readonly storyId: string;
  readonly lessons: Lesson[];
  private readonly fingerprintSet: Set<string>;

  private constructor(storyId: string) {
    this.storyId = storyId;
    this.lessons = [];
    this.fingerprintSet = new Set();
  }

  static create(storyId: string): LessonArtifact {
    if (!storyId || !/^H\d+-\d+$/.test(storyId)) {
      throw new SkillQualityError('INVALID_STORY_ID', 'storyId must be non-empty and match HXX-XX format');
    }
    return new LessonArtifact(storyId);
  }

  addLesson(lesson: Lesson): void {
    if (this.fingerprintSet.has(lesson.fingerprint.value)) {
      throw new SkillQualityError('DUPLICATE_LESSON_FINGERPRINT', 'Lesson with same fingerprint already exists');
    }
    this.lessons.push(lesson);
    this.fingerprintSet.add(lesson.fingerprint.value);
  }

  toJson(): LessonArtifactJson {
    return Object.freeze({
      storyId: this.storyId,
      lessons: this.lessons.map((l) => ({
        lessonId: l.lessonId,
        content: l.content,
        source: l.sourceContext.description,
        tags: l.tags,
        timestamp: l.timestamp,
      })),
    });
  }
}
