// @unit world-model
// @layer test
// @work-item-id WI-291
// @story H17-06

import { describe, expect, it } from "vitest";
import type { Sha256Capability } from "../../../../attestation/index.js";
import { AttestationSha256WorldHashingAdapter } from "../../../../world-model/infrastructure/adapters/attestation-sha256-world-hashing-adapter.js";

describe("AttestationSha256WorldHashingAdapter", () => {
  it("public capabilityのplain digestをWorld-local digestへ変換すること", () => {
    // Arrange
    const capability: Sha256Capability = {
      hashBytes: () => `sha256:${"a".repeat(64)}`,
    };
    const sut = new AttestationSha256WorldHashingAdapter(capability);

    // Act
    const actual = sut.sha256(new Uint8Array([1, 2, 3]));

    // Assert
    expect(actual.toString()).toBe(`sha256:${"a".repeat(64)}`);
  });
});
