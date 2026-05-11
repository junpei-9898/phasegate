// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145

import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallationModule } from "../../../installation/composition-root.js";
import { target } from "../../helpers/test-helpers.js";

interface FixtureExpectation {
  readonly fixture: FixtureName;
  readonly status: "green" | "warn" | "red";
  readonly exitCode: number;
  readonly findings: readonly ExpectedFinding[];
}

interface ExpectedFinding {
  readonly checkId: string;
  readonly severity: "red" | "warn";
  readonly repairMode: "mechanical" | "manual" | "ai-assisted";
}

type FixtureName = "no-phasegate" | "inert-install" | "partial-install" | "full-install";

let projectRoot: string | null = null;

const GOLDEN: readonly FixtureExpectation[] = [
  {
    fixture: "no-phasegate",
    status: "red",
    exitCode: 1,
    findings: [
      { checkId: "claude-hook-missing", severity: "red", repairMode: "mechanical" },
      { checkId: "codex-hook-missing", severity: "red", repairMode: "mechanical" },
      { checkId: "husky-pre-commit-missing", severity: "red", repairMode: "mechanical" },
      { checkId: "husky-commit-msg-missing", severity: "red", repairMode: "mechanical" },
      { checkId: "husky-pre-push-missing", severity: "warn", repairMode: "mechanical" },
      { checkId: "ci-workflow-missing", severity: "warn", repairMode: "manual" },
      { checkId: "package-json-devdep-missing", severity: "red", repairMode: "mechanical" },
      { checkId: "claude-skills-symlink", severity: "red", repairMode: "mechanical" },
      { checkId: "codex-skills-symlink", severity: "red", repairMode: "mechanical" },
    ],
  },
  {
    fixture: "inert-install",
    status: "warn",
    exitCode: 0,
    findings: [
      { checkId: "husky-pre-push-missing", severity: "warn", repairMode: "mechanical" },
      { checkId: "ci-workflow-missing", severity: "warn", repairMode: "manual" },
    ],
  },
  {
    fixture: "partial-install",
    status: "red",
    exitCode: 1,
    findings: [
      { checkId: "codex-hook-missing", severity: "red", repairMode: "ai-assisted" },
      { checkId: "husky-commit-msg-missing", severity: "red", repairMode: "ai-assisted" },
      { checkId: "husky-pre-push-missing", severity: "warn", repairMode: "mechanical" },
      { checkId: "ci-workflow-missing", severity: "warn", repairMode: "manual" },
      { checkId: "claude-skills-symlink", severity: "red", repairMode: "manual" },
      { checkId: "codex-skills-symlink", severity: "red", repairMode: "mechanical" },
    ],
  },
  {
    fixture: "full-install",
    status: "green",
    exitCode: 0,
    findings: [],
  },
];

async function createProjectRoot(): Promise<string> {
  projectRoot = await mkdtemp(join(tmpdir(), "phasegate-doctor-"));
  return projectRoot;
}

async function writeProjectFile(root: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = join(root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

async function createSkillLink(root: string, relativePath: string, target = "../skills"): Promise<void> {
  await mkdir(dirname(join(root, relativePath)), { recursive: true });
  await symlink(target, join(root, relativePath), process.platform === "win32" ? "junction" : "dir");
}

async function buildFixture(root: string, fixture: FixtureName): Promise<void> {
  await mkdir(join(root, "skills"), { recursive: true });
  if (fixture === "no-phasegate") return;

  await writeProjectFile(root, "package.json", JSON.stringify({ devDependencies: { phasegate: "0.145.0" } }));
  await writeProjectFile(root, ".claude/settings.json", JSON.stringify({ hooks: { Stop: [{ command: "npx phasegate hook stop" }] } }));
  await writeProjectFile(root, ".husky/pre-commit", standardPreCommitHook());

  if (fixture === "partial-install") {
    await writeProjectFile(root, ".codex/hooks.json", JSON.stringify({ hooks: [{ command: "custom hook" }] }));
    await writeProjectFile(root, ".husky/commit-msg", "custom commit message hook\n");
    await createSkillLink(root, ".claude/skills", "../other-skills");
    return;
  }

  await writeProjectFile(root, ".codex/hooks.json", JSON.stringify({ hooks: [{ command: "npx phasegate hook stop" }] }));
  await writeProjectFile(root, ".husky/commit-msg", 'npx phasegate commit-msg "$1"\n');
  await createSkillLink(root, ".claude/skills");
  await createSkillLink(root, ".codex/skills");

  if (fixture === "full-install") {
    await writeProjectFile(root, ".husky/pre-push", "npx phasegate bypass:audit --base origin/main --head HEAD\n");
    await writeProjectFile(root, ".github/workflows/phasegate-aidlc-gate.yml", "name: phasegate\n");
  }
}

async function runDoctor(root: string, strict: boolean) {
  const mod = createInstallationModule();
  const actual = await mod.doctorHandler.execute({
    projectRoot: root,
    strict,
    json: true,
    reportOut: null,
    phasegateVersion: "0.145.0",
  });
  return {
    ...actual,
    payload: JSON.parse(actual.stdout) as {
      readonly schemaVersion: string;
      readonly overallStatus: string;
      readonly findings: Array<{ checkId: string; severity: "red" | "warn"; repairMode: string }>;
      readonly exitCode: number;
    },
  };
}

function standardPreCommitHook(): string {
  return [
    'HARNESS_CMD="npx tsx scripts/harness/main.ts"',
    "$HARNESS_CMD lint",
    "$HARNESS_CMD check-phase-gate",
    "",
  ].join("\n");
}

afterEach(async () => {
  if (projectRoot !== null) await rm(projectRoot, { recursive: true, force: true });
  projectRoot = null;
});

target("DoctorHandler", () => {
  describe("doctor --json を fixture golden と照合する", () => {
    for (const expected of GOLDEN) {
      it(`${expected.fixture} の診断結果を固定すること`, async () => {
        const root = await createProjectRoot();
        await buildFixture(root, expected.fixture);

        const actual = await runDoctor(root, false);

        expect(actual.exitCode).toBe(expected.exitCode);
        expect(actual.payload.schemaVersion).toBe("1.0");
        expect(actual.payload.overallStatus).toBe(expected.status);
        expect(actual.payload.exitCode).toBe(expected.exitCode);
        expect(actual.payload.findings.map(({ checkId, severity, repairMode }) => ({ checkId, severity, repairMode }))).toEqual(expected.findings);
      });
    }
  });

  describe("doctor --strict", () => {
    it("warn のみの fixture でも exitCode 1 を返すこと", async () => {
      const root = await createProjectRoot();
      await buildFixture(root, "inert-install");

      const actual = await runDoctor(root, true);

      expect(actual.payload.overallStatus).toBe("warn");
      expect(actual.exitCode).toBe(1);
      expect(actual.payload.exitCode).toBe(1);
    });
  });

  describe("doctor --report-out", () => {
    it("指定pathにJSON reportを書き出すこと", async () => {
      const root = await createProjectRoot();
      await buildFixture(root, "full-install");
      const reportOut = "reports/doctor.json";
      const mod = createInstallationModule();

      const actual = await mod.doctorHandler.execute({
        projectRoot: root,
        strict: false,
        json: false,
        reportOut,
        phasegateVersion: "0.145.0",
      });
      const report = JSON.parse(await readFile(join(root, reportOut), "utf8")) as { overallStatus: string; findings: unknown[] };

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Status: GREEN");
      expect(report.overallStatus).toBe("green");
      expect(report.findings).toHaveLength(0);
    });
  });
});
