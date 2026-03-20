/**
 * @layer domain
 * @unit skill-quality
 */
import { createHash } from 'node:crypto';

export class LessonFingerprint {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static fromContent(content: string): LessonFingerprint {
    // Normalize: NFC → full-width space to half-width → collapse whitespace → trim
    const normalized = content
      .normalize('NFC')
      .replace(/\u3000/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const hash = createHash('sha256').update(normalized, 'utf8').digest('hex');
    return new LessonFingerprint(hash);
  }

  equals(other: LessonFingerprint): boolean {
    return this.value === other.value;
  }
}
