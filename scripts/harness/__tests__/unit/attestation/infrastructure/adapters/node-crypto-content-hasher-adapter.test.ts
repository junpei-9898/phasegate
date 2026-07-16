// @unit attestation
// @layer test
// @story H17-01

import { expect, it, vi } from "vitest";
import type {
  Sha256Capability,
  Sha256DigestString,
} from "../../../../../attestation/application/ports/sha256-capability.js";
import { NodeCryptoContentHasherAdapter } from "../../../../../attestation/infrastructure/adapters/node-crypto-content-hasher-adapter.js";
import { context, target } from "../../../../helpers/test-helpers.js";

target("NodeCryptoContentHasherAdapter", () => {
  context("plain public capabilityをattestation domainへadaptする場合", () => {
    it("UTF-8 bytesを一度だけhashしlocal Digestへ変換すること", () => {
      // Arrange
      const fixedDigest = `sha256:${"b".repeat(64)}` as Sha256DigestString;
      const hashBytes = vi.fn<(bytes: Uint8Array) => Sha256DigestString>().mockReturnValue(fixedDigest);
      const capability: Sha256Capability = { hashBytes };
      const adapter = new NodeCryptoContentHasherAdapter(capability);
      const content = "Phasegate世界";
      const expectedBytes = new TextEncoder().encode(content);

      // Act
      const actual = adapter.sha256(content);

      // Assert
      expect(hashBytes).toHaveBeenCalledTimes(1);
      expect(hashBytes).toHaveBeenCalledWith(expectedBytes);
      expect(actual.value).toBe(fixedDigest);
    });
  });
});
