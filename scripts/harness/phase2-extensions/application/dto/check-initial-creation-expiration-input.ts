/**
 * @layer application
 * @unit phase2-extensions
 */
export interface CheckInitialCreationExpirationInput {
  targetPattern?: string;
  format?: 'text' | 'json';
  dryRun?: boolean;
}
