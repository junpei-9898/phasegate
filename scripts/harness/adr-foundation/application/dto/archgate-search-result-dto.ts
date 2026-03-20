/**
 * @layer application
 * @unit adr-foundation
 */
export interface ArchgateSearchResultDto {
  readonly validatorId: string;
  readonly errorCode: string;
  readonly adrRef: string;
  readonly title: string;
  readonly status: string;
}
