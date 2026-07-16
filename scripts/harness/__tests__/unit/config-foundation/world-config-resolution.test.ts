// @unit config-foundation
// @layer test
// @work-item-id WI-300
// @story H17-13

import { describe, expect, it } from "vitest";
import { PresetResolutionService } from "../../../config-foundation/domain/services/preset-resolution-service.js";
import { WORLD_CONFIG_DEFAULTS } from "../../../config-foundation/domain/value-objects/world-config.js";
import { PresetDefinitionStore } from "../../../config-foundation/infrastructure/preset-definition-store.js";
import { createValidSourceDocument } from "../../integration/config-foundation/config-foundation-test-fixtures.js";

describe("World preset resolution", () => {
  it("明示World fieldがない場合だけlegacy document pathを継承すること", () => {
    // Arrange
    const source = createValidSourceDocument({
      paths: { designDocs: "spec/product/construction", inceptionDocs: "spec/inception" },
      layers: { L3: { requirementMatrixPath: "generated/matrix.json" } },
    });
    const preset = new PresetDefinitionStore().load().minimal;

    // Act
    const actual = new PresetResolutionService().resolve(source, preset);

    // Assert
    expect(actual.world).toMatchObject({
      corpus: {
        productRoots: ["docs/product", "spec/product"],
        inceptionRoots: ["spec/inception"],
      },
      inputs: { matrixPath: "generated/matrix.json" },
    });
  });

  it("明示World fieldをlegacy pathで上書きしないこと", () => {
    // Arrange
    const source = createValidSourceDocument({
      paths: { designDocs: "legacy/product/construction", inceptionDocs: "legacy/inception" },
      layers: { L3: { requirementMatrixPath: "legacy/matrix.json" } },
      world: {
        corpus: { productRoots: ["catalog/product"], inceptionRoots: ["catalog/inception"] },
        inputs: { matrixPath: "catalog/matrix.json" },
      },
    });
    const preset = new PresetDefinitionStore().load().minimal;

    // Act
    const actual = new PresetResolutionService().resolve(source, preset);

    // Assert
    expect(actual.world).toEqual({
      ...WORLD_CONFIG_DEFAULTS,
      corpus: {
        ...WORLD_CONFIG_DEFAULTS.corpus,
        productRoots: ["catalog/product"],
        inceptionRoots: ["catalog/inception"],
      },
      inputs: { ...WORLD_CONFIG_DEFAULTS.inputs, matrixPath: "catalog/matrix.json" },
    });
  });
});
