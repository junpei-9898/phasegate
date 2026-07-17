// @unit attestation
// @layer test
// @story H16-01

import { expect, it } from "vitest";
import type { AttestationDocument } from "../../../../attestation/application/dto/attestation-document.js";
import type {
  ProduceAttestationResult,
  ProduceAttestationUseCase,
} from "../../../../attestation/application/usecases/produce-attestation-usecase.js";
import { AttestHandler } from "../../../../attestation/presentation/handlers/attest-handler.js";
import { context, target } from "../../../helpers/test-helpers.js";

class FakeProduceUseCase {
  public lastInput: unknown = null;
  constructor(private readonly result: ProduceAttestationResult) {}
  async execute(input: unknown): Promise<ProduceAttestationResult> {
    this.lastInput = input;
    return this.result;
  }
}

const asUseCase = (fake: FakeProduceUseCase): ProduceAttestationUseCase => fake as unknown as ProduceAttestationUseCase;

const sampleDoc = (): AttestationDocument => ({
  schemaVersion: "phasegate-attestation/v1",
  predicateType: "https://phasegate.dev/attestation/gate-run/v1",
  subject: { command: "phasegate:ci-check", gateResult: "pass", validatorSet: [] },
  inputs: { digestAlgorithm: "sha256", sources: [], inputDigest: `sha256:${"a".repeat(64)}` },
  granularity: { traceability: { validator: "L3-004", level: "file", claim: "c", knownLimitations: [] } },
  acBoundScope: [],
  metadata: { producedAt: "t", producer: "phasegate-attestation/9.9.9", gitCommit: null },
  signature: {
    mode: "unsigned-poc",
    attestationDigest: `sha256:${"b".repeat(64)}`,
    algorithm: null,
    keyId: null,
    value: null,
  },
});

target("AttestHandler", () => {
  context("未知の --mode を渡した場合", () => {
    it("usecase を呼ばず exitCode 2 を返すこと", async () => {
      // Arrange
      const fake = new FakeProduceUseCase({ document: null, exitCode: 0 });
      const handler = new AttestHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({ mode: "bogus" });

      // Assert
      expect(result.exitCode).toBe(2);
      expect(fake.lastInput).toBeNull();
    });
  });

  context("--mode signed を渡した場合", () => {
    it("not-yet-implemented メッセージと exitCode 2 を返すこと", async () => {
      // Arrange
      const fake = new FakeProduceUseCase({ document: null, exitCode: 2 });
      const handler = new AttestHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({ mode: "signed" });

      // Assert
      expect(result.exitCode).toBe(2);
      expect(result.output).toContain("not yet implemented");
    });
  });

  context("--require-pass 下で gate fail の場合", () => {
    it("exitCode 1 を返すこと", async () => {
      // Arrange
      const fake = new FakeProduceUseCase({ document: null, exitCode: 1 });
      const handler = new AttestHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({ requirePass: true });

      // Assert
      expect(result.exitCode).toBe(1);
    });
  });

  context("--json 付きで生成成功した場合", () => {
    it("document を整形 JSON で出力し exitCode 0 を返すこと", async () => {
      // Arrange
      const doc = sampleDoc();
      const fake = new FakeProduceUseCase({ document: doc, exitCode: 0 });
      const handler = new AttestHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({ emitJson: true, out: "custom.json" });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.output)).toEqual(doc);
      expect((fake.lastInput as { out: string }).out).toBe("custom.json");
    });
  });
});
