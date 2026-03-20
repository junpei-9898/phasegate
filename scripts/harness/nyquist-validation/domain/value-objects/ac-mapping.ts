/**
 * @layer domain
 * @unit nyquist-validation
 *
 * AC ID とテスト参照のマッピングを表す値オブジェクト
 */
import { InvalidAcIdFormatError } from '../errors/invalid-ac-id-format-error.js';
import { TestReference, type RawTestReference } from './test-reference.js';

const AC_ID_PATTERN = /^AC-[1-9][0-9]*$/;

export interface RawAcMapping {
  readonly acId: string;
  readonly testReferences: readonly RawTestReference[];
}

export class AcMapping {
  readonly acId: string;
  readonly testReferences: readonly TestReference[];

  private constructor(acId: string, testReferences: readonly TestReference[]) {
    this.acId = acId;
    this.testReferences = testReferences;
    Object.freeze(this);
  }

  static create(raw: RawAcMapping): AcMapping {
    if (!AC_ID_PATTERN.test(raw.acId)) {
      throw new InvalidAcIdFormatError(raw.acId);
    }
    const testReferences = raw.testReferences.map((r) => TestReference.create(r));
    return new AcMapping(raw.acId, Object.freeze(testReferences));
  }

  isCovered(): boolean {
    return this.testReferences.length > 0;
  }

  equals(other: AcMapping): boolean {
    if (this.acId !== other.acId) return false;
    if (this.testReferences.length !== other.testReferences.length) return false;
    return this.testReferences.every((ref, i) => ref.equals(other.testReferences[i]));
  }

  toString(): string {
    return `AcMapping(${this.acId}, ${this.testReferences.length} refs)`;
  }
}
