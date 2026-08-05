// @unit agent-integration
// @layer test
// @story H11-02
// @work-item-id WI-348
// @work-item-id WI-350

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import type { FullModeSessionQueryInput } from "../../../agent-integration/domain/ports/full-mode-session-query-port.js";
import { FileSystemFullModeSessionQueryAdapter } from "../../../agent-integration/infrastructure/adapters/file-system-full-mode-session-query-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

const NOW = new Date("2026-08-05T12:00:00.000Z");
const FUTURE = "2026-08-05T13:00:00.000Z";
const PAST = "2026-08-05T11:00:00.000Z";

const createdRoots: string[] = [];

afterEach(async () => {
  while (createdRoots.length > 0) {
    const root = createdRoots.pop();
    if (root !== undefined) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

function createConfigQueryPort() {
  return {
    isHookEnabled: vi.fn(),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
    getRelaxedGates: vi.fn().mockResolvedValue([]),
    getProjectPaths: vi.fn().mockReturnValue({
      getSource: () => ["scripts/harness"],
      getDocsInception: () => "docs/inception",
      getDocsConstruction: () => "docs/product/construction",
    }),
    getBaselineConfig: vi.fn().mockResolvedValue({ enabled: false, path: ".phasegate/baseline.json" }),
    getStopHookEnforce: vi.fn().mockResolvedValue(false),
  };
}

async function createAdapterWithSession(
  session: Record<string, unknown> | null,
): Promise<FileSystemFullModeSessionQueryAdapter> {
  const rootDir = await mkdtemp(path.join(tmpdir(), "wi348-full-mode-session-"));
  createdRoots.push(rootDir);
  if (session !== null) {
    await mkdir(path.join(rootDir, ".phasegate"), { recursive: true });
    await writeFile(path.join(rootDir, ".phasegate", "session.json"), JSON.stringify(session, null, 2), "utf8");
  }
  return new FileSystemFullModeSessionQueryAdapter({
    rootDir,
    configQueryPort: createConfigQueryPort(),
    now: () => NOW,
  });
}

function activeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    mode: "full",
    unit: "agent-integration",
    workItemId: "WI-348",
    allowedCategories: ["bugfix", "docs", "test", "config", "feature", "domain", "api"],
    reason: "test session",
    startedAt: "2026-08-05T11:30:00.000Z",
    expiresAt: FUTURE,
    ...overrides,
  };
}

function queryInput(overrides: Partial<FullModeSessionQueryInput> = {}): FullModeSessionQueryInput {
  return {
    targetFilePaths: ["scripts/harness/agent-integration/domain/new-entity.ts"],
    unitId: "agent-integration",
    dominantCategory: "domain",
    ...overrides,
  };
}

target("FileSystemFullModeSessionQueryAdapter.check", () => {
  context("session.json が存在しない場合", () => {
    it("active=false かつ allowed=false が返ること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(null);

      // Act
      const actual = await sut.check(queryInput());

      // Assert
      expect(actual.active).toBe(false);
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("session marker not found or unreadable");
    });
  });

  context("session の期限が切れている場合", () => {
    it("allowed=false かつ理由が session expired になること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession({ expiresAt: PAST }));

      // Act
      const actual = await sut.check(queryInput());

      // Assert
      expect(actual.active).toBe(true);
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("session expired");
    });
  });

  context("対象 unit が session unit と一致しない場合", () => {
    it("allowed=false かつ理由に両 unit が含まれること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession());

      // Act
      const actual = await sut.check(
        queryInput({
          unitId: "quick-mode",
          targetFilePaths: ["scripts/harness/quick-mode/domain/new-entity.ts"],
        }),
      );

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("target unit quick-mode does not match session unit agent-integration");
    });
  });

  context("dominantCategory が feature の場合", () => {
    it("ChangeCategory 語彙の session で allowed=true になること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession());

      // Act
      const actual = await sut.check(queryInput({ dominantCategory: "feature" }));

      // Assert
      expect(actual.allowed).toBe(true);
      expect(actual.workItemId).toBe("WI-348");
    });
  });

  context("dominantCategory が session の allowedCategories に含まれない場合", () => {
    it("allowed=false かつ理由に当該カテゴリが含まれること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession({ allowedCategories: ["docs"] }));

      // Act
      const actual = await sut.check(queryInput({ dominantCategory: "api" }));

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("category api is not allowed by session");
    });
  });

  context("旧形式（レイヤー名語彙）の allowedCategories を持つ session の場合", () => {
    it("全カテゴリ許可へ正規化され api カテゴリが allowed=true になること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(
        activeSession({
          allowedCategories: ["domain", "application", "infrastructure", "presentation", "config"],
        }),
      );

      // Act
      const actual = await sut.check(queryInput({ dominantCategory: "api" }));

      // Assert
      expect(actual.allowed).toBe(true);
    });

    it("全要素が既知カテゴリの場合は正規化されず絞り込みが維持されること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession({ allowedCategories: ["docs", "test"] }));

      // Act
      const actual = await sut.check(queryInput({ dominantCategory: "api" }));

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("category api is not allowed by session");
    });
  });

  context("allowedCategories が配列でない場合", () => {
    it("allowed=false かつ理由が invalid になること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession({ allowedCategories: "domain" }));

      // Act
      const actual = await sut.check(queryInput());

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("session allowedCategories is invalid");
    });
  });

  context("unit を持たないパスのみが対象の場合", () => {
    it("unitId が undefined でも per-path チェックで許可されること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession());

      // Act
      const actual = await sut.check(
        queryInput({
          targetFilePaths: ["results/summary.md"],
          unitId: undefined,
          dominantCategory: "feature",
        }),
      );

      // Assert
      expect(actual.allowed).toBe(true);
      expect(actual.unit).toBe("agent-integration");
    });

    it("unit を持たないパスに session unit 外のパスが混在する場合は拒否されること", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession());

      // Act
      const actual = await sut.check(
        queryInput({
          targetFilePaths: ["results/summary.md", "scripts/harness/quick-mode/domain/other-entity.ts"],
          unitId: undefined,
          dominantCategory: "feature",
        }),
      );

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("one or more target paths are outside session unit agent-integration");
    });
  });

  context("session unit 外の target path が含まれる場合", () => {
    it("allowed=false かつ理由が unit 外パスであることを示すこと", async () => {
      // Arrange
      const sut = await createAdapterWithSession(activeSession());

      // Act
      const actual = await sut.check(
        queryInput({
          targetFilePaths: [
            "scripts/harness/agent-integration/domain/new-entity.ts",
            "scripts/harness/quick-mode/domain/other-entity.ts",
          ],
        }),
      );

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toBe("one or more target paths are outside session unit agent-integration");
    });
  });
});
