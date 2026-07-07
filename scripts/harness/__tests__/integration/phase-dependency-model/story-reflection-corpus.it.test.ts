// @unit phase-dependency-model
// @layer application
// @story WI-246
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { FULL_STORY_REFLECTION_DEFAULTS } from "../../../phase-dependency-model/domain/definitions/full-story-reflection-defaults.js";
import { StoryReflectionChecker } from "../../../phase-dependency-model/domain/services/story-reflection-checker.js";
import { FileSystemStoryReflectionAdapter } from "../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js";
import { context, target } from "../../helpers/test-helpers.ts";

interface BaselineEntry {
  readonly unit: string;
  readonly storyId: string;
  readonly productPath: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../..");
const baselinePath = path.join(__dirname, "fixtures/story-reflection-honest-baseline.json");

const toViolationKey = (entry: BaselineEntry): string => `${entry.unit}|${entry.storyId}|${entry.productPath}`;

async function listProductUnits(): Promise<string[]> {
  const constructionDir = path.join(rootDir, "docs/product/construction");
  const entries = await readdir(constructionDir, { withFileTypes: true });

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readBaseline(): Promise<BaselineEntry[]> {
  const content = await readFile(baselinePath, "utf8");
  return JSON.parse(content) as BaselineEntry[];
}

target("StoryReflectionChecker corpus", () => {
  context("実コーパスの反映違反を honest baseline と比較する場合", () => {
    it(
      "実コーパスのblocking violationsはhonest baselineを超えない",
      async () => {
        // Arrange
        const adapter = new FileSystemStoryReflectionAdapter({ rootDir });
        const checker = new StoryReflectionChecker(adapter);
        const units = await listProductUnits();
        const baseline = await readBaseline();
        const baselineKeys = new Set(baseline.map(toViolationKey));

        // Act
        const actual = new Set<string>();
        for (const unit of units) {
          const result = await checker.check(unit, FULL_STORY_REFLECTION_DEFAULTS);
          for (const violation of result.violations) {
            actual.add(
              toViolationKey({
                unit,
                storyId: violation.storyId,
                productPath: violation.productPath,
              }),
            );
          }
        }

        // Assert
        const added = [...actual].filter((key) => !baselineKeys.has(key)).sort();
        expect(added, `baseline に無い新規 violation:\n${added.join("\n")}`).toHaveLength(0);
      },
      180_000,
    );
  });
});
