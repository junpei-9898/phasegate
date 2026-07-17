// @layer domain
// @unit harness-api
// @work-item-id WI-307
// @work-item-id WI-332
// ci-check-result.ts — CiCheckResult Value Object

import { isEffectivelyPassed } from "../../../validator-system/domain/services/effective-severity-policy.js";
import type { HarnessError } from "./harness-api-response.js";

export interface ValidatorCheckItem {
  validatorId: string;
  passed: boolean;
  skipped?: boolean;
  errors?: readonly HarnessError[];
}

export interface CiCheckResultProps {
  validatorResults: readonly ValidatorCheckItem[];
  allPassed: boolean;
  /** WI-260 / ADR-017: warning-only failure を fail 扱いにする opt-in（既定 false）。 */
  failOnWarning?: boolean;
}

/**
 * WI-307: public ci-check projection の `passed` を aggregate policy と一致させる。
 * skipped は独立した green state のため raw passed を維持し、warning-only failure だけを
 * failOnWarning=false のとき passed=true に射影する。diagnostic は lossless に保持する。
 */
function toPublicValidatorResult(item: ValidatorCheckItem, failOnWarning: boolean): ValidatorCheckItem {
  return Object.freeze({
    ...item,
    passed: item.skipped ? item.passed : isEffectivelyPassed(item, failOnWarning),
    errors: item.errors === undefined ? undefined : Object.freeze([...item.errors]),
  });
}

export class CiCheckResult {
  readonly validatorResults: readonly ValidatorCheckItem[];
  readonly allPassed: boolean;

  private constructor(validatorResults: readonly ValidatorCheckItem[], allPassed: boolean, failOnWarning: boolean) {
    this.validatorResults = Object.freeze(validatorResults.map((item) => toPublicValidatorResult(item, failOnWarning)));
    this.allPassed = allPassed;
    Object.freeze(this);
  }

  static create(props: CiCheckResultProps): CiCheckResult {
    // INV-5: validatorResults は 1件以上
    if (!props.validatorResults || props.validatorResults.length === 0) {
      throw new Error("EmptyValidatorResultsError: validatorResults must have at least one item (INV-5)");
    }
    // INV-6 (WI-260/ADR-017 更新): allPassed === validatorResults.every(実質pass)
    const failOnWarning = props.failOnWarning ?? false;
    const computedAllPassed = props.validatorResults.every((r) => isEffectivelyPassed(r, failOnWarning));
    if (props.allPassed !== computedAllPassed) {
      throw new Error(
        `HarnessApiDomainError: allPassed=${props.allPassed} does not match validatorResults state (computed: ${computedAllPassed})`,
      );
    }
    return new CiCheckResult(props.validatorResults, props.allPassed, failOnWarning);
  }

  static fromResults(validatorResults: readonly ValidatorCheckItem[], failOnWarning = false): CiCheckResult {
    if (!validatorResults || validatorResults.length === 0) {
      throw new Error("EmptyValidatorResultsError: validatorResults must have at least one item (INV-5)");
    }
    const allPassed = validatorResults.every((r) => isEffectivelyPassed(r, failOnWarning));
    return new CiCheckResult(validatorResults, allPassed, failOnWarning);
  }

  getFailedValidators(): readonly ValidatorCheckItem[] {
    return this.validatorResults.filter((r) => !r.passed && !r.skipped);
  }

  collectAllErrors(): readonly HarnessError[] {
    return this.validatorResults.flatMap((r) => r.errors ?? []);
  }
}
