/**
 * @layer domain
 * @unit config-foundation
 *
 * QuickMode設定を表す値オブジェクト
 * 各配列は重複不可、入力順を保持する
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

export interface QuickModeConfigProps {
  readonly allowedCategories: readonly string[];
  readonly maintainedLayers: readonly string[];
  readonly relaxedGates: readonly string[];
}

export class QuickModeConfig {
  readonly allowedCategories: readonly string[];
  readonly maintainedLayers: readonly string[];
  readonly relaxedGates: readonly string[];

  constructor(props: QuickModeConfigProps) {
    QuickModeConfig.validateNoDuplicates(props.allowedCategories, 'allowedCategories');
    QuickModeConfig.validateNoDuplicates(props.maintainedLayers, 'maintainedLayers');
    QuickModeConfig.validateNoDuplicates(props.relaxedGates, 'relaxedGates');

    this.allowedCategories = [...props.allowedCategories];
    this.maintainedLayers = [...props.maintainedLayers];
    this.relaxedGates = [...props.relaxedGates];
  }

  private static validateNoDuplicates(arr: readonly string[], fieldName: string): void {
    const unique = new Set(arr);
    if (unique.size !== arr.length) {
      throw new ConfigValidationError(
        `${fieldName} に重複する要素があります`
      );
    }
  }

  static create(raw: QuickModeConfigProps): QuickModeConfig {
    return new QuickModeConfig(raw);
  }

  allows(category: string): boolean {
    return this.allowedCategories.includes(category);
  }

  maintains(layerId: string): boolean {
    return this.maintainedLayers.includes(layerId);
  }

  equals(other: QuickModeConfig): boolean {
    return (
      this.arraysEqual(this.allowedCategories, other.allowedCategories) &&
      this.arraysEqual(this.maintainedLayers, other.maintainedLayers) &&
      this.arraysEqual(this.relaxedGates, other.relaxedGates)
    );
  }

  private arraysEqual(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }
}
