/**
 * @layer domain
 * @unit quick-mode
 *
 * Quick Mode設定を表す値オブジェクト
 */

export class QuickModeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuickModeConfigError';
  }
}


export class QuickModeConfig {
  readonly allowedCategories: readonly string[];
  readonly maintainedLayers: readonly string[];
  readonly relaxedGates: readonly string[];

  private constructor(
    allowedCategories: readonly string[],
    maintainedLayers: readonly string[],
    relaxedGates: readonly string[]
  ) {
    this.allowedCategories = allowedCategories;
    this.maintainedLayers = maintainedLayers;
    this.relaxedGates = relaxedGates;
    Object.freeze(this);
  }

  static create(raw: {
    allowedCategories: string[];
    maintainedLayers: string[];
    relaxedGates: string[];
  }): QuickModeConfig {
    const { allowedCategories, maintainedLayers, relaxedGates } = raw;

    if (allowedCategories.length === 0) {
      throw new QuickModeConfigError('allowedCategories must not be empty');
    }

    return new QuickModeConfig(
      Object.freeze([...allowedCategories]),
      Object.freeze([...maintainedLayers]),
      Object.freeze([...relaxedGates])
    );
  }

  isAllowed(category: string): boolean {
    return this.allowedCategories.includes(category);
  }

  isMaintained(validatorId: string): boolean {
    return this.maintainedLayers.includes(validatorId);
  }

  isRelaxed(validatorId: string): boolean {
    return this.relaxedGates.includes(validatorId);
  }

  equals(other: QuickModeConfig): boolean {
    return (
      JSON.stringify(this.allowedCategories) === JSON.stringify(other.allowedCategories) &&
      JSON.stringify(this.maintainedLayers) === JSON.stringify(other.maintainedLayers) &&
      JSON.stringify(this.relaxedGates) === JSON.stringify(other.relaxedGates)
    );
  }
}
