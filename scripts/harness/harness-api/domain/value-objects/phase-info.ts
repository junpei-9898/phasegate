// phase-info.ts — PhaseInfo Value Object

export interface PhaseInfoProps {
  unitId: string;
  currentLevel: number;
  currentPhase: string;
  completedGates: readonly string[];
}

export class PhaseInfo {
  readonly unitId: string;
  readonly currentLevel: number;
  readonly currentPhase: string;
  readonly completedGates: readonly string[];

  private constructor(props: PhaseInfoProps) {
    this.unitId = props.unitId;
    this.currentLevel = props.currentLevel;
    this.currentPhase = props.currentPhase;
    this.completedGates = Object.freeze([...props.completedGates]);
    Object.freeze(this);
  }

  static create(props: PhaseInfoProps): PhaseInfo {
    if (!props.unitId || props.unitId.trim() === '') {
      throw new Error('HarnessApiDomainError: unitId must not be empty');
    }
    if (props.currentLevel <= 0 || !Number.isInteger(props.currentLevel)) {
      throw new Error(`HarnessApiDomainError: currentLevel must be a positive integer, got ${props.currentLevel}`);
    }
    return new PhaseInfo(props);
  }

  hasCompletedGate(gateName: string): boolean {
    return this.completedGates.includes(gateName);
  }
}
