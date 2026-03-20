/**
 * @layer application
 * @unit quick-mode
 *
 * QuickModeDecision を QuickModeDecisionContract に投影するMapper
 */

import type { QuickModeEligibility } from '../../domain/value-objects/quick-mode-eligibility.js';
import type { ValidatorRelaxationProfile } from '../../domain/value-objects/validator-relaxation-profile.js';
import type { QuickModeDecision } from '../../domain/value-objects/quick-mode-decision.js';
import type { QuickModeEligibilityContract } from '../dto/quick-mode-eligibility-contract.js';
import type { ValidatorRelaxationProfileContract } from '../dto/validator-relaxation-profile-contract.js';
import type { QuickModeDecisionContract } from '../dto/quick-mode-decision-contract.js';

export class QuickModeDecisionContractMapper {
  toEligibilityContract(eligibility: QuickModeEligibility): Readonly<QuickModeEligibilityContract> {
    if (eligibility.isEligible()) {
      return Object.freeze({
        eligible: true,
        reason: eligibility.reason,
        rejectionRule: undefined,
        rejectedFiles: undefined,
      });
    }

    return Object.freeze({
      eligible: false,
      reason: eligibility.reason,
      rejectionRule: eligibility.rejectionRule,
      rejectedFiles: eligibility.rejectedFiles?.map((f) => ({
        filePath: f.filePath,
        changeKind: f.changeKind,
      })),
    });
  }

  toRelaxationProfileContract(
    profile: ValidatorRelaxationProfile
  ): Readonly<ValidatorRelaxationProfileContract> {
    return Object.freeze({
      levelDependencyRelaxed: false as const,
      l1: Object.freeze({ all: true as const }),
      l2: Object.freeze({
        maintained: Object.freeze([...profile.l2.maintained]),
        skipped: Object.freeze([...profile.l2.skipped]),
      }),
      l3: Object.freeze({
        maintained: Object.freeze([...profile.l3.maintained]),
        skipped: Object.freeze([...profile.l3.skipped]),
      }),
      l4: Object.freeze({ all: false as const }),
      phaseExecution: Object.freeze({ twoPhaseRequired: false as const }),
    });
  }

  toDecisionContract(decision: QuickModeDecision): Readonly<QuickModeDecisionContract> {
    const eligibilityContract = this.toEligibilityContract(decision.eligibility);

    if (!decision.isApproved() || decision.relaxationProfile === undefined) {
      return Object.freeze({
        eligibility: eligibilityContract,
        relaxationProfile: undefined,
      });
    }

    const relaxationProfileContract = this.toRelaxationProfileContract(decision.relaxationProfile);

    return Object.freeze({
      eligibility: eligibilityContract,
      relaxationProfile: relaxationProfileContract,
    });
  }
}
