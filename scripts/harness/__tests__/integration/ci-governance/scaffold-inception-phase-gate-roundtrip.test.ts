// @unit ci-governance
// @layer test
// @story H02-02
// @work-item-id WI-368, WI-369

/**
 * WI-368 ラウンドトリップ（GitHub issue #42 の必須要件）。
 *
 * `scaffold-inception --apply` が生成した文書を **一切編集せずに**
 * L2-001 が使う Level-1 フェーズゲート（`check-phase-gate`）へ通す。
 * 「テンプレートを生成したのにゲートが落ちる」状態を回帰から守る。
 *
 * 併せて、planning mode `embedded-qa` では scaffold 直後の文書が
 * **通らない**ことも固定する。テンプレートが `[Answer]`（人間の承認証跡）を
 * 偽造しないための境界であり、緩めてはならない。
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCiGovernance } from "../../../ci-governance/composition-root.js";
import { toPhaseConfigSection } from "../../../config-foundation/application/mappers/phase-config-section-mapper.js";
import { createConfigFoundationModule } from "../../../config-foundation/composition-root.js";
import { createPhaseDependencyModelModule } from "../../../phase-dependency-model/composition-root.js";
import { context, target } from "../../helpers/test-helpers.js";

const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

interface ProjectConfigOptions {
  /** アーキ側ではなくフェーズ依存プリセット（`phaseDependencies.preset`） */
  readonly preset: "minimal" | "standard" | "full";
  readonly planningMode?: "interactive" | "embedded-qa" | "manual";
  readonly designDocs?: string;
  readonly inceptionDocs?: string;
}

function buildProjectConfig(options: ProjectConfigOptions): Record<string, unknown> {
  return {
    // 防御プリセット（project.preset）とフェーズ依存プリセットは独立した設定である
    project: { name: "roundtrip-project", preset: "standard" },
    layers: {},
    quickMode: {},
    phaseDependencies: { preset: options.preset, override: false, customRules: [] },
    planningMode: { default: options.planningMode ?? "interactive", perPhase: {} },
    harnesses: {},
    paths: {
      designDocs: options.designDocs ?? "docs/product/construction",
      inceptionDocs: options.inceptionDocs ?? "docs/inception",
    },
    reporting: { format: "json", outputDir: ".harness/reports" },
  };
}

target("scaffold-inception → check-phase-gate ラウンドトリップ", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "phasegate-roundtrip-"));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  async function writeConfig(options: ProjectConfigOptions): Promise<void> {
    await fs.writeFile(
      path.join(projectRoot, "phasegate.config.json"),
      `${JSON.stringify(buildProjectConfig(options), null, 2)}\n`,
      "utf-8",
    );
  }

  async function scaffold(kinds: readonly string[], options: ProjectConfigOptions): Promise<void> {
    const mod = buildCiGovernance(projectRoot, HARNESS_ROOT, {
      designDocs: options.designDocs,
      inceptionDocs: options.inceptionDocs,
    });
    for (const kind of kinds) {
      const result = await mod.scaffoldInceptionHandler.handle({ kind, apply: true });
      expect(result.exitCode).toBe(0);
    }
  }

  async function checkLevel2Gate(unitId: string): Promise<{
    exitCode: number;
    passed: boolean | undefined;
    blockers: readonly string[];
  }> {
    const configModule = createConfigFoundationModule();
    const resolved = await configModule.usecases.loadResolvedConfigUseCase.execute(
      path.join(projectRoot, "phasegate.config.json"),
    );
    const sut = createPhaseDependencyModelModule({
      rootDir: projectRoot,
      phaseConfig: toPhaseConfigSection(resolved.config),
      reportOutputDir: resolved.config.reporting.outputDir,
    });
    const actual = await sut.checkPhaseGateCommandHandler.execute({ targetLevel: 2, unitId });
    return {
      exitCode: actual.exitCode,
      passed: actual.result?.passed,
      blockers: actual.result?.blockers ?? [],
    };
  }

  describe("minimal preset（Level-1 が product-architect のみ）", () => {
    context("scaffold 前", () => {
      it("IT-CG-RT-001: Level-1 の成果物不足でゲートが落ちる", async () => {
        // Arrange
        const options: ProjectConfigOptions = { preset: "minimal" };
        await writeConfig(options);

        // Act
        const actual = await checkLevel2Gate("sample");

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.blockers.some((blocker) => blocker.includes("product_overview_plan.md"))).toBe(true);
        expect(actual.blockers.some((blocker) => blocker.includes("product_overview.md"))).toBe(true);
      });
    });

    context("scaffold 直後（生成物を一切編集しない）", () => {
      it("IT-CG-RT-002: Level-1 ゲートが blockers 空で通る", async () => {
        // Arrange
        const options: ProjectConfigOptions = { preset: "minimal" };
        await writeConfig(options);
        await scaffold(["product-overview-plan", "product-overview"], options);

        // Act
        const actual = await checkLevel2Gate("sample");

        // Assert
        expect(actual.blockers).toEqual([]);
        expect(actual.passed).toBe(true);
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  describe("standard preset（Level-1 が product-architect + story-writer）", () => {
    context("scaffold 対象外の user_stories.md のみ手書きで補った場合", () => {
      it("IT-CG-RT-003: plan 文書 2 種の QA evidence が充足しゲートが通る", async () => {
        // Arrange
        const options: ProjectConfigOptions = { preset: "standard" };
        await writeConfig(options);
        await scaffold(["product-overview-plan", "product-overview", "story-writer-plan"], options);
        await fs.writeFile(path.join(projectRoot, "docs/product/user_stories.md"), "# Stories\n- H01-01\n", "utf-8");

        // Act
        const actual = await checkLevel2Gate("sample");

        // Assert
        expect(actual.blockers).toEqual([]);
        expect(actual.passed).toBe(true);
      });
    });
  });

  describe("full preset（Level-1 が 4 スキル）", () => {
    context("scaffold 対象外の product 成果物を手書きで補った場合", () => {
      it("IT-CG-RT-004: plan 文書 4 種すべての QA evidence が充足する", async () => {
        // Arrange
        const options: ProjectConfigOptions = { preset: "full" };
        await writeConfig(options);
        await scaffold(
          ["product-overview-plan", "product-overview", "story-writer-plan", "story-mapping-plan", "unit-design-plan"],
          options,
        );
        await fs.writeFile(path.join(projectRoot, "docs/product/user_stories.md"), "# Stories\n- H01-01\n", "utf-8");
        await fs.writeFile(path.join(projectRoot, "docs/product/user_story_mapping.md"), "# Mapping\n", "utf-8");
        await fs.mkdir(path.join(projectRoot, "docs/product/units"), { recursive: true });
        await fs.writeFile(path.join(projectRoot, "docs/product/units/sample_unit.md"), "# sample\n", "utf-8");
        await fs.writeFile(path.join(projectRoot, "docs/product/units/integration_contract.md"), "# contract\n", "utf-8");

        // Act
        const actual = await checkLevel2Gate("sample");

        // Assert
        expect(actual.blockers).toEqual([]);
        expect(actual.passed).toBe(true);
      });
    });
  });

  describe("planningMode embedded-qa", () => {
    context("scaffold 直後（[Answer] が未記入）", () => {
      it("IT-CG-RT-005: 人間の回答が無いためゲートは通らない（承認証跡を偽造しない）", async () => {
        // Arrange
        const options: ProjectConfigOptions = { preset: "minimal", planningMode: "embedded-qa" };
        await writeConfig(options);
        await scaffold(["product-overview-plan", "product-overview"], options);

        // Act
        const actual = await checkLevel2Gate("sample");

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.blockers.length).toBeGreaterThan(0);
      });
    });
  });

  describe("paths を移設したプロジェクト（WI-369）", () => {
    context("designDocs / inceptionDocs を mydocs 配下に置いた場合", () => {
      it("IT-CG-RT-006: scaffold 先とゲート検査先が一致しゲートが通る", async () => {
        // Arrange
        const options: ProjectConfigOptions = {
          preset: "minimal",
          designDocs: "mydocs/product/construction",
          inceptionDocs: "mydocs/inception",
        };
        await writeConfig(options);
        await scaffold(["product-overview-plan", "product-overview"], options);

        // Act
        const actual = await checkLevel2Gate("sample");

        // Assert
        await expect(
          fs.access(path.join(projectRoot, "mydocs/inception/_shared/product_overview_plan.md")),
        ).resolves.toBeUndefined();
        await expect(
          fs.access(path.join(projectRoot, "mydocs/product/product_overview.md")),
        ).resolves.toBeUndefined();
        expect(actual.blockers).toEqual([]);
        expect(actual.passed).toBe(true);
      });
    });

    context("scaffold-design を同じ paths で実行した場合", () => {
      it("IT-CG-RT-007: 設計文書も paths.designDocs 配下に生成される", async () => {
        // Arrange
        const options: ProjectConfigOptions = {
          preset: "minimal",
          designDocs: "mydocs/product/construction",
          inceptionDocs: "mydocs/inception",
        };
        await writeConfig(options);
        const mod = buildCiGovernance(projectRoot, HARNESS_ROOT, {
          designDocs: options.designDocs,
          inceptionDocs: options.inceptionDocs,
        });

        // Act
        const actual = await mod.scaffoldDesignHandler.handle({
          unit: "sample",
          phase: "logical",
          apply: true,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        await expect(
          fs.access(path.join(projectRoot, "mydocs/product/construction/sample/logical_design.md")),
        ).resolves.toBeUndefined();
        await expect(
          fs.access(path.join(projectRoot, "docs/product/construction/sample/logical_design.md")),
        ).rejects.toThrow();
      });
    });
  });
});
