/**
 * @layer domain
 * @unit traceability-model
 *
 * ソースコードやテストコードから抽出したメタデータタグ
 */
import {
  METADATA_TAG_TYPES,
  type MetadataTagType,
} from '../constants/metadata-tag-types.js';
import type { ProjectRelativePath } from './project-relative-path.js';

const METADATA_TAG_TYPE_SET = new Set<string>(METADATA_TAG_TYPES);

export interface MetadataTagCreateArgs {
  readonly type: string;
  readonly value: string;
  readonly lineNumber: number;
  readonly filePath?: ProjectRelativePath | null;
}

export class MetadataTag {
  readonly type: MetadataTagType;
  readonly value: string;
  readonly lineNumber: number;
  readonly filePath: ProjectRelativePath | null;

  private constructor(args: {
    readonly type: MetadataTagType;
    readonly value: string;
    readonly lineNumber: number;
    readonly filePath: ProjectRelativePath | null;
  }) {
    this.type = args.type;
    this.value = args.value;
    this.lineNumber = args.lineNumber;
    this.filePath = args.filePath;
    Object.freeze(this);
  }

  static create(args: MetadataTagCreateArgs): MetadataTag {
    const normalizedValue = args.value.trim();

    if (!METADATA_TAG_TYPE_SET.has(args.type)) {
      throw new Error(`MetadataTag.typeが不正です: ${args.type}`);
    }

    if (normalizedValue.length === 0) {
      throw new Error('MetadataTag.valueは空文字を許可しません');
    }

    if (!Number.isInteger(args.lineNumber) || args.lineNumber < 1) {
      throw new Error(`MetadataTag.lineNumberは1以上の整数である必要があります: ${args.lineNumber}`);
    }

    return new MetadataTag({
      type: args.type as MetadataTagType,
      value: normalizedValue,
      lineNumber: args.lineNumber,
      filePath: args.filePath ?? null,
    });
  }

  isUnitTag(): boolean {
    return this.type === '@unit';
  }

  isLayerTag(): boolean {
    return this.type === '@layer';
  }

  isStoryIdTag(): boolean {
    return this.type === '@story-id';
  }

  isStoryTag(): boolean {
    return this.type === '@story';
  }

  equals(other: MetadataTag): boolean {
    const filePathEquals =
      this.filePath === null
        ? other.filePath === null
        : other.filePath !== null && this.filePath.equals(other.filePath);

    return (
      this.type === other.type &&
      this.value === other.value &&
      this.lineNumber === other.lineNumber &&
      filePathEquals
    );
  }
}
