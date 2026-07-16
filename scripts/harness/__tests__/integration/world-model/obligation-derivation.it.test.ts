// @unit world-model
// @layer integration
// @work-item-id WI-295
// @story H17-09
// @ac H17-09-1
// @ac H17-09-2
// @ac H17-09-3
// @ac H17-09-4
// @ac H17-09-5
// @ac H17-09-6

import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Module from "ajv/dist/2020.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSha256Capability } from "../../../attestation/index.js";
import { DeriveObligationsUseCase } from "../../../world-model/application/usecases/derive-obligations-use-case.js";
import { CanonicalJsonSerializer } from "../../../world-model/domain/services/canonical-json-serializer.js";
import type { ConstraintFindingDto } from "../../../world-model/domain/services/constraint-evaluator.js";
import { ObligationDerivationService } from "../../../world-model/domain/services/obligation-derivation-service.js";
import { PolicyInputsDigestDeriver } from "../../../world-model/domain/services/policy-inputs-digest-deriver.js";
import { SnapshotRootDeriver } from "../../../world-model/domain/services/snapshot-root-deriver.js";
import { ViolationFingerprintDeriver } from "../../../world-model/domain/services/violation-fingerprint-deriver.js";
import { Sha256Digest } from "../../../world-model/domain/value-objects/sha256-digest.js";
import { AttestationSha256WorldHashingAdapter } from "../../../world-model/infrastructure/adapters/attestation-sha256-world-hashing-adapter.js";
import { FileSystemObligationReportWriterAdapter } from "../../../world-model/infrastructure/adapters/file-system-obligation-report-writer-adapter.js";
import {
  FileSystemAdoptionBaselineRepositoryAdapter,
  FileSystemSemanticDebtRepositoryAdapter,
  FileSystemWaiverDeclarationRepositoryAdapter,
} from "../../../world-model/infrastructure/adapters/file-system-world-control-repository-adapters.js";

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../../../../..");
const fixtureRoot = path.resolve(here, "../../fixtures/world-model/control-declarations/minimal-valid");
let rootDir: string;

const digest = (character: string): string => `sha256:${character.repeat(64)}`;
const endpoint = (
  role: "claimant" | "premise",
  nodeId: string,
  pinnedDigest: string,
  currentDigest: string | null,
) => ({
  role,
  declaredNodeId: nodeId,
  pinnedDigest,
  status: currentDigest === null ? ("missing" as const) : ("resolved" as const),
  resolvedNodeId: currentDigest === null ? null : nodeId,
  currentDigest,
  candidateCount: currentDigest === null ? 0 : 1,
  candidateContentDigests: currentDigest === null ? [] : [currentDigest],
  locators: [],
  sourceDiagnosticCodes: [],
});
const findings: readonly ConstraintFindingDto[] = [
  {
    ruleId: "WCR-008",
    constraintId: "pgw:v1:constraint:world.fixture-reference",
    factType: "references",
    endpoint: "claimant",
    claimant: endpoint("claimant", "pgw:v1:source-file:scripts/harness/a.ts", digest("a"), digest("f")),
    premise: endpoint("premise", "pgw:v1:source-file:scripts/harness/b.ts", digest("b"), digest("b")),
    declarationArtifactId: "pgw:v1:artifact:external-declaration:external:phasegate.world-constraints.json",
    declarationLocator: "/constraints/0",
    evidence: { expectedDigest: digest("a"), observedDigest: digest("f") },
  },
  {
    ruleId: "WCR-002",
    constraintId: "pgw:v1:constraint:world.missing-source",
    factType: "references",
    endpoint: "premise",
    claimant: endpoint("claimant", "pgw:v1:source-file:scripts/harness/a.ts", digest("a"), digest("a")),
    premise: endpoint("premise", "pgw:v1:source-file:scripts/harness/missing.ts", digest("c"), null),
    declarationArtifactId: "pgw:v1:artifact:external-declaration:external:phasegate.world-constraints.json",
    declarationLocator: "/constraints/1",
    evidence: { baselineCandidateCount: 0 },
  },
];

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "world-obligations-"));
  await cp(fixtureRoot, rootDir, { recursive: true });
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

const createUseCase = () => {
  const serializer = new CanonicalJsonSerializer();
  const hashing = new AttestationSha256WorldHashingAdapter(createSha256Capability());
  const fingerprint = new ViolationFingerprintDeriver(serializer, hashing);
  return new DeriveObligationsUseCase({
    baselineRepository: new FileSystemAdoptionBaselineRepositoryAdapter({ rootDir }),
    waiverRepository: new FileSystemWaiverDeclarationRepositoryAdapter({ rootDir }),
    semanticDebtRepository: new FileSystemSemanticDebtRepositoryAdapter({ rootDir }),
    policyInputsDigestDeriver: new PolicyInputsDigestDeriver(serializer, hashing),
    evaluationIdDeriver: new SnapshotRootDeriver(serializer, hashing),
    obligationDerivationService: new ObligationDerivationService(fingerprint),
    serializer,
    writer: new FileSystemObligationReportWriterAdapter({ rootDir }),
  });
};

const input = (orderedFindings: readonly ConstraintFindingDto[], writeReport: boolean) => ({
  rulesetVersion: "phasegate-world-wcr/v1",
  findings: orderedFindings,
  corpusRoot: Sha256Digest.create(digest("c")),
  constraintRoot: Sha256Digest.create(digest("d")),
  evaluationConfigDigest: Sha256Digest.create(digest("e")),
  policyAsOfDate: "2026-07-17",
  writeReport,
});

describe("Obligation derivation integration", () => {
  it("同じsemantic inputを列挙順に依存せずschema-validなgolden bytesへ再導出すること", async () => {
    // Arrange
    const useCase = createUseCase();
    const capability = createSha256Capability();
    const schema = JSON.parse(
      await readFile(path.join(repositoryRoot, "docs/contracts/world-obligation-report.schema.json"), "utf8"),
    ) as object;

    // Act
    const actualFirst = await useCase.execute(input(findings, false));
    const actualSecond = await useCase.execute(input([...findings].reverse(), false));

    // Assert
    if (actualFirst.status !== "derived" || actualSecond.status !== "derived") {
      throw new Error("expected derived reports");
    }
    expect(actualSecond.canonicalBytes).toEqual(actualFirst.canonicalBytes);
    expect(actualFirst.report).not.toHaveProperty("generatedAt");
    expect(new Ajv2020({ strict: false }).compile(schema)(actualFirst.report)).toBe(true);
    expect(capability.hashBytes(actualFirst.canonicalBytes)).toBe(
      "sha256:edf11a6a811fd595e25b810d67dc2e11350f47443bcd5b82f8a3cd860f06bd97",
    );
  });

  it("persisted reportを読まずpure deriveしwrite modeだけ同じbytesをatomic保存すること", async () => {
    // Arrange
    const reportPath = path.join(rootDir, ".harness/world-obligations.json");
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, '{"tampered":true}\n', "utf8");
    const useCase = createUseCase();

    // Act
    const actualPure = await useCase.execute(input(findings, false));
    const persistedAfterPure = await readFile(reportPath, "utf8");
    const actualWrite = await useCase.execute(input(findings, true));

    // Assert
    if (actualPure.status !== "derived" || actualWrite.status !== "derived") {
      throw new Error("expected derived reports");
    }
    expect(persistedAfterPure).toBe('{"tampered":true}\n');
    expect(Uint8Array.from(await readFile(reportPath))).toEqual(actualPure.canonicalBytes);
    expect(actualWrite.canonicalBytes).toEqual(actualPure.canonicalBytes);
    expect((await readdir(path.dirname(reportPath))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("unknown policy schemaをemptyへfallbackせずreportを書かないこと", async () => {
    // Arrange
    await writeFile(
      path.join(rootDir, "phasegate.world-waivers.json"),
      JSON.stringify({ schemaVersion: "phasegate-world-waivers/v99", waivers: [] }),
      "utf8",
    );
    const useCase = createUseCase();

    // Act
    const actual = await useCase.execute(input(findings, true));

    // Assert
    expect(actual).toMatchObject({
      status: "invalid-policy-input",
      diagnostics: [{ code: "unsupported-schema-version" }],
    });
    await expect(readFile(path.join(rootDir, ".harness/world-obligations.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
