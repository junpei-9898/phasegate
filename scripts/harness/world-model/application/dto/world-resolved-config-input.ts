// @unit world-model
// @layer application
// @work-item-id WI-291

import { PathKey } from "../../domain/value-objects/path-key.js";

export interface WorldResolvedConfigInput {
  readonly designDocsRoot?: string;
  readonly inceptionRoot?: string;
  readonly requirementMatrixPath?: string;
}

export interface WorldCorpusConfig {
  readonly productScopes: readonly {
    readonly productRoot: string;
    readonly designDocsRoot: string;
    readonly unitRoot: string;
  }[];
  readonly inceptionRoot: string;
  readonly adrRoot: string;
  readonly sourceRoot: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly matrixPath: string;
  readonly attestationPath: string;
  readonly integrityManifestPath: string;
}

const DEFAULT_DESIGN_DOCS_ROOT = "docs/product/construction";

const validatePath = (value: string): string => PathKey.create(value).toString();

const deriveProductRoot = (designDocsRoot: string): string => {
  const normalized = designDocsRoot.replace(/\/+$/, "");
  return normalized.endsWith("/construction") ? normalized.slice(0, -"/construction".length) : normalized;
};

export const resolveWorldCorpusConfig = (input?: WorldResolvedConfigInput): WorldCorpusConfig => {
  const designDocsRoot = validatePath(input?.designDocsRoot ?? DEFAULT_DESIGN_DOCS_ROOT);
  const productRoot = validatePath(deriveProductRoot(designDocsRoot));
  const productScopes = [
    {
      productRoot: "docs/product",
      designDocsRoot: DEFAULT_DESIGN_DOCS_ROOT,
      unitRoot: "docs/product/units",
    },
    ...(productRoot === "docs/product"
      ? []
      : [{ productRoot, designDocsRoot, unitRoot: validatePath(`${productRoot}/units`) }]),
  ];
  return Object.freeze({
    productScopes: Object.freeze(productScopes),
    inceptionRoot: validatePath(input?.inceptionRoot ?? "docs/inception"),
    adrRoot: "docs/ADR",
    sourceRoot: "scripts/harness",
    include: Object.freeze(["**/*"]),
    exclude: Object.freeze([]),
    matrixPath: validatePath(input?.requirementMatrixPath ?? ".harness/requirement-test-matrix.json"),
    attestationPath: ".harness/attestation.json",
    integrityManifestPath: "phasegate.integrity.json",
  });
};
