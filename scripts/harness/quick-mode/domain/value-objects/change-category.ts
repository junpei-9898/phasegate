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

/**
 * ChangeCategory の語彙。config の enum 検証や categoryOverrides の
 * キー検証はこの定義を唯一の権威として参照する。
 * @work-item-id WI-372
 */
export const CHANGE_CATEGORY_VALUES: readonly ChangeCategoryValue[] = VALID_CATEGORIES;

/** 与えられた文字列が ChangeCategory の語彙に含まれるか（正規化はしない） */
export function isChangeCategoryValue(raw: string): raw is ChangeCategoryValue {
  return VALID_CATEGORIES.includes(raw as ChangeCategoryValue);
}

// リスク順優先度（api > domain > feature > bugfix > test > config > docs）。
// 複数の分類条件に一致した場合に、より高リスク側へ倒すための順序定義。
// @work-item-id WI-372
const RISK_PRIORITY: Record<ChangeCategoryValue, number> = {
  api: 6,
  domain: 5,
  feature: 4,
  bugfix: 3,
  test: 2,
  config: 1,
  docs: 0,
};

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

  /**
   * リスク優先度。値が大きいほど高リスク（api=6 ... docs=0）。
   * @work-item-id WI-372
   */
  riskPriority(): number {
    return RISK_PRIORITY[this.value];
  }

  toString(): string {
    return this.value;
  }

  equals(other: ChangeCategory): boolean {
    return this.value === other.value;
  }
}
