// @layer test
// @unit skill-quality
// @story H12-02
// @work-item-id WI-341
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CheckCoverageUseCase } from "../../../skill-quality/application/usecases/check-coverage-usecase.js";
import { CodeCoverageResult } from "../../../skill-quality/domain/value-objects/code-coverage-result.js";
import { FileSystemRequirementTestMatrixAdapter } from "../../../skill-quality/infrastructure/adapters/file-system-requirement-test-matrix-adapter.js";
import { CheckCoverageHandler } from "../../../skill-quality/presentation/handlers/check-coverage-handler.js";

describe("カバレッジ確認ハンドラのエラー出力", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), "phasegate-wi341-handler-"));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  describe("--json が指定されている場合", () => {
    it("--json で matrix ファイルがない場合は JSON エラーを返すこと", async () => {
      // Arrange
      const matrixFilePath = path.join(temporaryDirectory, "missing-requirement-test-matrix.json");
      const matrixPort = new FileSystemRequirementTestMatrixAdapter(matrixFilePath);
      const coverageRunnerPort = {
        run: async () => CodeCoverageResult.create(100, 100, 100),
      };
      const configQueryPort = {
        getCoverageThreshold: async () => ({ requirement: 100, code: 80 }),
        isAgentLessonCollectionEnabled: async () => false,
        getCascadeUpdateTargetPatterns: async () => [],
      };
      const useCase = new CheckCoverageUseCase(matrixPort, coverageRunnerPort, configQueryPort);
      const handler = new CheckCoverageHandler(useCase);

      // Act
      const actual = await handler.handle({ storyId: "H12-02", format: "json" });

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(JSON.parse(actual.message)).toEqual({
        error: {
          code: "MATRIX_FILE_NOT_FOUND",
          message: `requirement-test-matrix.json not found at ${matrixFilePath}`,
        },
      });
    });
  });
});
