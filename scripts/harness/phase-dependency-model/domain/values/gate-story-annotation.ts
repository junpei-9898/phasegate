/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface GateStoryAnnotationCreateArgs {
  readonly required: boolean;
  readonly tag: string;
}

export class InvalidGateStoryAnnotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGateStoryAnnotationError';
  }
}

export class GateStoryAnnotation {
  readonly required: boolean;
  readonly tag: string;

  private constructor(args: GateStoryAnnotationCreateArgs) {
    this.required = args.required;
    this.tag = args.tag.trim();
    Object.freeze(this);
  }

  static create(args: GateStoryAnnotationCreateArgs): GateStoryAnnotation {
    if (args.tag.trim().length === 0) {
      throw new InvalidGateStoryAnnotationError('tagは必須です');
    }

    return new GateStoryAnnotation(args);
  }

  equals(other: GateStoryAnnotation): boolean {
    return this.required === other.required && this.tag === other.tag;
  }
}
