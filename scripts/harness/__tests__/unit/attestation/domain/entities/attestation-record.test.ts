// @unit attestation
// @layer test
// @story H16-01
// @story H17-18

import { describe, expect, it } from "vitest";
import {
  AttestationInvariantError,
  AttestationRecord,
  type AttestationRecordProps,
  canonicalStringify,
} from "../../../../../attestation/domain/entities/attestation-record.js";
import type { ContentHasherPort } from "../../../../../attestation/domain/ports/content-hasher-port.js";
import { GranularityDerivationService } from "../../../../../attestation/domain/services/granularity-derivation-service.js";
import { Digest } from "../../../../../attestation/domain/value-objects/digest.js";
import { SignatureBlock } from "../../../../../attestation/domain/value-objects/signature-block.js";
import { ValidatorOutcome } from "../../../../../attestation/domain/value-objects/validator-outcome.js";
import { context, target } from "../../../../helpers/test-helpers.js";

/**
 * in-memory fake ContentHasherPort（domain 層テストで許可される唯一のダブル）。
 * content 文字列を決定論的に 64-hex へ写す。同一 content は同一 digest を返す。
 */
class FakeHasher implements ContentHasherPort {
  sha256(content: string): Digest {
    let h1 = 0x811c9dc5;
    let h2 = 0x1000193;
    for (let i = 0; i < content.length; i++) {
      const c = content.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
    }
    const base = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).padStart(16, "0");
    const hex = base.repeat(8).slice(0, 64);
    return Digest.fromSha256Hex(hex);
  }
}

const derivation = new GranularityDerivationService();
const DUMMY_DIGEST = Digest.create(`sha256:${"a".repeat(64)}`);

const buildProps = (
  overrides: Partial<{
    gateResult: "pass" | "fail";
    validatorSet: ValidatorOutcome[];
    producedAt: string;
    signature: SignatureBlock;
  }> = {},
): AttestationRecordProps => {
  const validatorSet = overrides.validatorSet ?? [
    ValidatorOutcome.create({ validatorId: "L3-004", passed: true, skipped: false }),
  ];
  const gateResult = overrides.gateResult ?? "pass";
  return {
    schemaVersion: "phasegate-attestation/v1",
    predicateType: "https://phasegate.dev/attestation/gate-run/v1",
    subject: { command: "phasegate:ci-check", gateResult, validatorSet },
    inputs: {
      digestAlgorithm: "sha256",
      sources: [{ path: "phasegate.config.json", digest: DUMMY_DIGEST }],
      inputDigest: DUMMY_DIGEST,
    },
    granularity: { traceability: derivation.derive(validatorSet) },
    metadata: {
      producedAt: overrides.producedAt ?? "2026-07-05T00:00:00Z",
      producer: "phasegate-attestation/0.0.0",
      gitCommit: "abc123",
    },
    signature: overrides.signature ?? SignatureBlock.unsignedPoc(DUMMY_DIGEST),
  };
};

target("AttestationRecord", () => {
  describe("INV-1 テスト", () => {
    context("gateResult と validatorSet の allPassed が不一致の場合", () => {
      it("AttestationInvariantError がスローされる（AC-3）", () => {
        // Arrange
        const validatorSet = [ValidatorOutcome.create({ validatorId: "L3-004", passed: false })];
        // Act / Assert: 全 green でないのに gateResult=pass は不正
        expect(() => AttestationRecord.create(buildProps({ gateResult: "pass", validatorSet }))).toThrow(
          AttestationInvariantError,
        );
      });
    });

    context("全 validator が green で gateResult=pass の場合", () => {
      it("正常に生成される", () => {
        expect(() => AttestationRecord.create(buildProps({ gateResult: "pass" }))).not.toThrow();
      });
    });
  });

  describe("INV-3 テスト", () => {
    context("granularity が導出値と異なる場合", () => {
      it("AttestationInvariantError がスローされる（anti-laundering）", () => {
        // Arrange
        const props = buildProps();
        const laundered = {
          ...props,
          granularity: {
            traceability: props.granularity.traceability,
          },
        };
        // 詐称: not-run な set の導出値を pass 用 record に流用
        const tampered: AttestationRecordProps = {
          ...laundered,
          granularity: { traceability: derivation.derive([]) },
        };
        // Act / Assert
        expect(() => AttestationRecord.create(tampered)).toThrow(AttestationInvariantError);
      });
    });
  });

  describe("INV-6 テスト", () => {
    context("unsigned-poc で algorithm が非null の場合", () => {
      it("SignatureBlock 段階で拒否される", () => {
        // SignatureBlock.create が INV-6 を強制する
        expect(() =>
          SignatureBlock.create({
            mode: "unsigned-poc",
            attestationDigest: DUMMY_DIGEST,
            algorithm: "x",
            keyId: null,
            value: null,
          }),
        ).toThrow();
      });
    });
  });

  describe("toCanonicalPayload テスト", () => {
    it("signature と volatile metadata（producedAt/gitCommit）が除去される（AC-9）", () => {
      // Arrange
      const record = AttestationRecord.create(buildProps());
      // Act
      const payload = record.toCanonicalPayload();
      // Assert
      expect(payload).not.toHaveProperty("signature");
      const metadata = payload.metadata as Record<string, unknown>;
      expect(metadata).not.toHaveProperty("producedAt");
      expect(metadata).not.toHaveProperty("gitCommit");
      expect(metadata.producer).toBe("phasegate-attestation/0.0.0");
    });
  });

  describe("canonicalStringify テスト", () => {
    it("キーが昇順ソートされ空白を含まない", () => {
      // Arrange / Act
      const out = canonicalStringify({ b: 1, a: { d: 2, c: 3 } });
      // Assert
      expect(out).toBe('{"a":{"c":3,"d":2},"b":1}');
    });

    it("配列は順序を保持する", () => {
      expect(canonicalStringify([3, 1, 2])).toBe("[3,1,2]");
    });
  });

  describe("seal 決定論テスト", () => {
    it("producedAt が違っても attestationDigest は一致する（AC-9 / INV-4 決定論）", () => {
      // Arrange
      const hasher = new FakeHasher();
      const recordA = AttestationRecord.create(buildProps({ producedAt: "2026-01-01T00:00:00Z" }));
      const recordB = AttestationRecord.create(buildProps({ producedAt: "2099-12-31T23:59:59Z" }));
      // Act
      const sealedA = recordA.seal(hasher);
      const sealedB = recordB.seal(hasher);
      // Assert
      expect(sealedA.signature.attestationDigest.equals(sealedB.signature.attestationDigest)).toBe(true);
    });

    it("seal 後の record は attestationDigest == canonical payload の sha256（INV-4）", () => {
      // Arrange
      const hasher = new FakeHasher();
      const record = AttestationRecord.create(buildProps());
      // Act
      const sealed = record.seal(hasher);
      const recomputed = sealed.computeAttestationDigest(hasher);
      // Assert
      expect(sealed.signature.attestationDigest.equals(recomputed)).toBe(true);
    });
  });

  describe("acBoundScope テスト（H16-03）", () => {
    it("acBoundScope が toCanonicalPayload に含まれる（attestationDigest でカバー）", () => {
      // Arrange
      const record = AttestationRecord.create({ ...buildProps(), acBoundScope: ["HF2-05"] });
      // Act
      const payload = record.toCanonicalPayload();
      // Assert
      expect(payload).toHaveProperty("acBoundScope");
      expect(payload.acBoundScope).toEqual(["HF2-05"]);
    });

    it("acBoundScope が equals の比較対象に含まれる", () => {
      // Arrange
      const recordA = AttestationRecord.create({ ...buildProps(), acBoundScope: ["HF2-05"] });
      const recordB = AttestationRecord.create({ ...buildProps(), acBoundScope: [] });
      // Act
      const actual = recordA.equals(recordB);
      // Assert
      expect(actual).toBe(false);
    });

    it("granularity.traceability.level は acBoundScope があっても file のまま", () => {
      // Arrange / Act
      const record = AttestationRecord.create({ ...buildProps(), acBoundScope: ["HF2-05"] });
      // Assert
      expect(record.granularity.traceability.level).toBe("file");
      expect(record.acBoundScope).toEqual(["HF2-05"]);
    });

    it("producedAt/gitCommit のみ差異なら acBoundScope 込みで attestationDigest がバイト一致（決定論）", () => {
      // Arrange
      const hasher = new FakeHasher();
      const recordA = AttestationRecord.create({
        ...buildProps({ producedAt: "2026-01-01T00:00:00Z" }),
        acBoundScope: ["HF2-05"],
      });
      const recordB = AttestationRecord.create({
        ...buildProps({ producedAt: "2099-12-31T23:59:59Z" }),
        acBoundScope: ["HF2-05"],
      });
      // Act
      const sealedA = recordA.seal(hasher);
      const sealedB = recordB.seal(hasher);
      // Assert
      expect(sealedA.signature.attestationDigest.value).toBe(sealedB.signature.attestationDigest.value);
    });
  });

  describe("attestation v2 World root テスト（WI-306）", () => {
    it("v2 rootをcanonical payloadへ含めてsealすること", () => {
      // Arrange
      const hasher = new FakeHasher();
      const root = Digest.create(`sha256:${"b".repeat(64)}`);
      const record = AttestationRecord.create({
        ...buildProps(),
        schemaVersion: "phasegate-attestation/v2",
        predicateType: "https://phasegate.dev/attestation/gate-run/v2",
        worldSnapshotRoot: root,
      });

      // Act
      const sealed = record.seal(hasher);

      // Assert
      expect(sealed.toCanonicalPayload()).toHaveProperty("worldSnapshotRoot", root.value);
      expect(sealed.worldSnapshotRoot?.value).toBe(root.value);
      expect(sealed.signature.attestationDigest.equals(sealed.computeAttestationDigest(hasher))).toBe(true);
    });

    it("v2 rootだけが違う場合にattestationDigestが変わること", () => {
      // Arrange
      const hasher = new FakeHasher();
      const v2 = (hex: string) =>
        AttestationRecord.create({
          ...buildProps(),
          schemaVersion: "phasegate-attestation/v2",
          predicateType: "https://phasegate.dev/attestation/gate-run/v2",
          worldSnapshotRoot: Digest.create(`sha256:${hex.repeat(64)}`),
        }).seal(hasher);

      // Act
      const first = v2("b");
      const second = v2("c");

      // Assert
      expect(first.signature.attestationDigest.value).not.toBe(second.signature.attestationDigest.value);
    });

    it("v1へrootを混入したrecordとrootなしv2を拒否すること", () => {
      // Arrange
      const root = Digest.create(`sha256:${"b".repeat(64)}`);

      // Act / Assert
      expect(() => AttestationRecord.create({ ...buildProps(), worldSnapshotRoot: root })).toThrow(
        AttestationInvariantError,
      );
      expect(() =>
        AttestationRecord.create({
          ...buildProps(),
          schemaVersion: "phasegate-attestation/v2",
          predicateType: "https://phasegate.dev/attestation/gate-run/v2",
        }),
      ).toThrow(AttestationInvariantError);
    });
  });

  describe("computeInputDigest テスト", () => {
    it("sources の順序が違っても inputDigest は一致する（AC-5 決定論）", () => {
      // Arrange
      const hasher = new FakeHasher();
      const d1 = Digest.create(`sha256:${"1".repeat(64)}`);
      const d2 = Digest.create(`sha256:${"2".repeat(64)}`);
      const base = buildProps();
      const recordA = AttestationRecord.create({
        ...base,
        inputs: {
          digestAlgorithm: "sha256",
          sources: [
            { path: "a.json", digest: d1 },
            { path: "b.json", digest: d2 },
          ],
          inputDigest: DUMMY_DIGEST,
        },
      });
      const recordB = AttestationRecord.create({
        ...base,
        inputs: {
          digestAlgorithm: "sha256",
          sources: [
            { path: "b.json", digest: d2 },
            { path: "a.json", digest: d1 },
          ],
          inputDigest: DUMMY_DIGEST,
        },
      });
      // Act
      const digestA = recordA.computeInputDigest(hasher);
      const digestB = recordB.computeInputDigest(hasher);
      // Assert
      expect(digestA.equals(digestB)).toBe(true);
    });
  });
});
