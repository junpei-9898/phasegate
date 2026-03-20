/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export interface FreshnessThresholdProps {
  warnThresholdDays: number;
  errorThresholdDays: number;
}

export class FreshnessThreshold {
  readonly warnThresholdDays: number;
  readonly errorThresholdDays: number;

  private constructor(props: FreshnessThresholdProps) {
    this.warnThresholdDays = props.warnThresholdDays;
    this.errorThresholdDays = props.errorThresholdDays;
    Object.freeze(this);
  }

  static create(props: FreshnessThresholdProps): FreshnessThreshold {
    if (!Number.isInteger(props.warnThresholdDays) || props.warnThresholdDays < 1) {
      throw new Phase2ExtensionsDomainError('L4-201', 'warnThresholdDays は 1 以上の整数である必要があります');
    }
    if (!Number.isInteger(props.errorThresholdDays) || props.errorThresholdDays < 1) {
      throw new Phase2ExtensionsDomainError('L4-202', 'errorThresholdDays は 1 以上の整数である必要があります');
    }
    if (props.warnThresholdDays >= props.errorThresholdDays) {
      throw new Phase2ExtensionsDomainError('L4-203', 'warnThresholdDays は errorThresholdDays より小さい必要があります');
    }

    return new FreshnessThreshold(props);
  }

  equals(other: FreshnessThreshold): boolean {
    return (
      this.warnThresholdDays === other.warnThresholdDays &&
      this.errorThresholdDays === other.errorThresholdDays
    );
  }
}
