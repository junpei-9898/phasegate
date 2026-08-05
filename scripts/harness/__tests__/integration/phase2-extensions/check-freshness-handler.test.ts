// @layer test
import { beforeEach, expect, it, vi } from "vitest";
import { CheckFreshnessHandler } from "../../../phase2-extensions/presentation/handlers/check-freshness-handler.js";
import { context, target } from "../../helpers/test-helpers.js";

target("IT-P2-008 CheckFreshnessHandler", () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: CheckFreshnessHandler;

  beforeEach(() => {
    useCaseMock = { execute: vi.fn() };
    handler = new CheckFreshnessHandler(useCaseMock as never);
  });

  context("handle(args)", () => {
    it("summary.error=0 のとき exitCode=0 が返る", async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 1, ok: 1, warn: 0, error: 0 },
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it("summary.error>0 かつ --dry-run 未指定のとき exitCode=1 が返る", async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 2, ok: 1, warn: 0, error: 1 },
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(1);
    });

    it("summary.error>0 でも --dry-run 指定時は exitCode=0 が返る", async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 2, ok: 1, warn: 0, error: 1 },
        errors: [],
      });
      // Act
      const actual = await handler.handle(["--dry-run"]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it("--dry-run 指定時も診断結果の stdout は抑制されない", async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 3, ok: 1, warn: 1, error: 1 },
        errors: [],
      });
      // Act
      const actual = await handler.handle(["--dry-run"]);
      // Assert
      expect(actual.stdout).toContain("error=1");
    });

    it("--dry-run 引数が UseCase の dryRun に渡される", async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warn: 0, error: 0 },
        errors: [],
      });
      // Act
      await handler.handle(["--dry-run"]);
      // Assert
      expect(useCaseMock.execute).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    });

    it("--pattern 引数が UseCase の targetPattern に渡される", async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warn: 0, error: 0 },
        errors: [],
      });
      // Act
      await handler.handle(["--pattern", "docs/adr/**/*.md"]);
      // Assert
      expect(useCaseMock.execute).toHaveBeenCalledWith(expect.objectContaining({ targetPattern: "docs/adr/**/*.md" }));
    });
  });
});
