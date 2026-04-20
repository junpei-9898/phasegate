/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { InitialCreationExpirationRule } from '../aggregates/initial-creation-expiration-rule.js';
import type { InitialCreationAge, InitialCreationAgeSource } from '../value-objects/initial-creation-age.js';

export type InitialCreationExpirationLevel = 'ok' | 'warn';

export interface InitialCreationExpirationResult {
  ruleId: string;
  documentPath: string;
  ageInDays: number;
  commitCount: number;
  ageSource: InitialCreationAgeSource;
  level: InitialCreationExpirationLevel;
  message: string;
}

export class InitialCreationExpirationCheckService {
  check(
    rule: InitialCreationExpirationRule,
    age: InitialCreationAge,
    documentPath: string,
  ): InitialCreationExpirationResult {
    if (!rule.isEnabled()) {
      return {
        ruleId: rule.ruleId,
        documentPath,
        ageInDays: age.ageInDays,
        commitCount: age.commitCount,
        ageSource: age.source,
        level: 'ok',
        message: 'disabled rule skipped',
      };
    }

    const daysHit = age.ageInDays >= rule.daysThreshold;
    const commitHit = age.commitCount >= rule.commitCountThreshold;
    const expired = rule.evaluationMode === 'or' ? daysHit || commitHit : daysHit && commitHit;

    return {
      ruleId: rule.ruleId,
      documentPath,
      ageInDays: age.ageInDays,
      commitCount: age.commitCount,
      ageSource: age.source,
      level: expired ? 'warn' : 'ok',
      message: expired
        ? `${documentPath} has been initial_creation:true for ${age.ageInDays} days (commits=${age.commitCount})`
        : `${documentPath} within threshold`,
    };
  }
}
