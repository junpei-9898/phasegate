/**
 * @layer domain
 * @unit quick-mode
 *
 * Quick Mode適用可否の判定結果を表す値オブジェクト
 */

import type { RejectionRule } from '../types/rejection-rule.js';
import type { ChangedFile } from './changed-file.js';

export class QuickModeEligibility {
  readonly eligible: boolean;
  readonly reason: string;
  readonly rejectionRule: RejectionRule | undefined;
  readonly rejectedFiles: readonly ChangedFile[] | undefined;

  private constructor(
    eligible: boolean,
    reason: string,
    rejectionRule: RejectionRule | undefined,
    rejectedFiles: readonly ChangedFile[] | undefined
  ) {
    this.eligible = eligible;
    this.reason = reason;
    this.rejectionRule = rejectionRule;
    this.rejectedFiles = rejectedFiles;
    Object.freeze(this);
  }

  static eligible(reason: string): QuickModeEligibility {
    if (!reason) {
      throw new Error('reason must not be empty (INV-E3)');
    }
    return new QuickModeEligibility(true, reason, undefined, undefined);
  }

  static rejected(
    rule: RejectionRule,
    rejectedFiles: readonly ChangedFile[],
    reason: string
  ): QuickModeEligibility {
    if (rejectedFiles.length === 0) {
      throw new Error('rejectedFiles must not be empty when eligible=false (INV-E2)');
    }
    if (!reason) {
      throw new Error('reason must not be empty (INV-E3)');
    }
    return new QuickModeEligibility(false, reason, rule, Object.freeze([...rejectedFiles]));
  }

  isEligible(): boolean {
    return this.eligible;
  }

  equals(other: QuickModeEligibility): boolean {
    return (
      this.eligible === other.eligible &&
      this.reason === other.reason &&
      this.rejectionRule === other.rejectionRule
    );
  }
}
