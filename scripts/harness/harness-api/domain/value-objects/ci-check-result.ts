// @layer domain
// @unit harness-api
// ci-check-result.ts — CiCheckResult Value Object

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
 * WI-260 / ADR-017: validator 1件が「実質 pass」か判定する severity-aware ルール。
 * `validate` 経路の AggregateValidationResultsUseCase と同一の判定式を harness-api の
 * domain VO 側に持たせ、ci-check と validate の集約挙動を一致させる（レイヤー越境回避のため
 * usecase を直接 import せず判定ロジックを共有）。
 *
 * - skipped: 実質 pass
 * - passed=true: 実質 pass
 * - passed=false かつ error severity（!= warning）を含む: fail
 * - passed=false かつ errors=[]（severity 判定不能）: 安全側に倒して fail
 * - passed=false かつ warning のみ: failOnWarning=false（既定）で実質 pass、true で fail
 */
function isEffectivelyPassed(item: ValidatorCheckItem, failOnWarning: boolean): boolean {
  if (item.skipped || item.passed) return true;
  const errors = item.errors ?? [];
  const hasNonWarningError = errors.some((e) => e.severity !== "warning");
  const hasWarnings = errors.some((e) => e.severity === "warning");
  const isEmptyFail = errors.length === 0;
  const hasFail = isEmptyFail || hasNonWarningError || (failOnWarning && hasWarnings);
  return !hasFail;
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
    return new CiCheckResult(props.validatorResults, props.allPassed);
  }

  static fromResults(validatorResults: readonly ValidatorCheckItem[], failOnWarning = false): CiCheckResult {
    if (!validatorResults || validatorResults.length === 0) {
      throw new Error("EmptyValidatorResultsError: validatorResults must have at least one item (INV-5)");
    }
    const allPassed = validatorResults.every((r) => isEffectivelyPassed(r, failOnWarning));
    return new CiCheckResult(validatorResults, allPassed);
  }

  getFailedValidators(): readonly ValidatorCheckItem[] {
    return this.validatorResults.filter((r) => !r.passed && !r.skipped);
  }

  collectAllErrors(): readonly HarnessError[] {
    return this.validatorResults.flatMap((r) => r.errors ?? []);
  }
}
