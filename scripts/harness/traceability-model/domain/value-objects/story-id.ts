/**
 * @layer domain
 * @unit traceability-model
 *
 * HXX-XX形式の正規ストーリーID
 */
const STORY_ID_PATTERN = /^H(?<epicNumber>[0-9]{2})-(?<storyNumber>[0-9]{2})$/;

export class StoryIdFormatError extends Error {
  constructor(value: string) {
    super(`StoryIdはHXX-XX形式で指定してください: ${value}`);
    this.name = 'StoryIdFormatError';
  }
}

export class StoryId {
  readonly value: string;
  readonly epicNumber: string;
  readonly storyNumber: string;

  private constructor(value: string, epicNumber: string, storyNumber: string) {
    this.value = value;
    this.epicNumber = epicNumber;
    this.storyNumber = storyNumber;
    Object.freeze(this);
  }

  static parse(value: string): StoryId {
    const normalizedValue = value.trim();
    const match = STORY_ID_PATTERN.exec(normalizedValue);

    if (!match?.groups) {
      throw new StoryIdFormatError(value);
    }

    return new StoryId(normalizedValue, match.groups.epicNumber, match.groups.storyNumber);
  }

  static isValid(value: string): boolean {
    return STORY_ID_PATTERN.test(value.trim());
  }

  toString(): string {
    return this.value;
  }

  getEpicNumber(): string {
    return this.epicNumber;
  }

  getStoryNumber(): string {
    return this.storyNumber;
  }

  equals(other: StoryId): boolean {
    return this.value === other.value;
  }
}
