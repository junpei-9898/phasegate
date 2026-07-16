// @unit attestation
// @layer test
// @story H17-01

import { expect, it, vi } from "vitest";
import {
  hashUtf8,
  type Sha256Capability,
  type Sha256DigestString,
} from "../../../../../attestation/application/ports/sha256-capability.js";
import { context, target } from "../../../../helpers/test-helpers.js";

const FIXED_DIGEST = `sha256:${"a".repeat(64)}` as Sha256DigestString;

target("hashUtf8", () => {
  context("non-ASCII文字列を渡した場合", () => {
    it("TextEncoderのUTF-8 bytesをcapabilityへ一度だけ渡すこと", () => {
      // Arrange
      const hashBytes = vi.fn<(bytes: Uint8Array) => Sha256DigestString>().mockReturnValue(FIXED_DIGEST);
      const capability: Sha256Capability = { hashBytes };
      const text = "こんにちは世界";
      const expectedBytes = new TextEncoder().encode(text);

      // Act
      const actual = hashUtf8(capability, text);

      // Assert
      expect(hashBytes).toHaveBeenCalledTimes(1);
      expect(hashBytes).toHaveBeenCalledWith(expectedBytes);
      expect(actual).toBe(FIXED_DIGEST);
    });
  });
});
