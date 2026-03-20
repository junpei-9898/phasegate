/**
 * @layer application
 * @unit adr-foundation
 */
export interface ArchgateEntryDto {
  readonly validatorId: string;
  readonly errorCode: string;
}

export interface ArchgateMappingDto {
  readonly enforcedBy: readonly ArchgateEntryDto[];
}

export interface AdrBodyDto {
  readonly context: string;
  readonly decision: string;
  readonly consequences: string;
  readonly alternatives?: string;
}

export interface AdrDetailDto {
  readonly adrRef: string;
  readonly title: string;
  readonly status: string;
  readonly date: string;
  readonly body: AdrBodyDto;
  readonly archgate?: ArchgateMappingDto;
  readonly supersededBy?: string;
  readonly filePath: string;
}
