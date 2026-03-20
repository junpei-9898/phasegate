/**
 * @layer application
 * @unit adr-foundation
 */
export interface ChangeAdrStatusCommand {
  readonly adrRef: string;
  readonly action: 'approve' | 'deprecate' | 'supersede' | 'repropose';
  readonly supersededBy?: string;
}
