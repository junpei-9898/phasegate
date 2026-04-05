/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface StoryReflectionMappingCreateArgs {
  readonly inception: string;
  readonly product: string;
  readonly required: boolean;
}

export class InvalidStoryReflectionMappingError extends Error {
  constructor(message: string) {
    super(`StoryReflectionMapping が不正です: ${message}`);
    this.name = 'InvalidStoryReflectionMappingError';
  }
}

export class StoryReflectionMapping {
  readonly inception: string;
  readonly product: string;
  readonly required: boolean;

  private constructor(args: StoryReflectionMappingCreateArgs) {
    this.inception = args.inception;
    this.product = args.product;
    this.required = args.required;
    Object.freeze(this);
  }

  static create(args: StoryReflectionMappingCreateArgs): StoryReflectionMapping {
    const inception = args.inception.trim();
    const product = args.product.trim();

    if (!inception.startsWith('docs/inception/')) {
      throw new InvalidStoryReflectionMappingError(
        `inception は docs/inception/ で始まる必要があります: ${inception}`,
      );
    }

    if (!product.startsWith('docs/product/')) {
      throw new InvalidStoryReflectionMappingError(
        `product は docs/product/ で始まる必要があります: ${product}`,
      );
    }

    if (!inception.includes('{storyId}')) {
      throw new InvalidStoryReflectionMappingError(
        `inception に {storyId} プレースホルダが必要です: ${inception}`,
      );
    }

    if (!inception.includes('{unit}')) {
      throw new InvalidStoryReflectionMappingError(
        `inception に {unit} プレースホルダが必要です: ${inception}`,
      );
    }

    if (!product.includes('{unit}')) {
      throw new InvalidStoryReflectionMappingError(
        `product に {unit} プレースホルダが必要です: ${product}`,
      );
    }

    return new StoryReflectionMapping({
      inception,
      product,
      required: args.required,
    });
  }

  resolve(scope: { unitId: string; storyId: string }): { inception: string; product: string } {
    const inception = this.inception
      .replaceAll('{unit}', scope.unitId)
      .replaceAll('{storyId}', scope.storyId);

    const product = this.product
      .replaceAll('{unit}', scope.unitId)
      .replaceAll('{storyId}', scope.storyId);

    return { inception, product };
  }

  equals(other: StoryReflectionMapping): boolean {
    return (
      this.inception === other.inception &&
      this.product === other.product &&
      this.required === other.required
    );
  }
}
