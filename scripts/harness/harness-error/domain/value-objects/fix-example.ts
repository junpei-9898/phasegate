/**
 * @layer domain
 * @unit harness-error
 *
 * 修正コード片値オブジェクト
 * trim後に空でないコード片であることを保証する
 */
import { InvalidFixExampleError } from '../errors/invalid-fix-example-error.js';

export class FixExample {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: string): FixExample {
    if (raw.trim().length === 0) {
      throw new InvalidFixExampleError(
        'fix_exampleは空文字であってはなりません。有効なコード片を指定してください。'
      );
    }
    return new FixExample(raw);
  }

  toString(): string {
    return this.value;
  }

  equals(other: FixExample): boolean {
    return this.value === other.value;
  }
}
