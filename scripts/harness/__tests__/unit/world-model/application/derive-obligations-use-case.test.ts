// @unit world-model
// @layer test
// @work-item-id WI-295
// @story H17-09
// @ac H17-09-4
// @ac H17-09-5

import { describe, expect, it } from "vitest";
import type { ObligationReportWriterPort } from "../../../../world-model/application/ports/obligation-report-writer-port.js";
import type {
  AdoptionBaselineRepositoryPort,
  SemanticDebtRepositoryPort,
  WaiverDeclarationRepositoryPort,
} from "../../../../world-model/application/ports/world-control-declaration-repository-port.js";
import { DeriveObligationsUseCase } from "../../../../world-model/application/usecases/derive-obligations-use-case.js";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { CanonicalJsonSerializer } from "../../../../world-model/domain/services/canonical-json-serializer.js";
import type { ConstraintFindingDto } from "../../../../world-model/domain/services/constraint-evaluator.js";
import { ObligationDerivationService } from "../../../../world-model/domain/services/obligation-derivation-service.js";
import { PolicyInputsDigestDeriver } from "../../../../world-model/domain/services/policy-inputs-digest-deriver.js";
import { SnapshotRootDeriver } from "../../../../world-model/domain/services/snapshot-root-deriver.js";
import { ViolationFingerprintDeriver } from "../../../../world-model/domain/services/violation-fingerprint-deriver.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";

class DeterministicHashingPort implements WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest {
    const hex = [...bytes]
      .reduce((value, byte) => (value + byte) >>> 0, 0)
      .toString(16)
      .padStart(8, "0");
    return Sha256Digest.create(`sha256:${hex.repeat(8)}`);
  }
}

class RecordingWriter implements ObligationReportWriterPort {
  readonly writes: Uint8Array[] = [];
  async write(bytes: Uint8Array): Promise<void> {
    this.writes.push(Uint8Array.from(bytes));
  }
}

class FailingWriter implements ObligationReportWriterPort {
  async write(_bytes: Uint8Array): Promise<void> {
    throw new Error("disk unavailable");
  }
}

const digest = (character: string): string => `sha256:${character.repeat(64)}`;
const finding: ConstraintFindingDto = {
  ruleId: "WCR-008",
  constraintId: "pgw:v1:constraint:world.digest-pin",
  factType: "content-equals",
  endpoint: "claimant",
  claimant: {
    role: "claimant",
    declaredNodeId: "pgw:v1:source-file:a.ts",
    pinnedDigest: digest("a"),
    status: "resolved",
    resolvedNodeId: "pgw:v1:source-file:a.ts",
    currentDigest: digest("b"),
    candidateCount: 1,
    candidateContentDigests: [digest("b")],
    locators: [],
    sourceDiagnosticCodes: [],
  },
  premise: {
    role: "premise",
    declaredNodeId: "pgw:v1:source-file:b.ts",
    pinnedDigest: digest("c"),
    status: "resolved",
    resolvedNodeId: "pgw:v1:source-file:b.ts",
    currentDigest: digest("c"),
    candidateCount: 1,
    candidateContentDigests: [digest("c")],
    locators: [],
    sourceDiagnosticCodes: [],
  },
  declarationArtifactId: "pgw:v1:artifact:external-declaration:external:phasegate.world-constraints.json",
  declarationLocator: "/constraints/0",
  evidence: { expectedDigest: digest("a"), observedDigest: digest("b") },
};

const loaded = <T>(value: T) => ({ state: "loaded" as const, value, diagnostics: [] });
const repositories = (): {
  baseline: AdoptionBaselineRepositoryPort;
  waivers: WaiverDeclarationRepositoryPort;
  debts: SemanticDebtRepositoryPort;
} => ({
  baseline: { load: async () => loaded(null), replaceAtomically: async () => ({ state: "written", path: "" }) },
  waivers: { load: async () => loaded([]), replaceAtomically: async () => ({ state: "written", path: "" }) },
  debts: { load: async () => loaded([]), replaceAtomically: async () => ({ state: "written", path: "" }) },
});

const createUseCase = (writer: ObligationReportWriterPort = new RecordingWriter(), overrides = repositories()) => {
  const serializer = new CanonicalJsonSerializer();
  const hashing = new DeterministicHashingPort();
  const fingerprint = new ViolationFingerprintDeriver(serializer, hashing);
  return {
    writer,
    useCase: new DeriveObligationsUseCase({
      baselineRepository: overrides.baseline,
      waiverRepository: overrides.waivers,
      semanticDebtRepository: overrides.debts,
      policyInputsDigestDeriver: new PolicyInputsDigestDeriver(serializer, hashing),
      evaluationIdDeriver: new SnapshotRootDeriver(serializer, hashing),
      obligationDerivationService: new ObligationDerivationService(fingerprint),
      serializer,
      writer,
    }),
  };
};

const input = {
  rulesetVersion: "phasegate-world-wcr/v1",
  findings: [finding],
  corpusRoot: Sha256Digest.create(digest("c")),
  constraintRoot: Sha256Digest.create(digest("d")),
  evaluationConfigDigest: Sha256Digest.create(digest("e")),
  policyAsOfDate: null,
};

describe("DeriveObligationsUseCase", () => {
  it("pure modeとwrite modeでbyte-identical reportを返しpureではwriterを呼ばないこと", async () => {
    // Arrange
    const writer = new RecordingWriter();
    const { useCase } = createUseCase(writer);

    // Act
    const actualPure = await useCase.execute({ ...input, writeReport: false });
    const actualWrite = await useCase.execute({ ...input, writeReport: true });

    // Assert
    expect(actualPure.status).toBe("derived");
    expect(actualWrite.status).toBe("derived");
    if (actualPure.status !== "derived" || actualWrite.status !== "derived") throw new Error("expected report");
    expect(actualWrite.canonicalBytes).toEqual(actualPure.canonicalBytes);
    expect(writer.writes).toEqual([actualPure.canonicalBytes]);
    expect(actualPure.persistence).toEqual({ state: "not-requested" });
    expect(actualWrite.persistence).toEqual({ state: "written" });
  });

  it("invalid policy repositoryをemptyへfallbackせずreportとdigestを作らないこと", async () => {
    // Arrange
    const repos = repositories();
    repos.waivers = {
      load: async () => ({
        state: "invalid",
        diagnostics: [
          { code: "unsupported-schema-version", path: "phasegate.world-waivers.json", locator: null, message: "v99" },
        ],
      }),
      replaceAtomically: async () => ({ state: "invalid", diagnostics: [] }),
    };
    const writer = new RecordingWriter();
    const { useCase } = createUseCase(writer, repos);

    // Act
    const actual = await useCase.execute({ ...input, writeReport: true });

    // Assert
    expect(actual).toMatchObject({
      status: "invalid-policy-input",
      diagnostics: [{ code: "unsupported-schema-version" }],
    });
    expect("report" in actual).toBe(false);
    expect(writer.writes).toEqual([]);
  });

  it("policy input差でevaluation IDを変えてもraw finding fingerprintを変えないこと", async () => {
    // Arrange
    const { useCase } = createUseCase();

    // Act
    const actualFirst = await useCase.execute({ ...input, writeReport: false });
    const actualSecond = await useCase.execute({
      ...input,
      evaluationConfigDigest: Sha256Digest.create(digest("f")),
      writeReport: false,
    });

    // Assert
    if (actualFirst.status !== "derived" || actualSecond.status !== "derived") throw new Error("expected report");
    expect(actualSecond.report.evaluationId).not.toBe(actualFirst.report.evaluationId);
    expect(actualSecond.report.structuralObligations[0].violationFingerprint).toBe(
      actualFirst.report.structuralObligations[0].violationFingerprint,
    );
  });

  it("write failureがderived reportを変更せずpersistence failureとして分離されること", async () => {
    // Arrange
    const pure = createUseCase();
    const failing = createUseCase(new FailingWriter());

    // Act
    const actualPure = await pure.useCase.execute({ ...input, writeReport: false });
    const actualFailed = await failing.useCase.execute({ ...input, writeReport: true });

    // Assert
    if (actualPure.status !== "derived" || actualFailed.status !== "derived") {
      throw new Error("expected derived reports");
    }
    expect(actualFailed.report).toEqual(actualPure.report);
    expect(actualFailed.canonicalBytes).toEqual(actualPure.canonicalBytes);
    expect(actualFailed.persistence).toEqual({
      state: "failed",
      message: "disk unavailable",
    });
  });
});
