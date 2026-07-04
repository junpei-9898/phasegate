// @unit attestation
// @layer test
// @story H16-02

import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AttestationDocument } from "../../../../../attestation/application/dto/attestation-document.js";
import { AttestationRecordMapper } from "../../../../../attestation/application/mappers/attestation-record-mapper.js";
import {
  type VerifyAttestationDeps,
  VerifyAttestationUseCase,
} from "../../../../../attestation/application/usecases/verify-attestation-usecase.js";
import {
  AttestationRecord,
  type AttestationRecordProps,
} from "../../../../../attestation/domain/entities/attestation-record.js";
import { GranularityDerivationService } from "../../../../../attestation/domain/services/granularity-derivation-service.js";
import { Digest } from "../../../../../attestation/domain/value-objects/digest.js";
import { SignatureBlock } from "../../../../../attestation/domain/value-objects/signature-block.js";
import { ValidatorOutcome } from "../../../../../attestation/domain/value-objects/validator-outcome.js";
import { context, target } from "../../../../helpers/test-helpers.js";

const derivation = new GranularityDerivationService();

const realHasher = {
  sha256: (content: string): Digest => Digest.fromSha256Hex(createHash("sha256").update(content, "utf8").digest("hex")),
};

const SOURCE_PATH = "phasegate.config.json";
const SOURCE_CONTENT = "the-real-config-contents";
const SOURCE_DIGEST = realHasher.sha256(SOURCE_CONTENT);

/** 未改竄 record を組んで seal し document 化する。 */
const buildSealedDocument = (): AttestationDocument => {
  const validatorSet = [
    ValidatorOutcome.create({ validatorId: "L3-001", passed: true, skipped: false }),
    ValidatorOutcome.create({ validatorId: "L3-004", passed: true, skipped: false }),
  ];
  const props: AttestationRecordProps = {
    schemaVersion: "phasegate-attestation/v1",
    predicateType: "https://phasegate.dev/attestation/gate-run/v1",
    subject: { command: "phasegate:ci-check", gateResult: "pass", validatorSet },
    inputs: {
      digestAlgorithm: "sha256",
      sources: [{ path: SOURCE_PATH, digest: SOURCE_DIGEST }],
      inputDigest: SOURCE_DIGEST,
    },
    granularity: { traceability: derivation.derive(validatorSet) },
    metadata: {
      producedAt: "2026-07-05T00:00:00Z",
      producer: "phasegate-attestation/1.0.0",
      gitCommit: "abc123",
    },
    signature: SignatureBlock.unsignedPoc(SOURCE_DIGEST),
  };
  const record = AttestationRecord.create(props);
  // inputDigest も正しく確定させる
  const inputDigest = record.computeInputDigest(realHasher);
  const withInput = AttestationRecord.create({ ...props, inputs: { ...props.inputs, inputDigest } });
  const sealed = withInput.seal(realHasher);
  return new AttestationRecordMapper().toDocument(sealed);
};

const buildSut = (overrides?: { storedDoc?: unknown; currentSourceContent?: string; readThrows?: boolean }) => {
  const deps: VerifyAttestationDeps = {
    repository: {
      write: vi.fn(),
      read: overrides?.readThrows
        ? vi.fn().mockRejectedValue(new Error("ENOENT"))
        : vi.fn().mockResolvedValue(overrides?.storedDoc ?? buildSealedDocument()),
    },
    sourceDigester: {
      digestFile: vi
        .fn()
        .mockImplementation(async () => realHasher.sha256(overrides?.currentSourceContent ?? SOURCE_CONTENT)),
    },
    hasher: realHasher,
    granularityService: new GranularityDerivationService(),
    mapper: new AttestationRecordMapper(),
  };
  return new VerifyAttestationUseCase(deps);
};

const input = { filePath: ".harness/attestation.json", emitJson: false };

target("VerifyAttestationUseCase", () => {
  describe("全チェック合格テスト（AC-3 / AC-4 / AC-5 / AC-6）", () => {
    context("未改竄 record の場合", () => {
      it("全チェック合格・exitCode 0 を返す", async () => {
        // Arrange
        const sut = buildSut();
        // Act
        const result = await sut.execute(input);
        // Assert
        expect(result.exitCode).toBe(0);
        expect(result.output.ok).toBe(true);
        expect(result.output.checks).toEqual({
          schema: true,
          mode: true,
          attestationDigest: true,
          inputHashes: true,
          granularity: true,
        });
        expect(result.output.mismatches).toHaveLength(0);
      });
    });
  });

  describe("attestationDigest 改竄テスト（AC-3）", () => {
    it("attestationDigest を書き換えると mismatch・exitCode 1", async () => {
      // Arrange
      const doc = buildSealedDocument() as unknown as { signature: { attestationDigest: string } };
      doc.signature.attestationDigest = `sha256:${"f".repeat(64)}`;
      const sut = buildSut({ storedDoc: doc });
      // Act
      const result = await sut.execute(input);
      // Assert
      expect(result.exitCode).toBe(1);
      expect(result.output.checks.attestationDigest).toBe(false);
    });
  });

  describe("input-hash 再照合テスト（AC-4）", () => {
    context("source ファイル内容が変わった場合", () => {
      it("inputHashes mismatch・exitCode 1", async () => {
        // Arrange: 現在の source 内容が生成時と異なる
        const sut = buildSut({ currentSourceContent: "tampered-config" });
        // Act
        const result = await sut.execute(input);
        // Assert
        expect(result.exitCode).toBe(1);
        expect(result.output.checks.inputHashes).toBe(false);
      });
    });
  });

  describe("anti-laundering 再導出テスト（AC-5）", () => {
    context("granularity を過大主張へ書き換えた場合", () => {
      it("granularity mismatch・exitCode 1（laundering 検出）", async () => {
        // Arrange: 格納 granularity の level を "file" → "ac" に詐称
        const doc = buildSealedDocument() as unknown as {
          granularity: { traceability: { level: string; knownLimitations: string[] } };
        };
        doc.granularity.traceability.level = "ac";
        doc.granularity.traceability.knownLimitations = [];
        const sut = buildSut({ storedDoc: doc });
        // Act
        const result = await sut.execute(input);
        // Assert
        expect(result.exitCode).toBe(1);
        expect(result.output.checks.granularity).toBe(false);
      });
    });
  });

  describe("非対応 mode テスト（AC-2）", () => {
    context("signature.mode が signed の場合", () => {
      it("exitCode 2・mode check fail を返す", async () => {
        // Arrange
        const doc = buildSealedDocument() as unknown as {
          signature: { mode: string; algorithm: string | null; keyId: string | null; value: string | null };
        };
        doc.signature.mode = "signed";
        const sut = buildSut({ storedDoc: doc });
        // Act
        const result = await sut.execute(input);
        // Assert
        expect(result.exitCode).toBe(2);
        expect(result.output.checks.mode).toBe(false);
      });
    });
  });

  describe("不在/malformed テスト（AC-6/7/8 status マッピング）", () => {
    context("read が失敗する場合", () => {
      it("exitCode 2・schema check fail を返す", async () => {
        const sut = buildSut({ readThrows: true });
        const result = await sut.execute(input);
        expect(result.exitCode).toBe(2);
        expect(result.output.checks.schema).toBe(false);
        expect(result.output.ok).toBe(false);
      });
    });

    context("shape が不正な場合", () => {
      it("exitCode 2・schema check fail を返す", async () => {
        const sut = buildSut({ storedDoc: { schemaVersion: "phasegate-attestation/v1" } });
        const result = await sut.execute(input);
        expect(result.exitCode).toBe(2);
        expect(result.output.checks.schema).toBe(false);
      });
    });
  });
});
