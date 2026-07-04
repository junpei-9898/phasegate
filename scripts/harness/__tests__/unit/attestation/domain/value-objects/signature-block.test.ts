// @unit attestation
// @layer test
// @story H16-01

import { describe, expect, it } from "vitest";
import { Digest } from "../../../../../attestation/domain/value-objects/digest.js";
import {
  SignatureBlock,
  UnsupportedSignatureModeError,
} from "../../../../../attestation/domain/value-objects/signature-block.js";
import { context, target } from "../../../../helpers/test-helpers.js";

const DIGEST = Digest.create(`sha256:${"a".repeat(64)}`);

target("SignatureBlock", () => {
  describe("unsignedPoc ファクトリテスト", () => {
    context("digest を渡した場合", () => {
      it("mode=unsigned-poc かつ algorithm/keyId/value が null で構築される（AC-8）", () => {
        // Arrange / Act
        const block = SignatureBlock.unsignedPoc(DIGEST);
        // Assert
        expect(block.mode).toBe("unsigned-poc");
        expect(block.attestationDigest.equals(DIGEST)).toBe(true);
        expect(block.algorithm).toBeNull();
        expect(block.keyId).toBeNull();
        expect(block.value).toBeNull();
      });
    });
  });

  describe("create 検証テスト", () => {
    context("mode=signed を渡した場合", () => {
      it("UnsupportedSignatureModeError がスローされる（AC-12）", () => {
        expect(() =>
          SignatureBlock.create({
            mode: "signed",
            attestationDigest: DIGEST,
            algorithm: "ed25519",
            keyId: "k1",
            value: "sig",
          }),
        ).toThrow(UnsupportedSignatureModeError);
      });
    });

    context("unsigned-poc なのに algorithm が非null の場合", () => {
      it("UnsupportedSignatureModeError がスローされる（INV-6）", () => {
        expect(() =>
          SignatureBlock.create({
            mode: "unsigned-poc",
            attestationDigest: DIGEST,
            algorithm: "ed25519",
            keyId: null,
            value: null,
          }),
        ).toThrow(UnsupportedSignatureModeError);
      });
    });
  });

  describe("例外の errorCode テスト", () => {
    it("UnsupportedSignatureModeError は errorCode L1-052 を保持する", () => {
      let captured: UnsupportedSignatureModeError | null = null;
      try {
        SignatureBlock.create({
          mode: "signed",
          attestationDigest: DIGEST,
          algorithm: null,
          keyId: null,
          value: null,
        });
      } catch (e) {
        captured = e as UnsupportedSignatureModeError;
      }
      expect(captured?.errorCode).toBe("L1-052");
    });
  });

  describe("等値性テスト", () => {
    it("同一 mode + digest で equals=true", () => {
      const a = SignatureBlock.unsignedPoc(DIGEST);
      const b = SignatureBlock.unsignedPoc(DIGEST);
      expect(a.equals(b)).toBe(true);
    });

    it("digest が異なれば equals=false", () => {
      const a = SignatureBlock.unsignedPoc(DIGEST);
      const b = SignatureBlock.unsignedPoc(Digest.create(`sha256:${"b".repeat(64)}`));
      expect(a.equals(b)).toBe(false);
    });
  });
});
