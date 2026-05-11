// @unit installation
// @layer application
// @work-item-id WI-146

import { mkdir, readFile, writeFile, copyFile, chmod, access, lstat, readlink, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DeploymentEntry } from "../../domain/deployment-entry.js";
import { DeploymentManifest } from "../../domain/deployment-manifest.js";
import type { ManagedBlockInput } from "../../domain/managed-block.js";
import type { RepairMode } from "../../domain/repair-mode.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";
import type { HashCalculatorPort } from "../ports/hash-calculator-port.js";

type InstallAction = "missing" | "will-merge" | "will-skip" | "will-overwrite";
type StrategyType = "json" | "shell" | "yaml-add" | "package-json";

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
}

export interface RunInstallResult {
  readonly plan: readonly InstallPlanItem[];
  readonly refused: readonly InstallPlanItem[];
  readonly changed: readonly InstallPlanItem[];
  readonly backupDir: string | null;
}

interface InstallTarget {
  readonly path: string;
  readonly strategy: StrategyType;
  readonly templatePath: string;
  readonly executable?: boolean;
  readonly block?: ManagedBlockInput;
}

const SKILL_HINT = "invoke /phasegate-config-doctor";
const PHASEGATE_SCRIPT_VERSION = "^0.0.0";

const SHELL_BEGIN = "# === phasegate managed (BEGIN) ===";
const SHELL_END = "# === phasegate managed (END) ===";

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
    const targets = this.createTargets({ includeClaude, includeCodex, includeHusky, includeCi });
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
      const template = await readFile(join(input.harnessRoot, target.templatePath), "utf8");
      const repairMode = this.repairMode(target, before);
      const next = this.merge(target, before, template, input.phasegateVersion);
      const didChange = before !== next;
      const action = this.actionFor(before, didChange, input.force);
      const item: InstallPlanItem = {
        path: target.path,
        action,
        repairMode,
        strategy: target.strategy,
        changed: didChange,
        summary: didChange ? `${target.path}: ${action}` : `${target.path}: already up to date`,
        diff: this.diffSummary(before, next),
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

      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, next, "utf8");
      if (target.executable) await chmod(absolutePath, 0o755);
      changed.push(item);

      const mode = before === null ? "created" : "merged";
      const hash = this.hashCalculator.compute(next);
      const existingEntry = baseManifest.findEntry(target.path);
      if (existingEntry !== null && existingEntry.hash.equals(hash)) {
        manifest = manifest.addEntry(existingEntry);
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

    const linkPaths = [
      ...(includeClaude ? [".claude/skills"] : []),
      ...(includeCodex ? [".codex/skills"] : []),
    ];
    for (const linkPath of linkPaths) {
      const item = await this.planSkillLink(input.projectRoot, linkPath);
      plan.push(item);
      if (!input.apply || !item.changed) continue;
      await mkdir(join(input.projectRoot, "skills"), { recursive: true });
      await mkdir(dirname(join(input.projectRoot, linkPath)), { recursive: true });
      await symlink("../skills", join(input.projectRoot, linkPath), process.platform === "win32" ? "junction" : "dir");
      changed.push(item);
      const hash = this.hashCalculator.compute("../skills");
      const existingEntry = baseManifest.findEntry(linkPath);
      if (existingEntry !== null && existingEntry.hash.equals(hash)) {
        manifest = manifest.addEntry(existingEntry);
      } else {
        manifest = manifest.addEntry(
          DeploymentEntry.create({
            path: linkPath,
            mode: "symlink",
            block: null,
            hash,
            deployedAt: new Date().toISOString(),
          }),
        );
      }
    }

    if (input.apply && changed.length > 0) {
      await this.manifestRepository.save(input.projectRoot, manifest);
    }

    return { plan, refused, changed, backupDir };
  }

  private createTargets(options: {
    readonly includeClaude: boolean;
    readonly includeCodex: boolean;
    readonly includeHusky: boolean;
    readonly includeCi: boolean;
  }): readonly InstallTarget[] {
    return [
      ...(options.includeClaude
        ? [{ path: ".claude/settings.json", strategy: "json" as const, templatePath: "templates/.claude/settings.json" }]
        : []),
      ...(options.includeCodex
        ? [{ path: ".codex/hooks.json", strategy: "json" as const, templatePath: "templates/.codex/hooks.json" }]
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

  private repairMode(target: InstallTarget, before: string | null): RepairMode {
    if (target.strategy === "shell") return shellRepairMode(before);
    if (target.strategy === "json") return jsonRepairMode(before);
    return "mechanical";
  }

  private actionFor(before: string | null, changed: boolean, force: boolean): InstallAction {
    if (!changed) return "will-skip";
    if (before === null) return "missing";
    return force ? "will-overwrite" : "will-merge";
  }

  private merge(target: InstallTarget, before: string | null, template: string, version: string): string {
    if (target.strategy === "yaml-add") return before ?? template;
    if (target.strategy === "shell") return mergeShell(before, template);
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

  private async planSkillLink(projectRoot: string, relativePath: string): Promise<InstallPlanItem> {
    const absolutePath = join(projectRoot, relativePath);
    try {
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink() && (await readlink(absolutePath)) === "../skills") {
        return {
          path: relativePath,
          action: "will-skip",
          repairMode: "mechanical",
          strategy: "yaml-add",
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
        strategy: "yaml-add",
        changed: false,
        summary: `${relativePath}: existing non-phasegate path requires manual review`,
        diff: "manual review required",
        skillHint: null,
      };
    } catch {
      return {
        path: relativePath,
        action: "missing",
        repairMode: "mechanical",
        strategy: "yaml-add",
        changed: true,
        summary: `${relativePath}: create symlink`,
        diff: "+ symlink ../skills",
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
