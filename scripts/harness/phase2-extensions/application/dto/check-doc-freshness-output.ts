/**
 * @layer application
 * @unit phase2-extensions
 */
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';
import type { FreshnessCheckResult } from '../../domain/services/freshness-check-service.js';

export interface CheckDocFreshnessOutput {
  results: FreshnessCheckResult[];
  summary: {
    total: number;
    ok: number;
    warn: number;
    error: number;
  };
  errors: HarnessErrorContract[];
}
