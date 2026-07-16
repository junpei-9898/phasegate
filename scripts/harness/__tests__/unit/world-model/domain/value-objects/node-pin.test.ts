// @unit world-model
// @layer test
// @work-item-id WI-293
// @story H17-07
// @ac H17-07-1

import { describe, expect, it } from "vitest";
import { NodePin } from "../../../../../world-model/domain/value-objects/node-pin.js";
import { PathKey } from "../../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../../world-model/domain/value-objects/sha256-digest.js";
import { WorldNodeId } from "../../../../../world-model/domain/value-objects/world-node-id.js";

describe("NodePin", () => {
  it("stable node IDと期待digestをimmutableなcanonical projectionとして保持すること", () => {
    // Arrange
    const nodeId = WorldNodeId.sourceFile(PathKey.create("scripts/harness/example.ts"));
    const contentDigest = Sha256Digest.fromHex("a".repeat(64));

    // Act
    const actual = NodePin.create({ nodeId, contentDigest });

    // Assert
    expect(actual.toCanonicalValue()).toEqual({
      contentDigest: `sha256:${"a".repeat(64)}`,
      nodeId: "pgw:v1:source-file:scripts/harness/example.ts",
    });
    expect(Object.isFrozen(actual)).toBe(true);
  });
});
