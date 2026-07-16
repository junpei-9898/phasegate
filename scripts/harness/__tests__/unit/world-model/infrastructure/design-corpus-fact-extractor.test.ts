// @unit world-model
// @layer test
// @work-item-id WI-289
// @story H17-04

import { describe, expect, it } from "vitest";
import type { TraceabilityWorldReadDto } from "../../../../traceability-model/index.js";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { CorpusRole } from "../../../../world-model/domain/value-objects/corpus-role.js";
import { PathKey } from "../../../../world-model/domain/value-objects/path-key.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { DesignCorpusFactExtractor } from "../../../../world-model/infrastructure/adapters/design-corpus-fact-extractor.js";
import type {
  DesignFactCandidateExtraction,
  DesignFactSource,
} from "../../../../world-model/infrastructure/adapters/design-fact-extraction.js";
import { MarkdownDesignFactExtractor } from "../../../../world-model/infrastructure/adapters/markdown-design-fact-extractor.js";
import { TraceabilityDesignFactAdapter } from "../../../../world-model/infrastructure/adapters/traceability-design-fact-adapter.js";

class ByteSensitiveHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    const sum = bytes.reduce((total, byte) => (total + byte) % 256, 0);
    return Sha256Digest.fromHex(sum.toString(16).padStart(2, "0").repeat(32));
  }
}

class StaticFactSource implements DesignFactSource {
  constructor(private readonly result: DesignFactCandidateExtraction) {}

  async extract(): Promise<DesignFactCandidateExtraction> {
    return this.result;
  }
}

const empty: DesignFactCandidateExtraction = {
  nodeCandidates: [],
  workItemReferences: [],
  reflectionReferences: [],
  diagnostics: [],
};

const traceabilityDto: TraceabilityWorldReadDto = {
  schemaVersion: "phasegate-traceability-world-read/v1",
  units: [],
  stories: [],
  acceptanceCriteria: [],
  workItems: [
    {
      workItemId: "WI-289",
      legacyIds: [],
      type: "story",
      severity: "high",
      status: "drafted",
      affects: ["world-model"],
      descriptionPath: "docs/inception/_cross/WI-289/description.md",
    },
  ],
  testReferences: [],
  diagnostics: [],
};

const merge = (...results: readonly DesignFactCandidateExtraction[]): DesignFactCandidateExtraction => ({
  nodeCandidates: results.flatMap((result) => result.nodeCandidates),
  workItemReferences: results.flatMap((result) => result.workItemReferences),
  reflectionReferences: results.flatMap((result) => result.reflectionReferences),
  diagnostics: results.flatMap((result) => result.diagnostics),
});

describe("Design corpus fact extraction", () => {
  it("productとinceptionを別identityのままWorkItem hubとexplicit reflectionで接続すること", async () => {
    // Arrange
    const hashingPort = new ByteSensitiveHashingPort();
    const markdown = new MarkdownDesignFactExtractor({ hashingPort });
    const proposal = markdown.extractFile({
      path: PathKey.create("docs/inception/_cross/WI-289/description.md"),
      role: CorpusRole.inception(),
      bytes: new TextEncoder().encode(
        "<!-- @world-fragment-id proposal.overview -->\n<!-- @work-item-id WI-289 -->\n# Proposal\nSame\n",
      ),
    });
    const product = markdown.extractFile({
      path: PathKey.create("docs/product/product_overview.md"),
      role: CorpusRole.product(),
      bytes: new TextEncoder().encode(
        "<!-- @world-fragment-id product.overview -->\n<!-- @world-reflects inception:proposal.overview -->\n<!-- @work-item-id WI-289 -->\n# Product\nSame\n",
      ),
    });
    const sut = new DesignCorpusFactExtractor({
      traceabilityAdapter: new TraceabilityDesignFactAdapter({
        facade: { read: async () => traceabilityDto },
        hashingPort,
      }),
      productExtractor: new StaticFactSource(product),
      proposalExtractor: new StaticFactSource(proposal),
      adrExtractor: new StaticFactSource(empty),
      unitExtractor: new StaticFactSource(empty),
    });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual(
      expect.arrayContaining([
        "pgw:v1:artifact:design-document:product:docs/product/product_overview.md",
        "pgw:v1:artifact:design-document:inception:docs/inception/_cross/WI-289/description.md",
        "pgw:v1:fragment:product:product.overview",
        "pgw:v1:fragment:inception:proposal.overview",
        "pgw:v1:work-item:WI-289",
      ]),
    );
    expect(actual.edges.map((edge) => edge.toCanonicalValue())).toEqual(
      expect.arrayContaining([
        {
          edgeType: "proposed-by",
          from: "pgw:v1:fragment:inception:proposal.overview",
          qualifier: { line: 2, path: "docs/inception/_cross/WI-289/description.md" },
          to: "pgw:v1:work-item:WI-289",
        },
        {
          edgeType: "reflected-as",
          from: "pgw:v1:fragment:inception:proposal.overview",
          qualifier: { line: 2, path: "docs/product/product_overview.md" },
          to: "pgw:v1:fragment:product:product.overview",
        },
        {
          edgeType: "reflected-in",
          from: "pgw:v1:work-item:WI-289",
          qualifier: { line: 3, path: "docs/product/product_overview.md" },
          to: "pgw:v1:fragment:product:product.overview",
        },
      ]),
    );
    expect(actual.diagnostics).toEqual([]);
  });

  it("同じcorpus roleのduplicate Fragment IDにwinnerを選ばないこと", async () => {
    // Arrange
    const hashingPort = new ByteSensitiveHashingPort();
    const markdown = new MarkdownDesignFactExtractor({ hashingPort });
    const first = markdown.extractFile({
      path: PathKey.create("docs/product/a.md"),
      role: CorpusRole.product(),
      bytes: new TextEncoder().encode("<!-- @world-fragment-id duplicate.key -->\n# A\n"),
    });
    const second = markdown.extractFile({
      path: PathKey.create("docs/product/b.md"),
      role: CorpusRole.product(),
      bytes: new TextEncoder().encode("<!-- @world-fragment-id duplicate.key -->\n# B\n"),
    });
    const sut = new DesignCorpusFactExtractor({
      traceabilityAdapter: new TraceabilityDesignFactAdapter({
        facade: { read: async () => ({ ...traceabilityDto, workItems: [] }) },
        hashingPort,
      }),
      productExtractor: new StaticFactSource(merge(first, second)),
      proposalExtractor: new StaticFactSource(empty),
      adrExtractor: new StaticFactSource(empty),
      unitExtractor: new StaticFactSource(empty),
    });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).not.toContain("pgw:v1:fragment:product:duplicate.key");
    expect(actual.diagnostics.map((entry) => entry.toCanonicalValue())).toContainEqual(
      expect.objectContaining({
        code: "duplicate-node-id",
        nodeId: "pgw:v1:fragment:product:duplicate.key",
        payload: {
          candidatePaths: ["docs/product/a.md", "docs/product/b.md"],
          candidates: 2,
        },
      }),
    );
  });

  it("missing reflection targetをedgeへ推論せずdiagnosticにすること", async () => {
    // Arrange
    const hashingPort = new ByteSensitiveHashingPort();
    const product = new MarkdownDesignFactExtractor({ hashingPort }).extractFile({
      path: PathKey.create("docs/product/a.md"),
      role: CorpusRole.product(),
      bytes: new TextEncoder().encode(
        "<!-- @world-fragment-id product.a -->\n<!-- @world-reflects inception:missing.a -->\n# A\n",
      ),
    });
    const sut = new DesignCorpusFactExtractor({
      traceabilityAdapter: new TraceabilityDesignFactAdapter({
        facade: { read: async () => ({ ...traceabilityDto, workItems: [] }) },
        hashingPort,
      }),
      productExtractor: new StaticFactSource(product),
      proposalExtractor: new StaticFactSource(empty),
      adrExtractor: new StaticFactSource(empty),
      unitExtractor: new StaticFactSource(empty),
    });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.edges).toEqual([]);
    expect(actual.diagnostics.map((entry) => entry.code)).toContain("missing-reflection-target");
  });
});
