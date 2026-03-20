/**
 * @layer domain
 * @unit skill-quality
 */
import { randomUUID } from 'node:crypto';
import { LessonFingerprint } from './lesson-fingerprint.js';
import type { SourceContext } from './source-context.js';
import type { ISODateString } from '../types/iso-date-string.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export type LessonCategory = string;

export interface LessonCreateProps {
  content: string;
  sourceContext: SourceContext;
  tags: readonly LessonCategory[];
}

export class Lesson {
  readonly lessonId: string;
  readonly content: string;
  readonly sourceContext: SourceContext;
  readonly fingerprint: LessonFingerprint;
  readonly tags: readonly LessonCategory[];
  readonly timestamp: ISODateString;

  private constructor(
    lessonId: string,
    content: string,
    sourceContext: SourceContext,
    fingerprint: LessonFingerprint,
    tags: readonly LessonCategory[],
    timestamp: ISODateString,
  ) {
    this.lessonId = lessonId;
    this.content = content;
    this.sourceContext = sourceContext;
    this.fingerprint = fingerprint;
    this.tags = tags;
    this.timestamp = timestamp;
    Object.freeze(this);
  }

  static create(props: LessonCreateProps): Lesson {
    if (!props.content) {
      throw new SkillQualityError('EMPTY_LESSON_CONTENT', 'content must be non-empty');
    }
    const lessonId = randomUUID();
    const fingerprint = LessonFingerprint.fromContent(props.content);
    const timestamp = new Date().toISOString();
    return new Lesson(lessonId, props.content, props.sourceContext, fingerprint, props.tags, timestamp);
  }

  equals(other: Lesson): boolean {
    return this.fingerprint.equals(other.fingerprint);
  }
}
