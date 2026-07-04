// @unit attestation
// @layer domain

import {
  GranularityClaim,
  KNOWN_LIMITATIONS_REGISTRY,
  TRACEABILITY_VALIDATOR_ID,
} from "../value-objects/granularity-claim.js";
import type { ValidatorOutcome } from "../value-objects/validator-outcome.js";

const TRACEABILITY_NOT_RUN_CLAIM =
  "Traceability (L3-004) was not part of this gate run; no file-level traceability guarantee is asserted.";

/**
 * validator set + 静的 known-limitations registry から GranularityClaim を機械導出する純粋サービス。
 * 生成（H16-01）と検証（H16-02 anti-laundering 再導出）で完全に同一の結果を返すため、
 * 決定論的かつ全域（total）でなければならない。
 *
 * anti-laundering: 導出は静的 registry のみを真実の源とする。格納された granularity を
 * 過大主張へ改竄しても、再導出は常に registry の honest な file-level 主張を返すため mismatch が検出される。
 * また validator set から L3-004 を除去する改竄も、導出結果が「not run」へ変化するため検出される。
 */
export class GranularityDerivationService {
  /**
   * validator set から traceability の GranularityClaim を導出する。
   * 1. registry から traceability 検査に対応する validatorId（L3-004）を引く
   * 2. L3-004 が validator set に含まれるか確認する
   * 3. 含まれる場合は registry の file-level 定義（known-limitation 付き）を、
   *    含まれない場合は「not run」主張を構築する
   */
  derive(validatorSet: readonly ValidatorOutcome[]): GranularityClaim {
    const definition = KNOWN_LIMITATIONS_REGISTRY[TRACEABILITY_VALIDATOR_ID];
    const present = validatorSet.some((o) => o.validatorId === TRACEABILITY_VALIDATOR_ID);

    if (!present) {
      return GranularityClaim.create({
        validator: definition.validator,
        level: definition.level,
        claim: TRACEABILITY_NOT_RUN_CLAIM,
        knownLimitations: [],
      });
    }

    return GranularityClaim.create({
      validator: definition.validator,
      level: definition.level,
      claim: definition.claim,
      knownLimitations: definition.knownLimitations,
    });
  }
}
