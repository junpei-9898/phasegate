// @unit harness-api
// @layer test
// @story H03-02
// @work-item-id WI-141
// @work-item-id WI-305

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { expect, it, vi } from "vitest";
import type { PreCommitDeps } from "../../../integrations/pre-commit.js";
import { runBypassAudit, runPreCommit, validateBypassTrailers } from "../../../integrations/pre-commit.js";
import type { ValidateMetadataCommandOutput } from "../../../traceability-model/presentation/cli/validate-metadata-command-handler.js";
import type { ValidationResultContract } from "../../../validator-system/application/dto/validation-result-contract.js";
import { context, target } from "../../helpers/test-helpers.js";

function passingContract(validatorId: string): ValidationResultContract {
  return {
    validatorId,
    passed: true,
    errors: [],
    durationMs: 1,
  };
}

function failingContract(validatorId: string, message: string): ValidationResultContract {
  return {
    validatorId,
    passed: false,
    errors: [
      {
        code: validatorId,
        severity: "error",
        message,
        suggestion: "fix me",
      },
    ],
    durationMs: 1,
  };
}

function passingMetadataOutput(): ValidateMetadataCommandOutput {
  return {
    exitCode: 0,
    results: [],
    text: "[PASS] docs/product/construction/foo/logical_design.md",
  };
}

function failingMetadataOutput(): ValidateMetadataCommandOutput {
  return {
    exitCode: 1,
    results: [],
    text: "[FAIL] docs/product/construction/foo/logical_design.md\n  ERROR: @story-id は必須です",
  };
}

function errorMetadataOutput(): ValidateMetadataCommandOutput {
  return {
    exitCode: 2,
    results: [],
    text: "Error: metadata validation failed unexpectedly",
  };
}

function buildDeps(
  overrides: Partial<{
    l2Result: readonly ValidationResultContract[];
    metadataResult: ValidateMetadataCommandOutput;
    designResult: Awaited<ReturnType<NonNullable<PreCommitDeps["validateDesignChangeDeclaration"]>>>;
  }> = {},
): PreCommitDeps & {
  l2Spy: ReturnType<typeof vi.fn>;
  metadataSpy: ReturnType<typeof vi.fn>;
  designSpy: ReturnType<typeof vi.fn>;
} {
  const l2Spy = vi.fn(async () => overrides.l2Result ?? [passingContract("L2-002")]);
  const metadataSpy = vi.fn(async () => overrides.metadataResult ?? passingMetadataOutput());
  const designSpy = vi.fn(
    async () =>
      overrides.designResult ?? { status: "passed" as const, checkedFragmentCount: 0, findings: [], warningCodes: [] },
  );
  return {
    runL2ValidatorsUseCase: { execute: l2Spy },
    validateMetadataCommandHandler: { execute: metadataSpy },
    validateDesignChangeDeclaration: designSpy,
    l2Spy,
    metadataSpy,
    designSpy,
  };
}

target("runPreCommit（pre-commit エントリ ISSUE-008 Phase B-3）", () => {
  context("staged ファイル分岐", () => {
    // UT-PC-01
    it("staged が空の場合、exitCode 0 と「No staged files to check」が返される", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit([], deps);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("No staged files to check");
      expect(deps.l2Spy).not.toHaveBeenCalled();
      expect(deps.metadataSpy).not.toHaveBeenCalled();
    });

    // UT-PC-02
    it("staged が .ts のみの場合、L2 validator のみ呼ばれる", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["scripts/harness/foo.ts"], deps);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(deps.l2Spy).toHaveBeenCalledTimes(1);
      expect(deps.l2Spy).toHaveBeenCalledWith(expect.objectContaining({ targetPaths: ["scripts/harness/foo.ts"] }));
      expect(deps.metadataSpy).not.toHaveBeenCalled();
    });

    // UT-PC-03
    it("staged が .md のみの場合、validateMetadataCommandHandler のみ呼ばれる", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["docs/product/construction/foo/logical_design.md"], deps);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(deps.metadataSpy).toHaveBeenCalledTimes(1);
      expect(deps.metadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePaths: ["docs/product/construction/foo/logical_design.md"],
        }),
      );
      expect(deps.l2Spy).not.toHaveBeenCalled();
    });

    // UT-PC-04
    it(".ts と .md が混在する場合、両方の UseCase が呼ばれ、両セクションが出力される", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(
        ["scripts/harness/foo.ts", "docs/product/construction/foo/logical_design.md"],
        deps,
      );
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(deps.l2Spy).toHaveBeenCalledTimes(1);
      expect(deps.metadataSpy).toHaveBeenCalledTimes(1);
      expect(actual.stdout).toContain("実装ファイル");
      expect(actual.stdout).toContain("メタデータ注釈");
    });

    // UT-PC-WI012-01
    it("implementationExtensions に .py が含まれる場合、staged .py が L2 validator に渡される", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["scripts/harness/sample/application/service.py"], deps, {
        implementationExtensions: [".ts", ".py"],
      });
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(deps.l2Spy).toHaveBeenCalledTimes(1);
      expect(deps.l2Spy).toHaveBeenCalledWith(
        expect.objectContaining({
          targetPaths: ["scripts/harness/sample/application/service.py"],
          unitName: "sample",
        }),
      );
    });

    // UT-PC-WI012-02
    it("implementationExtensions が未指定の場合、.py は検証対象外のままになる", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["scripts/harness/sample/application/service.py"], deps);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("No staged files to check");
      expect(deps.l2Spy).not.toHaveBeenCalled();
    });
  });

  context("テストファイル (.test.ts) の @story 検証 ISSUE-008 Phase C-3", () => {
    // UT-PC-09
    it("staged に .test.ts が含まれる場合、L2 validator と metadata handler の両方に渡される", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["scripts/harness/__tests__/unit/foo.test.ts"], deps);
      // Assert — L2 validator は .ts 全般を対象とする（@unit/@layer + test-quality）
      expect(actual.exitCode).toBe(0);
      expect(deps.l2Spy).toHaveBeenCalledWith(
        expect.objectContaining({
          targetPaths: ["scripts/harness/__tests__/unit/foo.test.ts"],
        }),
      );
      // metadata handler は @story 検証用に test ファイルも受け取る
      expect(deps.metadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePaths: ["scripts/harness/__tests__/unit/foo.test.ts"],
        }),
      );
    });

    // UT-PC-10
    it(".md と .test.ts が混在する場合、metadata handler は両方を受け取り、実装順で渡される", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      await runPreCommit(
        [
          "scripts/harness/foo.ts",
          "docs/product/construction/foo/logical_design.md",
          "scripts/harness/__tests__/unit/bar.spec.ts",
        ],
        deps,
      );
      // Assert
      expect(deps.metadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePaths: ["docs/product/construction/foo/logical_design.md", "scripts/harness/__tests__/unit/bar.spec.ts"],
        }),
      );
    });

    // UT-PC-11
    it("テストヘルパー (test-helpers.ts) は test サフィックスを持たないため metadata handler に渡されない", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      await runPreCommit(["scripts/harness/__tests__/helpers/test-helpers.ts"], deps);
      // Assert
      expect(deps.l2Spy).toHaveBeenCalledOnce(); // L2 validator は .ts 全般で呼ばれる
      expect(deps.metadataSpy).not.toHaveBeenCalled(); // metadata handler は呼ばれない
    });
  });

  context("合成 exitCode", () => {
    // UT-PC-05
    it(".ts 成功かつ .md 失敗の場合、exitCode は 1 になる", async () => {
      // Arrange
      const deps = buildDeps({ metadataResult: failingMetadataOutput() });
      // Act
      const actual = await runPreCommit(
        ["scripts/harness/foo.ts", "docs/product/construction/foo/logical_design.md"],
        deps,
      );
      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("Commit blocked");
    });

    // UT-PC-06
    it(".ts 失敗かつ .md 成功の場合、exitCode は 1 になる", async () => {
      // Arrange
      const deps = buildDeps({
        l2Result: [failingContract("L2-002", "メタデータ不足: @unit がありません")],
      });
      // Act
      const actual = await runPreCommit(
        ["scripts/harness/foo.ts", "docs/product/construction/foo/logical_design.md"],
        deps,
      );
      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("Commit blocked");
    });

    // UT-PC-07
    it(".md の検証が exitCode 2（実行時エラー）を返した場合、pre-commit も exitCode 2 になる", async () => {
      // Arrange
      const deps = buildDeps({ metadataResult: errorMetadataOutput() });
      // Act
      const actual = await runPreCommit(["docs/product/construction/foo/logical_design.md"], deps);
      // Assert
      expect(actual.exitCode).toBe(2);
    });
  });

  context("unitName 導出 (ISSUE-026 派生バグ修正)", () => {
    // UT-PC-12
    it("scripts/harness/{unit}/... 配下の staged TS から unitName を導出し、L2 に渡す", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      await runPreCommit(
        ["scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts"],
        deps,
      );
      // Assert
      expect(deps.l2Spy).toHaveBeenCalledTimes(1);
      expect(deps.l2Spy).toHaveBeenCalledWith(expect.objectContaining({ unitName: "phase-dependency-model" }));
    });

    // UT-PC-13
    it("__tests__/{type}/{unit}/... 配下の test ファイルからも unitName を導出する", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      await runPreCommit(["scripts/harness/__tests__/unit/phase-dependency-model/foo.test.ts"], deps);
      // Assert
      expect(deps.l2Spy).toHaveBeenCalledWith(expect.objectContaining({ unitName: "phase-dependency-model" }));
    });

    // UT-PC-14
    it("staged TS が複数 Unit に跨る場合、Unit ごとに L2 を実行する", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      await runPreCommit(
        [
          "scripts/harness/phase-dependency-model/infrastructure/foo.ts",
          "scripts/harness/config-foundation/domain/bar.ts",
        ],
        deps,
      );
      // Assert
      expect(deps.l2Spy).toHaveBeenCalledTimes(2);
      const calls = deps.l2Spy.mock.calls.map((args) => args[0] as { unitName: string });
      const unitNames = calls.map((c) => c.unitName).sort();
      expect(unitNames).toEqual(["config-foundation", "phase-dependency-model"]);
    });

    // UT-PC-15
    it('Unit 名を特定できない TS (scripts/harness/foo.ts 等) は unitName="" で実行される', async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      await runPreCommit(["scripts/harness/foo.ts"], deps);
      // Assert
      expect(deps.l2Spy).toHaveBeenCalledWith(expect.objectContaining({ unitName: "" }));
    });

    // UT-PC-16
    it("複数 Unit のいずれかで L2-001 が fail した場合、合成結果も fail になる", async () => {
      // Arrange
      const l2Spy = vi.fn();
      l2Spy.mockImplementationOnce(async () => [
        passingContract("L2-001"),
        passingContract("L2-002"),
        passingContract("L2-003"),
      ]);
      l2Spy.mockImplementationOnce(async () => [
        failingContract("L2-001", "prerequisites missing"),
        passingContract("L2-002"),
        passingContract("L2-003"),
      ]);
      const metadataSpy = vi.fn(async () => passingMetadataOutput());
      const deps: PreCommitDeps & { l2Spy: typeof l2Spy; metadataSpy: typeof metadataSpy } = {
        runL2ValidatorsUseCase: { execute: l2Spy },
        validateMetadataCommandHandler: { execute: metadataSpy },
        l2Spy,
        metadataSpy,
      };
      // Act
      const actual = await runPreCommit(
        ["scripts/harness/phase-dependency-model/foo.ts", "scripts/harness/config-foundation/bar.ts"],
        deps,
      );
      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("Commit blocked");
    });
  });

  context("対象外拡張子", () => {
    // UT-PC-08
    it(".ts / .md 以外（.json / .yml 等）は両 UseCase に渡されない", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(
        [
          "scripts/harness/foo.ts",
          "phasegate.config.json",
          "docs/product/construction/foo/logical_design.md",
          "biome.json",
        ],
        deps,
      );
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(deps.l2Spy).toHaveBeenCalledWith(expect.objectContaining({ targetPaths: ["scripts/harness/foo.ts"] }));
      expect(deps.metadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePaths: ["docs/product/construction/foo/logical_design.md"],
        }),
      );
    });

    // UT-PC-20
    it("metadata対象外の .md は metadata handler に渡されない", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["skills/quick-implementor/SKILL.md", "docs/guide/installation.md"], deps);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(deps.metadataSpy).not.toHaveBeenCalled();
    });
  });

  context("Work-Item trailer 検証 (ISSUE-026 Phase D-3)", () => {
    // UT-PC-17
    it("WI配下のdocumentがstagedでcommit messageにtrailerが無い場合、exitCode 1になる", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["docs/inception/_cross/WI-026/description.md"], deps, {
        commitMessage: "fix: update WI document",
      });
      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("Work-Item trailer");
      expect(actual.stdout).toContain("Work-Item: WI-XXX");
      expect(actual.stdout).toContain("Commit blocked");
    });

    // UT-PC-18
    it("WI配下のdocumentがstagedでcommit messageにtrailerがある場合、通過する", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["docs/inception/_cross/WI-026/description.md"], deps, {
        commitMessage: "fix: update WI document\n\nWork-Item: WI-026",
      });
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Work-Item trailer");
      expect(actual.stdout).toContain("All checks passed");
    });

    // UT-PC-19
    it("WI配下以外の変更ではcommit messageのtrailerを要求しない", async () => {
      // Arrange
      const deps = buildDeps();
      // Act
      const actual = await runPreCommit(["docs/product/construction/harness-api/logical_design.md"], deps, {
        commitMessage: "docs: update logical design",
      });
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).not.toContain("Work-Item trailer");
    });
  });

  context("design change declaration (WI-305)", () => {
    it("World disabledのskipでは従来出力を維持すること", async () => {
      // Arrange
      const deps = buildDeps({
        designResult: { status: "skipped", checkedFragmentCount: 0, findings: [], warningCodes: [] },
      });

      // Act
      const actual = await runPreCommit(["docs/product/construction/agent-integration/logical_design.md"], deps, {
        commitMessage: "docs: change design",
      });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).not.toContain("Design change declaration");
    });

    it("pin済みfragmentの宣言不一致をnon-bypassableでblockすること", async () => {
      // Arrange
      const deps = buildDeps({
        designResult: {
          status: "failed",
          checkedFragmentCount: 1,
          findings: [
            {
              code: "design-change-declaration-missing",
              path: "docs/product/construction/agent-integration/logical_design.md",
              declaredKey: "agent-integration.design-change-declaration",
              expectedWorkItemIds: ["WI-305"],
              constraintIds: ["pgw:v1:constraint:design-change"],
            },
          ],
          warningCodes: [],
        },
      });

      // Act
      const actual = await runPreCommit(["docs/product/construction/agent-integration/logical_design.md"], deps, {
        commitMessage: "docs: change design\n\nWork-Item: WI-999",
      });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("design-change-declaration-missing");
      expect(actual.blockerClasses).toContainEqual(
        expect.objectContaining({ code: "design-change-declaration", bypassable: false }),
      );
    });

    it("matching declarationをpassとして表示すること", async () => {
      // Arrange
      const deps = buildDeps({
        designResult: { status: "passed", checkedFragmentCount: 1, findings: [], warningCodes: [] },
      });

      // Act
      const actual = await runPreCommit(["docs/product/construction/agent-integration/logical_design.md"], deps, {
        commitMessage: "docs: change design\n\nWork-Item: WI-305",
      });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Design change declaration");
      expect(actual.stdout).toContain("1 pinned fragment");
    });

    it("observation不能をwarningとしてfail-openすること", async () => {
      // Arrange
      const deps = buildDeps({
        designResult: {
          status: "warning",
          checkedFragmentCount: 0,
          findings: [],
          warningCodes: ["constraint-observation-unavailable"],
        },
      });

      // Act
      const actual = await runPreCommit(["docs/product/construction/agent-integration/logical_design.md"], deps, {
        commitMessage: "docs: change design",
      });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("constraint-observation-unavailable");
      expect(actual.stdout).toContain("local fast-path");
    });
  });

  context("bypass trailer 検証 (WI-141)", () => {
    it("bypass trailer が一部だけ存在する場合、必須 trailer 欠落として失敗すること", async () => {
      // Arrange
      const commitMessage = "fix: bypass\n\nBypass-Reason: known phase-gate debt";

      // Act
      const actual = await validateBypassTrailers(commitMessage);

      // Assert
      expect(actual.hasAnyBypassTrailer).toBe(true);
      expect(actual.complete).toBe(false);
      expect(actual.errors).toContain("Missing required bypass trailer: Bypass-Evidence");
      expect(actual.errors).toContain("Missing required bypass trailer: Bypass-Owner");
    });

    it("command evidence を含む完全な bypass trailer は通過すること", async () => {
      // Arrange
      const commitMessage = [
        "fix: bypass",
        "",
        "Bypass-Reason: known phase-gate debt",
        "Bypass-Evidence: command: pnpm test",
        "Bypass-Owner: platform",
      ].join("\n");

      // Act
      const actual = await validateBypassTrailers(commitMessage);

      // Assert
      expect(actual.complete).toBe(true);
      expect(actual.errors).toEqual([]);
    });

    it("存在しない report evidence は失敗すること", async () => {
      // Arrange
      const commitMessage = [
        "fix: bypass",
        "",
        "Bypass-Reason: known phase-gate debt",
        "Bypass-Evidence: report: missing/report.json",
        "Bypass-Owner: platform",
      ].join("\n");

      // Act
      const actual = await validateBypassTrailers(commitMessage);

      // Assert
      expect(actual.complete).toBe(false);
      expect(actual.errors).toContain("Bypass-Evidence report does not exist: missing/report.json");
    });

    it("非 bypass 可能 blocker が残る場合、完全な bypass trailer があっても拒否すること", async () => {
      // Arrange
      const deps = buildDeps({
        l2Result: [failingContract("L2-003", "test-quality failed")],
      });
      const commitMessage = [
        "fix: bypass",
        "",
        "Bypass-Reason: urgent false positive",
        "Bypass-Evidence: command: pnpm test",
        "Bypass-Owner: platform",
      ].join("\n");

      // Act
      const actual = await runPreCommit(["scripts/harness/foo.ts"], deps, {
        commitMessage,
        allowConditionalBypass: true,
      });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("Bypass rejected for non-bypassable blocker");
    });

    it("条件付き blocker だけなら完全な bypass trailer で通過すること", async () => {
      // Arrange
      const deps = buildDeps({
        l2Result: [failingContract("L2-001", "phase-gate known debt")],
      });
      const commitMessage = [
        "fix: bypass",
        "",
        "Bypass-Reason: known phase-gate debt",
        "Bypass-Evidence: command: pnpm test",
        "Bypass-Owner: platform",
      ].join("\n");

      // Act
      const actual = await runPreCommit(["scripts/harness/foo.ts"], deps, {
        commitMessage,
        allowConditionalBypass: true,
      });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Conditional bypass evidence is complete");
    });

    it("report evidence が存在する場合は通過すること", async () => {
      // Arrange
      const workDir = await mkdtemp(path.join(tmpdir(), "phasegate-bypass-"));
      await writeFile(path.join(workDir, "report.json"), "{}", "utf-8");
      const commitMessage = [
        "fix: bypass",
        "",
        "Bypass-Reason: known phase-gate debt",
        "Bypass-Evidence: report: report.json",
        "Bypass-Owner: platform",
      ].join("\n");

      // Act
      const actual = await validateBypassTrailers(commitMessage, workDir);

      // Assert
      expect(actual.complete).toBe(true);
    });
  });

  context("bypass:audit range 検証 (WI-141)", () => {
    it("gate failure があり bypass trailer が無い場合、missing bypass evidence として失敗すること", async () => {
      // Arrange
      const deps = buildDeps({
        l2Result: [failingContract("L2-001", "phase-gate known debt")],
      });

      // Act
      const actual = await runBypassAudit(deps, {
        baseRef: "main",
        headRef: "HEAD",
        changedFiles: ["scripts/harness/foo.ts"],
        commitMessages: ["fix: bypass without trailers"],
      });

      // Assert
      expect(actual.exitCode).toBe(1);
      expect(actual.stdout).toContain("Gate failure requires complete bypass trailers");
    });

    it("条件付き blocker と完全な bypass trailer の場合は通過すること", async () => {
      // Arrange
      const deps = buildDeps({
        l2Result: [failingContract("L2-001", "phase-gate known debt")],
      });
      const commitMessage = [
        "fix: bypass",
        "",
        "Bypass-Reason: known phase-gate debt",
        "Bypass-Evidence: command: pnpm test",
        "Bypass-Owner: platform",
      ].join("\n");

      // Act
      const actual = await runBypassAudit(deps, {
        baseRef: "main",
        headRef: "HEAD",
        changedFiles: ["scripts/harness/foo.ts"],
        commitMessages: [commitMessage],
      });

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Bypass audit");
    });
  });
});
