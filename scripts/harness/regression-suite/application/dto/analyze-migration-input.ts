// @layer application
export interface AnalyzeMigrationInput {
  dryRun?: boolean;
  outOfScopePattern?: string[];
  orchestrationMigratedPattern?: string[];
}
