// @unit attestation
// @layer test
// @story H16-01

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, it } from "vitest";
import { AttestationRecordMapper } from "../../../attestation/application/mappers/attestation-record-mapper.js";
import type {
  GateResultSourcePort,
  GateValidatorResult,
} from "../../../attestation/application/ports/gate-result-source-port.js";
import { ProduceAttestationUseCase } from "../../../attestation/application/usecases/produce-attestation-usecase.js";
import { VerifyAttestationUseCase } from "../../../attestation/application/usecases/verify-attestation-usecase.js";
import { GranularityDerivationService } from "../../../attestation/domain/services/granularity-derivation-service.js";
import { AcBoundScopeService } from "../../../attestation/domain/services/ac-bound-scope-service.js";
import { FileSystemAttestationRepositoryAdapter } from "../../../attestation/infrastructure/adapters/file-system-attestation-repository-adapter.js";
import { FileSystemSourceDigesterAdapter } from "../../../attestation/infrastructure/adapters/file-system-source-digester-adapter.js";
import { FileSystemMatrixSourceAdapter } from "../../../attestation/infrastructure/adapters/file-system-matrix-source-adapter.js";
import type { AcBoundAllowlistPort } from "../../../attestation/application/ports/ac-bound-allowlist-port.js";
import { NodeCryptoContentHasherAdapter } from "../../../attestation/infrastructure/adapters/node-crypto-content-hasher-adapter.js";
import { AttestHandler } from "../../../attestation/presentation/handlers/attest-handler.js";
import { VerifyAttestationHandler } from "../../../attestation/presentation/handlers/verify-attestation-handler.js";
import { context, target } from "../../helpers/test-helpers.js";

/**
 * E2E round-trip は実 subprocess の ci-check には依存せず、GateResultSourcePort を
 * in-memory fake で差し替えてハーメティックに走らせる（実 ci-check の parse は
 * ci-check-gate-result-adapter.test.ts で個別検証済み）。
 * hasher / sourceDigester / repository は実 infrastructure を使い、実ファイル I/O で round-trip する。
 */
class FakeGateResultSource implements GateResultSourcePort {
  constructor(
    private readonly allPassed: boolean,
    private readonly validatorResults: readonly GateValidatorResult[],
  ) {}
  async fetchGateResult(): Promise<{
    readonly allPassed: boolean;
    readonly validatorResults: readonly GateValidatorResult[];
  }> {
    return { allPassed: this.allPassed, validatorResults: this.validatorResults };
  }
}

interface Harness {
  readonly dir: string;
  readonly outPath: string;
  readonly attestHandler: AttestHandler;
  readonly verifyHandler: VerifyAttestationHandler;
}

const PASS_VALIDATORS: readonly GateValidatorResult[] = [
  { validatorId: "L3-001", passed: true, skipped: false },
  { validatorId: "L3-004", passed: true, skipped: false },
];

const buildHarness = (gate: GateResultSourcePort, options?: { requirePass?: boolean }): Harness => {
  void options;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "attest-e2e-"));
  // source ファイル群を temp dir に用意（inputs.sources のデフォルトパス）。
  fs.writeFileSync(path.join(dir, "phasegate.config.json"), '{"project":{"preset":"standard"}}\n');
  fs.mkdirSync(path.join(dir, ".harness"), { recursive: true });
  // HF2-05 が全 AC ac-bound な matrix（acBoundScope round-trip 用）。
  fs.writeFileSync(
    path.join(dir, ".harness/requirement-test-matrix.json"),
    JSON.stringify({
      stories: [
        {
          storyId: "HF2-05",
          storyMappings: [
            { acId: "AC-1", testReferences: [{ binding: "ac" }] },
            { acId: "AC-2", testReferences: [{ binding: "ac" }, { binding: "file" }] },
          ],
        },
      ],
    }) + "\n",
  );

  const hasher = new NodeCryptoContentHasherAdapter();
  const sourceDigester = new FileSystemSourceDigesterAdapter(dir);
  const repository = new FileSystemAttestationRepositoryAdapter(dir);
  const granularityService = new GranularityDerivationService();
  const mapper = new AttestationRecordMapper();
  const matrixSource = new FileSystemMatrixSourceAdapter(dir, ".harness/requirement-test-matrix.json");
  const acBoundScopeService = new AcBoundScopeService();
  const allowlist: AcBoundAllowlistPort = { getAcBoundStories: async () => ["HF2-05"] };

  const produceUseCase = new ProduceAttestationUseCase({
    gateResultSource: gate,
    sourceDigester,
    hasher,
    repository,
    granularityService,
    mapper,
    gitCommitProvider: async () => "0000000000000000000000000000000000000000",
    pkgVersion: "9.9.9",
    clock: () => new Date("2026-07-05T00:00:00.000Z"),
    matrixSource,
    allowlist,
    acBoundScopeService,
  });
  const verifyUseCase = new VerifyAttestationUseCase({
    repository,
    sourceDigester,
    hasher,
    granularityService,
    mapper,
    matrixSource,
    allowlist,
    acBoundScopeService,
  });

  return {
    dir,
    outPath: path.join(dir, ".harness/attestation.json"),
    attestHandler: new AttestHandler(produceUseCase),
    verifyHandler: new VerifyAttestationHandler(verifyUseCase),
  };
};

const cleanup = (h: Harness) => {
  fs.rmSync(h.dir, { recursive: true, force: true });
};

target("attestation E2E: attest → verify round-trip", () => {
  context("gate pass の record を生成して verify する場合", () => {
    it("attest で record を生成し、verify が exitCode 0（全チェック合格）を返すこと", async () => {
      // Arrange
      const h = buildHarness(new FakeGateResultSource(true, PASS_VALIDATORS));
      try {
        // Act: attest
        const attestResult = await h.attestHandler.handle({ out: h.outPath, emitJson: true });

        // Assert: record が正しい shape で生成される
        expect(attestResult.exitCode).toBe(0);
        expect(fs.existsSync(h.outPath)).toBe(true);
        const doc = JSON.parse(fs.readFileSync(h.outPath, "utf8"));
        expect(doc.schemaVersion).toBe("phasegate-attestation/v1");
        expect(doc.subject.gateResult).toBe("pass");
        expect(doc.subject.validatorSet).toHaveLength(2);
        expect(doc.signature.mode).toBe("unsigned-poc");
        expect(doc.signature.attestationDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
        expect(doc.granularity.traceability.validator).toBe("L3-004");
        expect(doc.granularity.traceability.level).toBe("file");
        // acBoundScope が記録され、level は "file" のまま（H16-03 AC-5/AC-6）
        expect(doc.acBoundScope).toEqual(["HF2-05"]);

        // Act: verify（未改竄）
        const verifyResult = await h.verifyHandler.handle({ file: h.outPath, emitJson: true });

        // Assert
        expect(verifyResult.exitCode).toBe(0);
        const verifyOut = JSON.parse(verifyResult.output);
        expect(verifyOut.ok).toBe(true);
        expect(verifyOut.checks).toEqual({
          schema: true,
          mode: true,
          attestationDigest: true,
          inputHashes: true,
          granularity: true,
          acBoundScope: true,
        });
      } finally {
        cleanup(h);
      }
    });
  });

  context("生成した record の granularity.level を改竄した場合", () => {
    it("verify が granularity mismatch を検出し exitCode 1 を返すこと", async () => {
      // Arrange
      const h = buildHarness(new FakeGateResultSource(true, PASS_VALIDATORS));
      try {
        await h.attestHandler.handle({ out: h.outPath, emitJson: false });
        const doc = JSON.parse(fs.readFileSync(h.outPath, "utf8"));
        // Tamper: granularity level を "ac" に詐称（anti-laundering 対象）
        doc.granularity.traceability.level = "ac";
        fs.writeFileSync(h.outPath, JSON.stringify(doc, null, 2));

        // Act
        const verifyResult = await h.verifyHandler.handle({ file: h.outPath, emitJson: true });

        // Assert
        expect(verifyResult.exitCode).toBe(1);
        const out = JSON.parse(verifyResult.output);
        expect(out.ok).toBe(false);
        expect(out.checks.granularity).toBe(false);
      } finally {
        cleanup(h);
      }
    });
  });

  context("生成した record の source digest を改竄した場合", () => {
    it("verify が inputHashes mismatch を検出し exitCode 1 を返すこと", async () => {
      // Arrange
      const h = buildHarness(new FakeGateResultSource(true, PASS_VALIDATORS));
      try {
        await h.attestHandler.handle({ out: h.outPath, emitJson: false });
        const doc = JSON.parse(fs.readFileSync(h.outPath, "utf8"));
        // Tamper: 実ファイル対応 source（config）の digest を別値に書き換える
        const target = doc.inputs.sources.find((s: { path: string }) => s.path === "phasegate.config.json");
        target.digest = `sha256:${"f".repeat(64)}`;
        fs.writeFileSync(h.outPath, JSON.stringify(doc, null, 2));

        // Act
        const verifyResult = await h.verifyHandler.handle({ file: h.outPath, emitJson: true });

        // Assert
        expect(verifyResult.exitCode).toBe(1);
        const out = JSON.parse(verifyResult.output);
        expect(out.ok).toBe(false);
        expect(out.checks.inputHashes).toBe(false);
      } finally {
        cleanup(h);
      }
    });
  });

  context("生成した record の acBoundScope を改竄した場合（H16-03 / AC-7）", () => {
    it("verify が acBoundScope 再導出不一致を検出し exitCode 1 を返すこと", async () => {
      // Arrange
      const h = buildHarness(new FakeGateResultSource(true, PASS_VALIDATORS));
      try {
        await h.attestHandler.handle({ out: h.outPath, emitJson: false });
        const doc = JSON.parse(fs.readFileSync(h.outPath, "utf8"));
        // Tamper: bogus story を acBoundScope に追加（再計算なし・laundering）
        doc.acBoundScope = ["HF2-05", "H99-99"];
        fs.writeFileSync(h.outPath, JSON.stringify(doc, null, 2));

        // Act
        const verifyResult = await h.verifyHandler.handle({ file: h.outPath, emitJson: true });

        // Assert
        expect(verifyResult.exitCode).toBe(1);
        const out = JSON.parse(verifyResult.output);
        expect(out.ok).toBe(false);
        expect(out.checks.acBoundScope).toBe(false);
      } finally {
        cleanup(h);
      }
    });
  });

  context("verify 対象ファイルが存在しない場合", () => {
    it("exitCode 2（不在）を返すこと", async () => {
      // Arrange
      const h = buildHarness(new FakeGateResultSource(true, PASS_VALIDATORS));
      try {
        // Act
        const verifyResult = await h.verifyHandler.handle({
          file: path.join(h.dir, "does-not-exist.json"),
          emitJson: true,
        });

        // Assert
        expect(verifyResult.exitCode).toBe(2);
      } finally {
        cleanup(h);
      }
    });
  });
});
