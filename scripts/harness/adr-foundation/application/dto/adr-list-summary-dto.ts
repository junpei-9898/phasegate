/**
 * @layer application
 * @unit adr-foundation
 */
export interface AdrListSummaryDto {
  readonly total: number;
  readonly proposed: number;
  readonly accepted: number;
  readonly deprecated: number;
  readonly superseded: number;
}
