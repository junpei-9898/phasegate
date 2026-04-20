/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { InitialCreationExpirationRule } from '../aggregates/initial-creation-expiration-rule.js';

export interface InitialCreationExpirationConfigPort {
  loadRules(): Promise<InitialCreationExpirationRule[]>;
}
