/**
 * @layer domain
 * @unit phase-dependency-model
 */

export type PlanningModeValue = 'interactive' | 'embedded-qa';

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
    if (value !== 'interactive' && value !== 'embedded-qa') {
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
    return PlanningMode.create(value ?? '');
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
