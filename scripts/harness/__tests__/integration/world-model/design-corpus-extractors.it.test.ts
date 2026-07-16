// @unit world-model
// @layer integration
// @work-item-id WI-289
// @story H17-04

import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSha256Capability } from "../../../attestation/index.js";
import { createTraceabilityModelModule } from "../../../traceability-model/index.js";
import type { WorldHashingPort } from "../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../world-model/domain/value-objects/sha256-digest.js";
import { AdrFactExtractor } from "../../../world-model/infrastructure/adapters/adr-fact-extractor.js";
import { DesignCorpusFactExtractor } from "../../../world-model/infrastructure/adapters/design-corpus-fact-extractor.js";
import { MarkdownDesignFactExtractor } from "../../../world-model/infrastructure/adapters/markdown-design-fact-extractor.js";
import { ProductFactExtractor } from "../../../world-model/infrastructure/adapters/product-fact-extractor.js";
import { ProposalFactExtractor } from "../../../world-model/infrastructure/adapters/proposal-fact-extractor.js";
import { TraceabilityDesignFactAdapter } from "../../../world-model/infrastructure/adapters/traceability-design-fact-adapter.js";
import { UnitFactExtractor } from "../../../world-model/infrastructure/adapters/unit-fact-extractor.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../fixtures/world-model/design-corpus");
let rootDir: string;

class PublicSha256WorldHashingAdapter implements WorldHashingPort {
  private readonly capability = createSha256Capability();

  sha256(bytes: Uint8Array): Sha256Digest {
    return Sha256Digest.create(this.capability.hashBytes(bytes));
  }
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-design-corpus-"));
  await cp(path.join(fixtureRoot, "minimal-valid"), rootDir, { recursive: true });
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

const createSut = () => {
  const hashingPort = new PublicSha256WorldHashingAdapter();
  const markdownExtractor = new MarkdownDesignFactExtractor({ hashingPort });
  const traceability = createTraceabilityModelModule(rootDir, {
    pathRoots: {
      designDocsRoot: "docs/product/construction",
      testRoots: [],
    },
  });
  const traceabilityAdapter = new TraceabilityDesignFactAdapter({
    facade: traceability.worldReadFacade,
    hashingPort,
  });
  return new DesignCorpusFactExtractor({
    traceabilityAdapter,
    productExtractor: new ProductFactExtractor({ rootDir, markdownExtractor }),
    proposalExtractor: new ProposalFactExtractor({ rootDir, markdownExtractor }),
    adrExtractor: new AdrFactExtractor({ rootDir, markdownExtractor }),
    unitExtractor: new UnitFactExtractor({ rootDir, markdownExtractor }),
  });
};

describe("Design corpus filesystem extractors", () => {
  it("product・inception・ADR・Unitをowner-awareなWorld factへ抽出すること", async () => {
    // Arrange
    const sut = createSut();

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual(
      expect.arrayContaining([
        "pgw:v1:artifact:design-document:product:docs/product/product_overview.md",
        "pgw:v1:artifact:design-document:inception:docs/inception/_cross/WI-289/description.md",
        "pgw:v1:artifact:design-document:adr:docs/ADR/001-sample.md",
        "pgw:v1:artifact:design-document:product:docs/product/units/sample-unit_unit.md",
        "pgw:v1:fragment:product:phasegate.overview",
        "pgw:v1:fragment:inception:phasegate.proposal",
        "pgw:v1:work-item:WI-289",
      ]),
    );
    expect(actual.edges.map((edge) => edge.toCanonicalValue())).toContainEqual({
      edgeType: "reflected-as",
      from: "pgw:v1:fragment:inception:phasegate.proposal",
      qualifier: { line: 3, path: "docs/product/product_overview.md" },
      to: "pgw:v1:fragment:product:phasegate.overview",
    });
    const unitArtifact = actual.nodes.find(
      (node) => node.id.toString() === "pgw:v1:artifact:design-document:product:docs/product/units/sample-unit_unit.md",
    );
    expect(unitArtifact?.attributes).toEqual(expect.objectContaining({ unitId: "sample-unit" }));
    const storyArtifact = actual.nodes.find(
      (node) => node.id.toString() === "pgw:v1:artifact:design-document:product:docs/product/user_stories.md",
    );
    expect(storyArtifact?.attributes).toEqual(expect.objectContaining({ storyIds: ["H17-04"] }));
    expect(actual.diagnostics).toEqual([]);
  });

  it("同じbytesのproductとinceptionを同digestの別Artifactとして保持すること", async () => {
    // Arrange
    const sut = createSut();

    // Act
    const actual = await sut.extract();

    // Assert
    const product = actual.nodes.find(
      (node) => node.id.toString() === "pgw:v1:artifact:design-document:product:docs/product/shared.md",
    );
    const proposal = actual.nodes.find(
      (node) => node.id.toString() === "pgw:v1:artifact:design-document:inception:docs/inception/_shared/shared.md",
    );
    expect(product?.contentDigest.toString()).toBe(proposal?.contentDigest.toString());
    expect(product?.id.toString()).not.toBe(proposal?.id.toString());
  });

  it("duplicate・malformed・missing reflection・unsupported fileをdiagnosticへ隔離すること", async () => {
    // Arrange
    await cp(path.join(fixtureRoot, "invalid"), rootDir, { recursive: true, force: true });
    await symlink("product_overview.md", path.join(rootDir, "docs/product/linked.md"));
    const sut = createSut();

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).not.toContain("pgw:v1:fragment:product:duplicate.key");
    expect(actual.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "duplicate-node-id",
        "malformed-fragment-marker",
        "missing-reflection-target",
        "orphan-fragment-marker",
        "unsupported-corpus-file",
        "unsupported-file-type",
      ]),
    );
    const malformed = actual.diagnostics.find((entry) => entry.code === "malformed-fragment-marker");
    expect(malformed?.toCanonicalValue()).toEqual(
      expect.objectContaining({
        pathKey: "docs/product/orphan.md",
        payload: { raw: "<!-- @world-fragment-id INVALID KEY -->" },
      }),
    );
  });

  it("同じfixtureを2回抽出してbyte-equivalentなcanonical projectionを返すこと", async () => {
    // Arrange
    const sut = createSut();

    // Act
    const [first, second] = await Promise.all([sut.extract(), sut.extract()]);

    // Assert
    const project = (result: typeof first) => ({
      nodes: result.nodes.map((node) => node.toCanonicalValue()),
      edges: result.edges.map((edge) => edge.toCanonicalValue()),
      diagnostics: result.diagnostics.map((diagnostic) => diagnostic.toCanonicalValue()),
    });
    expect(JSON.stringify(project(first))).toBe(JSON.stringify(project(second)));
  });
});
