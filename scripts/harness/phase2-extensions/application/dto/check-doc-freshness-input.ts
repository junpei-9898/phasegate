/**
 * @layer application
 * @unit phase2-extensions
 */
export interface CheckDocFreshnessInput {
  dryRun?: boolean;
  targetPattern?: string;
  format?: 'text' | 'json';
}
