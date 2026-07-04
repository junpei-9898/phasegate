// @unit attestation
// @layer test
// @story H16-01

import { describe, expect, it } from "vitest";
import {
  AttestationRecordMapper,
  MalformedAttestationError,
} from "../../../../../attestation/application/mappers/attestation-record-mapper.js";
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
const DIGEST = Digest.create(`sha256:${"a".repeat(64)}`);
const mapper = new AttestationRecordMapper();

const buildRecord = (): AttestationRecord => {
  const validatorSet = [ValidatorOutcome.create({ validatorId: "L3-004", passed: true, skipped: false })];
  const props: AttestationRecordProps = {
    schemaVersion: "phasegate-attestation/v1",
    predicateType: "https://phasegate.dev/attestation/gate-run/v1",
    subject: { command: "phasegate:ci-check", gateResult: "pass", validatorSet },
    inputs: {
      digestAlgorithm: "sha256",
      sources: [{ path: "phasegate.config.json", digest: DIGEST }],
      inputDigest: DIGEST,
    },
    granularity: { traceability: derivation.derive(validatorSet) },
    metadata: { producedAt: "2026-07-05T00:00:00Z", producer: "phasegate-attestation/1.0.0", gitCommit: "abc" },
    signature: SignatureBlock.unsignedPoc(DIGEST),
  };
  return AttestationRecord.create(props);
};

target("AttestationRecordMapper", () => {
  describe("toDocument テスト", () => {
    it("schemaVersion / predicateType を含む document を返す（AC-1）", () => {
      // Arrange
      const record = buildRecord();
      // Act
      const doc = mapper.toDocument(record);
      // Assert
      expect(doc.schemaVersion).toBe("phasegate-attestation/v1");
      expect(doc.predicateType).toBe("https://phasegate.dev/attestation/gate-run/v1");
    });

    it("VO をプリミティブへ展開する（validatorSet / digest）", () => {
      const doc = mapper.toDocument(buildRecord());
      expect(doc.subject.validatorSet[0]).toEqual({ validatorId: "L3-004", passed: true, skipped: false });
      expect(doc.inputs.sources[0].digest).toBe(DIGEST.value);
      expect(doc.signature.attestationDigest).toBe(DIGEST.value);
    });
  });

  describe("round-trip テスト", () => {
    it("toDocument → fromDocument で等値な record に復元される", () => {
      // Arrange
      const record = buildRecord();
      // Act
      const restored = mapper.fromDocument(mapper.toDocument(record));
      // Assert
      expect(restored.equals(record)).toBe(true);
    });
  });

  describe("fromDocument 異常系テスト", () => {
    context("root がオブジェクトでない場合", () => {
      it("MalformedAttestationError がスローされる", () => {
        expect(() => mapper.fromDocument(null)).toThrow(MalformedAttestationError);
      });
    });

    context("subject.gateResult が不正値の場合", () => {
      it("MalformedAttestationError がスローされる", () => {
        const doc = mapper.toDocument(buildRecord()) as unknown as Record<string, unknown>;
        (doc.subject as Record<string, unknown>).gateResult = "unknown";
        expect(() => mapper.fromDocument(doc)).toThrow(MalformedAttestationError);
      });
    });

    context("digest が sha256 形式でない場合", () => {
      it("MalformedAttestationError がスローされる", () => {
        const doc = mapper.toDocument(buildRecord()) as unknown as Record<string, unknown>;
        (doc.inputs as Record<string, unknown>).inputDigest = "not-a-digest";
        expect(() => mapper.fromDocument(doc)).toThrow(MalformedAttestationError);
      });
    });

    it("MalformedAttestationError は errorCode L1-053 を保持する", () => {
      let captured: MalformedAttestationError | null = null;
      try {
        mapper.fromDocument({});
      } catch (e) {
        captured = e as MalformedAttestationError;
      }
      expect(captured?.errorCode).toBe("L1-053");
    });
  });
});
