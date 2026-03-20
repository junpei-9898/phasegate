/**
 * @layer domain
 * @unit nyquist-validation
 *
 * テストファイルへの参照を表す値オブジェクト
 */
import { EmptyFilePathError } from '../errors/empty-file-path-error.js';
import { InvalidTestTypeError } from '../errors/invalid-test-type-error.js';

export type TestType = 'unit' | 'it' | 'scenario';

const VALID_TEST_TYPES: readonly TestType[] = ['unit', 'it', 'scenario'];

export interface RawTestReference {
  readonly filePath: string;
  readonly testType: string;
}

export class TestReference {
  readonly filePath: string;
  readonly testType: TestType;

  private constructor(filePath: string, testType: TestType) {
    this.filePath = filePath;
    this.testType = testType;
    Object.freeze(this);
  }

  static create(raw: RawTestReference): TestReference {
    const trimmedPath = raw.filePath.trim();
    if (trimmedPath.length === 0) {
      throw new EmptyFilePathError();
    }
    if (!(VALID_TEST_TYPES as readonly string[]).includes(raw.testType)) {
      throw new InvalidTestTypeError(raw.testType);
    }
    return new TestReference(trimmedPath, raw.testType as TestType);
  }

  equals(other: TestReference): boolean {
    return this.filePath === other.filePath && this.testType === other.testType;
  }

  toString(): string {
    return `TestReference(${this.filePath}, ${this.testType})`;
  }
}
