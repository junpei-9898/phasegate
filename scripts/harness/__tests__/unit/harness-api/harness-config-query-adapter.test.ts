// @layer test
// @unit harness-api
// @story H09-04
// @work-item-id WI-096
// @work-item-id WI-328

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { HarnessConfigQueryAdapter } from "../../../harness-api/infrastructure/adapters/harness-config-query-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

async function writeConfig(config: unknown): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), "phasegate-config-query-"));
  const configPath = join(workDir, "phasegate.config.json");
  await writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

async function arrangeOperationalHealthFixture(): Promise<HarnessConfigQueryAdapter> {
  const workDir = await mkdtemp(join(tmpdir(), "phasegate-operational-health-"));
  const configPath = join(workDir, "phasegate.config.json");
  await mkdir(join(workDir, ".phasegate"), { recursive: true });
  const currentContent = "current\n";
  const currentSha1 = createHash("sha1").update(currentContent).digest("hex");
  await writeFile(join(workDir, "kept.ts"), currentContent);
  await writeFile(
    configPath,
    JSON.stringify({
      version: 2,
      project: { name: "test-project", preset: "standard" },
      baseline: { enabled: true, path: ".phasegate/baseline.json" },
    }),
  );
  await writeFile(
    join(workDir, ".phasegate/baseline.json"),
    JSON.stringify({
      version: "1.0",
      createdAt: "2026-05-12T00:00:00.000Z",
      algorithm: "sha1",
      files: [
        { path: "kept.ts", sha1: currentSha1 },
        { path: "missing.ts", sha1: "0000000000000000000000000000000000000000" },
      ],
    }),
  );
  await writeFile(
    join(workDir, ".phasegate/hook-skip-events.jsonl"),
    `${JSON.stringify({
      hookType: "stop",
      reason: "REENTRY_DETECTED",
      targetPaths: [],
      observedAt: "2026-05-12T00:00:00.000Z",
    })}\n`,
  );
  return new HarnessConfigQueryAdapter({ configPath });
}

target("HarnessConfigQueryAdapter.getPresetInfo", () => {
  describe("layers overrideを含むプリセット情報取得", () => {
    context("strictプリセットでL4が明示的に無効化されている場合", () => {
      it("L4をenabledLayersから除外すること", async () => {
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: "test-project", preset: "strict" },
          layers: { L4: { enabled: false } },
        });
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getPresetInfo();

        // Assert
        expect(actual.name).toBe("strict");
        expect(actual.enabledLayers).toEqual(["L1", "L2", "L3"]);
      });
    });

    context("minimalプリセットでL4が明示的に有効化されている場合", () => {
      it("L4をenabledLayersに追加すること", async () => {
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: "test-project", preset: "minimal" },
          layers: { L4: { enabled: true } },
        });
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getPresetInfo();

        // Assert
        expect(actual.name).toBe("minimal");
        expect(actual.enabledLayers).toEqual(["L1", "L4"]);
      });
    });
  });
});

target("HarnessConfigQueryAdapter.getLanguageInfo", () => {
  describe("実効言語リストと出所の解決", () => {
    context("config に project.languages が宣言されている場合", () => {
      it("getLanguageInfoが宣言された言語リストを source=declared で返すこと", async () => {
        // @work-item-id WI-328
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: "test-project", preset: "standard", languages: ["python", "go"] },
        });
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getLanguageInfo();

        // Assert
        expect(actual.effective).toEqual(["python", "go"]);
        expect(actual.source).toBe("declared");
      });
    });

    context("languages 未宣言でマーカーファイル go.mod が存在する場合", () => {
      it("getLanguageInfoがFS検出した言語リストを source=detected で返すこと", async () => {
        // @work-item-id WI-328
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: "test-project", preset: "standard" },
        });
        await writeFile(join(dirname(configPath), "go.mod"), "module example.com/test\n");
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getLanguageInfo();

        // Assert
        expect(actual.effective).toEqual(["go"]);
        expect(actual.source).toBe("detected");
      });
    });

    context("languages 未宣言でマーカーファイルが1つも存在しない場合", () => {
      it("getLanguageInfoがtypescriptフォールバックを source=fallback で返すこと", async () => {
        // @work-item-id WI-328
        // Arrange
        const configPath = await writeConfig({
          version: 2,
          project: { name: "test-project", preset: "standard" },
        });
        const adapter = new HarnessConfigQueryAdapter({ configPath });

        // Act
        const actual = await adapter.getLanguageInfo();

        // Assert
        expect(actual.effective).toEqual(["typescript"]);
        expect(actual.source).toBe("fallback");
      });
    });
  });
});

target("HarnessConfigQueryAdapter operational health", () => {
  describe("baseline と hook skip の状態取得", () => {
    context("baseline snapshot と hook skip record が存在する場合", () => {
      it("baseline debt を返すこと", async () => {
        // @work-item-id WI-123
        // Arrange
        const adapter = await arrangeOperationalHealthFixture();

        // Act
        const actual = await adapter.getBaselineHealth();

        // Assert
        expect(actual.grandfatheredFileCount).toBe(2);
        expect(actual.missingFileCount).toBe(1);
      });

      it("最新 hook skip reason を返すこと", async () => {
        // @work-item-id WI-123
        // Arrange
        const adapter = await arrangeOperationalHealthFixture();

        // Act
        const actual = await adapter.getHookHealth();

        // Assert
        expect(actual.latestSkip?.reason).toBe("REENTRY_DETECTED");
        expect(actual.skipCountsByReason.REENTRY_DETECTED).toBe(1);
      });
    });
  });
});
