// @unit attestation
// @layer test
// @story H16-01

import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { NodeCryptoContentHasherAdapter } from "../../../attestation/infrastructure/adapters/node-crypto-content-hasher-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

target("NodeCryptoContentHasherAdapter", () => {
  context("既知の文字列を渡した場合", () => {
    it("node:crypto の sha256 と一致する sha256:<64hex> を返すこと", () => {
      // Arrange
      const adapter = new NodeCryptoContentHasherAdapter();
      const content = "phasegate-attestation-canonical-payload";
      const expectedHex = createHash("sha256").update(content, "utf8").digest("hex");

      // Act
      const digest = adapter.sha256(content);

      // Assert
      expect(digest.value).toBe(`sha256:${expectedHex}`);
      expect(digest.value).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
  });

  context("空文字を渡した場合", () => {
    it("空文字の sha256 空ハッシュ値を返すこと", () => {
      // Arrange
      const adapter = new NodeCryptoContentHasherAdapter();

      // Act
      const digest = adapter.sha256("");

      // Assert（空文字の sha256 は既知の定数）
      expect(digest.value).toBe("sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });
  });
});
