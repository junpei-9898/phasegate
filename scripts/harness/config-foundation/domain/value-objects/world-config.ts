// @unit config-foundation
// @layer domain
// @work-item-id WI-300

import { ConfigValidationError } from "../errors/config-validation-error.js";

export interface WorldConfigDocument {
  readonly enabled: boolean;
  readonly corpus: {
    readonly productRoots: readonly string[];
    readonly inceptionRoots: readonly string[];
    readonly adrRoots: readonly string[];
    readonly sourceRoots: readonly string[];
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
  readonly inputs: {
    readonly matrixPath: string;
    readonly attestationPath: string;
    readonly integrityManifestPath: string;
  };
  readonly declarations: {
    readonly constraintsPath: string;
    readonly baselinePath: string;
    readonly waiversPath: string;
    readonly debtsPath: string;
  };
  readonly output: {
    readonly obligationReportPath: string;
  };
  readonly sessionStart: {
    readonly enabled: boolean;
    readonly maxItems: number;
    readonly maxChars: number;
  };
}

export type WorldConfigSourceDocument = {
  readonly [K in keyof WorldConfigDocument]?: WorldConfigDocument[K] extends readonly string[]
    ? readonly string[]
    : WorldConfigDocument[K] extends object
      ? Partial<WorldConfigDocument[K]>
      : WorldConfigDocument[K];
};

export const WORLD_CONFIG_DEFAULTS: WorldConfigDocument = Object.freeze({
  enabled: false,
  corpus: Object.freeze({
    productRoots: Object.freeze(["docs/product"]),
    inceptionRoots: Object.freeze(["docs/inception"]),
    adrRoots: Object.freeze(["docs/ADR"]),
    sourceRoots: Object.freeze(["scripts/harness"]),
    include: Object.freeze(["**/*"]),
    exclude: Object.freeze([]),
  }),
  inputs: Object.freeze({
    matrixPath: ".harness/requirement-test-matrix.json",
    attestationPath: ".harness/attestation.json",
    integrityManifestPath: "phasegate.integrity.json",
  }),
  declarations: Object.freeze({
    constraintsPath: "phasegate.world-constraints.json",
    baselinePath: "phasegate.world-baseline.json",
    waiversPath: "phasegate.world-waivers.json",
    debtsPath: "phasegate.world-debts.json",
  }),
  output: Object.freeze({
    obligationReportPath: ".harness/world-obligations.json",
  }),
  sessionStart: Object.freeze({ enabled: true, maxItems: 5, maxChars: 2000 }),
});

const cloneDocument = (document: WorldConfigDocument): WorldConfigDocument =>
  Object.freeze({
    enabled: document.enabled,
    corpus: Object.freeze({
      productRoots: Object.freeze([...document.corpus.productRoots]),
      inceptionRoots: Object.freeze([...document.corpus.inceptionRoots]),
      adrRoots: Object.freeze([...document.corpus.adrRoots]),
      sourceRoots: Object.freeze([...document.corpus.sourceRoots]),
      include: Object.freeze([...document.corpus.include]),
      exclude: Object.freeze([...document.corpus.exclude]),
    }),
    inputs: Object.freeze({ ...document.inputs }),
    declarations: Object.freeze({ ...document.declarations }),
    output: Object.freeze({ ...document.output }),
    sessionStart: Object.freeze({ ...document.sessionStart }),
  });

const assertProjectRelativePosixPath = (value: string): void => {
  const segments = value.split("/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new ConfigValidationError(`world path must be a project-relative POSIX path: ${value}`);
  }
};

const assertUniqueStrings = (name: string, values: readonly string[], allowEmpty: boolean): void => {
  if (!allowEmpty && values.length === 0) {
    throw new ConfigValidationError(`${name} must not be empty`);
  }
  if (values.some((value) => value.length === 0) || new Set(values).size !== values.length) {
    throw new ConfigValidationError(`${name} must contain unique non-empty values`);
  }
};

interface CorpusRootEntry {
  readonly role: string;
  readonly path: string;
}

const rootsOverlap = (left: string, right: string): boolean =>
  left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);

const assertCorpusRoots = (document: WorldConfigDocument): void => {
  const entries: readonly CorpusRootEntry[] = [
    ...document.corpus.productRoots.map((path) => ({ role: "product", path })),
    ...document.corpus.inceptionRoots.map((path) => ({ role: "inception", path })),
    ...document.corpus.adrRoots.map((path) => ({ role: "adr", path })),
    ...document.corpus.sourceRoots.map((path) => ({ role: "source", path })),
  ];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      if (left.path.toLowerCase() === right.path.toLowerCase() && left.path !== right.path) {
        throw new ConfigValidationError(`world path case-fold collision: ${left.path} / ${right.path}`);
      }
      if (left.role !== right.role && rootsOverlap(left.path, right.path)) {
        throw new ConfigValidationError(`world corpus root role overlap: ${left.path} / ${right.path}`);
      }
    }
  }
};

const allPaths = (document: WorldConfigDocument): readonly string[] => [
  ...document.corpus.productRoots,
  ...document.corpus.inceptionRoots,
  ...document.corpus.adrRoots,
  ...document.corpus.sourceRoots,
  document.inputs.matrixPath,
  document.inputs.attestationPath,
  document.inputs.integrityManifestPath,
  document.declarations.constraintsPath,
  document.declarations.baselinePath,
  document.declarations.waiversPath,
  document.declarations.debtsPath,
  document.output.obligationReportPath,
];

const assertNoCaseFoldPathCollisions = (paths: readonly string[]): void => {
  const byFoldedPath = new Map<string, string>();
  for (const path of paths) {
    const folded = path.toLowerCase();
    const existing = byFoldedPath.get(folded);
    if (existing !== undefined && existing !== path) {
      throw new ConfigValidationError(`world path case-fold collision: ${existing} / ${path}`);
    }
    byFoldedPath.set(folded, path);
  }
};

export class WorldConfig {
  private constructor(private readonly document: WorldConfigDocument) {}

  static create(document: WorldConfigDocument): WorldConfig {
    assertUniqueStrings("world.corpus.productRoots", document.corpus.productRoots, false);
    assertUniqueStrings("world.corpus.inceptionRoots", document.corpus.inceptionRoots, false);
    assertUniqueStrings("world.corpus.adrRoots", document.corpus.adrRoots, false);
    assertUniqueStrings("world.corpus.sourceRoots", document.corpus.sourceRoots, false);
    assertUniqueStrings("world.corpus.include", document.corpus.include, false);
    assertUniqueStrings("world.corpus.exclude", document.corpus.exclude, true);
    const paths = allPaths(document);
    for (const path of paths) assertProjectRelativePosixPath(path);
    assertNoCaseFoldPathCollisions(paths);
    assertCorpusRoots(document);
    if (
      !Number.isInteger(document.sessionStart.maxItems) ||
      document.sessionStart.maxItems < 1 ||
      document.sessionStart.maxItems > 20 ||
      !Number.isInteger(document.sessionStart.maxChars) ||
      document.sessionStart.maxChars < 1 ||
      document.sessionStart.maxChars > 8000
    ) {
      throw new ConfigValidationError("world.sessionStart must use maxItems 1..20 and maxChars 1..8000");
    }
    return new WorldConfig(cloneDocument(document));
  }

  toDocument(): WorldConfigDocument {
    return cloneDocument(this.document);
  }
}
