// @layer domain
// @unit harness-api
// ci-check-result.ts — CiCheckResult Value Object

import type { HarnessError } from './harness-api-response.js';

export interface ValidatorCheckItem {
  validatorId: string;
  passed: boolean;
  skipped?: boolean;
  errors?: readonly HarnessError[];
}

export interface CiCheckResultProps {
  validatorResults: readonly ValidatorCheckItem[];
  allPassed: boolean;
}

export class CiCheckResult {
  readonly validatorResults: readonly ValidatorCheckItem[];
  readonly allPassed: boolean;

  private constructor(validatorResults: readonly ValidatorCheckItem[], allPassed: boolean) {
    this.validatorResults = Object.freeze([...validatorResults]);
    this.allPassed = allPassed;
    Object.freeze(this);
  }

  static create(props: CiCheckResultProps): CiCheckResult {
    // INV-5: validatorResults は 1件以上
    if (!props.validatorResults || props.validatorResults.length === 0) {
      throw new Error('EmptyValidatorResultsError: validatorResults must have at least one item (INV-5)');
    }
    // INV-6: allPassed === validatorResults.every(r => r.passed || r.skipped)
    const computedAllPassed = props.validatorResults.every((r) => r.passed || r.skipped);
    if (props.allPassed !== computedAllPassed) {
      throw new Error(
        `HarnessApiDomainError: allPassed=${props.allPassed} does not match validatorResults state (computed: ${computedAllPassed})`
      );
    }
    return new CiCheckResult(props.validatorResults, props.allPassed);
  }

  static fromResults(validatorResults: readonly ValidatorCheckItem[]): CiCheckResult {
    if (!validatorResults || validatorResults.length === 0) {
      throw new Error('EmptyValidatorResultsError: validatorResults must have at least one item (INV-5)');
    }
    const allPassed = validatorResults.every((r) => r.passed || r.skipped);
    return new CiCheckResult(validatorResults, allPassed);
  }

  getFailedValidators(): readonly ValidatorCheckItem[] {
    return this.validatorResults.filter((r) => !r.passed && !r.skipped);
  }

  collectAllErrors(): readonly HarnessError[] {
    return this.validatorResults.flatMap((r) => r.errors ?? []);
  }
}
