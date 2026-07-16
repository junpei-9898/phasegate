// @unit world-model
// @layer test
// @work-item-id WI-291
// @story H17-06

import { describe, expect, it } from "vitest";
import { resolveWorldCorpusConfig } from "../../../../world-model/application/dto/world-resolved-config-input.js";

describe("World corpus config resolution", () => {
  it("config不在時にADR-037のcanonical corpus defaultsを返すこと", () => {
    // Arrange / Act
    const actual = resolveWorldCorpusConfig();

    // Assert
    expect(actual).toEqual({
      productScopes: [
        {
          productRoot: "docs/product",
          designDocsRoot: "docs/product/construction",
          unitRoot: "docs/product/units",
        },
      ],
      inceptionRoot: "docs/inception",
      adrRoot: "docs/ADR",
      sourceRoot: "scripts/harness",
      include: ["**/*"],
      exclude: [],
      matrixPath: ".harness/requirement-test-matrix.json",
      attestationPath: ".harness/attestation.json",
      integrityManifestPath: "phasegate.integrity.json",
    });
  });

  it("解決済み既存configのdesign・inception・matrix pathを反映すること", () => {
    // Arrange / Act
    const actual = resolveWorldCorpusConfig({
      designDocsRoot: "spec/product/construction",
      inceptionRoot: "spec/inception",
      requirementMatrixPath: "generated/matrix.json",
    });

    // Assert
    expect(actual).toEqual(
      expect.objectContaining({
        productScopes: [
          {
            productRoot: "docs/product",
            designDocsRoot: "docs/product/construction",
            unitRoot: "docs/product/units",
          },
          {
            productRoot: "spec/product",
            designDocsRoot: "spec/product/construction",
            unitRoot: "spec/product/units",
          },
        ],
        inceptionRoot: "spec/inception",
        matrixPath: "generated/matrix.json",
      }),
    );
  });

  it("absolute・backslash・root escape pathをfail-closedで拒否すること", () => {
    // Arrange
    const inputs = [
      { designDocsRoot: "/tmp/product" },
      { inceptionRoot: "docs\\inception" },
      { requirementMatrixPath: "../matrix.json" },
    ];

    // Act
    const actual = inputs.map((input) => () => resolveWorldCorpusConfig(input));

    // Assert
    for (const execute of actual) expect(execute).toThrow();
  });
});
