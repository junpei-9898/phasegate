/**
 * @layer application
 * @unit adr-foundation
 */
export interface SeedAdrDefinition {
  readonly title: string;
  readonly status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
  readonly date: string;
  readonly body: {
    readonly context: string;
    readonly decision: string;
    readonly consequences: string;
    readonly alternatives?: string;
  };
  readonly archgate?: {
    readonly enforcedBy: ReadonlyArray<{
      readonly validatorId: string;
      readonly errorCode: string;
    }>;
  };
}
