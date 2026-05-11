// @unit installation
// @layer domain
// @work-item-id WI-145

export interface ManagedBlockInput {
  readonly start: string;
  readonly end: string;
  readonly content: string;
}

export class ManagedBlock {
  readonly start: string;
  readonly end: string;
  readonly content: string;

  private constructor(input: ManagedBlockInput) {
    if (input.start.trim().length === 0 || input.end.trim().length === 0) {
      throw new Error("ManagedBlock start and end markers are required");
    }
    this.start = input.start;
    this.end = input.end;
    this.content = input.content;
    Object.freeze(this);
  }

  static create(input: ManagedBlockInput): ManagedBlock {
    return new ManagedBlock(input);
  }

  toJSON(): ManagedBlockInput {
    return {
      start: this.start,
      end: this.end,
      content: this.content,
    };
  }
}
