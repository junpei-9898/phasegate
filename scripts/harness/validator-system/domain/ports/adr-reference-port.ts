// @unit validator-system
// @layer domain

export interface AdrMetadata {
  readonly adrId: string;
  readonly title: string;
  readonly status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
}

export interface AdrReferencePort {
  exists(adrRef: string): Promise<boolean>;
  getMetadata(adrRef: string): Promise<AdrMetadata | null>;
}
