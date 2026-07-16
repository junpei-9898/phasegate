// @unit world-model
// @layer test
// @work-item-id WI-291
// @work-item-id WI-300
// @story H17-06
// @story H17-13

import { describe, expect, it } from "vitest";
import { resolveWorldCorpusConfig } from "../../../../world-model/application/dto/world-resolved-config-input.js";

describe("World corpus config resolution", () => {
  it("config不在時にADR-037のcanonical corpus defaultsを返すこと", () => {
    // Arrange / Act
    const actual = resolveWorldCorpusConfig();

    // Assert
    expect(actual).toEqual({
      enabled: false,
      productScopes: [
        {
          productRoot: "docs/product",
          designDocsRoot: "docs/product/construction",
          unitRoot: "docs/product/units",
        },
      ],
      inceptionRoots: ["docs/inception"],
      adrRoots: ["docs/ADR"],
      sourceRoots: ["scripts/harness"],
      include: ["**/*"],
      exclude: [],
      matrixPath: ".harness/requirement-test-matrix.json",
      attestationPath: ".harness/attestation.json",
      integrityManifestPath: "phasegate.integrity.json",
      constraintsPath: "phasegate.world-constraints.json",
      baselinePath: "phasegate.world-baseline.json",
      waiversPath: "phasegate.world-waivers.json",
      debtsPath: "phasegate.world-debts.json",
      obligationReportPath: ".harness/world-obligations.json",
      sessionStart: { enabled: true, maxItems: 5, maxChars: 2000 },
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
        inceptionRoots: ["spec/inception"],
        matrixPath: "generated/matrix.json",
      }),
    );
  });

  it("完全なresolved World configをruntime pathへ写像すること", () => {
    // Arrange / Act
    const actual = resolveWorldCorpusConfig({
      enabled: false,
      corpus: {
        productRoots: ["catalog/product"],
        inceptionRoots: ["catalog/inception"],
        adrRoots: ["catalog/adr"],
        sourceRoots: ["src"],
        include: ["**/*.ts"],
        exclude: ["**/fixtures/**"],
      },
      inputs: {
        matrixPath: "generated/matrix.json",
        attestationPath: "generated/attestation.json",
        integrityManifestPath: "config/integrity.json",
      },
      declarations: {
        constraintsPath: "config/constraints.json",
        baselinePath: "config/baseline.json",
        waiversPath: "config/waivers.json",
        debtsPath: "config/debts.json",
      },
      output: { obligationReportPath: "generated/obligations.json" },
      sessionStart: { enabled: false, maxItems: 3, maxChars: 800 },
    });

    // Assert
    expect(actual).toMatchObject({
      enabled: false,
      productScopes: [
        {
          productRoot: "catalog/product",
          designDocsRoot: "catalog/product/construction",
          unitRoot: "catalog/product/units",
        },
      ],
      inceptionRoots: ["catalog/inception"],
      adrRoots: ["catalog/adr"],
      sourceRoots: ["src"],
      include: ["**/*.ts"],
      exclude: ["**/fixtures/**"],
      constraintsPath: "config/constraints.json",
      obligationReportPath: "generated/obligations.json",
      sessionStart: { enabled: false, maxItems: 3, maxChars: 800 },
    });
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
