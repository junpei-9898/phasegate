// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145
// @work-item-id WI-210
// @work-item-id WI-215
// @work-item-id WI-216
// @work-item-id WI-340
// @work-item-id WI-343
// @work-item-id WI-384

import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { CiWorkflowMissingCheck } from "../../../../installation/application/checks/ci-workflow-missing-check.js";
import { ClaudeContextMissingCheck } from "../../../../installation/application/checks/claude-context-missing-check.js";
import { ClaudeHookMissingCheck } from "../../../../installation/application/checks/claude-hook-missing-check.js";
import { ClaudeSkillsSymlinkCheck } from "../../../../installation/application/checks/claude-skills-symlink-check.js";
import { CodexContextMissingCheck } from "../../../../installation/application/checks/codex-context-missing-check.js";
import { CodexHookMissingCheck } from "../../../../installation/application/checks/codex-hook-missing-check.js";
import { CodexSkillsSymlinkCheck } from "../../../../installation/application/checks/codex-skills-symlink-check.js";
import { ConfigStatusCheck } from "../../../../installation/application/checks/config-status-check.js";
import { HuskyCommitMsgMissingCheck } from "../../../../installation/application/checks/husky-commit-msg-missing-check.js";
import { HuskyPreCommitMissingCheck } from "../../../../installation/application/checks/husky-pre-commit-missing-check.js";
import { HuskyPrePushMissingCheck } from "../../../../installation/application/checks/husky-pre-push-missing-check.js";
import { PackageJsonDevdepMissingCheck } from "../../../../installation/application/checks/package-json-devdep-missing-check.js";
import type { ConfigStatusProbePort } from "../../../../installation/application/ports/config-status-probe-port.js";
import type { FileInspectorPort } from "../../../../installation/application/ports/file-inspector-port.js";
import type { ConfigStatusProbeResult } from "../../../../installation/domain/config-status.js";
import { getSkillsForSet } from "../../../../setup/skill-deployer.js";
import { context, target } from "../../../helpers/test-helpers.js";
import { createInspector, projectFile } from "./check-test-helpers.js";

function currentCodexHooks(overrides: { preMatcher?: string; postMatcher?: string } = {}) {
  return {
    hooks: {
      PreToolUse: [{
        matcher: overrides.preMatcher ?? "Bash|apply_patch",
        hooks: [{ command: "npx phasegate hook pre-tool-use" }],
      }],
      PostToolUse: [{
        matcher: overrides.postMatcher ?? "Bash|apply_patch",
        hooks: [{ command: "npx phasegate hook post-tool-use" }],
      }],
    },
  };
}

target("doctor heuristic checks", () => {
  describe("agent context checks", () => {
    it("Claude の runtime-visible .claude/CLAUDE.md がある場合は finding を返さないこと", async () => {
      const inspector = createTextInspector(
        ".claude/CLAUDE.md",
        "<!-- phasegate:managed-section:start -->\nPhaseGate\n",
      );

      const actual = await new ClaudeContextMissingCheck().run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("ルート CLAUDE.md の managed block に Phasegate 表記がある場合は finding を返さないこと", async () => {
      // Arrange
      const inspector = createTextInspector(
        "CLAUDE.md",
        "<!-- phasegate:managed-section:start -->\nPhasegate\n",
      );
      const sut = new ClaudeContextMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", inspector, { installationMode: "project" });

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("project mode で Claude context がない場合は finding の target にルート CLAUDE.md を返すこと", async () => {
      // Arrange
      const sut = new ClaudeContextMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createInspector(), { installationMode: "project" });

      // Assert
      expect(actual?.target).toBe("CLAUDE.md");
    });

    it("personal mode で Claude context がない場合は finding の target に .claude/CLAUDE.md を返すこと", async () => {
      // Arrange
      const sut = new ClaudeContextMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createInspector(), { installationMode: "personal" });

      // Assert
      expect(actual?.target).toBe(".claude/CLAUDE.md");
    });

    it("Claude legacy .claude/CLAUDE.local.md だけの場合は red を返すこと", async () => {
      const inspector = createTextInspector(".claude/CLAUDE.local.md", "PhaseGate\n");

      const actual = await new ClaudeContextMissingCheck().run("/tmp/project", inspector);

      expect(actual).toMatchObject({ checkId: "claude-context-missing", severity: "red", repairMode: "mechanical" });
    });

    it("Codex の runtime-visible AGENTS.md がある場合は finding を返さないこと", async () => {
      const inspector = createTextInspector("AGENTS.md", "<!-- phasegate:managed-section:start -->\nPhaseGate\n");

      const actual = await new CodexContextMissingCheck().run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("Codex legacy .codex/AGENTS.local.md だけの場合は red を返すこと", async () => {
      const inspector = createTextInspector(".codex/AGENTS.local.md", "PhaseGate\n");

      const actual = await new CodexContextMissingCheck().run("/tmp/project", inspector);

      expect(actual).toMatchObject({ checkId: "codex-context-missing", severity: "red", repairMode: "mechanical" });
    });

    it("Codex team AGENTS.md に PhaseGate managed section がない場合は manual red を返すこと", async () => {
      const inspector = createTextInspector("AGENTS.md", "team guidance\n");

      const actual = await new CodexContextMissingCheck().run("/tmp/project", inspector);

      expect(actual).toMatchObject({ checkId: "codex-context-missing", severity: "red", repairMode: "manual" });
    });
  });

  describe("ClaudeHookMissingCheck", () => {
    it("missing settings は mechanical red を返すこと", async () => {
      const sut = new ClaudeHookMissingCheck();

      const actual = await sut.run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "claude-hook-missing", severity: "red", repairMode: "mechanical" });
    });
  });

  describe("CodexHookMissingCheck", () => {
    it("PreToolUse と PostToolUse が canonical matcher を持つ場合は finding を返さないこと", async () => {
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(currentCodexHooks()),
      });
      const sut = new CodexHookMissingCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("丸括弧付き matcher が Bash と apply_patch を含む場合も finding を返さないこと", async () => {
      // Arrange
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(currentCodexHooks({
          preMatcher: "^(Bash|apply_patch)$",
          postMatcher: "(Bash|apply_patch)",
        })),
      });

      // Act
      const actual = await new CodexHookMissingCheck().run("/tmp/project", inspector);

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("phasegate command があっても Bash-only matcher の場合は apply_patch 欠落の red を返すこと", async () => {
      // Arrange
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(currentCodexHooks({ preMatcher: "Bash", postMatcher: "Bash" })),
      });
      const sut = new CodexHookMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", inspector);

      // Assert
      expect(actual).toMatchObject({ checkId: "codex-hook-missing", severity: "red", repairMode: "mechanical" });
      expect(actual?.message).toContain("PreToolUse:apply_patch");
      expect(actual?.message).toContain("PostToolUse:apply_patch");
      expect(actual?.repairHint).toContain("phasegate reconcile --apply");
      expect(actual?.repairHint).toContain("/hooks");
    });

    it("PreToolUse だけ canonical matcher の場合は PostToolUse 欠落の red を返すこと", async () => {
      // Arrange
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(currentCodexHooks({ postMatcher: "Bash" })),
      });

      // Act
      const actual = await new CodexHookMissingCheck().run("/tmp/project", inspector);

      // Assert
      expect(actual?.message).toContain("PostToolUse:apply_patch");
      expect(actual?.message).not.toContain("PreToolUse:apply_patch");
    });

    it("PostToolUse だけ canonical matcher の場合は PreToolUse 欠落の red を返すこと", async () => {
      // Arrange
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(currentCodexHooks({ preMatcher: "Bash" })),
      });

      // Act
      const actual = await new CodexHookMissingCheck().run("/tmp/project", inspector);

      // Assert
      expect(actual?.message).toContain("PreToolUse:apply_patch");
      expect(actual?.message).not.toContain("PostToolUse:apply_patch");
    });

    it("apply_patch 文字列が別 entry にあるだけでは phasegate entry の matcher 充足とみなさないこと", async () => {
      // Arrange
      const config = currentCodexHooks({ preMatcher: "Bash" });
      config.hooks.PreToolUse.push({ matcher: "apply_patch", hooks: [{ command: "custom hook apply_patch" }] });
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(config),
      });

      // Act
      const actual = await new CodexHookMissingCheck().run("/tmp/project", inspector);

      // Assert
      expect(actual?.message).toContain("PreToolUse:apply_patch");
      expect(actual?.repairMode).toBe("ai-assisted");
    });

    context("JSON として読めない場合", () => {
      it("manual red を返すこと", async () => {
        const inspector = createInspector({
          exists: vi.fn().mockResolvedValue(true),
          readJson: vi.fn().mockResolvedValue(null),
        });
        const sut = new CodexHookMissingCheck();

        const actual = await sut.run("/tmp/project", inspector);

        expect(actual).toMatchObject({ checkId: "codex-hook-missing", severity: "red", repairMode: "manual" });
      });
    });

    it("既存 hook があるが phasegate hook がない場合は ai-assisted red を返すこと", async () => {
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue({ hooks: [{ command: "custom hook" }] }),
      });
      const sut = new CodexHookMissingCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toMatchObject({ checkId: "codex-hook-missing", repairMode: "ai-assisted" });
    });

    it("user hook と stale phasegate entry が共存する場合は ai-assisted red を返すこと", async () => {
      // Arrange
      const config = currentCodexHooks({ postMatcher: "Bash" });
      config.hooks.PostToolUse.push({ matcher: "apply_patch", hooks: [{ command: "custom post hook" }] });
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue(config),
      });

      // Act
      const actual = await new CodexHookMissingCheck().run("/tmp/project", inspector);

      // Assert
      expect(actual).toMatchObject({ severity: "red", repairMode: "ai-assisted" });
    });
  });

  describe("Husky の pre-commit hook を検査する", () => {
    it("実テンプレートから lint の案内行を除いても finding を返さないこと", async () => {
      // Arrange
      const templateUrl = new URL("../../../../../../docs/templates/hooks/pre-commit", import.meta.url);
      const template = await readFile(templateUrl, "utf8");
      const content = template
        .split("\n")
        .filter((line) => !line.includes("詳細: npx phasegate lint"))
        .join("\n");
      const sut = new HuskyPreCommitMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", content));

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("phasegate pre-commit を含む場合は finding を返さないこと", async () => {
      // Arrange
      const content = "npx phasegate pre-commit\n";
      const sut = new HuskyPreCommitMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", content));

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("PHASEGATE_CMD lint を含む場合は finding を返さないこと", async () => {
      // Arrange
      const content = 'PHASEGATE_CMD="npx phasegate"\n$PHASEGATE_CMD lint\n';
      const sut = new HuskyPreCommitMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", content));

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("HARNESS_CMD lint を含む場合は finding を返さないこと", async () => {
      // Arrange
      const content = 'HARNESS_CMD="npx tsx scripts/harness/main.ts"\n$HARNESS_CMD lint\n';
      const sut = new HuskyPreCommitMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", content));

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("phasegate 系コマンドを含まない場合は ai-assisted red を返すこと", async () => {
      // Arrange
      const sut = new HuskyPreCommitMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", "pnpm test\n"));

      // Assert
      expect(actual).toMatchObject({ checkId: "husky-pre-commit-missing", severity: "red", repairMode: "ai-assisted" });
    });

    it("空ファイルの場合は mechanical red を返すこと", async () => {
      // Arrange
      const sut = new HuskyPreCommitMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", ""));

      // Assert
      expect(actual).toMatchObject({ checkId: "husky-pre-commit-missing", severity: "red", repairMode: "mechanical" });
    });
  });

  describe("HuskyCommitMsgMissingCheck", () => {
    it("phasegate commit-msg command がある場合は finding を返さないこと", async () => {
      const sut = new HuskyCommitMsgMissingCheck();

      const actual = await sut.run(
        "/tmp/project",
        createTextInspector(".husky/commit-msg", 'npx phasegate commit-msg "$1"\n'),
      );

      expect(actual).toStrictEqual(null);
    });

    it("missing の場合は mechanical red を返すこと", async () => {
      const sut = new HuskyCommitMsgMissingCheck();

      const actual = await sut.run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "husky-commit-msg-missing", severity: "red", repairMode: "mechanical" });
    });
  });

  describe("HuskyPrePushMissingCheck", () => {
    it("phasegate bypass:audit command がある場合は finding を返さないこと", async () => {
      const sut = new HuskyPrePushMissingCheck();

      const actual = await sut.run(
        "/tmp/project",
        createTextInspector(".husky/pre-push", "npx phasegate bypass:audit --base origin/main\n"),
      );

      expect(actual).toStrictEqual(null);
    });

    it("missing の場合は mechanical warn を返すこと", async () => {
      const sut = new HuskyPrePushMissingCheck();

      const actual = await sut.run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "husky-pre-push-missing", severity: "warn", repairMode: "mechanical" });
    });
  });

  describe("CiWorkflowMissingCheck", () => {
    it("phasegate 系 workflow がある場合は finding を返さないこと", async () => {
      const inspector = createInspector({
        listFiles: vi.fn().mockResolvedValue([projectFile(".github/workflows/phasegate-aidlc-gate.yml")]),
      });
      const sut = new CiWorkflowMissingCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("workflow がない場合は manual warn を返すこと", async () => {
      const sut = new CiWorkflowMissingCheck();

      const actual = await sut.run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "ci-workflow-missing", severity: "warn", repairMode: "manual" });
    });
  });

  describe("PackageJsonDevdepMissingCheck", () => {
    it("devDependencies.phasegate がある場合は finding を返さないこと", async () => {
      const inspector = createInspector({
        readJson: vi.fn().mockResolvedValue({ devDependencies: { phasegate: "0.145.0" } }),
      });
      const sut = new PackageJsonDevdepMissingCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("self package phasegate は finding を返さないこと", async () => {
      const inspector = createInspector({
        readJson: vi.fn().mockResolvedValue({ name: "phasegate", devDependencies: {} }),
      });
      const sut = new PackageJsonDevdepMissingCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("package.json がない場合は mechanical red を返すこと", async () => {
      const sut = new PackageJsonDevdepMissingCheck();

      const actual = await sut.run("/tmp/project", createInspector());

      expect(actual).toMatchObject({
        checkId: "package-json-devdep-missing",
        severity: "red",
        repairMode: "mechanical",
      });
    });
  });

  describe("skills symlink checks", () => {
    it("Claude/Codex の skills symlink が ../skills を指す場合は finding を返さないこと", async () => {
      const inspector = createInspector({
        readSymlink: vi.fn().mockResolvedValue("../skills"),
        readText: vi.fn().mockResolvedValue(JSON.stringify({ version: "0.145.0", skillSet: "all" })),
        listFiles: vi
          .fn()
          .mockResolvedValue(getSkillsForSet("all").map((skill) => `/tmp/project/skills/${skill}/SKILL.md`)),
      });

      const actual = [
        await new ClaudeSkillsSymlinkCheck().run("/tmp/project", inspector),
        await new CodexSkillsSymlinkCheck().run("/tmp/project", inspector),
      ];

      expect(actual).toStrictEqual([null, null]);
    });

    it("skills 以外を指す symlink は manual red を返すこと", async () => {
      const inspector = createInspector({ readSymlink: vi.fn().mockResolvedValue("../other-skills") });

      const actual = await new ClaudeSkillsSymlinkCheck().run("/tmp/project", inspector);

      expect(actual).toMatchObject({ checkId: "claude-skills-symlink", severity: "red", repairMode: "manual" });
    });

    it("valid symlink でも link target が空の場合は mechanical red を返すこと", async () => {
      const inspector = createInspector({
        readSymlink: vi.fn().mockResolvedValue("../skills"),
        listFiles: vi.fn().mockResolvedValue([]),
      });

      const actual = await new ClaudeSkillsSymlinkCheck().run("/tmp/project", inspector);

      expect(actual).toMatchObject({ checkId: "claude-skills-symlink", severity: "red", repairMode: "mechanical" });
    });

    it("personal install の real skills directory は finding を返さないこと", async () => {
      const inspector = createInspector({
        readSymlink: vi.fn().mockResolvedValue(null),
        readText: vi.fn().mockResolvedValue(JSON.stringify({ version: "0.145.0", skillSet: "all" })),
        listFiles: vi
          .fn()
          .mockResolvedValue(getSkillsForSet("all").map((skill) => `/tmp/project/.codex/skills/${skill}/SKILL.md`)),
      });

      const actual = await new CodexSkillsSymlinkCheck().run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("missing symlink は mechanical red を返すこと", async () => {
      const actual = await new CodexSkillsSymlinkCheck().run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "codex-skills-symlink", severity: "red", repairMode: "mechanical" });
    });
  });

  describe("config-status check (WI-330)", () => {
    it("config-status probe が valid の場合は finding を返さないこと", async () => {
      // Arrange
      const sut = new ConfigStatusCheck(createConfigStatusProbe({ status: "valid" }));

      // Act
      const actual = await sut.run("/tmp/project", createInspector());

      // Assert
      expect(actual).toStrictEqual(null);
    });

    it("config-status probe が missing の場合は phasegate init を案内する mechanical warn を返すこと", async () => {
      // Arrange
      const sut = new ConfigStatusCheck(createConfigStatusProbe({ status: "missing" }));

      // Act
      const actual = await sut.run("/tmp/project", createInspector());

      // Assert
      expect(actual).toMatchObject({
        checkId: "config-status",
        severity: "warn",
        repairMode: "mechanical",
        repairHint: "npx phasegate init",
      });
      expect(actual?.message).toContain("fail-open");
    });

    it("config-status probe が invalid-json の場合は詳細付き manual red を返すこと", async () => {
      // Arrange
      const sut = new ConfigStatusCheck(
        createConfigStatusProbe({ status: "invalid-json", detail: "Unexpected token b in JSON" }),
      );

      // Act
      const actual = await sut.run("/tmp/project", createInspector());

      // Assert
      expect(actual).toMatchObject({ checkId: "config-status", severity: "red", repairMode: "manual" });
      expect(actual?.message).toContain("JSON 構文エラー");
      expect(actual?.message).toContain("Unexpected token b in JSON");
    });

    it("config-status probe が invalid-schema の場合はスキーマ違反詳細付き manual red を返すこと", async () => {
      // Arrange
      const sut = new ConfigStatusCheck(
        createConfigStatusProbe({
          status: "invalid-schema",
          detail: "設定が不正です: [L1-001] /layers/L3/coverageThreshold",
        }),
      );

      // Act
      const actual = await sut.run("/tmp/project", createInspector());

      // Assert
      expect(actual).toMatchObject({ checkId: "config-status", severity: "red", repairMode: "manual" });
      expect(actual?.message).toContain("スキーマ違反");
      expect(actual?.message).toContain("/layers/L3/coverageThreshold");
    });
  });
});

function createConfigStatusProbe(overrides: Partial<ConfigStatusProbeResult>): ConfigStatusProbePort {
  const result: ConfigStatusProbeResult = {
    status: "valid",
    configPath: "phasegate.config.json",
    detail: null,
    ...overrides,
  };
  return { probe: vi.fn().mockResolvedValue(result) };
}

function createTextInspector(relativePath: string, content: string): FileInspectorPort {
  return createInspector({
    readText: vi.fn(async (path: string) => (path === projectFile(relativePath) ? content : null)),
  });
}
