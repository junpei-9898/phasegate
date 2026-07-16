// @unit attestation
// @layer test
// @story H17-01

import { expect, it } from "vitest";
import * as attestationPublic from "../../../attestation/index.js";
import { createSha256Capability, hashUtf8 } from "../../../attestation/index.js";
import { NodeCryptoContentHasherAdapter } from "../../../attestation/infrastructure/adapters/node-crypto-content-hasher-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

target("Sha256Capability public facade", () => {
  context("既知bytesを渡した場合", () => {
    it("abcの既知SHA-256 digestをplain stringで返すこと", () => {
      // Arrange
      const capability = createSha256Capability();
      const bytes = new TextEncoder().encode("abc");

      // Act
      const actual = capability.hashBytes(bytes);

      // Assert
      expect(actual).toBe("sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
      expect(actual).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
  });

  context("non-ASCII文字列をUTF-8 helperへ渡した場合", () => {
    it("既知のUTF-8 SHA-256 digestを返すこと", () => {
      // Arrange
      const capability = createSha256Capability();

      // Act
      const actual = hashUtf8(capability, "こんにちは世界");

      // Assert
      expect(actual).toBe("sha256:c6a304536826fb57e1b1896fcd8c91693a746233ae6a286dc85a65c8ae1f416f");
    });
  });

  context("既存attestation adapterと同じ文字列をhashする場合", () => {
    it("public helperとattestation-local Digestの値が一致すること", () => {
      // Arrange
      const capability = createSha256Capability();
      const adapter = new NodeCryptoContentHasherAdapter(capability);
      const content = "phasegate-attestation-canonical-payload";

      // Act
      const publicDigest = hashUtf8(capability, content);
      const localDigest = adapter.sha256(content);

      // Assert
      expect(localDigest.value).toBe(publicDigest);
    });
  });

  context("root barrelのruntime exportを確認する場合", () => {
    it("attestation内部のDigest・ContentHasherPort・concrete crypto classを公開しないこと", () => {
      // Arrange
      const internalExportNames = ["Digest", "ContentHasherPort", "NodeCryptoSha256Capability"];

      // Act
      const actualExportNames = Object.keys(attestationPublic);

      // Assert
      for (const internalName of internalExportNames) {
        expect(actualExportNames).not.toContain(internalName);
      }
    });
  });
});
