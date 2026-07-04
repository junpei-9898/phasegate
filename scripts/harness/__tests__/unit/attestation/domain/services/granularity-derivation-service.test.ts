// @unit attestation
// @layer test
// @story H16-01

import { describe, expect, it } from "vitest";
import { GranularityDerivationService } from "../../../../../attestation/domain/services/granularity-derivation-service.js";
import { L3_004_FILE_LEVEL_KNOWN_LIMITATION } from "../../../../../attestation/domain/value-objects/granularity-claim.js";
import { ValidatorOutcome } from "../../../../../attestation/domain/value-objects/validator-outcome.js";
import { context, target } from "../../../../helpers/test-helpers.js";

const service = new GranularityDerivationService();

const outcome = (validatorId: string, passed = true) =>
  ValidatorOutcome.create({ validatorId, passed, skipped: false });

target("GranularityDerivationService", () => {
  describe("derive テスト", () => {
    context("L3-004 を含む validator set の場合", () => {
      it('level="file" と L3-004 file-level known-limitation を導出する（AC-6/AC-7）', () => {
        // Arrange
        const set = [outcome("L3-001"), outcome("L3-004")];
        // Act
        const claim = service.derive(set);
        // Assert
        expect(claim.validator).toBe("L3-004");
        expect(claim.level).toBe("file");
        expect(claim.knownLimitations).toContain(L3_004_FILE_LEVEL_KNOWN_LIMITATION);
      });
    });

    context("L3-004 を含まない validator set の場合", () => {
      it("known-limitation を付与せず not-run 主張を導出する（anti-laundering: set 依存）", () => {
        // Arrange
        const set = [outcome("L3-001"), outcome("L3-002")];
        // Act
        const claim = service.derive(set);
        // Assert
        expect(claim.knownLimitations).toHaveLength(0);
        expect(claim.claim).not.toBe("");
      });
    });

    context("同一 set を2回導出した場合", () => {
      it("決定論的に等値な GranularityClaim を返す", () => {
        // Arrange
        const set = [outcome("L3-004")];
        // Act
        const first = service.derive(set);
        const second = service.derive(set);
        // Assert
        expect(first.equals(second)).toBe(true);
      });
    });

    context("L3-004 有無で導出結果が変わる", () => {
      it("L3-004 を除去すると導出 granularity が不一致になる（改竄検出の基盤）", () => {
        // Arrange
        const withL3004 = service.derive([outcome("L3-004")]);
        // Act
        const withoutL3004 = service.derive([outcome("L3-001")]);
        // Assert
        expect(withL3004.equals(withoutL3004)).toBe(false);
      });
    });
  });
});
