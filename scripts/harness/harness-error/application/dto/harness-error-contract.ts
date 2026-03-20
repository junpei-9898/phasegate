/**
 * @layer application
 * @unit harness-error
 *
 * HarnessError の公開契約DTO
 */
export interface HarnessErrorContract {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
}
