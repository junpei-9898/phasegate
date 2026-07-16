// @unit config-foundation
// @layer test
// @work-item-id WI-300
// @story H17-13

import { describe, expect, it } from "vitest";
import { WORLD_CONFIG_DEFAULTS, WorldConfig } from "../../../config-foundation/domain/value-objects/world-config.js";

describe("WorldConfig", () => {
  it("canonical defaultsをresolved documentとして保持すること", () => {
    // Arrange / Act
    const actual = WorldConfig.create(WORLD_CONFIG_DEFAULTS).toDocument();

    // Assert
    expect(actual).toEqual(WORLD_CONFIG_DEFAULTS);
    expect(Object.isFrozen(actual)).toBe(true);
  });

  it("absolute・backslash・traversal pathを拒否すること", () => {
    // Arrange
    const invalidDocuments = [
      {
        ...structuredClone(WORLD_CONFIG_DEFAULTS),
        inputs: { ...WORLD_CONFIG_DEFAULTS.inputs, matrixPath: "/tmp/matrix.json" },
      },
      { ...structuredClone(WORLD_CONFIG_DEFAULTS), output: { obligationReportPath: ".harness\\world.json" } },
      {
        ...structuredClone(WORLD_CONFIG_DEFAULTS),
        declarations: { ...WORLD_CONFIG_DEFAULTS.declarations, debtsPath: "../debts.json" },
      },
    ];

    // Act
    const actual = invalidDocuments.map((document) => () => WorldConfig.create(document));

    // Assert
    for (const execute of actual) expect(execute).toThrow(/project-relative POSIX path/);
  });

  it("異なるcorpus roleの包含rootとcase-fold collisionを拒否すること", () => {
    // Arrange
    const roleOverlap = {
      ...structuredClone(WORLD_CONFIG_DEFAULTS),
      corpus: { ...WORLD_CONFIG_DEFAULTS.corpus, inceptionRoots: ["docs/product/proposals"] },
    };
    const caseFoldCollision = {
      ...structuredClone(WORLD_CONFIG_DEFAULTS),
      corpus: { ...WORLD_CONFIG_DEFAULTS.corpus, adrRoots: ["DOCS/PRODUCT"] },
    };

    // Act
    const actual = [() => WorldConfig.create(roleOverlap), () => WorldConfig.create(caseFoldCollision)];

    // Assert
    expect(actual[0]).toThrow(/corpus root role overlap/);
    expect(actual[1]).toThrow(/case-fold collision/);
  });

  it("sessionStart limitの境界だけを受理すること", () => {
    // Arrange
    const lower = {
      ...structuredClone(WORLD_CONFIG_DEFAULTS),
      sessionStart: { enabled: true, maxItems: 1, maxChars: 1 },
    };
    const upper = {
      ...structuredClone(WORLD_CONFIG_DEFAULTS),
      sessionStart: { enabled: true, maxItems: 20, maxChars: 8000 },
    };
    const invalid = {
      ...structuredClone(WORLD_CONFIG_DEFAULTS),
      sessionStart: { enabled: true, maxItems: 21, maxChars: 0 },
    };

    // Act
    const actual = [WorldConfig.create(lower).toDocument(), WorldConfig.create(upper).toDocument()];

    // Assert
    expect(actual.map((item) => item.sessionStart)).toEqual([lower.sessionStart, upper.sessionStart]);
    expect(() => WorldConfig.create(invalid)).toThrow(/sessionStart/);
  });
});
