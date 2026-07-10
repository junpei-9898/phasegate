// @unit ci-governance
// @layer test
// @story WI-254
// @work-item-id WI-254

import { describe, expect, it, vi } from "vitest";
import type { PinIntegrityOutput } from "../../../ci-governance/application/dto/pin-integrity-output.js";
import type { VerifyIntegrityOutput } from "../../../ci-governance/application/dto/verify-integrity-output.js";
import type { PinIntegrityUseCase } from "../../../ci-governance/application/usecases/pin-integrity-usecase.js";
import type { VerifyIntegrityUseCase } from "../../../ci-governance/application/usecases/verify-integrity-usecase.js";
import { IntegrityHandler } from "../../../ci-governance/presentation/handlers/integrity-handler.js";
import { context, target } from "../../helpers/test-helpers.js";

function createPinUseCase(output: PinIntegrityOutput): PinIntegrityUseCase {
  return { execute: vi.fn(async () => output) } as unknown as PinIntegrityUseCase;
}

function createVerifyUseCase(output: VerifyIntegrityOutput): VerifyIntegrityUseCase {
  return { execute: vi.fn(async () => output) } as unknown as VerifyIntegrityUseCase;
}

target("IntegrityHandler", () => {
  describe("pin", () => {
    context("保存に成功した場合", () => {
      it("exitCode 0 でエントリ数を出力する", async () => {
        // Arrange
        const pin = createPinUseCase({
          savedPath: "/repo/phasegate.integrity.json",
          entryCount: 3,
          dryRun: false,
          files: [],
        });
        const handler = new IntegrityHandler(
          pin,
          createVerifyUseCase({
            manifestPath: "/repo/phasegate.integrity.json",
            ok: true,
            drifts: [],
          }),
        );

        // Act
        const result = await handler.pin({ format: "human" });

        // Assert
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("エントリ数: 3");
      });
    });
  });

  describe("verify", () => {
    context("drift なしの場合", () => {
      it("exitCode 0 を返す", async () => {
        // Arrange
        const handler = new IntegrityHandler(
          createPinUseCase({ savedPath: "", entryCount: 0, dryRun: false, files: [] }),
          createVerifyUseCase({ manifestPath: "/repo/phasegate.integrity.json", ok: true, drifts: [] }),
        );

        // Act
        const result = await handler.verify({ format: "human" });

        // Assert
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("drift はありません");
      });
    });

    context("drift ありの場合", () => {
      it("exitCode 2 と drift 一覧を返す", async () => {
        // Arrange
        const handler = new IntegrityHandler(
          createPinUseCase({ savedPath: "", entryCount: 0, dryRun: false, files: [] }),
          createVerifyUseCase({
            manifestPath: "/repo/phasegate.integrity.json",
            ok: false,
            drifts: [{ path: "skills/a/SKILL.md", kind: "mismatch" }],
          }),
        );

        // Act
        const result = await handler.verify({ format: "human" });

        // Assert
        expect(result.exitCode).toBe(2);
        expect(result.output).toContain("skills/a/SKILL.md");
      });
    });

    context("json フォーマット指定かつ drift ありの場合", () => {
      it("exitCode 2 で JSON を返す", async () => {
        // Arrange
        const handler = new IntegrityHandler(
          createPinUseCase({ savedPath: "", entryCount: 0, dryRun: false, files: [] }),
          createVerifyUseCase({
            manifestPath: "/repo/phasegate.integrity.json",
            ok: false,
            drifts: [{ path: "x", kind: "missing" }],
          }),
        );

        // Act
        const result = await handler.verify({ format: "json" });

        // Assert
        expect(result.exitCode).toBe(2);
        expect(JSON.parse(result.output).ok).toBe(false);
      });
    });
  });
});
