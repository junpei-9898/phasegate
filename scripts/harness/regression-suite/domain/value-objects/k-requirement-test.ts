export interface KRequirementTestProps {
  kNumber: string;
  targetUnit: string;
  verificationCondition: string;
}

const VALID_K_NUMBERS: ReadonlySet<string> = new Set([
  'K1', 'K2', 'K3', 'K3.5', 'K4', 'K5', 'K6', 'K7', 'K8',
  'K9', 'K10', 'K11', 'K12', 'K13', 'K14', 'K15',
]);

export class KRequirementTest {
  readonly kNumber: string;
  readonly targetUnit: string;
  readonly verificationCondition: string;

  private constructor(props: KRequirementTestProps) {
    this.kNumber = props.kNumber;
    this.targetUnit = props.targetUnit;
    this.verificationCondition = props.verificationCondition;
    Object.freeze(this);
  }

  static create(props: KRequirementTestProps): KRequirementTest {
    if (!VALID_K_NUMBERS.has(props.kNumber)) {
      throw new Error(`InvalidKNumberError: '${props.kNumber}' is not a valid K number (K1-K15, K3.5)`);
    }
    if (!props.targetUnit || props.targetUnit.trim().length === 0) {
      throw new Error('InvalidKRequirementTestError: targetUnit must not be empty');
    }
    if (!props.verificationCondition || props.verificationCondition.trim().length === 0) {
      throw new Error('InvalidKRequirementTestError: verificationCondition must not be empty');
    }
    return new KRequirementTest(props);
  }

  equals(other: KRequirementTest): boolean {
    return (
      this.kNumber === other.kNumber &&
      this.targetUnit === other.targetUnit &&
      this.verificationCondition === other.verificationCondition
    );
  }
}
