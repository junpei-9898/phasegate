// @unit attestation
// @layer test
// @story H16-02

import { expect, it } from "vitest";
import type { VerifyAttestationOutput } from "../../../../attestation/application/dto/verify-attestation-output.js";
import type {
  VerifyAttestationResult,
  VerifyAttestationUseCase,
} from "../../../../attestation/application/usecases/verify-attestation-usecase.js";
import { VerifyAttestationHandler } from "../../../../attestation/presentation/handlers/verify-attestation-handler.js";
import { context, target } from "../../../helpers/test-helpers.js";

class FakeVerifyUseCase {
  public called = false;
  constructor(private readonly result: VerifyAttestationResult) {}
  async execute(): Promise<VerifyAttestationResult> {
    this.called = true;
    return this.result;
  }
}

const asUseCase = (fake: FakeVerifyUseCase): VerifyAttestationUseCase => fake as unknown as VerifyAttestationUseCase;

const okOutput = (): VerifyAttestationOutput => ({
  ok: true,
  checks: { schema: true, mode: true, attestationDigest: true, inputHashes: true, granularity: true, acBoundScope: true },
  mismatches: [],
});

target("VerifyAttestationHandler", () => {
  context("位置引数 <file> が無い場合", () => {
    it("usecase を呼ばず exitCode 2（usage error）を返すこと", async () => {
      // Arrange
      const fake = new FakeVerifyUseCase({ output: okOutput(), exitCode: 0 });
      const handler = new VerifyAttestationHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({});

      // Assert
      expect(result.exitCode).toBe(2);
      expect(fake.called).toBe(false);
      expect(result.output).toContain("<file> is required");
    });
  });

  context("全チェック合格・--json の場合", () => {
    it("VerifyAttestationOutput を JSON 出力し exitCode 0 を返すこと", async () => {
      // Arrange
      const out = okOutput();
      const fake = new FakeVerifyUseCase({ output: out, exitCode: 0 });
      const handler = new VerifyAttestationHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({ file: "a.json", emitJson: true });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.output)).toEqual(out);
    });
  });

  context("mismatch・human 出力の場合", () => {
    it("各チェック行と exitCode 1 を返すこと", async () => {
      // Arrange
      const out: VerifyAttestationOutput = {
        ok: false,
        checks: { schema: true, mode: true, attestationDigest: true, inputHashes: false, granularity: true, acBoundScope: true },
        mismatches: ['input hash mismatch for "x"'],
      };
      const fake = new FakeVerifyUseCase({ output: out, exitCode: 1 });
      const handler = new VerifyAttestationHandler(asUseCase(fake));

      // Act
      const result = await handler.handle({ file: "a.json" });

      // Assert
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("inputHashes      : FAIL");
      expect(result.output).toContain("Mismatches:");
      expect(result.output).toContain("Result: MISMATCH");
    });
  });
});
