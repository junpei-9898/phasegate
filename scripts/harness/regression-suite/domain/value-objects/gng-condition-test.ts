export interface GngConditionTestProps {
  gngNumber: string;
  targetUnit: string;
  verificationCondition: string;
}

const VALID_GNG_NUMBERS: ReadonlySet<string> = new Set(['GNG-4', 'GNG-5', 'GNG-8']);

export class GngConditionTest {
  readonly gngNumber: string;
  readonly targetUnit: string;
  readonly verificationCondition: string;

  private constructor(props: GngConditionTestProps) {
    this.gngNumber = props.gngNumber;
    this.targetUnit = props.targetUnit;
    this.verificationCondition = props.verificationCondition;
    Object.freeze(this);
  }

  static create(props: GngConditionTestProps): GngConditionTest {
    if (!VALID_GNG_NUMBERS.has(props.gngNumber)) {
      throw new Error(`InvalidGngNumberError: '${props.gngNumber}' is not a valid GNG number (GNG-4, GNG-5, GNG-8)`);
    }
    if (!props.targetUnit || props.targetUnit.trim().length === 0) {
      throw new Error('InvalidGngConditionTestError: targetUnit must not be empty');
    }
    if (!props.verificationCondition || props.verificationCondition.trim().length === 0) {
      throw new Error('InvalidGngConditionTestError: verificationCondition must not be empty');
    }
    return new GngConditionTest(props);
  }

  equals(other: GngConditionTest): boolean {
    return (
      this.gngNumber === other.gngNumber &&
      this.targetUnit === other.targetUnit &&
      this.verificationCondition === other.verificationCondition
    );
  }
}
