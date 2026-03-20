/**
 * @layer application
 * @unit biome-ast-engine
 */

export type HarnessErrorPayloadItem = {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
};

export type BuildHarnessErrorPayloadOutput = {
  readonly errors: readonly HarnessErrorPayloadItem[];
};
