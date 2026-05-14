// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-146
// @work-item-id WI-174
// @work-item-id WI-182
// @work-item-id WI-183

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallationModule } from "../../../installation/composition-root.js";
import { target } from "../../helpers/test-helpers.js";

let projectRoot: string | null = null;

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-install-"));
  return projectRoot;
}

async function writeProjectFile(root: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = join(root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

async function runInstall(root: string, options: { apply?: boolean; force?: boolean } = {}) {
  const mod = createInstallationModule();
  return mod.installHandler.execute({
    projectRoot: root,
    harnessRoot: resolve("."),
    phasegateVersion: "0.145.1",
    dryRun: !options.apply,
    apply: options.apply ?? false,
    force: options.force ?? false,
    json: true,
  });
}

async function installAndReadJsonMerge(root: string) {
  const result = await runInstall(root, { apply: true });
  return {
    result,
    claude: await readFile(join(root, ".claude/settings.json"), "utf8"),
    codex: await readFile(join(root, ".codex/hooks.json"), "utf8"),
    manifest: JSON.parse(await readFile(join(root, ".phasegate", "manifest.json"), "utf8")) as {
      entries: Array<{ path: string; mode: string }>;
    },
  };
}

async function arrangeJsonMergeAndInstall() {
  const root = await createProjectRoot();
  await writeProjectFile(
    root,
    ".claude/settings.json",
    JSON.stringify({ hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "custom stop" }] }] } }),
  );
  await writeProjectFile(
    root,
    ".codex/hooks.json",
    JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "custom" }] }] } }),
  );
  return installAndReadJsonMerge(root);
}

async function installTwiceAndReadIdempotency(root: string) {
  await runInstall(root, { apply: true });
  const firstManifest = await readFile(join(root, ".phasegate", "manifest.json"), "utf8");
  const firstPackage = await readFile(join(root, "package.json"), "utf8");
  const secondResult = await runInstall(root, { apply: true });
  return {
    secondResult,
    firstManifest,
    secondManifest: await readFile(join(root, ".phasegate", "manifest.json"), "utf8"),
    firstPackage,
    secondPackage: await readFile(join(root, "package.json"), "utf8"),
  };
}

async function arrangeAndReadIdempotency() {
  const root = await createProjectRoot();
  return installTwiceAndReadIdempotency(root);
}

async function refuseThenForceAndRead(root: string) {
  const refused = await runInstall(root, { apply: true });
  const forced = await runInstall(root, { apply: true, force: true });
  return {
    refused,
    forced,
    content: await readFile(join(root, ".husky/pre-commit"), "utf8"),
  };
}

async function arrangeCustomHuskyAndForce() {
  const root = await createProjectRoot();
  await writeProjectFile(root, ".husky/pre-commit", "echo custom\n");
  return refuseThenForceAndRead(root);
}

async function arrangeExistingAgentsMdInstallAndRead(): Promise<string> {
  const root = await createProjectRoot();
  await writeProjectFile(root, "AGENTS.md", "# Existing Agent Notes\n\nkeep user text\n");
  await runInstall(root, { apply: true });
  return await readFile(join(root, "AGENTS.md"), "utf8");
}

async function installAndReadDownstreamTemplates(root: string) {
  const result = await runInstall(root, { apply: true });
  return {
    result,
    preCommit: await readFile(join(root, ".husky/pre-commit"), "utf8"),
    aidlcGate: await readFile(join(root, ".github/workflows/phasegate-aidlc-gate.yml"), "utf8"),
  };
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("InstallHandler", () => {
  describe("structured merge", () => {
    it("既存 JSON hooks を保持して phasegate hooks と manifest を追加すること", async () => {
      // Act
      const actual = await arrangeJsonMergeAndInstall();

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.claude).toContain("custom stop");
      expect(actual.claude).toContain("npx phasegate hook stop");
      expect(actual.codex).toContain("custom");
      expect(actual.codex).toContain("npx phasegate hook pre-tool-use");
      expect(actual.manifest.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ".claude/settings.json", mode: "merged" }),
          expect.objectContaining({ path: "CLAUDE.md", mode: "created" }),
          expect.objectContaining({ path: ".codex/hooks.json", mode: "merged" }),
          expect.objectContaining({ path: "AGENTS.md", mode: "created" }),
          expect.objectContaining({ path: "package.json", mode: "created" }),
          expect.objectContaining({ path: ".github/workflows/phasegate-aidlc-gate.yml", mode: "created" }),
        ]),
      );
    });

    it("2回連続 apply しても target hash と manifest hash が変わらないこと", async () => {
      // Act
      const actual = await arrangeAndReadIdempotency();

      // Assert
      expect(actual.secondResult.exitCode).toBe(0);
      expect(actual.secondManifest).toBe(actual.firstManifest);
      expect(actual.secondPackage).toBe(actual.firstPackage);
    });

    it("custom Husky script は force 無しで refuse し force で backup を取ること", async () => {
      // Act
      const actual = await arrangeCustomHuskyAndForce();

      // Assert
      expect(actual.refused.exitCode).toBe(1);
      expect(actual.forced.exitCode).toBe(0);
      expect(actual.forced.stdout).toContain(".phasegate/backups");
      expect(actual.content).toContain("echo custom");
      expect(actual.content).toContain("# === phasegate managed (BEGIN) ===");
    });

    it("既存 AGENTS.md の user content を保持して managed section を追加すること", async () => {
      // Act
      const actual = await arrangeExistingAgentsMdInstallAndRead();

      // Assert
      expect(actual).toContain("<!-- phasegate:managed-section:start -->");
      expect(actual).toContain("PhaseGate Managed Instructions");
      expect(actual).toContain("keep user text");
    });

    it("downstream install が package bin 経由の hook/workflow を配布すること", async () => {
      // Arrange
      const root = await createProjectRoot();

      // Act
      const actual = await installAndReadDownstreamTemplates(root);

      // Assert
      expect(actual.result.exitCode).toBe(0);
      expect(actual.preCommit).toContain('PHASEGATE_CMD="${PHASEGATE_CMD:-npx phasegate}"');
      expect(actual.preCommit).toContain("$PHASEGATE_CMD lint");
      expect(actual.preCommit).not.toContain("scripts/harness/main.ts");
      expect(actual.aidlcGate).toContain("if [ -f pnpm-lock.yaml ]; then");
      expect(actual.aidlcGate).toContain("RESULT=$(npx phasegate lint --json 2>&1)");
      expect(actual.aidlcGate).toContain("RESULT=$(npx phasegate phasegate:ci-check --json 2>&1)");
      expect(actual.aidlcGate).not.toContain("pnpm run harness");
    });
  });
});
