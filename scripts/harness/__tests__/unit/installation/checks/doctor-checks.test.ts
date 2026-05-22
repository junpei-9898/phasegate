// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145
// @work-item-id WI-210

import { describe, expect, it, vi } from "vitest";
import { ClaudeHookMissingCheck } from "../../../../installation/application/checks/claude-hook-missing-check.js";
import { ClaudeSkillsSymlinkCheck } from "../../../../installation/application/checks/claude-skills-symlink-check.js";
import { CiWorkflowMissingCheck } from "../../../../installation/application/checks/ci-workflow-missing-check.js";
import { CodexHookMissingCheck } from "../../../../installation/application/checks/codex-hook-missing-check.js";
import { CodexSkillsSymlinkCheck } from "../../../../installation/application/checks/codex-skills-symlink-check.js";
import { HuskyCommitMsgMissingCheck } from "../../../../installation/application/checks/husky-commit-msg-missing-check.js";
import { HuskyPreCommitMissingCheck } from "../../../../installation/application/checks/husky-pre-commit-missing-check.js";
import { HuskyPrePushMissingCheck } from "../../../../installation/application/checks/husky-pre-push-missing-check.js";
import { PackageJsonDevdepMissingCheck } from "../../../../installation/application/checks/package-json-devdep-missing-check.js";
import type { FileInspectorPort } from "../../../../installation/application/ports/file-inspector-port.js";
import { context, target } from "../../../helpers/test-helpers.js";
import { createInspector, projectFile } from "./check-test-helpers.js";

target("doctor heuristic checks", () => {
  describe("ClaudeHookMissingCheck", () => {
    it("missing settings は mechanical red を返すこと", async () => {
      const sut = new ClaudeHookMissingCheck();

      const actual = await sut.run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "claude-hook-missing", severity: "red", repairMode: "mechanical" });
    });
  });

  describe("CodexHookMissingCheck", () => {
    it("phasegate hook が存在する場合は finding を返さないこと", async () => {
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue({ hooks: [{ command: "npx phasegate hook stop" }] }),
      });
      const sut = new CodexHookMissingCheck();

      const actual = await sut.run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
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
  });

  describe("HuskyPreCommitMissingCheck", () => {
    it("標準 template の HARNESS_CMD lint/check-phase-gate を検出すること", async () => {
      const content = [
        'HARNESS_CMD="npx tsx scripts/harness/main.ts"',
        "$HARNESS_CMD lint",
        "$HARNESS_CMD check-phase-gate",
      ].join("\n");
      const sut = new HuskyPreCommitMissingCheck();

      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", content));

      expect(actual).toStrictEqual(null);
    });

    it("既存 custom hook に phasegate command がない場合は ai-assisted red を返すこと", async () => {
      const sut = new HuskyPreCommitMissingCheck();

      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-commit", "pnpm test\n"));

      expect(actual).toMatchObject({ checkId: "husky-pre-commit-missing", severity: "red", repairMode: "ai-assisted" });
    });
  });

  describe("HuskyCommitMsgMissingCheck", () => {
    it("phasegate commit-msg command がある場合は finding を返さないこと", async () => {
      const sut = new HuskyCommitMsgMissingCheck();

      const actual = await sut.run("/tmp/project", createTextInspector(".husky/commit-msg", 'npx phasegate commit-msg "$1"\n'));

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

      const actual = await sut.run("/tmp/project", createTextInspector(".husky/pre-push", "npx phasegate bypass:audit --base origin/main\n"));

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

      expect(actual).toMatchObject({ checkId: "package-json-devdep-missing", severity: "red", repairMode: "mechanical" });
    });
  });

  describe("skills symlink checks", () => {
    it("Claude/Codex の skills symlink が ../skills を指す場合は finding を返さないこと", async () => {
      const inspector = createInspector({
        readSymlink: vi.fn().mockResolvedValue("../skills"),
        listFiles: vi.fn().mockResolvedValue(["/tmp/project/skills/phasegate-toolkit-guide/SKILL.md"]),
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
        listFiles: vi.fn().mockResolvedValue(["/tmp/project/.codex/skills/.harness-version"]),
      });

      const actual = await new CodexSkillsSymlinkCheck().run("/tmp/project", inspector);

      expect(actual).toStrictEqual(null);
    });

    it("missing symlink は mechanical red を返すこと", async () => {
      const actual = await new CodexSkillsSymlinkCheck().run("/tmp/project", createInspector());

      expect(actual).toMatchObject({ checkId: "codex-skills-symlink", severity: "red", repairMode: "mechanical" });
    });
  });
});

function createTextInspector(relativePath: string, content: string): FileInspectorPort {
  return createInspector({
    readText: vi.fn(async (path: string) => (path === projectFile(relativePath) ? content : null)),
  });
}
