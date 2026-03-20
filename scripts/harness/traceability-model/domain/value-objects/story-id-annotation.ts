/**
 * @layer domain
 * @unit traceability-model
 */

import type { StoryIdLike } from './story-reference.js';

export interface StoryIdAnnotationArgs {
  readonly storyId: StoryIdLike;
  readonly lineNumber: number;
  readonly contextLine: string;
  readonly standaloneLine: boolean;
}

export class StoryIdAnnotation {
  readonly storyId: StoryIdLike;
  readonly lineNumber: number;
  readonly contextLine: string;
  readonly standaloneLine: boolean;

  private constructor(args: StoryIdAnnotationArgs) {
    this.storyId = args.storyId;
    this.lineNumber = args.lineNumber;
    this.contextLine = args.contextLine;
    this.standaloneLine = args.standaloneLine;
    Object.freeze(this);
  }

  static create(args: StoryIdAnnotationArgs): StoryIdAnnotation {
    if (!Number.isInteger(args.lineNumber) || args.lineNumber < 1) {
      throw new Error('lineNumber must be greater than or equal to 1');
    }

    return new StoryIdAnnotation(args);
  }

  isStandalone(): boolean {
    return this.standaloneLine;
  }

  equals(other: StoryIdAnnotation): boolean {
    return (
      this.storyId.equals(other.storyId) &&
      this.lineNumber === other.lineNumber &&
      this.contextLine === other.contextLine &&
      this.standaloneLine === other.standaloneLine
    );
  }
}
