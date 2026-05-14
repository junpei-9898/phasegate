/**
 * @layer domain
 * @unit phase-dependency-model
 */

export type PlanningModeValue = 'interactive' | 'embedded-qa' | 'manual';

export class InvalidPlanningModeError extends Error {
  constructor(value: string) {
    super(`PlanningModeが不正です: ${value}`);
    this.name = 'InvalidPlanningModeError';
  }
}

export class PlanningMode {
  readonly value: PlanningModeValue;

  private constructor(value: PlanningModeValue) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): PlanningMode {
    if (value !== 'interactive' && value !== 'embedded-qa' && value !== 'manual') {
      throw new InvalidPlanningModeError(value);
    }

    return new PlanningMode(value);
  }

  static fromConfig(
    config:
      | string
      | {
          readonly default?: string;
          readonly mode?: string;
          readonly planningMode?: string;
        },
  ): PlanningMode {
    if (typeof config === 'string') {
      return PlanningMode.create(config);
    }

    const value = config.default ?? config.mode ?? config.planningMode;
    // 値が未設定の場合はデフォルト値 'interactive' を使用する
    return PlanningMode.create(value ?? 'interactive');
  }

  requiresAnsweredQa(): boolean {
    return this.value === 'embedded-qa';
  }

  requiresQaSection(): boolean {
    return this.value === 'interactive';
  }

  equals(other: PlanningMode): boolean {
    return this.value === other.value;
  }
}
