/**
 * @layer domain
 * @unit ci-governance
 */

export interface AdrExistencePort {
  exists(adrId: string): Promise<boolean>;
}
