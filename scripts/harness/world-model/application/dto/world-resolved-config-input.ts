// @unit world-model
// @layer application
// @work-item-id WI-291, WI-300

import { PathKey } from "../../domain/value-objects/path-key.js";

export interface WorldResolvedConfigInput {
  readonly enabled?: boolean;
  readonly corpus?: {
    readonly productRoots?: readonly string[];
    readonly inceptionRoots?: readonly string[];
    readonly adrRoots?: readonly string[];
    readonly sourceRoots?: readonly string[];
    readonly include?: readonly string[];
    readonly exclude?: readonly string[];
  };
  readonly inputs?: {
    readonly matrixPath?: string;
    readonly attestationPath?: string;
    readonly integrityManifestPath?: string;
  };
  readonly declarations?: {
    readonly constraintsPath?: string;
    readonly baselinePath?: string;
    readonly waiversPath?: string;
    readonly debtsPath?: string;
  };
  readonly output?: { readonly obligationReportPath?: string };
  readonly sessionStart?: {
    readonly enabled?: boolean;
    readonly maxItems?: number;
    readonly maxChars?: number;
  };
  readonly designDocsRoot?: string;
  readonly inceptionRoot?: string;
  readonly requirementMatrixPath?: string;
}

export interface WorldCorpusConfig {
  readonly enabled: boolean;
  readonly productScopes: readonly {
    readonly productRoot: string;
    readonly designDocsRoot: string;
    readonly unitRoot: string;
  }[];
  readonly inceptionRoots: readonly string[];
  readonly adrRoots: readonly string[];
  readonly sourceRoots: readonly string[];
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly matrixPath: string;
  readonly attestationPath: string;
  readonly integrityManifestPath: string;
  readonly constraintsPath: string;
  readonly baselinePath: string;
  readonly waiversPath: string;
  readonly debtsPath: string;
  readonly obligationReportPath: string;
  readonly sessionStart: { readonly enabled: boolean; readonly maxItems: number; readonly maxChars: number };
}

const validatePath = (value: string): string => PathKey.create(value).toString();
const validatePaths = (values: readonly string[]): readonly string[] => Object.freeze(values.map(validatePath));

const deriveProductRoot = (designDocsRoot: string): string => {
  const normalized = designDocsRoot.replace(/\/+$/, "");
  return normalized.endsWith("/construction") ? normalized.slice(0, -"/construction".length) : normalized;
};

const resolveProductRoots = (input?: WorldResolvedConfigInput): readonly string[] => {
  if (input?.corpus?.productRoots !== undefined) return validatePaths(input.corpus.productRoots);
  if (input?.designDocsRoot === undefined) return Object.freeze(["docs/product"]);
  const productRoot = validatePath(deriveProductRoot(input.designDocsRoot));
  return Object.freeze(productRoot === "docs/product" ? [productRoot] : ["docs/product", productRoot]);
};

const assertLimit = (name: string, value: number, maximum: number): number => {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
};

export const resolveWorldCorpusConfig = (input?: WorldResolvedConfigInput): WorldCorpusConfig => {
  const productRoots = resolveProductRoots(input);
  const inceptionRoots = validatePaths(input?.corpus?.inceptionRoots ?? [input?.inceptionRoot ?? "docs/inception"]);
  const adrRoots = validatePaths(input?.corpus?.adrRoots ?? ["docs/ADR"]);
  const sourceRoots = validatePaths(input?.corpus?.sourceRoots ?? ["scripts/harness"]);
  if ([productRoots, inceptionRoots, adrRoots, sourceRoots].some((roots) => roots.length === 0)) {
    throw new Error("World corpus roots must not be empty");
  }
  const include = Object.freeze([...(input?.corpus?.include ?? ["**/*"])]);
  const exclude = Object.freeze([...(input?.corpus?.exclude ?? [])]);
  if (include.length === 0 || [...include, ...exclude].some((pattern) => pattern.length === 0)) {
    throw new Error("World corpus selection patterns must not be empty");
  }
  return Object.freeze({
    enabled: input?.enabled ?? false,
    productScopes: Object.freeze(
      productRoots.map((productRoot) => ({
        productRoot,
        designDocsRoot: validatePath(`${productRoot}/construction`),
        unitRoot: validatePath(`${productRoot}/units`),
      })),
    ),
    inceptionRoots,
    adrRoots,
    sourceRoots,
    include,
    exclude,
    matrixPath: validatePath(
      input?.inputs?.matrixPath ?? input?.requirementMatrixPath ?? ".harness/requirement-test-matrix.json",
    ),
    attestationPath: validatePath(input?.inputs?.attestationPath ?? ".harness/attestation.json"),
    integrityManifestPath: validatePath(input?.inputs?.integrityManifestPath ?? "phasegate.integrity.json"),
    constraintsPath: validatePath(input?.declarations?.constraintsPath ?? "phasegate.world-constraints.json"),
    baselinePath: validatePath(input?.declarations?.baselinePath ?? "phasegate.world-baseline.json"),
    waiversPath: validatePath(input?.declarations?.waiversPath ?? "phasegate.world-waivers.json"),
    debtsPath: validatePath(input?.declarations?.debtsPath ?? "phasegate.world-debts.json"),
    obligationReportPath: validatePath(input?.output?.obligationReportPath ?? ".harness/world-obligations.json"),
    sessionStart: Object.freeze({
      enabled: input?.sessionStart?.enabled ?? true,
      maxItems: assertLimit("world.sessionStart.maxItems", input?.sessionStart?.maxItems ?? 5, 20),
      maxChars: assertLimit("world.sessionStart.maxChars", input?.sessionStart?.maxChars ?? 2000, 8000),
    }),
  });
};
