/**
 * @layer domain
 * @unit validator-system
 *
 * AdrReferencePort — adr-foundation ADR実在性確認（L4-002）
 */

export interface AdrMetadata {
  readonly adrId: string;
  readonly title: string;
  readonly status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
}

export interface AdrReferencePort {
  exists(adrRef: string): Promise<boolean>;
  getMetadata(adrRef: string): Promise<AdrMetadata | null>;
}
