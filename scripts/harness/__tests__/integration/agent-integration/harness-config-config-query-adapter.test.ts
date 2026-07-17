// @unit agent-integration
// @layer infrastructure
// @story H11-02
// @work-item-id WI-214
// @work-item-id WI-333

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ProjectPaths } from "../../../agent-integration/domain/value-objects/project-paths.js";
import { HarnessConfigConfigQueryAdapter } from "../../../agent-integration/infrastructure/adapters/harness-config-config-query-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const ENABLED_CONFIG = path.join(FIXTURES_DIR, "harness-config-enabled.json");
const DISABLED_CONFIG = path.join(FIXTURES_DIR, "harness-config-disabled.json");
const WITH_PROJECT_PATHS_CONFIG = path.join(FIXTURES_DIR, "harness-config-with-project-paths.json");
const CUSTOM_PATHS_CONFIG = path.join(FIXTURES_DIR, "harness-config-custom-paths.json");
const WITH_EXCLUSIONS_CONFIG = path.join(FIXTURES_DIR, "harness-config-with-exclusions.json");
const WITH_RELAXED_GATES_CONFIG = path.join(FIXTURES_DIR, "harness-config-with-relaxed-gates.json");
const WITH_BASELINE_CONFIG = path.join(FIXTURES_DIR, "harness-config-with-baseline.json");
const WITH_STOP_HOOK_ENFORCE_CONFIG = path.join(FIXTURES_DIR, "harness-config-with-stop-hook-enforce.json");
const WITH_TOP_LEVEL_PATHS_CONFIG = path.join(FIXTURES_DIR, "harness-config-with-top-level-paths.json");

target("HarnessConfigConfigQueryAdapter", () => {
  describe("設定読み取り", () => {
    context("cascadeUpdate=trueのfixture使用時", () => {
      // IT-REPO-ConfigQueryAdapter-001
      it("post-tool-use フックが有効と判定されること（cascadeUpdate=true）", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled("post-tool-use");

        // Assert
        expect(actual).toBe(true);
      });
    });

    context("cascadeUpdate=falseのfixture使用時", () => {
      // IT-REPO-ConfigQueryAdapter-002
      it("post-tool-use フックが無効と判定されること（cascadeUpdate=false）", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(DISABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled("post-tool-use");

        // Assert
        expect(actual).toBe(false);
      });
    });

    context("agentLessonCollection=trueのfixture使用時", () => {
      // IT-REPO-ConfigQueryAdapter-003
      it("pre-tool-use フックが有効と判定されること（agentLessonCollection=true）", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled("pre-tool-use");

        // Assert
        expect(actual).toBe(true);
      });
    });

    context("getProtectedFilePatterns呼び出し時", () => {
      // IT-REPO-ConfigQueryAdapter-004
      it("getProtectedFilePatterns()が設定由来のprinciples/folder rules保護パターンを返すこと", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.getProtectedFilePatterns();

        // Assert
        expect(actual).toEqual(["docs/principles/**", "docs/folder_management_rules.md"]);
      });

      it("top-level paths の principles/folder rules 設定から保護パターンを生成すること", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_TOP_LEVEL_PATHS_CONFIG);

        // Act
        const actual = await adapter.getProtectedFilePatterns();

        // Assert
        expect(actual).toEqual([
          "custom/protected.json",
          "documentation/principles/**",
          "documentation/folder_rules.md",
        ]);
      });
    });

    context("Stopフックのデフォルト有効設定", () => {
      // IT-REPO-ConfigQueryAdapter-005
      it("stop フックが有効と判定されること（Stopはデフォルト有効）", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled("stop");

        // Assert
        expect(actual).toBe(true);
      });
    });

    context("存在しないconfigファイルが指定された場合", () => {
      // IT-REPO-ConfigQueryAdapter-006
      // 契約変更（WI-333 / ADR-038 G1）: ENOENT throw は hook プロセスを exit 2 に落とし
      // 全ツール遮断＝自己修復デッドロックを起こすため、hook 専用のこの adapter は
      // ENOENT を invalid-json と同じ「警告 + 既定値」の fail-open として扱う。
      it("phasegate.config.jsonが存在しない場合、throwせず警告付きで既定値にfail-openすること（WI-333: hookデッドロック回避の契約変更）", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter("/nonexistent/path/phasegate.config.json");
        const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

        try {
          // Act
          const actual = await adapter.isHookEnabled("post-tool-use");

          // Assert
          expect(actual).toBe(true);
          expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("not found"));
        } finally {
          stderrSpy.mockRestore();
        }
      });

      it("config不在のfail-open時、保護パターンとProjectPathsが既定値で解決されること（WI-333）", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter("/nonexistent/path/phasegate.config.json");
        const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

        try {
          // Act
          const actual = await adapter.getProtectedFilePatterns();

          // Assert
          expect(actual).toEqual(["docs/principles/**", "docs/folder_management_rules.md"]);
          expect(
            adapter.getProjectPaths().equals(
              ProjectPaths.create(["scripts/harness"], {
                inception: "docs/inception",
                construction: "docs/product/construction",
              }),
            ),
          ).toBe(true);
        } finally {
          stderrSpy.mockRestore();
        }
      });
    });

    context("ENOENT以外のfsエラーが発生する場合（configパスがディレクトリ）", () => {
      it("ENOENT以外のfsエラー（EISDIR等）はfail-openせず従来どおりthrowされること（WI-333）", async () => {
        // Arrange: ディレクトリを config パスとして渡すと readFileSync が EISDIR を throw する
        const adapter = new HarnessConfigConfigQueryAdapter(FIXTURES_DIR);

        // Act
        const actual = adapter.isHookEnabled("post-tool-use");

        // Assert
        await expect(actual).rejects.toThrow("EISDIR");
      });
    });

    context("project.pathsセクションが存在する場合", () => {
      // IT-REPO-ConfigQueryAdapter-007
      it("project.pathsセクションありの設定の場合、ProjectPaths VOを返すこと", () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_PROJECT_PATHS_CONFIG);
        const expected = ProjectPaths.create(["scripts/harness"], {
          inception: "docs/inception",
          construction: "docs/product/construction",
        });

        // Act
        const actual = adapter.getProjectPaths();

        // Assert
        expect(actual.equals(expected)).toBe(true);
      });
    });

    context("project.pathsセクションが存在しない場合", () => {
      // IT-REPO-ConfigQueryAdapter-008
      it("top-level paths の design/inception 設定にフォールバックすること", () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);
        const expected = ProjectPaths.create(["scripts/harness"], {
          inception: "docs/inception",
          construction: "docs",
        });

        // Act
        const actual = adapter.getProjectPaths();

        // Assert
        expect(actual.equals(expected)).toBe(true);
      });
    });

    context("project.pathsにカスタム設定がある場合", () => {
      // IT-REPO-ConfigQueryAdapter-009
      it("カスタムパス設定の場合、その設定値をそのまま返すこと", () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(CUSTOM_PATHS_CONFIG);
        const expected = ProjectPaths.create(["src", "lib"], {
          inception: "design/inception",
          construction: "design/construction",
        });

        // Act
        const actual = adapter.getProjectPaths();

        // Assert
        expect(actual.equals(expected)).toBe(true);
      });
    });

    context("protectedFiles.excludeセクションが存在する場合", () => {
      // IT-REPO-ConfigQueryAdapter-010
      it("getProtectedFileExclusions()が除外パターン配列を返すこと", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_EXCLUSIONS_CONFIG);

        // Act
        const actual = await adapter.getProtectedFileExclusions();

        // Assert
        expect(actual).toEqual(["tsconfig.json", "package.json"]);
      });
    });

    context("protectedFilesセクションが存在しない場合", () => {
      // IT-REPO-ConfigQueryAdapter-011
      it("getProtectedFileExclusions()が空配列を返すこと", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.getProtectedFileExclusions();

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context("quickMode.relaxedGatesセクションが存在する場合", () => {
      // IT-REPO-ConfigQueryAdapter-012
      it("getRelaxedGates()がrelaxedGates配列を返すこと", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_RELAXED_GATES_CONFIG);

        // Act
        const actual = await adapter.getRelaxedGates();

        // Assert
        expect(actual).toEqual(["phase-gate", "2-phase-execution"]);
      });
    });

    context("quickModeセクションにrelaxedGatesがない場合", () => {
      // IT-REPO-ConfigQueryAdapter-013
      it("getRelaxedGates()が空配列を返すこと", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.getRelaxedGates();

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context("baseline セクションが未定義 (ISSUE-007 Wave 2 / Wave 6 で default=true へ変更)", () => {
      it("IT-AI-HCC-BL-001: デフォルトで enabled=true, path=.phasegate/baseline.json", async () => {
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);
        const actual = await adapter.getBaselineConfig();
        expect(actual.enabled).toBe(true);
        expect(actual.path).toBe(".phasegate/baseline.json");
      });
    });

    context("baseline セクションに enabled=true + カスタム path", () => {
      it("IT-AI-HCC-BL-002: 指定値を返す", async () => {
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_BASELINE_CONFIG);
        const actual = await adapter.getBaselineConfig();
        expect(actual.enabled).toBe(true);
        expect(actual.path).toBe(".custom/baseline.json");
      });
    });

    context("agentIntegration.stopHook.enforce=true (WI-087 Phase C-2)", () => {
      it("getStopHookEnforce() が true を返す", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_STOP_HOOK_ENFORCE_CONFIG);

        // Act
        const actual = await adapter.getStopHookEnforce();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context("agentIntegration セクションが未定義 (WI-087 Phase C-2)", () => {
      it("getStopHookEnforce() がデフォルト false を返す", async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.getStopHookEnforce();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
