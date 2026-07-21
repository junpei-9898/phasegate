// @layer test
// @unit skill-quality
// @story H12-02
// @work-item-id WI-341
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemRequirementTestMatrixAdapter } from "../../../skill-quality/infrastructure/adapters/file-system-requirement-test-matrix-adapter.js";

describe("要件テストマトリクスのファイル読み取り", () => {
  let temporaryDirectory: string;
  let matrixFilePath: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), "phasegate-wi341-matrix-"));
    matrixFilePath = path.join(temporaryDirectory, "requirement-test-matrix.json");
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  describe("producer が生成する matrix 1.2 を読み取る場合", () => {
    it("matrix 1.2 の stories から AC カバレッジを導出できること", async () => {
      // Arrange
      const fixture = {
        version: "1.2",
        generatedAt: "2026-07-21T00:00:00.000Z",
        stories: [
          {
            storyId: "H12-02",
            coverageStatus: "required",
            coverageLifecycle: ["planned", "required"],
            storyMappings: [
              {
                acId: "AC-1",
                testReferences: [
                  {
                    filePath: "tests/covered-one.test.ts",
                    testType: "unit",
                    testName: "一つ目を検証すること",
                    binding: "ac",
                  },
                ],
              },
              { acId: "AC-2", testReferences: [] },
              {
                acId: "AC-3",
                testReferences: [
                  { filePath: "tests/covered-three.test.ts", testType: "it", binding: "file" },
                  { filePath: "tests/covered-three-scenario.test.ts", testType: "scenario" },
                ],
              },
            ],
          },
        ],
      };
      await writeFile(matrixFilePath, JSON.stringify(fixture), "utf-8");
      const adapter = new FileSystemRequirementTestMatrixAdapter(matrixFilePath);

      // Act
      const actual = await adapter.read("H12-02");

      // Assert
      expect(actual).toEqual({
        storyId: "H12-02",
        total: 3,
        covered: 2,
        uncoveredIds: ["AC-2"],
      });
    });

    it("matrix 1.2 に指定 story がない場合は STORY_NOT_FOUND を返すこと", async () => {
      // Arrange
      const fixture = {
        version: "1.2",
        generatedAt: "2026-07-21T00:00:00.000Z",
        stories: [{ storyId: "H12-99", storyMappings: [] }],
      };
      await writeFile(matrixFilePath, JSON.stringify(fixture), "utf-8");
      const adapter = new FileSystemRequirementTestMatrixAdapter(matrixFilePath);

      // Act
      const actual = await adapter.read("H12-02").catch((error: unknown) => error);

      // Assert
      expect(actual).toMatchObject({
        name: "SkillQualityError",
        code: "STORY_NOT_FOUND",
        message: `Story H12-02 not found in ${matrixFilePath}`,
      });
    });
  });

  describe("legacy matrix を読み取る場合", () => {
    it("旧形式の story 辞書からカバレッジを読み取れること", async () => {
      // Arrange
      const fixture = { "H12-02": { total: 2, covered: 1, uncoveredIds: ["AC-2"] } };
      await writeFile(matrixFilePath, JSON.stringify(fixture), "utf-8");
      const adapter = new FileSystemRequirementTestMatrixAdapter(matrixFilePath);

      // Act
      const actual = await adapter.read("H12-02");

      // Assert
      expect(actual).toEqual({
        storyId: "H12-02",
        total: 2,
        covered: 1,
        uncoveredIds: ["AC-2"],
      });
    });
  });

  describe("壊れた matrix を読み取る場合", () => {
    it("壊れた matrix を SkillQualityError に正規化すること", async () => {
      // Arrange
      await writeFile(matrixFilePath, "{ invalid json", "utf-8");
      const adapter = new FileSystemRequirementTestMatrixAdapter(matrixFilePath);

      // Act
      const actual = await adapter.read("H12-02").catch((error: unknown) => error);

      // Assert
      expect(actual).toMatchObject({
        name: "SkillQualityError",
        code: "MATRIX_FILE_NOT_FOUND",
        message: `requirement-test-matrix.json could not be parsed at ${matrixFilePath}`,
      });
    });
  });
});
