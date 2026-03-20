/**
 * @layer domain
 * @unit quick-mode
 *
 * Quick Mode最終判定の複合値オブジェクト
 */

import type { QuickModeEligibility } from './quick-mode-eligibility.js';
import type { ValidatorRelaxationProfile } from './validator-relaxation-profile.js';

export class QuickModeDecision {
  readonly eligibility: QuickModeEligibility;
  readonly relaxationProfile: ValidatorRelaxationProfile | undefined;

  private constructor(
    eligibility: QuickModeEligibility,
    relaxationProfile: ValidatorRelaxationProfile | undefined
  ) {
    this.eligibility = eligibility;
    this.relaxationProfile = relaxationProfile;
  }

  static approved(
    eligibility: QuickModeEligibility,
    profile: ValidatorRelaxationProfile
  ): QuickModeDecision {
    if (!eligibility.isEligible()) {
      throw new Error('Cannot create approved QuickModeDecision with ineligible eligibility (INV-D2)');
    }
    return new QuickModeDecision(eligibility, profile);
  }

  static rejected(eligibility: QuickModeEligibility): QuickModeDecision {
    return new QuickModeDecision(eligibility, undefined);
  }

  isApproved(): boolean {
    return this.eligibility.isEligible();
  }

  equals(other: QuickModeDecision): boolean {
    if (!this.eligibility.equals(other.eligibility)) return false;
    if (this.relaxationProfile === undefined && other.relaxationProfile === undefined) return true;
    if (this.relaxationProfile === undefined || other.relaxationProfile === undefined) return false;
    return this.relaxationProfile.equals(other.relaxationProfile);
  }
}
