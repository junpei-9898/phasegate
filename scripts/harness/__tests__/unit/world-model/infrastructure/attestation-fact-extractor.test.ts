// @unit world-model
// @layer test
// @work-item-id WI-290
// @story H17-05
// @story H17-18

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AttestationDocument, VerifyAttestationOutput } from "../../../../attestation/index.js";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import {
  AttestationFactExtractor,
  type AttestationVerificationFacade,
} from "../../../../world-model/infrastructure/adapters/attestation-fact-extractor.js";

class ByteHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    let value = 0;
    for (const byte of bytes) value = (value * 31 + byte) >>> 0;
    return Sha256Digest.fromHex(value.toString(16).padStart(8, "0").repeat(8));
  }
}

class FixedVerificationFacade implements AttestationVerificationFacade {
  constructor(private readonly output: VerifyAttestationOutput) {}

  async verify(): Promise<VerifyAttestationOutput> {
    return this.output;
  }
}

const passed: VerifyAttestationOutput = {
  ok: true,
  checks: {
    schema: true,
    mode: true,
    attestationDigest: true,
    inputHashes: true,
    granularity: true,
    acBoundScope: true,
  },
  mismatches: [],
};

const document = (producedAt: string, signatureDigest: string): AttestationDocument => ({
  schemaVersion: "phasegate-attestation/v1",
  predicateType: "https://phasegate.dev/attestation/gate-run/v1",
  subject: {
    command: "phasegate:ci-check",
    gateResult: "pass",
    validatorSet: [{ validatorId: "L3-004", passed: true, skipped: false }],
  },
  inputs: {
    digestAlgorithm: "sha256",
    sources: [
      { path: "phasegate.config.json", digest: `sha256:${"1".repeat(64)}` },
      { path: "git:HEAD", digest: `sha256:${"2".repeat(64)}` },
    ],
    inputDigest: `sha256:${"3".repeat(64)}`,
  },
  granularity: {
    traceability: {
      validator: "L3-004",
      level: "file",
      claim: "file claim",
      knownLimitations: ["known"],
    },
  },
  acBoundScope: ["H17-05"],
  metadata: {
    producedAt,
    producer: "phasegate-attestation/0.244.0",
    gitCommit: "deadbeef",
  },
  signature: {
    mode: "unsigned-poc",
    attestationDigest: signatureDigest,
    algorithm: null,
    keyId: null,
    value: null,
  },
});

let rootDir: string;
const filePath = ".harness/attestation.json";

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-attestation-facts-"));
  await mkdir(path.join(rootDir, ".harness"), { recursive: true });
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

const writeDocument = async (value: unknown): Promise<void> => {
  await writeFile(path.join(rootDir, filePath), JSON.stringify(value), "utf8");
};

describe("Attestation fact extraction", () => {
  it("public DTO semanticsとverification statusをgenerated Artifactへ投影すること", async () => {
    // Arrange
    await writeDocument(document("2026-07-16T00:00:00Z", `sha256:${"4".repeat(64)}`));
    const sut = new AttestationFactExtractor({
      rootDir,
      hashingPort: new ByteHashingPort(),
      verificationFacade: new FixedVerificationFacade(passed),
    });

    // Act
    const actual = await sut.extract();

    // Assert
    expect(actual.nodes.map((node) => node.id.toString())).toEqual([
      "pgw:v1:artifact:generated-artifact:generated:.harness/attestation.json",
    ]);
    expect(actual.nodes[0].attributes).toEqual(
      expect.objectContaining({
        verificationStatus: {
          ok: true,
          checks: passed.checks,
        },
      }),
    );
    expect(actual.nodes[0].attributes).not.toHaveProperty("metadata");
    expect(actual.nodes[0].attributes).not.toHaveProperty("signature");
    expect(JSON.stringify(actual.nodes[0].attributes)).not.toContain("git:HEAD");
  });

  it("producedAt・producer・gitCommit・signatureだけの差でdigestを変えないこと", async () => {
    // Arrange
    const sut = new AttestationFactExtractor({
      rootDir,
      hashingPort: new ByteHashingPort(),
      verificationFacade: new FixedVerificationFacade(passed),
    });

    // Act
    await writeDocument(document("2026-07-16T00:00:00Z", `sha256:${"4".repeat(64)}`));
    const first = await sut.extract();
    const changed = {
      ...document("2030-01-01T00:00:00Z", `sha256:${"5".repeat(64)}`),
      inputs: {
        ...document("2030-01-01T00:00:00Z", `sha256:${"5".repeat(64)}`).inputs,
        sources: [
          { path: "phasegate.config.json", digest: `sha256:${"1".repeat(64)}` },
          { path: "git:HEAD", digest: `sha256:${"9".repeat(64)}` },
        ],
        inputDigest: `sha256:${"8".repeat(64)}`,
      },
      metadata: {
        producedAt: "2030-01-01T00:00:00Z",
        producer: "phasegate-attestation/9.9.9",
        gitCommit: "changed",
      },
    };
    await writeDocument(changed);
    const second = await sut.extract();

    // Assert
    expect(first.nodes[0].contentDigest.toString()).toBe(second.nodes[0].contentDigest.toString());
  });

  it("verification statusの差をdigestへ含めること", async () => {
    // Arrange
    await writeDocument(document("2026-07-16T00:00:00Z", `sha256:${"4".repeat(64)}`));
    const failed: VerifyAttestationOutput = {
      ...passed,
      ok: false,
      checks: { ...passed.checks, attestationDigest: false },
      mismatches: ["digest mismatch"],
    };

    // Act
    const first = await new AttestationFactExtractor({
      rootDir,
      hashingPort: new ByteHashingPort(),
      verificationFacade: new FixedVerificationFacade(passed),
    }).extract();
    const second = await new AttestationFactExtractor({
      rootDir,
      hashingPort: new ByteHashingPort(),
      verificationFacade: new FixedVerificationFacade(failed),
    }).extract();

    // Assert
    expect(first.nodes[0].contentDigest.toString()).not.toBe(second.nodes[0].contentDigest.toString());
  });

  it("v2 worldSnapshotRootだけの差をWorld projectionから除外すること", async () => {
    // Arrange
    const sut = new AttestationFactExtractor({
      rootDir,
      hashingPort: new ByteHashingPort(),
      verificationFacade: new FixedVerificationFacade(passed),
    });
    const v2 = (root: string) => ({
      ...document("2026-07-16T00:00:00Z", `sha256:${"4".repeat(64)}`),
      schemaVersion: "phasegate-attestation/v2",
      predicateType: "https://phasegate.dev/attestation/gate-run/v2",
      worldSnapshotRoot: root,
    });

    // Act
    await writeDocument(v2(`sha256:${"b".repeat(64)}`));
    const first = await sut.extract();
    await writeDocument(v2(`sha256:${"c".repeat(64)}`));
    const second = await sut.extract();

    // Assert
    expect(first.diagnostics).toEqual([]);
    expect(second.diagnostics).toEqual([]);
    expect(first.nodes[0].contentDigest.toString()).toBe(second.nodes[0].contentDigest.toString());
    expect(first.nodes[0].attributes).not.toHaveProperty("worldSnapshotRoot");
  });

  it("unknown schemaとfile不在をartifactなしのdiagnosticにすること", async () => {
    // Arrange
    const sut = new AttestationFactExtractor({
      rootDir,
      hashingPort: new ByteHashingPort(),
      verificationFacade: new FixedVerificationFacade(passed),
    });

    // Act
    const absent = await sut.extract();
    await writeDocument({ ...document("x", `sha256:${"4".repeat(64)}`), schemaVersion: "future" });
    const unsupported = await sut.extract();

    // Assert
    expect(absent.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["not-present"]);
    expect(unsupported.nodes).toEqual([]);
    expect(unsupported.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unsupported-provider-schema"]);
  });
});
