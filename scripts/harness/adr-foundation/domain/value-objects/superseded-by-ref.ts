/**
 * @layer domain
 * @unit adr-foundation
 */
import { AdrId } from './adr-id.js';

export class SupersededByRef {
  readonly adrId: AdrId;

  private constructor(adrId: AdrId) {
    this.adrId = adrId;
    Object.freeze(this);
  }

  static create(adrId: AdrId): SupersededByRef {
    return new SupersededByRef(adrId);
  }

  toAdrRef(): string {
    return this.adrId.toAdrRef();
  }

  equals(other: SupersededByRef): boolean {
    return this.adrId.equals(other.adrId);
  }
}
