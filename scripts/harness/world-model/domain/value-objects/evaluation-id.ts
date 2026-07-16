// @unit world-model
// @layer domain
// @work-item-id WI-287
import type { Sha256Digest } from "./sha256-digest.js";

const EVALUATION_ID_PATTERN = /^pgw:v1:evaluation:sha256:[0-9a-f]{64}$/;

export class InvalidEvaluationIdError extends Error {
  constructor(value: string) {
    super(`Invalid World evaluation ID: "${value}"`);
    this.name = "InvalidEvaluationIdError";
  }
}

export class EvaluationId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static fromDigest(digest: Sha256Digest): EvaluationId {
    return new EvaluationId(`pgw:v1:evaluation:${digest.toString()}`);
  }

  static parse(value: string): EvaluationId {
    if (!EVALUATION_ID_PATTERN.test(value)) {
      throw new InvalidEvaluationIdError(value);
    }
    return new EvaluationId(value);
  }

  equals(other: EvaluationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
