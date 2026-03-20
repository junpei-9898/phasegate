/**
 * @layer domain
 * @unit adr-foundation
 */
import { AdrId } from './adr-id.js';
import { ArchgateEntry, type ArchgateEntryProps } from './archgate-entry.js';

export type ArchgateMappingProps = Readonly<{
  adrId?: AdrId | string;
  adr_id?: AdrId | string;
  enforcedBy?: readonly (ArchgateEntry | ArchgateEntryProps)[];
  enforced_by?: readonly (ArchgateEntry | ArchgateEntryProps)[];
}>;

export class DuplicateArchgateEntryError extends Error {
  constructor(validatorId: string, errorCode: string) {
    super(`archgate.enforced_by に重複エントリがあります: ${validatorId} / ${errorCode}`);
    this.name = 'DuplicateArchgateEntryError';
  }
}

export class ArchgateMapping {
  readonly adrId: AdrId;
  readonly adr_id: string;
  readonly enforcedBy: readonly ArchgateEntry[];
  readonly enforced_by: readonly ArchgateEntry[];

  private constructor(adrId: AdrId, enforcedBy: readonly ArchgateEntry[]) {
    const frozenEntries = Object.freeze([...enforcedBy]);

    this.adrId = adrId;
    this.adr_id = adrId.value;
    this.enforcedBy = frozenEntries;
    this.enforced_by = frozenEntries;
    Object.freeze(this);
  }

  static create(props: ArchgateMappingProps): ArchgateMapping {
    const rawAdrId = props.adrId ?? props.adr_id;
    const rawEntries = props.enforcedBy ?? props.enforced_by ?? [];
    const adrId = rawAdrId instanceof AdrId ? rawAdrId : AdrId.create(String(rawAdrId ?? ''));
    const enforcedBy = rawEntries.map((entry) =>
      entry instanceof ArchgateEntry ? entry : ArchgateEntry.create(entry)
    );

    if (enforcedBy.length === 0) {
      throw new Error('archgate.enforced_by には1件以上のエントリが必要です');
    }

    const uniqueKeys = new Set<string>();
    for (const entry of enforcedBy) {
      const key = `${entry.validatorId}:${entry.errorCode}`;
      if (uniqueKeys.has(key)) {
        throw new DuplicateArchgateEntryError(entry.validatorId, entry.errorCode);
      }
      uniqueKeys.add(key);
    }

    return new ArchgateMapping(adrId, enforcedBy);
  }

  findByValidatorId(validatorId: string): ArchgateEntry[] {
    return this.enforcedBy.filter((entry) => entry.matchesValidatorId(validatorId));
  }

  findByErrorCode(errorCode: string): ArchgateEntry[] {
    return this.enforcedBy.filter((entry) => entry.matchesErrorCode(errorCode));
  }

  hasEntry(validatorId: string, errorCode: string): boolean {
    return this.enforcedBy.some(
      (entry) => entry.matchesValidatorId(validatorId) && entry.matchesErrorCode(errorCode)
    );
  }

  toPrimitives(): {
    enforced_by: Array<{ validator_id: string; error_code: string }>;
  } {
    return {
      enforced_by: this.enforcedBy.map((entry) => ({
        validator_id: entry.validatorId,
        error_code: entry.errorCode,
      })),
    };
  }

  equals(other: ArchgateMapping): boolean {
    if (!this.adrId.equals(other.adrId) || this.enforcedBy.length !== other.enforcedBy.length) {
      return false;
    }

    return this.enforcedBy.every((entry, index) => entry.equals(other.enforcedBy[index]!));
  }
}
