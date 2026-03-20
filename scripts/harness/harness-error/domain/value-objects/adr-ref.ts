/**
 * @layer domain
 * @unit harness-error
 *
 * ADR参照値オブジェクト
 * ADR-{3桁の数字} 形式の参照値を表現する
 */
import { InvalidAdrRefError } from '../errors/invalid-adr-ref-error.js';

const ADR_REF_PATTERN = /^ADR-[0-9]{3}$/;

export class AdrRef {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: string): AdrRef {
    if (!ADR_REF_PATTERN.test(raw)) {
      throw new InvalidAdrRefError(raw);
    }
    return new AdrRef(raw);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AdrRef): boolean {
    return this.value === other.value;
  }
}
