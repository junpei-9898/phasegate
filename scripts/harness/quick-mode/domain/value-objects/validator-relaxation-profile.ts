/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-140
 *
 * Quick Mode時のバリデータ実行構成を表す値オブジェクト
 */

const L2_IDS = ['L2-001', 'L2-002', 'L2-003', 'L2-014'] as const;
const L3_IDS = ['L3-001', 'L3-002', 'L3-003', 'L3-004'] as const;

type L2Id = (typeof L2_IDS)[number];
type L3Id = (typeof L3_IDS)[number];

export interface ValidatorRelaxationProfileParams {
  levelDependencyRelaxed: false;
  l1: { all: true };
  l2: { maintained: string[]; skipped: string[] };
  l3: { maintained: string[]; skipped: string[] };
  l4: { all: false };
  phaseExecution: { twoPhaseRequired: false };
}

export class ValidatorRelaxationProfile {
  readonly levelDependencyRelaxed: false;
  readonly l1: { readonly all: true };
  readonly l2: { readonly maintained: readonly string[]; readonly skipped: readonly string[] };
  readonly l3: { readonly maintained: readonly string[]; readonly skipped: readonly string[] };
  readonly l4: { readonly all: false };
  readonly phaseExecution: { readonly twoPhaseRequired: false };

  private constructor(params: ValidatorRelaxationProfileParams) {
    this.levelDependencyRelaxed = false;
    this.l1 = Object.freeze({ all: true as const });
    this.l2 = Object.freeze({
      maintained: Object.freeze([...params.l2.maintained]),
      skipped: Object.freeze([...params.l2.skipped]),
    });
    this.l3 = Object.freeze({
      maintained: Object.freeze([...params.l3.maintained]),
      skipped: Object.freeze([...params.l3.skipped]),
    });
    this.l4 = Object.freeze({ all: false as const });
    this.phaseExecution = Object.freeze({ twoPhaseRequired: false as const });
    Object.freeze(this);
  }

  static createDefault(): ValidatorRelaxationProfile {
    return new ValidatorRelaxationProfile({
      levelDependencyRelaxed: false,
      l1: { all: true },
      l2: { maintained: ['L2-002', 'L2-003', 'L2-014'], skipped: ['L2-001'] },
      l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
      l4: { all: false },
      phaseExecution: { twoPhaseRequired: false },
    });
  }

  static create(params: {
    levelDependencyRelaxed?: false;
    l1?: { all: true };
    l2: { maintained: string[]; skipped: string[] };
    l3: { maintained: string[]; skipped: string[] };
    l4?: { all: false };
    phaseExecution?: { twoPhaseRequired: false };
  }): ValidatorRelaxationProfile {
    const { l2, l3 } = params;

    // INV-P5: l2.maintained ∪ l2.skipped = {L2-001, L2-002, L2-003, L2-014}
    const l2Union = [...l2.maintained, ...l2.skipped].sort();
    const l2Expected = [...L2_IDS].sort();
    if (JSON.stringify(l2Union) !== JSON.stringify(l2Expected)) {
      throw new Error(
        `INV-P5 violated: l2.maintained ∪ l2.skipped must equal {${L2_IDS.join(', ')}}. Got: {${l2Union.join(', ')}}`
      );
    }

    // INV-P6: l3.maintained ∪ l3.skipped = {L3-001, L3-002, L3-003, L3-004}
    const l3Union = [...l3.maintained, ...l3.skipped].sort();
    const l3Expected = [...L3_IDS].sort();
    if (JSON.stringify(l3Union) !== JSON.stringify(l3Expected)) {
      throw new Error(
        `INV-P6 violated: l3.maintained ∪ l3.skipped must equal {${L3_IDS.join(', ')}}. Got: {${l3Union.join(', ')}}`
      );
    }

    return new ValidatorRelaxationProfile({
      levelDependencyRelaxed: false,
      l1: { all: true },
      l2,
      l3,
      l4: { all: false },
      phaseExecution: { twoPhaseRequired: false },
    });
  }

  isMaintained(validatorId: string): boolean {
    return (
      this.l2.maintained.includes(validatorId) || this.l3.maintained.includes(validatorId)
    );
  }

  isSkipped(validatorId: string): boolean {
    return (
      this.l2.skipped.includes(validatorId) || this.l3.skipped.includes(validatorId)
    );
  }

  equals(other: ValidatorRelaxationProfile): boolean {
    return (
      JSON.stringify(this.l2.maintained) === JSON.stringify(other.l2.maintained) &&
      JSON.stringify(this.l2.skipped) === JSON.stringify(other.l2.skipped) &&
      JSON.stringify(this.l3.maintained) === JSON.stringify(other.l3.maintained) &&
      JSON.stringify(this.l3.skipped) === JSON.stringify(other.l3.skipped)
    );
  }
}
