/**
 * @layer domain
 * @unit quick-mode
 *
 * Quick Mode設定を表す値オブジェクト
 */

import { QuickModeConfigError } from '../errors/quick-mode-config-error.js';
import {
  CategoryOverrideRules,
  type CategoryOverrideRulesInput,
} from './category-override-rules.js';
import { CHANGE_CATEGORY_VALUES, isChangeCategoryValue } from './change-category.js';

export { QuickModeConfigError };

export type FullModeRequiredRuleId = 'mixedCategories' | 'newDomainFile' | 'apiContractChange';

export interface FullModeRequiredRules {
  readonly mixedCategories: boolean;
  readonly newDomainFile: boolean;
  readonly apiContractChange: boolean;
}

const DEFAULT_FULL_MODE_REQUIRED_WHEN: FullModeRequiredRules = Object.freeze({
  mixedCategories: true,
  newDomainFile: true,
  apiContractChange: true,
});


export class QuickModeConfig {
  readonly allowedCategories: readonly string[];
  readonly maintainedLayers: readonly string[];
  readonly relaxedGates: readonly string[];
  readonly fullModeRequiredWhen: FullModeRequiredRules;
  /** @work-item-id WI-372 プロジェクト固有パスのカテゴリ割当ルール（未設定時は空） */
  readonly categoryOverrides: CategoryOverrideRules;

  private constructor(
    allowedCategories: readonly string[],
    maintainedLayers: readonly string[],
    relaxedGates: readonly string[],
    fullModeRequiredWhen: FullModeRequiredRules,
    categoryOverrides: CategoryOverrideRules
  ) {
    this.allowedCategories = allowedCategories;
    this.maintainedLayers = maintainedLayers;
    this.relaxedGates = relaxedGates;
    this.fullModeRequiredWhen = fullModeRequiredWhen;
    this.categoryOverrides = categoryOverrides;
    Object.freeze(this);
  }

  static create(raw: {
    allowedCategories: string[];
    maintainedLayers: string[];
    relaxedGates: string[];
    fullModeRequiredWhen?: Partial<FullModeRequiredRules>;
    categoryOverrides?: CategoryOverrideRulesInput;
  }): QuickModeConfig {
    const { allowedCategories, maintainedLayers, relaxedGates, fullModeRequiredWhen, categoryOverrides } = raw;

    if (allowedCategories.length === 0) {
      throw new QuickModeConfigError('allowedCategories must not be empty');
    }

    // WI-373: allowedCategories は ChangeCategory 7 値の enum。
    // 従来は非空チェックのみだったため "typoo" のような未知値が黙って通り、
    // 「設定したのに効かない」状態になっていた。分類結果のキーは常に小文字なので
    // 大文字小文字の正規化はせず厳密一致で拒否する（正規化は効かない設定の黙認になる）。
    for (const category of allowedCategories) {
      if (!isChangeCategoryValue(category)) {
        throw new QuickModeConfigError(
          `allowedCategories contains unknown category "${category}". Valid values: ${CHANGE_CATEGORY_VALUES.join(', ')}`
        );
      }
    }

    const mergedRules: FullModeRequiredRules = Object.freeze({
      mixedCategories: fullModeRequiredWhen?.mixedCategories ?? DEFAULT_FULL_MODE_REQUIRED_WHEN.mixedCategories,
      newDomainFile: fullModeRequiredWhen?.newDomainFile ?? DEFAULT_FULL_MODE_REQUIRED_WHEN.newDomainFile,
      apiContractChange: fullModeRequiredWhen?.apiContractChange ?? DEFAULT_FULL_MODE_REQUIRED_WHEN.apiContractChange,
    });

    return new QuickModeConfig(
      Object.freeze([...allowedCategories]),
      Object.freeze([...maintainedLayers]),
      Object.freeze([...relaxedGates]),
      mergedRules,
      CategoryOverrideRules.create(categoryOverrides)
    );
  }

  isAllowed(category: string): boolean {
    return this.allowedCategories.includes(category);
  }

  isMaintained(validatorId: string): boolean {
    // maintainedLayers の各エントリ P について、レイヤー名エントリ（例 "L2"）は
    // そのレイヤーの全 ID（例 "L2-002"）にマッチし、ID 完全一致（例 "L2-002"）も
    // 引き続きサポートする。
    return this.maintainedLayers.some(
      (entry) => validatorId === entry || validatorId.startsWith(`${entry}-`)
    );
  }

  isRelaxed(validatorId: string): boolean {
    return this.relaxedGates.includes(validatorId);
  }

  isFullModeRequiredFor(rule: FullModeRequiredRuleId): boolean {
    return this.fullModeRequiredWhen[rule];
  }

  equals(other: QuickModeConfig): boolean {
    return (
      JSON.stringify(this.allowedCategories) === JSON.stringify(other.allowedCategories) &&
      JSON.stringify(this.maintainedLayers) === JSON.stringify(other.maintainedLayers) &&
      JSON.stringify(this.relaxedGates) === JSON.stringify(other.relaxedGates) &&
      this.fullModeRequiredWhen.mixedCategories === other.fullModeRequiredWhen.mixedCategories &&
      this.fullModeRequiredWhen.newDomainFile === other.fullModeRequiredWhen.newDomainFile &&
      this.fullModeRequiredWhen.apiContractChange === other.fullModeRequiredWhen.apiContractChange &&
      this.categoryOverrides.equals(other.categoryOverrides)
    );
  }
}
