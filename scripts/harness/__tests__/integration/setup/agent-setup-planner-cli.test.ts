// @unit harness-api
// @layer integration
// @work-item-id WI-385
// @work-item-id WI-171
// @work-item-id WI-172
// @work-item-id WI-173
// @work-item-id WI-175
// @work-item-id WI-176
// @work-item-id WI-177
// @work-item-id WI-205
// @story H11-06

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const HARNESS_ROOT = resolve(process.cwd());
const MAIN_TS = join(HARNESS_ROOT, "scripts/harness/main.ts");

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", join(HARNESS_ROOT, "node_modules/tsx/dist/loader.mjs"), MAIN_TS, ...args],
      { cwd },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolveResult({ exitCode: code ?? -1, stdout, stderr });
    });
    child.stdin.end();
  });
}

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), "phasegate-setup-planner-"));
  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

target("agent setup planner CLI", () => {
  describe("setup and config planning commands", () => {
    it("setup:agent dry-run が検出結果と検証手順を返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        return await runCli(
          ["setup:agent", "--intent", "strict", "--with-ci", "--with-husky", "--dry-run", "--json"],
          projectRoot,
        );
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as {
        plan: {
          intent: string;
          changes: string[];
          validation: string[];
          completeness: Array<{ area: string; status: string; nextAction: string | null }>;
          agentReadiness: Array<{ agent: string; status: string; nextAction: string | null; evidence: string[] }>;
        };
        applied: boolean;
      };
      expect(actual.exitCode).toBe(0);
      expect(parsed.applied).toBe(false);
      expect(parsed.plan.intent).toBe("strict");
      expect(parsed.plan.changes.join("\n")).toContain("GitHub Actions");
      expect(parsed.plan.validation).toContain("phasegate doctor");
      expect(parsed.plan.completeness).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ area: "local-config", status: "planned" }),
          expect.objectContaining({ area: "ci", status: "planned" }),
          expect.objectContaining({ area: "external-actions", status: "manual" }),
        ]),
      );
      expect(parsed.plan.agentReadiness).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ agent: "claude", status: "planned" }),
          expect.objectContaining({ agent: "codex", status: "planned" }),
          expect.objectContaining({ agent: "shared", status: "planned" }),
        ]),
      );
    }, 120000);

    it("setup:agent --agent claude が Claude 固有 readiness と Codex 非対象を返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        return await runCli(
          ["setup:agent", "--agent", "claude", "--intent", "strict", "--with-husky", "--dry-run", "--json"],
          projectRoot,
        );
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as {
        plan: {
          validation: string[];
          agentReadiness: Array<{ agent: string; status: string; nextAction: string | null; evidence: string[] }>;
        };
      };
      expect(actual.exitCode).toBe(0);
      expect(parsed.plan.validation).toContain("phasegate doctor --agent claude");
      expect(parsed.plan.agentReadiness).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            agent: "claude",
            status: "planned",
            nextAction:
              "Run setup:agent --agent claude --apply, then ask Claude Code to read CLAUDE.md before planning work.",
          }),
          expect.objectContaining({ agent: "codex", status: "not-applicable", nextAction: null }),
          expect.objectContaining({ agent: "shared", status: "planned" }),
        ]),
      );
    }, 120000);

    it("config:plan が Codex hook 変更対象と user-level 手順を分けて返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        return await runCli(["config:plan", "--intent", "codex-hooks", "--json"], projectRoot);
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as {
        targets: string[];
        managedTargets: string[];
        externalActions: Array<{ id: string; command: string | null }>;
        commands: string[];
        validations: string[];
        configPatch: { applicability: string; blockedReason: string | null; operations: unknown[] };
      };
      expect(actual.exitCode).toBe(0);
      expect(parsed.targets).toContain(".codex/hooks.json");
      expect(parsed.targets).toContain("AGENTS.md");
      expect(parsed.managedTargets).toContain(".codex/hooks.json");
      expect(parsed.externalActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "codex-hooks-feature", command: "codex features enable hooks" }),
        ]),
      );
      expect(parsed.commands).toContain("codex features enable hooks");
      expect(parsed.validations).toContain("phasegate doctor --json");
      expect(parsed.configPatch.applicability).toBe("not-applicable");
      expect(parsed.configPatch.blockedReason).toBe(
        "Selected intent does not require a local phasegate.config.json mutation.",
      );
      expect(parsed.configPatch.operations).toEqual([]);
    }, 120000);

    it("config:plan l4-strict が phasegate.config.json の before/after patch preview を返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        return await runCli(["config:plan", "--intent", "l4-strict", "--json"], projectRoot);
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as {
        configPatch: {
          applicability: string;
          before: unknown;
          after: unknown;
          operations: Array<{ op: string; pointer: string; before: unknown; after: unknown }>;
        };
      };
      expect(actual.exitCode).toBe(0);
      expect(parsed.configPatch.applicability).toBe("applicable");
      expect(parsed.configPatch.before).toEqual(null);
      expect(parsed.configPatch.after).toEqual({
        layers: { L4: { enabled: true } },
        validate: { failOnWarning: true },
      });
      expect(parsed.configPatch.operations).toEqual([
        { op: "add", pointer: "/layers/L4/enabled", before: null, after: true },
        { op: "add", pointer: "/validate/failOnWarning", before: null, after: true },
      ]);
    }, 120000);

    it("config:plan --intent l4-strict --apply が生成する config がスキーマ検証を通過すること", async () => {
      // Arrange: 既存の有効な config へ merge するケースを検証する
      const { createValidSourceDocument } = await import("../config-foundation/config-foundation-test-fixtures.js");
      const seedConfig = createValidSourceDocument();

      // Act
      const actual = await withTempProject(async (projectRoot) => {
        await writeFile(join(projectRoot, "phasegate.config.json"), `${JSON.stringify(seedConfig, null, 2)}\n`, "utf8");
        const applyResult = await runCli(["config:plan", "--intent", "l4-strict", "--apply", "--json"], projectRoot);
        const written = await readFile(join(projectRoot, "phasegate.config.json"), "utf8");
        return { applyResult, written };
      });

      // Assert
      expect(actual.applyResult.exitCode).toBe(0);
      const writtenConfig = JSON.parse(actual.written) as Record<string, unknown>;
      expect((writtenConfig.validate as Record<string, unknown>).failOnWarning).toBe(true);
      expect((writtenConfig.layers as Record<string, Record<string, unknown>>).L4.enabled).toBe(true);
      const { AjvConfigSchemaValidator } = await import(
        "../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js"
      );
      const validator = new AjvConfigSchemaValidator();
      const errors = validator.validate(writtenConfig);
      expect(errors).toEqual([]);
    }, 120000);

    it("setup:agent strict apply 後の再 dry-run が completeness configured と direct install no-diff を返すこと", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        const apply = await runCli(
          ["setup:agent", "--intent", "strict", "--with-ci", "--with-husky", "--apply", "--json"],
          projectRoot,
        );
        const dryRun = await runCli(
          ["setup:agent", "--intent", "strict", "--with-ci", "--with-husky", "--dry-run", "--json"],
          projectRoot,
        );
        const installDryRun = await runCli(
          ["install", "--agent", "both", "--workflow", "strict", "--with-ci", "--with-husky", "--dry-run", "--json"],
          projectRoot,
        );
        const claudeMd = await readFile(join(projectRoot, "CLAUDE.md"), "utf8");
        return { apply, dryRun, installDryRun, claudeMd };
      });

      // Assert
      const setup = JSON.parse(actual.dryRun.stdout) as {
        plan: {
          completeness: Array<{ area: string; status: string }>;
          agentReadiness: Array<{ agent: string; status: string }>;
        };
      };
      const install = JSON.parse(actual.installDryRun.stdout) as {
        plan: Array<{ path: string; action: string; changed: boolean }>;
      };
      expect(actual.apply.exitCode).toBe(0);
      expect(actual.dryRun.exitCode).toBe(0);
      expect(actual.installDryRun.exitCode).toBe(0);
      expect(setup.plan.completeness).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ area: "local-config", status: "configured" }),
          expect.objectContaining({ area: "agent-context", status: "configured" }),
          expect.objectContaining({ area: "ci", status: "configured" }),
        ]),
      );
      expect(setup.plan.agentReadiness).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ agent: "claude", status: "configured" }),
          expect.objectContaining({ agent: "codex", status: "configured" }),
          expect.objectContaining({ agent: "shared", status: "configured" }),
        ]),
      );
      expect(install.plan.filter((item) => item.path === "AGENTS.md" || item.path === "CLAUDE.md")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "AGENTS.md", action: "will-skip", changed: false }),
          expect.objectContaining({ path: "CLAUDE.md", action: "will-skip", changed: false }),
        ]),
      );
      expect(actual.claudeMd).toContain("After the `claude` and `shared` rows are `configured`");
      expect(actual.claudeMd).toContain(
        "Reflect the accepted design into the relevant `docs/product/...` files with `@work-item-id WI-XXX`",
      );
    }, 120000);

    it("setup:agent apply が structured install error を返した場合は exit 1 で終了すること", async () => {
      // Act
      const actual = await withTempProject(async (projectRoot) => {
        await writeFile(join(projectRoot, ".codex"), "not a directory", "utf8");
        return await runCli(
          ["setup:agent", "--intent", "strict", "--with-ci", "--with-husky", "--apply", "--json"],
          projectRoot,
        );
      });

      // Assert
      const parsed = JSON.parse(actual.stdout) as {
        installResult: {
          error: {
            target: string;
            operation: string;
            code: string;
            likelyCause: string;
            recovery: string;
            partialChanges: string[];
          };
        };
      };
      expect(actual.exitCode).toBe(1);
      expect(parsed.installResult.error).toMatchObject({
        target: ".codex/hooks.json",
        operation: "mkdir",
        partialChanges: [".claude/settings.json", "CLAUDE.md"],
      });
      expect(["EEXIST", "ENOTDIR"]).toContain(parsed.installResult.error.code);
      expect(parsed.installResult.error.likelyCause).toMatch(/parent path|managed target/i);
      expect(parsed.installResult.error.recovery).toContain("phasegate install --dry-run --json");
    }, 120000);
  });
});
