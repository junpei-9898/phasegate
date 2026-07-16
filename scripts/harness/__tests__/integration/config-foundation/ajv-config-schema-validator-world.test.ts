// @unit config-foundation
// @layer test
// @work-item-id WI-300
// @story H17-13

import { describe, expect, it } from "vitest";
import { WORLD_CONFIG_DEFAULTS } from "../../../config-foundation/domain/value-objects/world-config.js";
import { AjvConfigSchemaValidator } from "../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js";
import { createValidSourceDocument } from "./config-foundation-test-fixtures.js";

const createDocument = (v3: boolean): Record<string, unknown> => ({
  ...createValidSourceDocument(),
  ...(v3 ? { architecture: { preset: "clean" } } : {}),
  world: structuredClone(WORLD_CONFIG_DEFAULTS),
});

describe("World config schema", () => {
  it.each([false, true])("v2/v3で完全World documentを受理すること (v3=%s)", (v3) => {
    // Arrange
    const validator = new AjvConfigSchemaValidator();

    // Act
    const actual = validator.validate(createDocument(v3));

    // Assert
    expect(actual).toEqual([]);
  });

  it("unknown fieldとinvalid pathと範囲外limitをfail-closedで拒否すること", () => {
    // Arrange
    const validator = new AjvConfigSchemaValidator();
    const unknown = createDocument(false);
    (unknown.world as Record<string, unknown>).worldModel = true;
    const invalidPath = createDocument(false);
    ((invalidPath.world as Record<string, unknown>).inputs as Record<string, unknown>).matrixPath = "../matrix.json";
    const invalidLimit = createDocument(false);
    ((invalidLimit.world as Record<string, unknown>).sessionStart as Record<string, unknown>).maxItems = 21;

    // Act
    const actual = [unknown, invalidPath, invalidLimit].map((document) => validator.validate(document));

    // Assert
    expect(actual.every((errors) => errors.length > 0)).toBe(true);
  });
});
