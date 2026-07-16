// @unit config-foundation
// @layer test
// @work-item-id WI-300
// @story H17-13

import { describe, expect, it } from "vitest";
import { toWorldModelConfig } from "../../../config-foundation/application/mappers/world-model-config-mapper.js";
import type { HarnessConfigV2 } from "../../../config-foundation/domain/harness-config.js";
import { WORLD_CONFIG_DEFAULTS } from "../../../config-foundation/domain/value-objects/world-config.js";
import { createResolvedDocument } from "../../integration/config-foundation/config-foundation-test-fixtures.js";

describe("toWorldModelConfig", () => {
  it("完全なresolved World DTOをplain objectとして返すこと", () => {
    // Arrange
    const config: HarnessConfigV2 = {
      ...createResolvedDocument("standard"),
      world: {
        ...structuredClone(WORLD_CONFIG_DEFAULTS),
        enabled: true,
        declarations: {
          ...WORLD_CONFIG_DEFAULTS.declarations,
          constraintsPath: "config/world-constraints.json",
        },
      },
    };

    // Act
    const actual = toWorldModelConfig(config);

    // Assert
    expect(actual).toEqual(config.world);
    expect(actual).not.toBe(config.world);
  });

  it("legacy resolved configにはcanonical World defaultsを補うこと", () => {
    // Arrange
    const { world: _world, ...config } = createResolvedDocument("minimal");

    // Act
    const actual = toWorldModelConfig(config);

    // Assert
    expect(actual).toEqual(WORLD_CONFIG_DEFAULTS);
  });
});
