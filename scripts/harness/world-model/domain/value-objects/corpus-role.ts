// @unit world-model
// @layer domain
// @work-item-id WI-287
export type CorpusRoleValue = "product" | "inception" | "adr" | "generated" | "external";

const VALUES: readonly CorpusRoleValue[] = ["product", "inception", "adr", "generated", "external"];

export class InvalidCorpusRoleError extends Error {
  constructor(value: string) {
    super(`Invalid World corpus role: "${value}"`);
    this.name = "InvalidCorpusRoleError";
  }
}

export class CorpusRole {
  readonly value: CorpusRoleValue;

  private constructor(value: CorpusRoleValue) {
    this.value = value;
    Object.freeze(this);
  }

  static parse(value: string): CorpusRole {
    if (!VALUES.includes(value as CorpusRoleValue)) {
      throw new InvalidCorpusRoleError(value);
    }
    return new CorpusRole(value as CorpusRoleValue);
  }

  static product(): CorpusRole {
    return new CorpusRole("product");
  }

  static inception(): CorpusRole {
    return new CorpusRole("inception");
  }

  static adr(): CorpusRole {
    return new CorpusRole("adr");
  }

  static generated(): CorpusRole {
    return new CorpusRole("generated");
  }

  static external(): CorpusRole {
    return new CorpusRole("external");
  }

  equals(other: CorpusRole): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
