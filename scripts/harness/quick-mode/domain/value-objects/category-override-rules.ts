/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-372
 *
 * `quickMode.categoryOverrides` を表す値オブジェクト。
 * ChangeCategory 7 値をキー、glob パターン列を値とする写像で、
 * プロジェクト固有パス（`results/**` 等）を任意カテゴリへ割り当てる。
 */

import { QuickModeConfigError } from '../errors/quick-mode-config-error.js';
import {
  CHANGE_CATEGORY_VALUES,
  ChangeCategory,
  type ChangeCategoryValue,
  isChangeCategoryValue,
} from './change-category.js';

/**
 * glob → 正規表現の変換。
 *
 * domain 層は repo 全体で外部 npm パッケージを import していないため
 * （picomatch は infrastructure adapter 専用）、
 * `agent-integration/domain/value-objects/protected-file-list.ts` と同型の
 * 純正規表現実装を採る（logical_design.md LD-10）。
 *
 * サポートする記法:
 * - `**` … `/` を含む任意の文字列
 * - `*`  … `/` を含まない任意の文字列
 * - `?`  … `/` 以外の 1 文字
 * - その他はリテラル（正規表現メタ文字はエスケープ）
 */
function globToRegExp(pattern: string): RegExp {
  const regexSource = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${regexSource}$`);
}

export type CategoryOverrideRulesInput = Readonly<Record<string, readonly string[]>>;

export class CategoryOverrideRules {
  private readonly patterns: ReadonlyMap<ChangeCategoryValue, readonly string[]>;
  private readonly matchers: ReadonlyMap<ChangeCategoryValue, readonly RegExp[]>;

  private constructor(
    patterns: ReadonlyMap<ChangeCategoryValue, readonly string[]>,
    matchers: ReadonlyMap<ChangeCategoryValue, readonly RegExp[]>,
  ) {
    this.patterns = patterns;
    this.matchers = matchers;
    Object.freeze(this);
  }

  static empty(): CategoryOverrideRules {
    return new CategoryOverrideRules(new Map(), new Map());
  }

  static create(raw: CategoryOverrideRulesInput | undefined | null): CategoryOverrideRules {
    if (raw === undefined || raw === null) {
      return CategoryOverrideRules.empty();
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new QuickModeConfigError('categoryOverrides must be an object keyed by change category');
    }

    const patterns = new Map<ChangeCategoryValue, readonly string[]>();
    const matchers = new Map<ChangeCategoryValue, readonly RegExp[]>();

    for (const [key, value] of Object.entries(raw)) {
      if (!isChangeCategoryValue(key)) {
        throw new QuickModeConfigError(
          `categoryOverrides contains unknown category "${key}". Valid values: ${CHANGE_CATEGORY_VALUES.join(', ')}`,
        );
      }
      if (!Array.isArray(value)) {
        throw new QuickModeConfigError(`categoryOverrides.${key} must be an array of glob patterns`);
      }
      for (const pattern of value) {
        if (typeof pattern !== 'string' || pattern.length === 0) {
          throw new QuickModeConfigError(
            `categoryOverrides.${key} must not contain an empty or non-string glob pattern`,
          );
        }
      }
      if (value.length === 0) {
        continue;
      }
      patterns.set(key, Object.freeze([...value]));
      matchers.set(key, Object.freeze(value.map(globToRegExp)));
    }

    return new CategoryOverrideRules(patterns, matchers);
  }

  isEmpty(): boolean {
    return this.matchers.size === 0;
  }

  /**
   * パスに対応する override カテゴリを返す。
   * 一致が無ければ null（組み込み分類へ委譲）。
   * 複数カテゴリに一致した場合はリスク優先度が最も高いカテゴリを返すため、
   * JSON のキー列挙順に依存しない決定的な結果になる（domain_model.md DD-4）。
   */
  resolve(filePath: string): ChangeCategory | null {
    if (filePath === '' || this.matchers.size === 0) {
      return null;
    }

    let resolved: ChangeCategory | null = null;
    let resolvedPriority = -1;

    for (const [category, regexps] of this.matchers) {
      if (!regexps.some((regexp) => regexp.test(filePath))) {
        continue;
      }
      const candidate = ChangeCategory.fromString(category);
      const priority = candidate.riskPriority();
      if (priority > resolvedPriority) {
        resolvedPriority = priority;
        resolved = candidate;
      }
    }

    return resolved;
  }

  /** キーは ChangeCategory 語彙順に正規化する（equals をキー順に依存させないため） */
  toRecord(): Readonly<Record<string, readonly string[]>> {
    const record: Record<string, readonly string[]> = {};
    for (const category of CHANGE_CATEGORY_VALUES) {
      const globs = this.patterns.get(category);
      if (globs !== undefined) {
        record[category] = globs;
      }
    }
    return Object.freeze(record);
  }

  equals(other: CategoryOverrideRules): boolean {
    return JSON.stringify(this.toRecord()) === JSON.stringify(other.toRecord());
  }
}
