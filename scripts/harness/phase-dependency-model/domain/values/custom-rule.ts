/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface CustomRuleCreateArgs {
  readonly targetPhase: string;
  readonly condition: string;
  readonly action: readonly string[];
}

export class InvalidCustomRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCustomRuleError';
  }
}

export class CustomRule {
  readonly targetPhase: string;
  readonly condition: string;
  readonly action: readonly string[];

  private constructor(args: CustomRuleCreateArgs) {
    this.targetPhase = args.targetPhase.trim();
    this.condition = args.condition.trim();
    this.action = Object.freeze([...args.action]);
    Object.freeze(this);
  }

  static create(args: CustomRuleCreateArgs): CustomRule {
    const targetPhase = args.targetPhase.trim();

    if (targetPhase.length === 0) {
      throw new InvalidCustomRuleError('targetPhaseは必須です');
    }

    if (args.action.length === 0) {
      throw new InvalidCustomRuleError('actionは1件以上必要です');
    }

    return new CustomRule({
      targetPhase,
      condition: args.condition,
      action: args.action.map((entry) => entry.trim()),
    });
  }

  requiredNodeKeys(): readonly string[] {
    return Object.freeze(this.action.filter((entry) => !entry.startsWith('remove:')));
  }

  equals(other: CustomRule): boolean {
    if (
      this.targetPhase !== other.targetPhase ||
      this.condition !== other.condition ||
      this.action.length !== other.action.length
    ) {
      return false;
    }

    return this.action.every((entry, index) => entry === other.action[index]);
  }
}
