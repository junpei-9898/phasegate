/**
 * @layer domain
 * @unit traceability-model
 */

export interface StoryIdLike {
  readonly value: string;
  equals(other: { readonly value: string }): boolean;
}

export interface StoryReferenceArgs {
  readonly storyId: StoryIdLike;
}

export class StoryReference {
  readonly storyId: StoryIdLike;
  readonly resolved: boolean;

  private constructor(storyId: StoryIdLike, resolved: boolean) {
    this.storyId = storyId;
    this.resolved = resolved;
    Object.freeze(this);
  }

  static resolved(args: StoryReferenceArgs): StoryReference {
    return new StoryReference(args.storyId, true);
  }

  static unresolved(args: StoryReferenceArgs): StoryReference {
    return new StoryReference(args.storyId, false);
  }

  isResolved(): boolean {
    return this.resolved;
  }

  equals(other: StoryReference): boolean {
    return this.resolved === other.resolved && this.storyId.equals(other.storyId);
  }
}
