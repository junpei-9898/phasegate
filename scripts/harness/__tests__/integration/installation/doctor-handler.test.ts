// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145
// @work-item-id WI-178
// @work-item-id WI-179

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

type FixtureName = "no-phasegate" | "inert-install" | "partial-install" | "full-install" | "claude-only-install";

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

  if (fixture === "claude-only-install") {
    await writeProjectFile(root, ".husky/commit-msg", 'npx phasegate commit-msg "$1"\n');
    await writeProjectFile(root, ".husky/pre-push", "npx phasegate bypass:audit --base origin/main --head HEAD\n");
    await writeProjectFile(root, ".github/workflows/phasegate-aidlc-gate.yml", "name: phasegate\n");
    await createSkillLink(root, ".claude/skills");
    return;
  }

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

async function runDoctor(root: string, strict: boolean, agent: "claude" | "codex" | "both" = "both") {
  const mod = createInstallationModule();
  const actual = await mod.doctorHandler.execute({
    projectRoot: root,
    strict,
    json: true,
    reportOut: null,
    phasegateVersion: "0.145.0",
    agent,
  });
  return {
    ...actual,
    payload: JSON.parse(actual.stdout) as {
      readonly schemaVersion: string;
      readonly scope: { readonly agent: string; readonly description: string };
      readonly overallStatus: string;
      readonly findings: Array<{ checkId: string; severity: "red" | "warn"; repairMode: string; applicability: string; repairHint: string | null; repairHintApplicability: string }>;
      readonly scopedOutFindings: Array<{
        checkId: string;
        severity: "red" | "warn";
        repairMode: string;
        repairHint: string | null;
        suggestedSkill: unknown | null;
        applicability: string;
        repairHintApplicability: string;
        scopeReason: string;
      }>;
      readonly exitCode: number;
    },
  };
}

async function runDoctorHumanFixture(fixture: FixtureName, strict: boolean, agent: "claude" | "codex" | "both" = "both") {
  const root = await createProjectRoot();
  await buildFixture(root, fixture);
  const mod = createInstallationModule();
  return await mod.doctorHandler.execute({
    projectRoot: root,
    strict,
    json: false,
    reportOut: null,
    phasegateVersion: "0.145.0",
    agent,
  });
}

async function runDoctorFixture(fixture: FixtureName, strict: boolean, agent: "claude" | "codex" | "both" = "both") {
  const root = await createProjectRoot();
  await buildFixture(root, fixture);
  return await runDoctor(root, strict, agent);
}

async function runDoctorReportOutFixture(fixture: FixtureName, reportOut: string) {
  const root = await createProjectRoot();
  await buildFixture(root, fixture);
  const mod = createInstallationModule();
  const output = await mod.doctorHandler.execute({
    projectRoot: root,
    strict: false,
    json: false,
    reportOut,
    phasegateVersion: "0.145.0",
    agent: "both",
  });
  const report = JSON.parse(await readFile(join(root, reportOut), "utf8")) as { overallStatus: string; findings: unknown[] };
  return { output, report };
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
      const actual = await runDoctorFixture("inert-install", true);

      expect(actual.payload.overallStatus).toBe("warn");
      expect(actual.exitCode).toBe(1);
      expect(actual.payload.exitCode).toBe(1);
    });
  });

  describe("doctor --agent", () => {
    it("Claude scope では Codex-only finding を not-applicable として exitCode に含めないこと", async () => {
      const actual = await runDoctorFixture("claude-only-install", false, "claude");

      expect(actual.exitCode).toBe(0);
      expect(actual.payload.scope.agent).toBe("claude");
      expect(actual.payload.overallStatus).toBe("green");
      expect(actual.payload.findings).toEqual([]);
      expect(actual.payload.scopedOutFindings.map(({ checkId, applicability }) => ({ checkId, applicability }))).toEqual([
        { checkId: "codex-hook-missing", applicability: "not-applicable" },
        { checkId: "codex-skills-symlink", applicability: "not-applicable" },
      ]);
      expect(actual.payload.scopedOutFindings.map(({ repairHint, suggestedSkill, repairHintApplicability }) => ({ repairHint, suggestedSkill, repairHintApplicability }))).toEqual([
        { repairHint: null, suggestedSkill: null, repairHintApplicability: "only-if-agent-selected" },
        { repairHint: null, suggestedSkill: null, repairHintApplicability: "only-if-agent-selected" },
      ]);
    });

    it("既定の full scope では同じ fixture の Codex 欠落を red として検出すること", async () => {
      const actual = await runDoctorFixture("claude-only-install", false);

      expect(actual.exitCode).toBe(1);
      expect(actual.payload.scope.agent).toBe("both");
      expect(actual.payload.findings.map(({ checkId, severity }) => ({ checkId, severity }))).toEqual([
        { checkId: "codex-hook-missing", severity: "red" },
        { checkId: "codex-skills-symlink", severity: "red" },
      ]);
      expect(actual.payload.findings.map(({ checkId, repairHint, repairHintApplicability }) => ({ checkId, repairHint, repairHintApplicability }))).toEqual([
        { checkId: "codex-hook-missing", repairHint: "npx phasegate install --apply", repairHintApplicability: "applicable" },
        { checkId: "codex-skills-symlink", repairHint: "npx phasegate install --apply", repairHintApplicability: "applicable" },
      ]);
      expect(actual.payload.scopedOutFindings).toEqual([]);
    });

    it("human output では scoped-out finding を repair target ではないと説明すること", async () => {
      const actual = await runDoctorHumanFixture("claude-only-install", false, "claude");

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain("Scoped out: 2 informational findings not applicable to --agent claude; not repair targets for this scope.");
    });
  });

  describe("doctor --report-out", () => {
    it("指定pathにJSON reportを書き出すこと", async () => {
      const actual = await runDoctorReportOutFixture("full-install", "reports/doctor.json");

      expect(actual.output.exitCode).toBe(0);
      expect(actual.output.stdout).toContain("Status: GREEN");
      expect(actual.report.overallStatus).toBe("green");
      expect(actual.report.findings).toEqual([]);
    });
  });
});
