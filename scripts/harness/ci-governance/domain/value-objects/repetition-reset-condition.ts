/**
 * @layer domain
 * @unit ci-governance
 *
 * RepetitionResetCondition VO
 */

export interface RepetitionResetConditionProps {
  readonly resetOnResolution: boolean;
}

export class RepetitionResetCondition {
  readonly resetOnResolution: boolean;

  private constructor(props: RepetitionResetConditionProps) {
    this.resetOnResolution = props.resetOnResolution;
  }

  static create(props: RepetitionResetConditionProps): RepetitionResetCondition {
    return new RepetitionResetCondition(props);
  }

  equals(other: RepetitionResetCondition): boolean {
    return this.resetOnResolution === other.resetOnResolution;
  }

  isMet(): boolean {
    return this.resetOnResolution;
  }
}
