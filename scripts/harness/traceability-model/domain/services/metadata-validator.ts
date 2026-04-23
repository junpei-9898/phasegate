/**
 * @layer domain
 * @unit traceability-model
 */

import type { StoryCatalogPort } from '../ports/story-catalog-port.js';
import type { UnitDefinitionPort } from '../ports/unit-definition-port.js';
import type { DesignDocumentFlags } from '../value-objects/design-document-flags.js';
import {
  MetadataValidationResult,
  type TraceabilityHarnessError,
} from '../value-objects/metadata-validation-result.js';
import type { StoryIdLike } from '../value-objects/story-reference.js';
import type { StoryIdAnnotation } from '../value-objects/story-id-annotation.js';

const STORY_ID_PATTERN = /^H(?:F\d+|[0-9]{2})-[0-9]{2}$/;
const VALID_LAYER_NAMES = new Set([
  'domain',
  'application',
  'infrastructure',
  'presentation',
]);

const createError = (args: {
  readonly message: string;
  readonly suggestion: string;
  readonly fixExample?: string;
}): TraceabilityHarnessError =>
  Object.freeze({
    code: 'L2-002',
    severity: 'error' as const,
    message: args.message,
    suggestion: args.suggestion,
    ...(args.fixExample !== undefined ? { fix_example: args.fixExample } : {}),
  });

const hasStoryId = async (
  port: StoryCatalogPort,
  storyId: StoryIdLike,
): Promise<boolean> => {
  if (typeof port.exists === 'function') {
    return port.exists(storyId);
  }
  if (typeof port.hasStoryId === 'function') {
    return port.hasStoryId(storyId);
  }
  return false;
};

const hasUnit = async (
  port: UnitDefinitionPort,
  unitName: string,
): Promise<boolean> => {
  if (typeof port.exists === 'function') {
    return port.exists(unitName);
  }
  if (typeof port.hasUnit === 'function') {
    return port.hasUnit(unitName);
  }
  return false;
};

export class MetadataValidator {
  private readonly storyCatalogPort: StoryCatalogPort;
  private readonly unitDefinitionPort: UnitDefinitionPort;

  constructor(deps: {
    readonly storyCatalogPort: StoryCatalogPort;
    readonly unitDefinitionPort: UnitDefinitionPort;
  }) {
    this.storyCatalogPort = deps.storyCatalogPort;
    this.unitDefinitionPort = deps.unitDefinitionPort;
  }

  async validateImplementation(input: {
    readonly filePath: unknown;
    readonly tags: ReadonlyArray<{
      readonly type: string;
      readonly value: string;
    }>;
  }): Promise<MetadataValidationResult> {
    const errors: TraceabilityHarnessError[] = [];
    const unitTags = input.tags.filter((tag) => tag.type === '@unit');
    const layerTag = input.tags.find((tag) => tag.type === '@layer');

    if (unitTags.length === 0) {
      errors.push(
        createError({
          message: '@unit が必要です',
          suggestion: '実装ファイルに unit メタデータを追加してください',
          fixExample: '@unit traceability-model',
        }),
      );
    }

    if (!layerTag) {
      errors.push(
        createError({
          message: '@layer が必要です',
          suggestion: '実装ファイルに layer メタデータを追加してください',
          fixExample: '@layer domain',
        }),
      );
    } else if (!VALID_LAYER_NAMES.has(layerTag.value)) {
      errors.push(
        createError({
          message: `@layer "${layerTag.value}" は正規語彙ではありません`,
          suggestion: 'domain/application/infrastructure/presentation を使用してください',
          fixExample: '@layer domain',
        }),
      );
    }

    for (const unitTag of unitTags) {
      if (!(await hasUnit(this.unitDefinitionPort, unitTag.value))) {
        errors.push(
          createError({
            message: `@unit "${unitTag.value}" は unit 定義に存在しません`,
            suggestion: '登録済みの unit 名を指定してください',
            fixExample: '@unit traceability-model',
          }),
        );
      }
    }

    if (errors.length > 0) {
      return MetadataValidationResult.failure(Object.freeze({ errors }));
    }

    return MetadataValidationResult.success();
  }

  async validateDesignDocument(input: {
    readonly documentPath: unknown;
    readonly annotations: readonly StoryIdAnnotation[];
    readonly flags: DesignDocumentFlags;
  }): Promise<MetadataValidationResult> {
    const errors: TraceabilityHarnessError[] = [];

    if (input.flags.requiresStoryIdAnnotation() && input.annotations.length === 0) {
      errors.push(
        createError({
          message: '@story-id は必須です',
          suggestion: '設計文書の対象ストーリーを注釈してください',
          fixExample: '@story-id H03-02',
        }),
      );
      return MetadataValidationResult.failure(Object.freeze({ errors }));
    }

    if (input.annotations.length === 0) {
      return MetadataValidationResult.success();
    }

    for (const annotation of input.annotations) {
      if (!annotation.isStandalone()) {
        errors.push(
          createError({
            message: '@story-id は独立行で記述する必要があります',
            suggestion: '注釈行を単独行に分離してください',
            fixExample: '@story-id H03-02',
          }),
        );
        continue;
      }

      if (annotation.contextLine.trim().length === 0) {
        errors.push(
          createError({
            message: '@story-id の直後に設計要素行が必要です',
            suggestion: '空行を挟まずに設計要素を記述してください',
            fixExample: '@story-id H03-02',
          }),
        );
        continue;
      }

      if (!(await hasStoryId(this.storyCatalogPort, annotation.storyId))) {
        errors.push(
          createError({
            message: `StoryId "${annotation.storyId.value}" は StoryCatalog に存在しません`,
            suggestion: 'user_stories.md に存在する StoryId を指定してください',
            fixExample: '@story-id H03-02',
          }),
        );
      }
    }

    if (errors.length > 0) {
      return MetadataValidationResult.failure(Object.freeze({ errors }));
    }

    return MetadataValidationResult.success();
  }

  async validateTest(input: {
    readonly filePath: unknown;
    readonly tags: ReadonlyArray<{
      readonly type: string;
      readonly value: string;
    }>;
  }): Promise<MetadataValidationResult> {
    const errors: TraceabilityHarnessError[] = [];
    const storyTags = input.tags.filter((tag) => tag.type === '@story');

    if (storyTags.length === 0) {
      errors.push(
        createError({
          message: '@story が必要です',
          suggestion: 'テストファイルに対象 StoryId を宣言してください',
          fixExample: '// @story H03-03',
        }),
      );
      return MetadataValidationResult.failure(Object.freeze({ errors }));
    }

    for (const tag of storyTags) {
      const normalizedValue = tag.value.trim();
      if (!STORY_ID_PATTERN.test(normalizedValue)) {
        errors.push(
          createError({
            message: `@story "${tag.value}" は HXX-XX 形式ではありません`,
            suggestion: '正規 StoryId を指定してください',
            fixExample: '// @story H03-03',
          }),
        );
        continue;
      }

      const storyId = Object.freeze({
        value: normalizedValue,
        equals(other: { readonly value: string }) {
          return other.value === normalizedValue;
        },
      });

      if (!(await hasStoryId(this.storyCatalogPort, storyId))) {
        errors.push(
          createError({
            message: `StoryId "${normalizedValue}" は StoryCatalog に存在しません`,
            suggestion: '存在する StoryId に修正してください',
            fixExample: '// @story H03-03',
          }),
        );
      }
    }

    if (errors.length > 0) {
      return MetadataValidationResult.failure(Object.freeze({ errors }));
    }

    return MetadataValidationResult.success();
  }
}
