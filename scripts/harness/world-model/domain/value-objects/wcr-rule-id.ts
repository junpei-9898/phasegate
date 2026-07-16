// @unit world-model
// @layer domain
// @work-item-id WI-293

export type WcrRuleIdValue =
  | "WCR-001"
  | "WCR-002"
  | "WCR-003"
  | "WCR-004"
  | "WCR-005"
  | "WCR-006"
  | "WCR-007"
  | "WCR-008";

const VALUES: readonly WcrRuleIdValue[] = [
  "WCR-001",
  "WCR-002",
  "WCR-003",
  "WCR-004",
  "WCR-005",
  "WCR-006",
  "WCR-007",
  "WCR-008",
];

export class InvalidWcrRuleIdError extends Error {
  constructor(value: string) {
    super(`Invalid World constraint rule ID: "${value}"`);
    this.name = "InvalidWcrRuleIdError";
  }
}

export class WcrRuleId {
  readonly value: WcrRuleIdValue;

  private constructor(value: WcrRuleIdValue) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): WcrRuleId {
    if (!VALUES.includes(value as WcrRuleIdValue)) {
      throw new InvalidWcrRuleIdError(value);
    }
    return new WcrRuleId(value as WcrRuleIdValue);
  }

  static all(): readonly WcrRuleId[] {
    return Object.freeze(VALUES.map((value) => new WcrRuleId(value)));
  }

  equals(other: WcrRuleId): boolean {
    return this.value === other.value;
  }

  toString(): WcrRuleIdValue {
    return this.value;
  }
}
