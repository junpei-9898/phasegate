/**
 * @layer domain
 * @unit harness-error
 *
 * エラーコード値オブジェクト
 * L{0-4}-{3桁以上の数字} 形式の正規エラーコードを表現する
 */
import { InvalidErrorCodeError } from '../errors/invalid-error-code-error.js';

const ERROR_CODE_PATTERN = /^L([0-4])-([0-9]{3,})$/;

export class ErrorCode {
  readonly value: string;
  readonly layer: number;
  readonly sequence: string;

  private constructor(value: string, layer: number, sequence: string) {
    this.value = value;
    this.layer = layer;
    this.sequence = sequence;
    Object.freeze(this);
  }

  static create(raw: string): ErrorCode {
    const match = ERROR_CODE_PATTERN.exec(raw);
    if (!match) {
      throw new InvalidErrorCodeError(raw);
    }
    const layer = Number(match[1]);
    const sequence = match[2];
    return new ErrorCode(raw, layer, sequence);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ErrorCode): boolean {
    return this.value === other.value;
  }
}
