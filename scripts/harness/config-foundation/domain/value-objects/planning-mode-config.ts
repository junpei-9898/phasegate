/**
 * @layer domain
 * @unit config-foundation
 *
 * Planning Mode設定を表す値オブジェクト
 * defaultMode と perPhase の値は列挙値 "interactive" | "embedded-qa" のみ許容
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

const VALID_MODES = ['interactive', 'embedded-qa'] as const;
type PlanningMode = (typeof VALID_MODES)[number];

export interface PlanningModeConfigProps {
  readonly default: string;
  readonly perPhase: Readonly<Record<string, string>>;
}

export class PlanningModeConfig {
  readonly defaultMode: PlanningMode;
  readonly perPhase: Readonly<Record<string, PlanningMode>>;

  constructor(props: PlanningModeConfigProps) {
    if (!PlanningModeConfig.isValidMode(props.default)) {
      throw new ConfigValidationError(
        `defaultMode の値 "${props.default}" は無効です。有効値: ${VALID_MODES.join(', ')}`
      );
    }

    const perPhase: Record<string, PlanningMode> = {};
    for (const [phase, mode] of Object.entries(props.perPhase)) {
      if (!PlanningModeConfig.isValidMode(mode)) {
        throw new ConfigValidationError(
          `perPhase.${phase} の値 "${mode}" は無効です。有効値: ${VALID_MODES.join(', ')}`
        );
      }
      perPhase[phase] = mode as PlanningMode;
    }

    this.defaultMode = props.default as PlanningMode;
    this.perPhase = Object.freeze({ ...perPhase });
  }

  private static isValidMode(value: string): value is PlanningMode {
    return (VALID_MODES as readonly string[]).includes(value);
  }

  static create(raw: PlanningModeConfigProps): PlanningModeConfig {
    return new PlanningModeConfig(raw);
  }

  resolveFor(phase: string): PlanningMode {
    return this.perPhase[phase] ?? this.defaultMode;
  }

  equals(other: PlanningModeConfig): boolean {
    if (this.defaultMode !== other.defaultMode) return false;
    const thisKeys = Object.keys(this.perPhase).sort();
    const otherKeys = Object.keys(other.perPhase).sort();
    if (thisKeys.length !== otherKeys.length) return false;
    return thisKeys.every(
      (key, idx) =>
        key === otherKeys[idx] && this.perPhase[key] === other.perPhase[key]
    );
  }
}
