// @unit installation
// @layer application
// @work-item-id WI-146
// @work-item-id WI-174
// @work-item-id WI-198
// @work-item-id WI-175
// @work-item-id WI-177
// @work-item-id WI-182
// @work-item-id WI-183
// @work-item-id WI-207
// @work-item-id WI-208
// @work-item-id WI-209
// @work-item-id WI-210
// @work-item-id WI-213
// @work-item-id WI-214
// @work-item-id WI-215

import { mkdir, readFile, writeFile, copyFile, chmod, access, lstat, readlink, symlink, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getSkillsForSet, type SkillSet } from "../../../setup/skill-deployer.js";
import { DeploymentEntry } from "../../domain/deployment-entry.js";
import { DeploymentManifest } from "../../domain/deployment-manifest.js";
import type { ManagedBlockInput } from "../../domain/managed-block.js";
import type { RepairMode } from "../../domain/repair-mode.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";
import type { HashCalculatorPort } from "../ports/hash-calculator-port.js";

type InstallAction = "missing" | "will-merge" | "will-skip" | "will-overwrite";
type StrategyType = "json" | "shell" | "yaml-add" | "package-json" | "markdown-managed" | "text-managed" | "copy" | "copy-dir" | "symlink";

export interface InstallPlanItem {
  readonly path: string;
  readonly action: InstallAction;
  readonly repairMode: RepairMode;
  readonly strategy: StrategyType;
  readonly changed: boolean;
  readonly summary: string;
  readonly diff: string;
  readonly skillHint: string | null;
}

export interface RunInstallInput {
  readonly projectRoot: string;
  readonly harnessRoot: string;
  readonly phasegateVersion: string;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly force: boolean;
  readonly includeClaude?: boolean;
  readonly includeCodex?: boolean;
  readonly includeHusky?: boolean;
  readonly includeCi?: boolean;
  readonly skillSet?: "core" | "all";
  readonly workflow?: "standard" | "strict";
  readonly agent?: "claude" | "codex" | "both";
  readonly personal?: boolean;
}

export interface RunInstallResult {
  readonly plan: readonly InstallPlanItem[];
  readonly refused: readonly InstallPlanItem[];
  readonly changed: readonly InstallPlanItem[];
  readonly backupDir: string | null;
  readonly error?: TargetAwareApplyError;
}

export interface TargetAwareApplyError {
  readonly target: string;
  readonly operation: string;
  readonly code: string;
  readonly likelyCause: string;
  readonly recovery: string;
  readonly partialChanges: readonly string[];
}

interface InstallTarget {
  readonly path: string;
  readonly strategy: StrategyType;
  readonly templatePath: string;
  readonly executable?: boolean;
  readonly block?: ManagedBlockInput;
  readonly personalManualIfUnmanaged?: boolean;
}

const SKILL_HINT = "invoke /phasegate-config-doctor";
const PHASEGATE_SCRIPT_VERSION = "^0.0.0";

const SHELL_BEGIN = "# === phasegate managed (BEGIN) ===";
const SHELL_END = "# === phasegate managed (END) ===";
const MARKDOWN_BEGIN = "<!-- phasegate:managed-section:start -->";
const MARKDOWN_END = "<!-- phasegate:managed-section:end -->";
const TEXT_BEGIN = "# phasegate personal install exclude (BEGIN)";
const TEXT_END = "# phasegate personal install exclude (END)";
const PERSONAL_AGENT_RUNTIME_FILES = new Set([".claude/CLAUDE.md", ".claude/settings.json", "AGENTS.md", ".codex/hooks.json"]);
const SHARED_SKILLS_VERSION_PATH = "skills/.harness-version";
const PERSONAL_PRINCIPLES_DOCS = ".phasegate-local/docs/principles";
const PERSONAL_FOLDER_RULES_DOC = ".phasegate-local/docs/folder_management_rules.md";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readTextOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}

async function listSelectedBundledSkills(harnessRoot: string, skillSet: SkillSet): Promise<string[]> {
  const skillsSource = join(harnessRoot, "skills");
  const allowed = new Set(getSkillsForSet(skillSet));
  const entries = await readdir(skillsSource, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && allowed.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function normalizeJsonEntry(value: unknown): string {
  return JSON.stringify(value);
}

function mergeHookArrays(existing: unknown, incoming: unknown): unknown[] {
  const result = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(result.map((entry) => normalizeJsonEntry(entry)));
  for (const entry of Array.isArray(incoming) ? incoming : []) {
    const key = normalizeJsonEntry(entry);
    if (!seen.has(key)) {
      result.push(entry);
      seen.add(key);
    }
  }
  return result;
}

function mergeJsonObject(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };
  const existingHooks = isRecord(existing.hooks) ? existing.hooks : {};
  const incomingHooks = isRecord(incoming.hooks) ? incoming.hooks : {};
  result.hooks = { ...existingHooks };
  for (const [event, incomingEntries] of Object.entries(incomingHooks)) {
    (result.hooks as Record<string, unknown>)[event] = mergeHookArrays(existingHooks[event], incomingEntries);
  }

  const existingPermissions = isRecord(existing.permissions) ? existing.permissions : {};
  const incomingPermissions = isRecord(incoming.permissions) ? incoming.permissions : {};
  if (Object.keys(incomingPermissions).length > 0 || Object.keys(existingPermissions).length > 0) {
    const deny = [
      ...(Array.isArray(existingPermissions.deny) ? existingPermissions.deny : []),
      ...(Array.isArray(incomingPermissions.deny) ? incomingPermissions.deny : []),
    ];
    result.permissions = {
      ...existingPermissions,
      ...incomingPermissions,
      deny: [...new Set(deny)],
    };
  }
  return result;
}

function mergeShell(existing: string | null, incoming: string): string {
  if (existing === incoming || existing === `${incoming.trim()}\n`) return existing;
  const block = `${SHELL_BEGIN}\n${incoming.trim()}\n${SHELL_END}`;
  if (existing === null || existing.trim().length === 0) return `${incoming.trim()}\n`;
  const pattern = new RegExp(`${escapeRegExp(SHELL_BEGIN)}[\\s\\S]*?${escapeRegExp(SHELL_END)}`);
  if (pattern.test(existing)) return existing.replace(pattern, block).replace(/\s*$/, "\n");
  return `${existing.replace(/\s*$/, "\n\n")}${block}\n`;
}

function mergeTextManaged(existing: string | null, incoming: string): string {
  const block = `${TEXT_BEGIN}\n${incoming.trim()}\n${TEXT_END}`;
  if (existing === null || existing.trim().length === 0) return `${block}\n`;
  const pattern = new RegExp(`${escapeRegExp(TEXT_BEGIN)}[\\s\\S]*?${escapeRegExp(TEXT_END)}`);
  if (pattern.test(existing)) return existing.replace(pattern, block).replace(/\s*$/, "\n");
  return `${existing.replace(/\s*$/, "\n\n")}${block}\n`;
}

function managedMarkdownBlock(content: string): string {
  const start = content.indexOf(MARKDOWN_BEGIN);
  const end = content.indexOf(MARKDOWN_END);
  if (start === -1 || end === -1 || end < start) return content.trim();
  return content.slice(start, end + MARKDOWN_END.length).trim();
}

function mergeManagedMarkdown(existing: string | null, incoming: string): string {
  const block = managedMarkdownBlock(incoming);
  if (existing === null || existing.trim().length === 0) return `${incoming.trim()}\n`;
  const pattern = new RegExp(`${escapeRegExp(MARKDOWN_BEGIN)}[\\s\\S]*?${escapeRegExp(MARKDOWN_END)}`);
  if (pattern.test(existing)) return existing.replace(pattern, block).replace(/\s*$/, "\n");
  return `${block}\n\n${existing.replace(/\s*$/, "\n")}`;
}

function renderAgentContextTemplate(
  template: string,
  options: {
    readonly agent: "claude" | "codex" | "both";
    readonly skillSet: "core" | "all";
    readonly workflow: "standard" | "strict";
    readonly includeHusky: boolean;
    readonly includeCi: boolean;
  },
): string {
  const commands = [
    "- `phasegate doctor`",
    "- `phasegate phasegate:check-ready`",
    "- `phasegate validate --layer L2 --format human`",
    "- `phasegate setup:agent --dry-run`",
    "- `phasegate config:plan --intent l4-strict --dry-run`",
  ].join("\n");
  return template
    .replaceAll("{{PHASEGATE_AGENT}}", options.agent)
    .replaceAll("{{PHASEGATE_SKILLS_MODE}}", options.skillSet)
    .replaceAll("{{PHASEGATE_WORKFLOW}}", options.workflow)
    .replaceAll("{{PHASEGATE_HUSKY_STATE}}", options.includeHusky ? "managed" : "not managed by this setup run")
    .replaceAll("{{PHASEGATE_CI_STATE}}", options.includeCi ? "managed" : "not managed by this setup run")
    .replaceAll("{{PHASEGATE_COMMANDS}}", commands)
    .replaceAll("{{PHASEGATE_SKILLS}}", options.skillSet === "core" ? "- `core skills`" : "- `all bundled skills`")
    .replaceAll("{{PHASEGATE_PRESETS}}", "- `minimal`\n- `standard`\n- `full`\n- `custom`")
    .replaceAll("{{PHASEGATE_USER_SECTION}}", "Project-specific agent instructions go here.");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergePackageJson(existing: Record<string, unknown>, version: string): Record<string, unknown> {
  const devDependencies = isRecord(existing.devDependencies) ? existing.devDependencies : {};
  const scripts = isRecord(existing.scripts) ? existing.scripts : {};
  return {
    ...existing,
    scripts: {
      ...scripts,
      "phasegate:lint": scripts["phasegate:lint"] ?? "phasegate lint",
      "phasegate:check-ready": scripts["phasegate:check-ready"] ?? "phasegate phasegate:check-ready",
      "phasegate:doctor": scripts["phasegate:doctor"] ?? "phasegate doctor",
    },
    devDependencies: {
      ...devDependencies,
      phasegate: `^${version}`,
    },
  };
}

function hasCustomJson(content: string | null): boolean {
  if (content === null) return false;
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed)) return true;
    const withoutEmptyHooks = { ...parsed };
    if (isRecord(withoutEmptyHooks.hooks) && Object.keys(withoutEmptyHooks.hooks).length === 0) delete withoutEmptyHooks.hooks;
    return Object.keys(withoutEmptyHooks).length > 0;
  } catch {
    return true;
  }
}

function errorCode(error: unknown): string {
  if (isRecord(error) && typeof error.code === "string") return error.code;
  return "UNKNOWN";
}

function likelyCauseFor(code: string): string {
  if (code === "EPERM") return "The filesystem or sandbox denied this write operation.";
  if (code === "EACCES") return "The current user does not have permission to write this target.";
  if (code === "EROFS") return "The project is on a read-only filesystem.";
  if (code === "EEXIST") return "A parent path already exists as a file or incompatible filesystem entry.";
  if (code === "ENOTDIR") return "A parent path exists but is not a directory.";
  return "The managed target could not be written.";
}

function recoveryFor(code: string, target: string): string {
  if (code === "EPERM") return `Review sandbox or filesystem permissions for ${target}, ask the user for write access when needed, then rerun phasegate setup:agent --apply or phasegate install --apply.`;
  if (code === "EACCES") return `Fix ownership or permissions for ${target}, then rerun phasegate install --apply.`;
  if (code === "EROFS") return `Move the project to a writable filesystem or rerun in a writable workspace before applying ${target}.`;
  if (code === "EEXIST" || code === "ENOTDIR") return `Inspect the parent path for ${target}; if it is user-owned, rename or move it before rerunning phasegate install --dry-run --json and then --apply.`;
  return `Inspect ${target}, run phasegate install --dry-run --json, then rerun with --apply after resolving the filesystem issue.`;
}

function shellRepairMode(content: string | null): RepairMode {
  if (content === null || content.trim().length === 0 || content.includes(SHELL_BEGIN)) return "mechanical";
  return "ai-assisted";
}

function jsonRepairMode(content: string | null): RepairMode {
  if (content === null) return "mechanical";
  try {
    JSON.parse(content);
  } catch {
    return "manual";
  }
  return "mechanical";
}

export class RunInstallUseCase {
  constructor(
    private readonly manifestRepository: ManifestRepositoryPort,
    private readonly hashCalculator: HashCalculatorPort,
  ) {}

  async execute(input: RunInstallInput): Promise<RunInstallResult> {
    const includeClaude = input.includeClaude ?? true;
    const includeCodex = input.includeCodex ?? true;
    const includeHusky = input.includeHusky ?? true;
    const includeCi = input.includeCi ?? true;
    const skillSet = input.skillSet ?? "all";
    const workflow = input.workflow ?? "standard";
    const agent = input.agent ?? (includeClaude && includeCodex ? "both" : includeCodex ? "codex" : "claude");
    const targets = input.personal
      ? this.createPersonalTargets({ includeClaude, includeCodex })
      : this.createTargets({ includeClaude, includeCodex, includeHusky, includeCi });
    const existingManifest = await this.manifestRepository.load(input.projectRoot);
    const baseManifest = existingManifest ?? DeploymentManifest.create(input.phasegateVersion);
    let manifest = baseManifest;
    const plan: InstallPlanItem[] = [];
    const refused: InstallPlanItem[] = [];
    const changed: InstallPlanItem[] = [];
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    let backupDir: string | null = null;

    for (const target of targets) {
      const absolutePath = join(input.projectRoot, target.path);
      const before = await readTextOrNull(absolutePath);
      const rawTemplate = await readFile(join(input.harnessRoot, target.templatePath), "utf8");
      const template = target.strategy === "markdown-managed"
        ? renderAgentContextTemplate(rawTemplate, { agent, skillSet, workflow, includeHusky, includeCi })
        : rawTemplate;
      const existingEntry = baseManifest.findEntry(target.path);
      const beforeHash = before === null ? null : this.hashCalculator.compute(before);
      const unmanagedPersonalRuntimeFile = input.personal
        && (PERSONAL_AGENT_RUNTIME_FILES.has(target.path) || target.personalManualIfUnmanaged === true)
        && before !== null
        && !before.includes(MARKDOWN_BEGIN)
        && (existingEntry === null || beforeHash === null || !beforeHash.equals(existingEntry.hash));
      const repairMode = unmanagedPersonalRuntimeFile ? "manual" : this.repairMode(target, before);
      const next = unmanagedPersonalRuntimeFile ? before : this.merge(target, before, template, input.phasegateVersion);
      const didChange = before !== next;
      const action = this.actionFor(before, didChange, input.force);
      const item: InstallPlanItem = {
        path: target.path,
        action,
        repairMode,
        strategy: target.strategy,
        changed: didChange,
        summary: unmanagedPersonalRuntimeFile
          ? `${target.path}: existing non-phasegate runtime path requires manual review`
          : didChange ? `${target.path}: ${action}` : `${target.path}: already up to date`,
        diff: unmanagedPersonalRuntimeFile ? "manual review required" : this.diffSummary(before, next),
        skillHint: repairMode === "ai-assisted" ? SKILL_HINT : null,
      };
      plan.push(item);

      if (!input.apply || !didChange) continue;
      if ((repairMode === "ai-assisted" || repairMode === "manual") && !input.force) {
        refused.push(item);
        continue;
      }

      if (before !== null && (input.force || before.includes(SHELL_BEGIN))) {
        backupDir ??= join(input.projectRoot, ".phasegate", "backups", backupStamp);
        await this.backup(input.projectRoot, target.path, backupDir);
      }

      try {
        await mkdir(dirname(absolutePath), { recursive: true });
      } catch (error) {
        return this.withApplyError({ plan, refused, changed, backupDir }, target.path, "mkdir", error);
      }
      try {
        await writeFile(absolutePath, next, "utf8");
      } catch (error) {
        return this.withApplyError({ plan, refused, changed, backupDir }, target.path, "writeFile", error);
      }
      if (target.executable) {
        try {
          await chmod(absolutePath, 0o755);
        } catch (error) {
          return this.withApplyError({ plan, refused, changed, backupDir }, target.path, "chmod", error);
        }
      }
      changed.push(item);

      const mode = before === null ? "created" : "merged";
      const hash = this.hashCalculator.compute(next);
      const manifestEntry = baseManifest.findEntry(target.path);
      if (manifestEntry !== null && manifestEntry.hash.equals(hash)) {
        manifest = manifest.addEntry(manifestEntry);
      } else {
        manifest = manifest.addEntry(
          DeploymentEntry.create({
            path: target.path,
            mode,
            block: mode === "merged" ? (target.block ?? this.managedBlockFor(target)) : null,
            hash,
            deployedAt: new Date().toISOString(),
          }),
        );
      }
    }

    const personalSkillTargets = input.personal
      ? [
          ...(includeClaude ? [".claude/skills"] : []),
          ...(includeCodex ? [".codex/skills"] : []),
        ]
      : [];
    for (const skillPath of personalSkillTargets) {
      const item = await this.planPersonalSkillDirectory(input, skillPath, baseManifest);
      plan.push(item);
      if (input.apply && item.changed && item.repairMode === "mechanical") {
        try {
          await copyDirectory(join(input.harnessRoot, "skills"), join(input.projectRoot, skillPath));
          await writeFile(
            join(input.projectRoot, skillPath, ".harness-version"),
            `${JSON.stringify({ version: input.phasegateVersion, deployedAt: new Date().toISOString(), skillSet }, null, 2)}\n`,
            "utf8",
          );
        } catch (error) {
          return this.withApplyError({ plan, refused, changed, backupDir }, item.path, "copyDirectory", error);
        }
        changed.push(item);
        manifest = this.addManifestEntry(baseManifest, manifest, {
          path: item.path,
          mode: "created",
          contentForHash: this.personalSkillsHashInput(item.path, input.phasegateVersion, skillSet),
        });
      }
    }

    if (!input.personal && (includeClaude || includeCodex)) {
      const sharedSkills = await listSelectedBundledSkills(input.harnessRoot, skillSet);
      const item = await this.planSharedSkillDirectory(input, sharedSkills, baseManifest);
      plan.push(item);
      if (input.apply && item.changed && item.repairMode === "mechanical") {
        try {
          await this.deploySharedSkills(input, sharedSkills, skillSet);
        } catch (error) {
          return this.withApplyError({ plan, refused, changed, backupDir }, item.path, "copyDirectory", error);
        }
        changed.push(item);
        manifest = this.addManifestEntry(baseManifest, manifest, {
          path: SHARED_SKILLS_VERSION_PATH,
          mode: "created",
          contentForHash: this.sharedSkillsVersionHashInput(input.phasegateVersion, skillSet, sharedSkills),
        });
        for (const skill of sharedSkills) {
          manifest = this.addManifestEntry(baseManifest, manifest, {
            path: `skills/${skill}`,
            mode: "created",
            contentForHash: this.sharedSkillHashInput(skill, input.phasegateVersion, skillSet),
          });
        }
      }
    }

    const linkSpecs = input.personal
      ? []
      : [
          ...(includeClaude ? [{ path: ".claude/skills", target: "../skills" }] : []),
          ...(includeCodex ? [{ path: ".codex/skills", target: "../skills" }] : []),
        ];
    for (const linkSpec of linkSpecs) {
      const item = await this.planSkillLink(input.projectRoot, linkSpec.path, linkSpec.target);
      plan.push(item);
      if (!input.apply || !item.changed) continue;
      try {
        if (!input.personal) await mkdir(join(input.projectRoot, "skills"), { recursive: true });
        await mkdir(dirname(join(input.projectRoot, linkSpec.path)), { recursive: true });
      } catch (error) {
        return this.withApplyError({ plan, refused, changed, backupDir }, linkSpec.path, "mkdir", error);
      }
      try {
        await symlink(linkSpec.target, join(input.projectRoot, linkSpec.path), process.platform === "win32" ? "junction" : "dir");
      } catch (error) {
        return this.withApplyError({ plan, refused, changed, backupDir }, linkSpec.path, "symlink", error);
      }
      changed.push(item);
      manifest = this.addManifestEntry(baseManifest, manifest, {
        path: linkSpec.path,
        mode: "symlink",
        contentForHash: linkSpec.target,
      });
    }

    if (input.personal && includeCodex) {
      plan.push({
        path: "~/.codex/config.toml",
        action: "will-skip",
        repairMode: "manual",
        strategy: "json",
        changed: false,
        summary: "~/.codex/config.toml: personal mode does not write user-level Codex feature flags; enable hooks manually when needed",
        diff: "manual Codex hooks feature enablement may be required",
        skillHint: null,
      });
    }

    if (input.apply && changed.length > 0) {
      try {
        await this.manifestRepository.save(input.projectRoot, manifest);
      } catch (error) {
        return this.withApplyError({ plan, refused, changed, backupDir }, ".phasegate/manifest.json", "manifest-save", error);
      }
    }

    return { plan, refused, changed, backupDir };
  }

  private withApplyError(
    result: RunInstallResult,
    target: string,
    operation: string,
    error: unknown,
  ): RunInstallResult {
    const code = errorCode(error);
    return {
      ...result,
      error: {
        target,
        operation,
        code,
        likelyCause: likelyCauseFor(code),
        recovery: recoveryFor(code, target),
        partialChanges: result.changed.map((item) => item.path),
      },
    };
  }

  private createTargets(options: {
    readonly includeClaude: boolean;
    readonly includeCodex: boolean;
    readonly includeHusky: boolean;
    readonly includeCi: boolean;
  }): readonly InstallTarget[] {
    return [
      {
        path: "phasegate.config.json",
        strategy: "copy" as const,
        templatePath: "docs/templates/project/phasegate.config.json",
      },
      ...(options.includeClaude
        ? [
            { path: ".claude/settings.json", strategy: "json" as const, templatePath: "templates/.claude/settings.json" },
            {
              path: "CLAUDE.md",
              strategy: "markdown-managed" as const,
              templatePath: "docs/templates/agent-context/CLAUDE.md.template.md",
              block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate CLAUDE.md managed section" },
            },
          ]
        : []),
      ...(options.includeCodex
        ? [
            { path: ".codex/hooks.json", strategy: "json" as const, templatePath: "templates/.codex/hooks.json" },
            {
              path: "AGENTS.md",
              strategy: "markdown-managed" as const,
              templatePath: "docs/templates/agent-context/AGENTS.md.template.md",
              block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate AGENTS.md managed section" },
            },
          ]
        : []),
      ...(options.includeHusky
        ? [
            {
              path: ".husky/pre-commit",
              strategy: "shell" as const,
              templatePath: "docs/templates/hooks/pre-commit",
              executable: true,
              block: { start: SHELL_BEGIN, end: SHELL_END, content: "phasegate pre-commit managed block" },
            },
            {
              path: ".husky/commit-msg",
              strategy: "shell" as const,
              templatePath: "docs/templates/hooks/commit-msg",
              executable: true,
              block: { start: SHELL_BEGIN, end: SHELL_END, content: "phasegate commit-msg managed block" },
            },
            {
              path: ".husky/pre-push",
              strategy: "shell" as const,
              templatePath: "docs/templates/hooks/pre-push",
              executable: true,
              block: { start: SHELL_BEGIN, end: SHELL_END, content: "phasegate pre-push managed block" },
            },
          ]
        : []),
      ...(options.includeCi
        ? [
            {
              path: ".github/workflows/phasegate-aidlc-gate.yml",
              strategy: "yaml-add" as const,
              templatePath: "docs/templates/ci/aidlc-gate.yml",
            },
          ]
        : []),
      { path: "package.json", strategy: "package-json" as const, templatePath: "package.json" },
    ];
  }

  private createPersonalTargets(options: { readonly includeClaude: boolean; readonly includeCodex: boolean }): readonly InstallTarget[] {
    return [
      {
        path: ".phasegate-local/phasegate.config.json",
        strategy: "copy" as const,
        templatePath: "docs/templates/personal/phasegate-local-config.json",
      },
      ...(options.includeClaude
        ? [
            {
              path: ".claude/CLAUDE.md",
              strategy: "markdown-managed" as const,
              templatePath: "docs/templates/agent-context/CLAUDE.md.template.md",
              block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate personal .claude/CLAUDE.md managed section" },
              personalManualIfUnmanaged: true,
            },
            {
              path: ".claude/settings.json",
              strategy: "copy" as const,
              templatePath: "templates/.claude/settings.json",
            },
          ]
        : []),
      ...(options.includeCodex
        ? [
            {
              path: "AGENTS.md",
              strategy: "markdown-managed" as const,
              templatePath: "docs/templates/agent-context/AGENTS.md.template.md",
              block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate personal AGENTS.md managed section" },
              personalManualIfUnmanaged: true,
            },
            {
              path: ".codex/hooks.json",
              strategy: "copy" as const,
              templatePath: "templates/.codex/hooks.json",
            },
          ]
        : []),
      {
        path: ".git/hooks/pre-commit",
        strategy: "copy" as const,
        templatePath: "docs/templates/personal/hooks/pre-commit",
        executable: true,
      },
      {
        path: ".git/hooks/commit-msg",
        strategy: "copy" as const,
        templatePath: "docs/templates/personal/hooks/commit-msg",
        executable: true,
      },
      {
        path: PERSONAL_FOLDER_RULES_DOC,
        strategy: "copy" as const,
        templatePath: "docs/folder_management_rules.md",
      },
      {
        path: `${PERSONAL_PRINCIPLES_DOCS}/architecture-philosophy.md`,
        strategy: "copy" as const,
        templatePath: "docs/principles/architecture-philosophy.md",
      },
      {
        path: `${PERSONAL_PRINCIPLES_DOCS}/model-routing.md`,
        strategy: "copy" as const,
        templatePath: "docs/principles/model-routing.md",
      },
      {
        path: `${PERSONAL_PRINCIPLES_DOCS}/testing-rules.md`,
        strategy: "copy" as const,
        templatePath: "docs/principles/testing-rules.md",
      },
      {
        path: ".git/info/exclude",
        strategy: "text-managed" as const,
        templatePath: "docs/templates/personal/git-info-exclude",
        block: { start: TEXT_BEGIN, end: TEXT_END, content: "phasegate personal install exclude block" },
      },
    ];
  }

  private repairMode(target: InstallTarget, before: string | null): RepairMode {
    if (target.strategy === "shell") return shellRepairMode(before);
    if (target.strategy === "text-managed") return "mechanical";
    if (target.strategy === "copy") return "mechanical";
    if (target.strategy === "copy-dir") return "mechanical";
    if (target.strategy === "symlink") return "mechanical";
    if (target.strategy === "json") return jsonRepairMode(before);
    if (target.strategy === "markdown-managed") return "mechanical";
    return "mechanical";
  }

  private actionFor(before: string | null, changed: boolean, force: boolean): InstallAction {
    if (!changed) return "will-skip";
    if (before === null) return "missing";
    return force ? "will-overwrite" : "will-merge";
  }

  private merge(target: InstallTarget, before: string | null, template: string, version: string): string {
    if (target.strategy === "yaml-add") return before ?? template;
    if (target.strategy === "copy") return before ?? template;
    if (target.strategy === "shell") return mergeShell(before, template);
    if (target.strategy === "text-managed") return mergeTextManaged(before, template);
    if (target.strategy === "markdown-managed") return mergeManagedMarkdown(before, template);
    if (target.strategy === "package-json") {
      const existing = before === null ? {} : (JSON.parse(before) as unknown);
      const merged = mergePackageJson(isRecord(existing) ? existing : {}, version || PHASEGATE_SCRIPT_VERSION);
      return `${JSON.stringify(merged, null, 2)}\n`;
    }
    const existing = before === null ? {} : (JSON.parse(before) as unknown);
    const incoming = JSON.parse(template) as unknown;
    const merged = mergeJsonObject(isRecord(existing) ? existing : {}, isRecord(incoming) ? incoming : {});
    return `${JSON.stringify(merged, null, 2)}\n`;
  }

  private async backup(projectRoot: string, relativePath: string, backupDir: string): Promise<void> {
    const source = join(projectRoot, relativePath);
    const target = join(backupDir, relativePath);
    if (!(await exists(source))) return;
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }

  private managedBlockFor(target: InstallTarget): ManagedBlockInput {
    return {
      start: "phasegate structured merge",
      end: "phasegate structured merge",
      content: `${target.strategy}:${target.path}`,
    };
  }

  private async planPersonalSkillDirectory(
    input: RunInstallInput,
    relativePath: string,
    baseManifest: DeploymentManifest,
  ): Promise<InstallPlanItem> {
    const absolutePath = join(input.projectRoot, relativePath);
    const versionPath = join(absolutePath, ".harness-version");
    const current = await readTextOrNull(versionPath);
    const expectedNeedle = `"version": "${input.phasegateVersion}"`;
    const manifestEntry = baseManifest.findEntry(relativePath);
    const pathExists = await exists(absolutePath);
    const unmanagedExisting = pathExists && (current === null || manifestEntry === null);
    const changed = !unmanagedExisting && (current === null || !current.includes(expectedNeedle));
    return {
      path: relativePath,
      action: changed ? "missing" : unmanagedExisting ? "will-merge" : "will-skip",
      repairMode: unmanagedExisting ? "manual" : "mechanical",
      strategy: "copy-dir",
      changed,
      summary: unmanagedExisting
        ? `${relativePath}: existing non-phasegate directory requires manual review`
        : changed ? `${relativePath}: deploy bundled skills` : `${relativePath}: already up to date`,
      diff: unmanagedExisting ? "manual review required" : changed ? "+ bundled skills" : "no changes",
      skillHint: null,
    };
  }

  private personalSkillsHashInput(path: string, version: string, skillSet: "core" | "all"): string {
    return `personal-skills:${path}:${version}:${skillSet}`;
  }

  private async planSharedSkillDirectory(
    input: RunInstallInput,
    skills: readonly string[],
    baseManifest: DeploymentManifest,
  ): Promise<InstallPlanItem> {
    const versionPath = join(input.projectRoot, SHARED_SKILLS_VERSION_PATH);
    const current = await readTextOrNull(versionPath);
    const skillSet = input.skillSet ?? "all";
    const expectedVersion = `"version": "${input.phasegateVersion}"`;
    const expectedSkillSet = `"skillSet": "${skillSet}"`;
    let missingSkill = false;
    for (const skill of skills) {
      if (!(await exists(join(input.projectRoot, "skills", skill, "SKILL.md")))) {
        missingSkill = true;
        break;
      }
    }
    const missingManifest = baseManifest.findEntry(SHARED_SKILLS_VERSION_PATH) === null
      || skills.some((skill) => baseManifest.findEntry(`skills/${skill}`) === null);
    const changed = current === null || !current.includes(expectedVersion) || !current.includes(expectedSkillSet) || missingSkill || missingManifest;
    return {
      path: "skills",
      action: changed ? "missing" : "will-skip",
      repairMode: "mechanical",
      strategy: "copy-dir",
      changed,
      summary: changed ? "skills: deploy shared bundled skills" : "skills: already up to date",
      diff: changed ? `+ ${skills.length} bundled skills (${skillSet})` : "no changes",
      skillHint: null,
    };
  }

  private async deploySharedSkills(input: RunInstallInput, skills: readonly string[], skillSet: SkillSet): Promise<void> {
    const targetRoot = join(input.projectRoot, "skills");
    await mkdir(targetRoot, { recursive: true });
    for (const skill of skills) {
      const source = join(input.harnessRoot, "skills", skill);
      const target = join(targetRoot, skill);
      await rm(target, { recursive: true, force: true });
      await copyDirectory(source, target);
    }
    await writeFile(
      join(targetRoot, ".harness-version"),
      `${JSON.stringify({ version: input.phasegateVersion, deployedAt: new Date().toISOString(), skillSet }, null, 2)}\n`,
      "utf8",
    );
  }

  private sharedSkillsVersionHashInput(version: string, skillSet: SkillSet, skills: readonly string[]): string {
    return `shared-skills-version:${version}:${skillSet}:${skills.join(",")}`;
  }

  private sharedSkillHashInput(skill: string, version: string, skillSet: SkillSet): string {
    return `shared-skill:${skill}:${version}:${skillSet}`;
  }

  private addManifestEntry(
    baseManifest: DeploymentManifest,
    manifest: DeploymentManifest,
    input: { readonly path: string; readonly mode: "created" | "symlink"; readonly contentForHash: string },
  ): DeploymentManifest {
    const hash = this.hashCalculator.compute(input.contentForHash);
    const existingEntry = baseManifest.findEntry(input.path);
    if (existingEntry !== null && existingEntry.hash.equals(hash)) {
      return manifest.addEntry(existingEntry);
    }
    return manifest.addEntry(
      DeploymentEntry.create({
        path: input.path,
        mode: input.mode,
        block: null,
        hash,
        deployedAt: new Date().toISOString(),
      }),
    );
  }

  private async planSkillLink(projectRoot: string, relativePath: string, target: string): Promise<InstallPlanItem> {
    const absolutePath = join(projectRoot, relativePath);
    const parentPath = dirname(absolutePath);
    try {
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink() && (await readlink(absolutePath)) === target) {
        return {
          path: relativePath,
          action: "will-skip",
          repairMode: "mechanical",
          strategy: "symlink",
          changed: false,
          summary: `${relativePath}: already linked`,
          diff: "no changes",
          skillHint: null,
        };
      }
      return {
        path: relativePath,
        action: "will-merge",
        repairMode: "manual",
        strategy: "symlink",
        changed: false,
        summary: `${relativePath}: existing non-phasegate path requires manual review`,
        diff: "manual review required",
        skillHint: null,
      };
    } catch {
      try {
        const parentStat = await lstat(parentPath);
        if (!parentStat.isDirectory()) {
          return {
            path: relativePath,
            action: "will-merge",
            repairMode: "manual",
            strategy: "symlink",
            changed: false,
            summary: `${relativePath}: parent path exists and requires manual review`,
            diff: "manual review required",
            skillHint: null,
          };
        }
      } catch {}
      return {
        path: relativePath,
        action: "missing",
        repairMode: "mechanical",
        strategy: "symlink",
        changed: true,
        summary: `${relativePath}: create symlink`,
        diff: `+ symlink ${target}`,
        skillHint: null,
      };
    }
  }

  private diffSummary(before: string | null, next: string): string {
    if (before === next) return "no changes";
    if (before === null) return `+ ${next.split(/\r?\n/).filter(Boolean).length} lines`;
    return `~ ${before.length} bytes -> ${next.length} bytes`;
  }
}
