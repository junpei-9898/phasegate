/**
 * @layer domain
 * @unit quick-mode
 *
 * 変更カテゴリを表す値オブジェクト
 */

export type ChangeCategoryValue =
  | 'bugfix'
  | 'docs'
  | 'test'
  | 'config'
  | 'feature'
  | 'domain'
  | 'api';

const VALID_CATEGORIES: readonly ChangeCategoryValue[] = [
  'bugfix',
  'docs',
  'test',
  'config',
  'feature',
  'domain',
  'api',
] as const;

export class UnknownChangeCategoryError extends Error {
  constructor(raw: string) {
    super(`Unknown change category: "${raw}". Valid values: ${VALID_CATEGORIES.join(', ')}`);
    this.name = 'UnknownChangeCategoryError';
  }
}

export class ChangeCategory {
  private readonly value: ChangeCategoryValue;

  private constructor(value: ChangeCategoryValue) {
    this.value = value;
  }

  static fromString(raw: string): ChangeCategory {
    const normalized = raw.toLowerCase();
    if (!VALID_CATEGORIES.includes(normalized as ChangeCategoryValue)) {
      throw new UnknownChangeCategoryError(raw);
    }
    return new ChangeCategory(normalized as ChangeCategoryValue);
  }

  isQuickModeRejectable(): boolean {
    return this.value === 'domain' || this.value === 'feature' || this.value === 'api';
  }

  toString(): string {
    return this.value;
  }

  equals(other: ChangeCategory): boolean {
    return this.value === other.value;
  }
}
