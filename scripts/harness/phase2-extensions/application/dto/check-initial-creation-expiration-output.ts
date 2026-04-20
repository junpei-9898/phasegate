/**
 * @layer application
 * @unit phase2-extensions
 */
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';
import type { InitialCreationExpirationResult } from '../../domain/services/initial-creation-expiration-check-service.js';

export interface CheckInitialCreationExpirationOutput {
  results: InitialCreationExpirationResult[];
  summary: {
    total: number;
    ok: number;
    warn: number;
  };
  warnings: HarnessErrorContract[];
  errors: HarnessErrorContract[];
}
