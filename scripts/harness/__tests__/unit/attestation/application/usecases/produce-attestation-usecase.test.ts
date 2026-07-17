// @unit attestation
// @layer test
// @story H16-01
// @story H17-18

import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AttestationDocument } from "../../../../../attestation/application/dto/attestation-document.js";
import type { ProduceAttestationInput } from "../../../../../attestation/application/dto/produce-attestation-input.js";
import { AttestationRecordMapper } from "../../../../../attestation/application/mappers/attestation-record-mapper.js";
import {
  type ProduceAttestationDeps,
  ProduceAttestationUseCase,
} from "../../../../../attestation/application/usecases/produce-attestation-usecase.js";
import { AcBoundScopeService } from "../../../../../attestation/domain/services/ac-bound-scope-service.js";
import { GranularityDerivationService } from "../../../../../attestation/domain/services/granularity-derivation-service.js";
import { Digest } from "../../../../../attestation/domain/value-objects/digest.js";
import { L3_004_FILE_LEVEL_KNOWN_LIMITATION } from "../../../../../attestation/domain/value-objects/granularity-claim.js";
import { context, target } from "../../../../helpers/test-helpers.js";

/** 実 sha256 で ContentHasherPort を満たす（domain 純粋計算; port の実体差し替えは application 境界で許可）。 */
const realHasher = {
  sha256: (content: string): Digest => Digest.fromSha256Hex(createHash("sha256").update(content, "utf8").digest("hex")),
};

const GATE_PASS = {
  allPassed: true,
  validatorResults: [
    { validatorId: "L3-001", passed: true, skipped: false },
    { validatorId: "L3-004", passed: true, skipped: false },
  ],
};

const GATE_FAIL = {
  allPassed: false,
  validatorResults: [{ validatorId: "L3-001", passed: false, skipped: false }],
};

const buildSut = (overrides?: {
  gate?: typeof GATE_PASS;
  writeSpy?: ReturnType<typeof vi.fn>;
  worldSnapshotRootProvider?: ProduceAttestationDeps["worldSnapshotRootProvider"];
}) => {
  const writeSpy = overrides?.writeSpy ?? vi.fn().mockResolvedValue(undefined);
  const deps: ProduceAttestationDeps = {
    gateResultSource: {
      fetchGateResult: vi.fn().mockResolvedValue(overrides?.gate ?? GATE_PASS),
    },
    sourceDigester: {
      digestFile: vi.fn().mockImplementation(async (path: string) => realHasher.sha256(`content-of-${path}`)),
    },
    hasher: realHasher,
    repository: {
      write: writeSpy,
      read: vi.fn(),
    },
    granularityService: new GranularityDerivationService(),
    mapper: new AttestationRecordMapper(),
    gitCommitProvider: vi.fn().mockResolvedValue("deadbeef"),
    pkgVersion: "1.2.3",
    clock: () => new Date("2026-07-05T12:00:00Z"),
    inputSourcePaths: ["phasegate.config.json", ".harness/requirement-test-matrix.json"],
    worldSnapshotRootProvider: overrides?.worldSnapshotRootProvider,
  };
  return { sut: new ProduceAttestationUseCase(deps), writeSpy };
};

const baseInput: ProduceAttestationInput = {
  out: ".harness/attestation.json",
  requirePass: false,
  emitJson: false,
  mode: "unsigned-poc",
};

target("ProduceAttestationUseCase", () => {
  describe("生成成功テスト（gate pass）", () => {
    it("exitCode 0 で document を out に書く（AC-1 / AC-2）", async () => {
      // Arrange
      const { sut, writeSpy } = buildSut();
      // Act
      const result = await sut.execute(baseInput);
      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.document).not.toBeNull();
      expect(writeSpy).toHaveBeenCalledTimes(1);
      const [outPath, doc] = writeSpy.mock.calls[0] as [string, AttestationDocument];
      expect(outPath).toBe(".harness/attestation.json");
      expect(doc.schemaVersion).toBe("phasegate-attestation/v1");
      expect(doc.subject.validatorSet).toEqual([
        { validatorId: "L3-001", passed: true, skipped: false },
        { validatorId: "L3-004", passed: true, skipped: false },
      ]);
    });

    it("gateResult は allPassed をミラーする（AC-3）", async () => {
      const { sut } = buildSut();
      const result = await sut.execute(baseInput);
      expect(result.document?.subject.gateResult).toBe("pass");
    });

    it("sources は sha256 digest を持ち inputDigest が算出される（AC-4 / AC-5）", async () => {
      const { sut } = buildSut();
      const result = await sut.execute(baseInput);
      const doc = result.document as AttestationDocument;
      for (const source of doc.inputs.sources) {
        expect(source.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
      }
      expect(doc.inputs.inputDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
      // git commit SHA が source に取り込まれている（AC-5）
      expect(doc.inputs.sources.some((s) => s.path === "git:HEAD")).toBe(true);
      // gitCommit が metadata に記録される
      expect(doc.metadata.gitCommit).toBe("deadbeef");
    });

    it("granularity が validatorSet から導出され L3-004 file-level 制約を含む（AC-6 / AC-7）", async () => {
      const { sut } = buildSut();
      const result = await sut.execute(baseInput);
      const g = (result.document as AttestationDocument).granularity.traceability;
      expect(g.validator).toBe("L3-004");
      expect(g.level).toBe("file");
      expect(g.knownLimitations).toContain(L3_004_FILE_LEVEL_KNOWN_LIMITATION);
    });

    it("signature は unsigned-poc で algorithm/keyId/value が null（AC-8）", async () => {
      const { sut } = buildSut();
      const result = await sut.execute(baseInput);
      const sig = (result.document as AttestationDocument).signature;
      expect(sig.mode).toBe("unsigned-poc");
      expect(sig.algorithm).toBeNull();
      expect(sig.keyId).toBeNull();
      expect(sig.value).toBeNull();
      expect(sig.attestationDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
  });

  describe("v2 World snapshot root テスト（WI-306）", () => {
    it("providerが返すrootを持つv2を生成しfragment digestを保存しない", async () => {
      // Arrange
      const root = `sha256:${"b".repeat(64)}`;
      const { sut } = buildSut({ worldSnapshotRootProvider: { getWorldSnapshotRoot: async () => root } });

      // Act
      const result = await sut.execute(baseInput);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.document).toMatchObject({
        schemaVersion: "phasegate-attestation/v2",
        predicateType: "https://phasegate.dev/attestation/gate-run/v2",
        worldSnapshotRoot: root,
      });
      expect(JSON.stringify(result.document)).not.toContain("fragmentDigest");
    });

    it("provider未配線では従来v1 shapeを維持する", async () => {
      // Arrange
      const { sut } = buildSut();

      // Act
      const result = await sut.execute(baseInput);

      // Assert
      expect(result.document?.schemaVersion).toBe("phasegate-attestation/v1");
      expect(result.document).not.toHaveProperty("worldSnapshotRoot");
    });

    it("provider失敗または不正digestではrecordを書かずexit 2", async () => {
      // Arrange
      const failed = buildSut({
        worldSnapshotRootProvider: {
          getWorldSnapshotRoot: async () => {
            throw new Error("unavailable");
          },
        },
      });
      const invalid = buildSut({
        worldSnapshotRootProvider: { getWorldSnapshotRoot: async () => "not-a-digest" },
      });

      // Act
      const failedResult = await failed.sut.execute(baseInput);
      const invalidResult = await invalid.sut.execute(baseInput);

      // Assert
      expect(failedResult.exitCode).toBe(2);
      expect(invalidResult.exitCode).toBe(2);
      expect(failed.writeSpy).not.toHaveBeenCalled();
      expect(invalid.writeSpy).not.toHaveBeenCalled();
    });
  });

  describe("決定論テスト（AC-9）", () => {
    it("producedAt が違っても attestationDigest は一致する", async () => {
      // Arrange: 同一 gate 結果・同一 source・producedAt のみ差
      const sutA = buildSut().sut;
      const sutB = (() => {
        const { sut } = buildSut();
        return sut;
      })();
      // producedAt を変えるため clock を差し替えた 2 個目を組む
      const writeSpyB = vi.fn().mockResolvedValue(undefined);
      const depsB: ProduceAttestationDeps = {
        gateResultSource: { fetchGateResult: vi.fn().mockResolvedValue(GATE_PASS) },
        sourceDigester: {
          digestFile: vi.fn().mockImplementation(async (path: string) => realHasher.sha256(`content-of-${path}`)),
        },
        hasher: realHasher,
        repository: { write: writeSpyB, read: vi.fn() },
        granularityService: new GranularityDerivationService(),
        mapper: new AttestationRecordMapper(),
        gitCommitProvider: vi.fn().mockResolvedValue("deadbeef"),
        pkgVersion: "1.2.3",
        clock: () => new Date("2099-01-01T00:00:00Z"),
        inputSourcePaths: ["phasegate.config.json", ".harness/requirement-test-matrix.json"],
      };
      const sutBReal = new ProduceAttestationUseCase(depsB);
      void sutB;
      // Act
      const resA = await sutA.execute(baseInput);
      const resB = await sutBReal.execute(baseInput);
      // Assert: producedAt は異なるが attestationDigest は一致
      expect(resA.document?.metadata.producedAt).not.toBe(resB.document?.metadata.producedAt);
      expect(resA.document?.signature.attestationDigest).toBe(resB.document?.signature.attestationDigest);
    });
  });

  describe("acBoundScope テスト（H16-03 / AC-5, AC-6）", () => {
    it("matrixSource + allowlist から acBoundScope を導出し record に記録する（HF2-05）", async () => {
      // Arrange
      const writeSpy = vi.fn().mockResolvedValue(undefined);
      const matrix = {
        stories: [
          {
            storyId: "HF2-05",
            storyMappings: [
              { acId: "AC-1", testReferences: [{ binding: "ac" }] },
              { acId: "AC-2", testReferences: [{ binding: "ac" }, { binding: "file" }] },
            ],
          },
        ],
      };
      const deps: ProduceAttestationDeps = {
        gateResultSource: { fetchGateResult: vi.fn().mockResolvedValue(GATE_PASS) },
        sourceDigester: {
          digestFile: vi.fn().mockImplementation(async (path: string) => realHasher.sha256(`content-of-${path}`)),
        },
        hasher: realHasher,
        repository: { write: writeSpy, read: vi.fn() },
        granularityService: new GranularityDerivationService(),
        mapper: new AttestationRecordMapper(),
        gitCommitProvider: vi.fn().mockResolvedValue("deadbeef"),
        pkgVersion: "1.2.3",
        clock: () => new Date("2026-07-05T12:00:00Z"),
        inputSourcePaths: ["phasegate.config.json", ".harness/requirement-test-matrix.json"],
        matrixSource: { load: vi.fn().mockResolvedValue(matrix) },
        allowlist: { getAcBoundStories: vi.fn().mockResolvedValue(["HF2-05"]) },
        acBoundScopeService: new AcBoundScopeService(),
      };
      const sut = new ProduceAttestationUseCase(deps);
      // Act
      const result = await sut.execute(baseInput);
      // Assert
      const doc = result.document as AttestationDocument;
      expect(doc.acBoundScope).toEqual(["HF2-05"]);
      // granularity.level は "file" のまま（AC-6）
      expect(doc.granularity.traceability.level).toBe("file");
    });
  });

  describe("require-pass テスト（AC-10）", () => {
    context("gate fail かつ requirePass の場合", () => {
      it("record を一切出力せず exitCode 1 を返す", async () => {
        // Arrange
        const { sut, writeSpy } = buildSut({ gate: GATE_FAIL });
        // Act
        const result = await sut.execute({ ...baseInput, requirePass: true });
        // Assert
        expect(result.exitCode).toBe(1);
        expect(result.document).toBeNull();
        expect(writeSpy).not.toHaveBeenCalled();
      });
    });

    context("gate fail だが requirePass off の場合", () => {
      it("gateResult=fail の record を出力し exitCode 0", async () => {
        const { sut, writeSpy } = buildSut({ gate: GATE_FAIL });
        const result = await sut.execute({ ...baseInput, requirePass: false });
        expect(result.exitCode).toBe(0);
        expect(result.document?.subject.gateResult).toBe("fail");
        expect(writeSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("mode signed テスト（AC-12）", () => {
    it("exitCode 2 を返し record を生成/出力しない", async () => {
      const { sut, writeSpy } = buildSut();
      const result = await sut.execute({ ...baseInput, mode: "signed" });
      expect(result.exitCode).toBe(2);
      expect(result.document).toBeNull();
      expect(writeSpy).not.toHaveBeenCalled();
    });
  });
});
