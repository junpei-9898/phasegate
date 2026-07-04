// @unit attestation
// @layer test
// @story H16-01

import { describe, expect, it } from "vitest";
import { Digest, InvalidDigestError } from "../../../../../attestation/domain/value-objects/digest.js";
import { context, target } from "../../../../helpers/test-helpers.js";

const VALID_HEX = "a".repeat(64);
const VALID_DIGEST = `sha256:${VALID_HEX}`;

target("Digest", () => {
  describe("生成テスト", () => {
    context("sha256: + 64桁 hex を渡した場合", () => {
      it("正常に Digest が生成され value を保持する", () => {
        // Arrange / Act
        const digest = Digest.create(VALID_DIGEST);
        // Assert
        expect(digest.value).toBe(VALID_DIGEST);
        expect(digest.toString()).toBe(VALID_DIGEST);
      });
    });

    context("prefix が無い場合", () => {
      it("InvalidDigestError がスローされる", () => {
        // Arrange / Act / Assert
        expect(() => Digest.create(VALID_HEX)).toThrow(InvalidDigestError);
      });
    });

    context("hex が 63桁の場合", () => {
      it("InvalidDigestError がスローされる", () => {
        expect(() => Digest.create(`sha256:${"a".repeat(63)}`)).toThrow(InvalidDigestError);
      });
    });

    context("hex が大文字を含む場合", () => {
      it("InvalidDigestError がスローされる（小文字のみ許可）", () => {
        expect(() => Digest.create(`sha256:${"A".repeat(64)}`)).toThrow(InvalidDigestError);
      });
    });

    context("fromSha256Hex に生の hex を渡した場合", () => {
      it("sha256: prefix を付与した Digest が生成される", () => {
        const digest = Digest.fromSha256Hex(VALID_HEX);
        expect(digest.value).toBe(VALID_DIGEST);
      });
    });
  });

  describe("例外の errorCode テスト", () => {
    it("InvalidDigestError は errorCode L1-050 を保持する", () => {
      // Arrange
      let captured: InvalidDigestError | null = null;
      // Act
      try {
        Digest.create("bad");
      } catch (e) {
        captured = e as InvalidDigestError;
      }
      // Assert
      expect(captured?.errorCode).toBe("L1-050");
    });
  });

  describe("等値性テスト", () => {
    it("同一 value で equals=true", () => {
      const a = Digest.create(VALID_DIGEST);
      const b = Digest.create(VALID_DIGEST);
      expect(a.equals(b)).toBe(true);
    });

    it("異なる value で equals=false", () => {
      const a = Digest.create(VALID_DIGEST);
      const b = Digest.create(`sha256:${"b".repeat(64)}`);
      expect(a.equals(b)).toBe(false);
    });
  });
});
