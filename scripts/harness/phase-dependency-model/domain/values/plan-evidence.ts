/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface PlanEvidenceCreateArgs {
  readonly exists: boolean;
  readonly qaComplete: boolean;
  readonly planningModeMatch: boolean;
}

export class PlanEvidence {
  readonly exists: boolean;
  readonly qaComplete: boolean;
  readonly planningModeMatch: boolean;

  private constructor(args: PlanEvidenceCreateArgs) {
    this.exists = args.exists;
    this.qaComplete = args.qaComplete;
    this.planningModeMatch = args.planningModeMatch;
    Object.freeze(this);
  }

  static create(args: PlanEvidenceCreateArgs): PlanEvidence {
    if (!args.exists && (args.qaComplete || args.planningModeMatch)) {
      throw new Error('存在しないplan文書にQA充足は設定できません');
    }

    return new PlanEvidence(args);
  }

  blocksPhaseTransition(): boolean {
    return !this.exists || !this.qaComplete || !this.planningModeMatch;
  }

  equals(other: PlanEvidence): boolean {
    return (
      this.exists === other.exists &&
      this.qaComplete === other.qaComplete &&
      this.planningModeMatch === other.planningModeMatch
    );
  }
}
