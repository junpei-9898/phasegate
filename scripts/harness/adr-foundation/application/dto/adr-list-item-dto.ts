/**
 * @layer application
 * @unit adr-foundation
 */
export interface AdrListItemDto {
  readonly adrRef: string;
  readonly title: string;
  readonly status: string;
  readonly date: string;
  readonly hasArchgate: boolean;
  readonly supersededBy?: string;
}
