// @unit harness-error
// @layer application

export interface ErrorDefinitionSummary {
  readonly code: string;
  readonly title: string;
  readonly category: string;
  readonly defaultSeverity: 'error' | 'warning';
  readonly adrRefRequired: boolean;
  readonly fixExampleRequired: boolean;
  readonly validatorId: string;
}
