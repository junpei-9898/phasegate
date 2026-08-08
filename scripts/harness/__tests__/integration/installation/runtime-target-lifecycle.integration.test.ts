// @unit installation
// @layer integration
// @story H11-01
// @work-item-id WI-385

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallationModule } from "../../../installation/composition-root.js";
import type { AgentTarget } from "../../../installation/domain/agent-target.js";
import { target } from "../../helpers/test-helpers.js";

let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-runtime-target-"));
  return projectRoot;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeProjectFile(root: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = join(root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

async function install(root: string, agent: AgentTarget) {
  return createInstallationModule().installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: "0.338.0",
    dryRun: false,
    apply: true,
    force: false,
    json: true,
    agent,
    includeHusky: false,
    includeCi: false,
  });
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("runtime target install lifecycle", () => {
  describe("runtime ごとの managed surface を配布する", () => {
    it("Grok選択はClaude互換settingsとskillsとAGENTSを配布すること", async () => {
      // Arrange
      const root = await createProjectRoot();

      // Act
      const actual = await install(root, "grok");

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await exists(join(root, ".claude/settings.json"))).toBe(true);
      expect(await exists(join(root, "AGENTS.md"))).toBe(true);
      expect(await exists(join(root, "CLAUDE.md"))).toBe(false);
      expect(await exists(join(root, ".grok"))).toBe(false);
      expect(await exists(join(root, ".claude/skills"))).toBe(true);
      expect(await exists(join(root, "skills/phasegate-config-doctor/SKILL.md"))).toBe(true);
      expect(await exists(join(root, ".codex/hooks.json"))).toBe(false);
    });

    it("反重力選択はnamed mapとAGENTSを配布して利用者keyを保持すること", async () => {
      // Arrange
      const root = await createProjectRoot();
      await writeProjectFile(root, ".agents/hooks.json", `${JSON.stringify({ "user-hook": { enabled: true } })}\n`);

      // Act
      const actual = await install(root, "antigravity");

      // Assert
      const hooks = JSON.parse(await readFile(join(root, ".agents/hooks.json"), "utf8"));
      expect(actual.exitCode).toBe(0);
      expect(hooks["user-hook"]).toEqual({ enabled: true });
      expect(hooks["phasegate-gate"].PreToolUse[0]).toMatchObject({
        matcher: expect.stringContaining("write_to_file"),
        hooks: [{ command: "npx phasegate hook pre-tool-use", timeout: 30, type: "command" }],
      });
      expect(await exists(join(root, "AGENTS.md"))).toBe(true);
      expect(await exists(join(root, ".agents/skills"))).toBe(true);
      expect(await exists(join(root, "skills/phasegate-config-doctor/SKILL.md"))).toBe(true);
      expect(await exists(join(root, ".claude/settings.json"))).toBe(false);
    });

    it("全選択は三runtime hookを一度ずつ配布すること", async () => {
      // Arrange
      const root = await createProjectRoot();

      // Act
      const actual = await install(root, "all");

      // Assert
      expect(actual.exitCode).toBe(0);
      expect(await exists(join(root, ".claude/settings.json"))).toBe(true);
      expect(await exists(join(root, ".codex/hooks.json"))).toBe(true);
      expect(await exists(join(root, ".agents/hooks.json"))).toBe(true);
      expect(await exists(join(root, ".grok"))).toBe(false);
    });
  });

  describe("Antigravity named map の upgrade と cleanup を行う", () => {
    it("reconcileは利用者keyを保持して古いphasegate定義だけを更新すること", async () => {
      // Arrange
      const root = await createProjectRoot();
      await writeProjectFile(root, ".agents/hooks.json", `${JSON.stringify({ "user-hook": { enabled: true } })}\n`);
      await install(root, "antigravity");
      const hooksPath = join(root, ".agents/hooks.json");
      const drifted = JSON.parse(await readFile(hooksPath, "utf8"));
      drifted["phasegate-gate"] = { stale: true };
      await writeFile(hooksPath, `${JSON.stringify(drifted, null, 2)}\n`, "utf8");

      // Act
      const actual = await createInstallationModule().reconcileHandler.execute({
        projectRoot: root,
        harnessRoot: resolve("."),
        phasegateVersion: "0.338.0",
        dryRun: false,
        apply: true,
        force: true,
        json: true,
      });

      // Assert
      const hooks = JSON.parse(await readFile(hooksPath, "utf8"));
      expect(actual.exitCode).toBe(0);
      expect(hooks["user-hook"]).toEqual({ enabled: true });
      expect(hooks["phasegate-gate"].PreToolUse[0].hooks[0].timeout).toBe(30);
    });

    it("uninstallはmerged mapからphasegate keyだけを除去すること", async () => {
      // Arrange
      const root = await createProjectRoot();
      await writeProjectFile(root, ".agents/hooks.json", `${JSON.stringify({ "user-hook": { enabled: true } })}\n`);
      await install(root, "antigravity");

      // Act
      const actual = await createInstallationModule().uninstallHandler.execute({
        projectRoot: root,
        harnessRoot: resolve("."),
        dryRun: false,
        apply: true,
        force: true,
        json: true,
      });

      // Assert
      const hooks = JSON.parse(await readFile(join(root, ".agents/hooks.json"), "utf8"));
      expect(actual.exitCode).toBe(0);
      expect(hooks).toEqual({ "user-hook": { enabled: true } });
    });
  });
});
