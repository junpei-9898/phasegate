// @unit world-model
// @layer integration
// @work-item-id WI-290
// @story H17-05

import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttestationModule, createSha256Capability } from "../../../attestation/index.js";
import type { WorldHashingPort } from "../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../world-model/domain/value-objects/sha256-digest.js";
import {
  AttestationFactExtractor,
  AttestationVerificationHandlerAdapter,
} from "../../../world-model/infrastructure/adapters/attestation-fact-extractor.js";
import { IntegrityManifestFactExtractor } from "../../../world-model/infrastructure/adapters/integrity-manifest-fact-extractor.js";
import { MatrixFactExtractor } from "../../../world-model/infrastructure/adapters/matrix-fact-extractor.js";
import { SourceMetadataFactExtractor } from "../../../world-model/infrastructure/adapters/source-metadata-fact-extractor.js";
import { TestReferenceSourceFactExtractor } from "../../../world-model/infrastructure/adapters/test-reference-source-fact-extractor.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../../../../..");
const fixtureRoot = path.resolve(here, "../../fixtures/world-model/runtime-corpus");
let rootDir: string;

class PublicSha256WorldHashingAdapter implements WorldHashingPort {
  private readonly capability = createSha256Capability();

  sha256(bytes: Uint8Array): Sha256Digest {
    return Sha256Digest.create(this.capability.hashBytes(bytes));
  }
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-runtime-corpus-"));
  await cp(path.join(fixtureRoot, "minimal-valid"), rootDir, { recursive: true });
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

const createExtractors = () => {
  const hashingPort = new PublicSha256WorldHashingAdapter();
  const attestation = createAttestationModule(rootDir, {
    gitCommitProvider: async () => null,
  });
  return {
    source: new SourceMetadataFactExtractor({ rootDir, hashingPort }),
    tests: new TestReferenceSourceFactExtractor({ rootDir, hashingPort }),
    matrix: new MatrixFactExtractor({ rootDir, hashingPort }),
    attestation: new AttestationFactExtractor({
      rootDir,
      hashingPort,
      verificationFacade: new AttestationVerificationHandlerAdapter(attestation.verifyAttestationHandler),
    }),
    integrity: new IntegrityManifestFactExtractor({ rootDir, hashingPort }),
  };
};

describe("Runtime / evidence filesystem extractors", () => {
  it("source・test・matrix・attestation・integrityをowner-aware factへ抽出すること", async () => {
    // Arrange
    const extractors = createExtractors();

    // Act
    const [source, tests, matrix, attestation, integrity] = await Promise.all([
      extractors.source.extract(),
      extractors.tests.extract(),
      extractors.matrix.extract(),
      extractors.attestation.extract(),
      extractors.integrity.extract(),
    ]);

    // Assert
    expect(source.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:source-file:scripts/harness/sample/domain/model.ts",
    ]);
    expect(tests.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:source-file:scripts/harness/__tests__/unit/sample/model.test.ts",
    ]);
    expect(matrix.nodes.map((node) => node.id.nodeType)).toEqual(["artifact", "test-reference", "test-reference"]);
    expect(attestation.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:artifact:generated-artifact:generated:.harness/attestation.json",
    ]);
    expect(attestation.nodes[0].attributes).toEqual(
      expect.objectContaining({
        verificationStatus: expect.objectContaining({ ok: false }),
      }),
    );
    expect(integrity.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:artifact:external-declaration:external:phasegate.integrity.json",
    ]);
    expect([
      ...source.diagnostics,
      ...tests.diagnostics,
      ...matrix.diagnostics,
      ...attestation.diagnostics,
      ...integrity.diagnostics,
    ]).toEqual([]);
  });

  it("unsupported provider schemaをempty successへ変換しないこと", async () => {
    // Arrange
    await cp(path.join(fixtureRoot, "invalid"), rootDir, { recursive: true, force: true });
    const extractors = createExtractors();

    // Act
    const [matrix, attestation, integrity] = await Promise.all([
      extractors.matrix.extract(),
      extractors.attestation.extract(),
      extractors.integrity.extract(),
    ]);

    // Assert
    expect(matrix.nodes).toEqual([]);
    expect(attestation.nodes).toEqual([]);
    expect(integrity.nodes).toEqual([]);
    expect(
      [...matrix.diagnostics, ...attestation.diagnostics, ...integrity.diagnostics].map(
        (diagnostic) => diagnostic.code,
      ),
    ).toEqual(["unsupported-projection-field", "unsupported-provider-schema", "unsupported-provider-schema"]);
  });

  it("optional provider file不在をprovider別not-present observationにすること", async () => {
    // Arrange
    await rm(path.join(rootDir, ".harness"), { recursive: true, force: true });
    await rm(path.join(rootDir, "phasegate.integrity.json"), { force: true });
    const extractors = createExtractors();

    // Act
    const actual = await Promise.all([
      extractors.matrix.extract(),
      extractors.attestation.extract(),
      extractors.integrity.extract(),
    ]);

    // Assert
    expect(actual.map((result) => result.diagnostics[0].toCanonicalValue())).toEqual([
      expect.objectContaining({ code: "not-present", payload: { provider: "matrix" } }),
      expect.objectContaining({ code: "not-present", payload: { provider: "attestation" } }),
      expect.objectContaining({ code: "not-present", payload: { provider: "integrity" } }),
    ]);
  });

  it("provider deep importとworld-model内node:crypto call siteを増やさないこと", async () => {
    // Arrange
    const adapterRoot = path.join(repositoryRoot, "scripts/harness/world-model/infrastructure/adapters");
    const files = ["matrix-fact-extractor.ts", "attestation-fact-extractor.ts", "integrity-manifest-fact-extractor.ts"];

    // Act
    const actual = await Promise.all(
      files.map(async (file) => ({
        file,
        source: await readFile(path.join(adapterRoot, file), "utf8"),
      })),
    );

    // Assert
    expect(
      actual.flatMap(({ file, source }) =>
        [...source.matchAll(/from\s+"([^"]+)"/g)]
          .map((match) => match[1])
          .filter((specifier) => specifier.includes("attestation/") || specifier.includes("nyquist-validation/"))
          .map((specifier) => ({ file, specifier })),
      ),
    ).toEqual([
      {
        file: "matrix-fact-extractor.ts",
        specifier: "../../../nyquist-validation/index.js",
      },
      {
        file: "attestation-fact-extractor.ts",
        specifier: "../../../attestation/index.js",
      },
    ]);
    expect(actual.some(({ source }) => source.includes("node:crypto"))).toBe(false);
  });
});
