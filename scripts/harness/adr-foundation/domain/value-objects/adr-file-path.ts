/**
 * @layer domain
 * @unit adr-foundation
 */
import { AdrId } from './adr-id.js';

const ADR_FILE_PATH_PATTERN = /^docs\/ADR\/[0-9]{3}-[a-z0-9-]+\.md$/;

export class InvalidAdrFilePathError extends Error {
  constructor(value: string) {
    super(`ADRファイルパスは docs/ADR/{NNN}-{slug}.md 形式で指定してください: ${value}`);
    this.name = 'InvalidAdrFilePathError';
  }
}

export class AdrFilePath {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(path: string): AdrFilePath {
    if (path === 'docs/ADR/template.md') {
      throw new InvalidAdrFilePathError(path);
    }

    if (!ADR_FILE_PATH_PATTERN.test(path)) {
      throw new InvalidAdrFilePathError(path);
    }

    return new AdrFilePath(path);
  }

  static fromAdr(adrId: AdrId, title: string): AdrFilePath {
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    const normalizedSlug = slug.length > 0 ? slug : 'untitled';
    return AdrFilePath.create(`docs/ADR/${adrId.value}-${normalizedSlug}.md`);
  }

  getAdrId(): AdrId {
    const match = /^docs\/ADR\/(?<id>[0-9]{3})-/.exec(this.value);
    return AdrId.create(match?.groups?.id ?? '');
  }

  toString(): string {
    return this.value;
  }

  equals(other: AdrFilePath): boolean {
    return this.value === other.value;
  }
}
