// @unit installation
// @layer application
// @work-item-id WI-147
// @work-item-id WI-174
// @work-item-id WI-199

import { access, copyFile, lstat, mkdir, readFile, readlink, rm, rmdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { DeploymentEntry } from "../../domain/deployment-entry.js";
import type { RepairMode } from "../../domain/repair-mode.js";
import type { HashCalculatorPort } from "../ports/hash-calculator-port.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";

type UninstallAction = "missing-manifest" | "delete" | "unlink" | "reverse-merge" | "skip" | "refuse";
type StrategyType = "created" | "json" | "shell" | "package-json" | "markdown-managed" | "symlink" | "yaml-add" | "unknown";

export interface UninstallPlanItem {
  readonly path: string;
  readonly action: UninstallAction;
  readonly repairMode: RepairMode;
  readonly strategy: StrategyType;
  readonly changed: boolean;
  readonly protected: boolean;
  readonly summary: string;
  readonly diff: string;
  readonly skillHint: string | null;
}

export interface RunUninstallInput {
  readonly projectRoot: string;
  readonly harnessRoot: string;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly force: boolean;
}

export interface RunUninstallResult {
  readonly plan: readonly UninstallPlanItem[];
  readonly refused: readonly UninstallPlanItem[];
  readonly changed: readonly UninstallPlanItem[];
  readonly backupDir: string | null;
  readonly archivedManifestPath: string | null;
}

const SKILL_HINT = "invoke /phasegate-config-doctor";
const SHELL_BEGIN = "# === phasegate managed (BEGIN) ===";
const SHELL_END = "# === phasegate managed (END) ===";
const MARKDOWN_BEGIN = "<!-- phasegate:managed-section:start -->";
const MARKDOWN_END = "<!-- phasegate:managed-section:end -->";
const PHASEGATE_SCRIPT_PREFIX = "phasegate:";
const PROTECTED_UNINSTALL_PATHS = new Set(["package.json", "package-lock.json"]);

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

function removeHookEntries(existing: unknown, incoming: unknown): unknown[] {
  const templateEntries = new Set((Array.isArray(incoming) ? incoming : []).map((entry) => normalizeJsonEntry(entry)));
  return (Array.isArray(existing) ? existing : []).filter((entry) => !templateEntries.has(normalizeJsonEntry(entry)));
}

export function reverseJsonMerge(currentContent: string, templateContent: string): string {
  const current = JSON.parse(currentContent) as unknown;
  const template = JSON.parse(templateContent) as unknown;
  const result: Record<string, unknown> = isRecord(current) ? { ...current } : {};
  const currentHooks = isRecord(result.hooks) ? result.hooks : {};
  const templateHooks = isRecord(template) && isRecord(template.hooks) ? template.hooks : {};
  const nextHooks: Record<string, unknown> = {};
  for (const [event, entries] of Object.entries(currentHooks)) {
    const remaining = removeHookEntries(entries, templateHooks[event]);
    if (remaining.length > 0) nextHooks[event] = remaining;
  }
  if (Object.keys(nextHooks).length > 0) result.hooks = nextHooks;
  else delete result.hooks;

  if (isRecord(result.permissions)) {
    const templatePermissions = isRecord(template) && isRecord(template.permissions) ? template.permissions : {};
    const templateDeny = new Set(Array.isArray(templatePermissions.deny) ? templatePermissions.deny : []);
    const currentDeny = Array.isArray(result.permissions.deny) ? result.permissions.deny : [];
    const remainingDeny = currentDeny.filter((entry) => !templateDeny.has(entry));
    const nextPermissions = { ...result.permissions };
    if (remainingDeny.length > 0) nextPermissions.deny = remainingDeny;
    else delete nextPermissions.deny;
    if (Object.keys(nextPermissions).length > 0) result.permissions = nextPermissions;
    else delete result.permissions;
  }

  return `${JSON.stringify(result, null, 2)}\n`;
}

export function reverseShellMerge(currentContent: string): string {
  const pattern = new RegExp(`\\n?${escapeRegExp(SHELL_BEGIN)}[\\s\\S]*?${escapeRegExp(SHELL_END)}\\n?`);
  return currentContent.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n").replace(/^\n/, "");
}

export function reverseManagedMarkdown(currentContent: string): string {
  const pattern = new RegExp(`\\n?${escapeRegExp(MARKDOWN_BEGIN)}[\\s\\S]*?${escapeRegExp(MARKDOWN_END)}\\n?`);
  return currentContent.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n").replace(/^\n/, "");
}

export function reversePackageJsonMerge(currentContent: string): string {
  const parsed = JSON.parse(currentContent) as unknown;
  const result = isRecord(parsed) ? { ...parsed } : {};
  if (isRecord(result.devDependencies)) {
    const devDependencies = { ...result.devDependencies };
    delete devDependencies.phasegate;
    if (Object.keys(devDependencies).length > 0) result.devDependencies = devDependencies;
    else delete result.devDependencies;
  }
  if (isRecord(result.scripts)) {
    const scripts = Object.fromEntries(Object.entries(result.scripts).filter(([name]) => !name.startsWith(PHASEGATE_SCRIPT_PREFIX)));
    if (Object.keys(scripts).length > 0) result.scripts = scripts;
    else delete result.scripts;
  }
  return `${JSON.stringify(result, null, 2)}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class RunUninstallUseCase {
  constructor(
    private readonly manifestRepository: ManifestRepositoryPort,
    private readonly hashCalculator: HashCalculatorPort,
  ) {}

  async execute(input: RunUninstallInput): Promise<RunUninstallResult> {
    const manifest = await this.manifestRepository.load(input.projectRoot);
    if (manifest === null) {
      const item: UninstallPlanItem = {
        path: ".phasegate/manifest.json",
        action: "missing-manifest",
        repairMode: "manual",
        strategy: "unknown",
        changed: false,
        summary: "manifest missing; run phasegate doctor and clean up manually",
        diff: "manual cleanup required",
        skillHint: SKILL_HINT,
      };
      return { plan: [item], refused: [], changed: [], backupDir: null, archivedManifestPath: null };
    }

    const plan: UninstallPlanItem[] = [];
    const refused: UninstallPlanItem[] = [];
    const changed: UninstallPlanItem[] = [];
    const backupStamp = `uninstall-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    let backupDir: string | null = null;

    const outcomes: Array<{
      readonly entry: DeploymentEntry;
      readonly item: UninstallPlanItem;
      readonly needsBackup: boolean;
      readonly apply: () => Promise<void>;
    }> = [];
    for (const entry of manifest.entries) {
      const outcome = await this.planEntry(input, entry);
      outcomes.push({ entry, ...outcome });
      plan.push(outcome.item);
      if (input.apply && outcome.item.changed && this.requiresForce(outcome.item) && !input.force) {
        refused.push({ ...outcome.item, action: "refuse" });
      }
    }

    if (!input.apply || refused.length > 0) {
      return { plan, refused, changed, backupDir: null, archivedManifestPath: null };
    }

    for (const outcome of outcomes) {
      if (!outcome.item.changed) continue;
      if (outcome.needsBackup) {
        backupDir ??= join(input.projectRoot, ".phasegate", "backups", backupStamp);
        await this.backup(input.projectRoot, outcome.entry.path, backupDir);
      }
      await outcome.apply();
      await this.cleanupEmptyParents(input.projectRoot, outcome.entry.path);
      changed.push(outcome.item);
    }

    const archivedManifestPath = await this.manifestRepository.archive(input.projectRoot);
    return { plan, refused, changed, backupDir, archivedManifestPath };
  }

  private async planEntry(input: RunUninstallInput, entry: DeploymentEntry): Promise<{
    readonly item: UninstallPlanItem;
    readonly needsBackup: boolean;
    readonly apply: () => Promise<void>;
  }> {
    const absolutePath = this.resolveProjectPath(input.projectRoot, entry.path);
    const currentContent = await readTextOrNull(absolutePath);
    const strategy = this.strategyFor(entry.path, entry.mode);
    if (currentContent === null && strategy !== "symlink") {
      return {
        item: this.item(entry.path, "skip", "mechanical", strategy, false, `${entry.path}: already absent`, "no changes", null),
        needsBackup: false,
        apply: async () => {},
      };
    }

    if (entry.mode === "symlink") return this.planSymlink(input.projectRoot, entry);
    if (entry.mode === "created") return this.planCreated(input.projectRoot, entry, currentContent ?? "");
    return this.planMerged(input, entry, currentContent ?? "", strategy);
  }

  private async planSymlink(projectRoot: string, entry: DeploymentEntry) {
    const absolutePath = this.resolveProjectPath(projectRoot, entry.path);
    let target: string | null = null;
    try {
      const stat = await lstat(absolutePath);
      target = stat.isSymbolicLink() ? await readlink(absolutePath) : null;
    } catch {
      target = null;
    }
    if (target === "../skills") {
      return {
        item: this.item(entry.path, "unlink", "mechanical", "symlink", true, `${entry.path}: remove symlink`, "- symlink ../skills", null),
        needsBackup: false,
        apply: async () => {
          await rm(absolutePath, { force: true });
        },
      };
    }
    return {
      item: this.item(entry.path, "skip", "manual", "symlink", false, `${entry.path}: non-phasegate symlink/path skipped`, "manual review required", null),
      needsBackup: false,
      apply: async () => {},
    };
  }

  private async planCreated(projectRoot: string, entry: DeploymentEntry, currentContent: string) {
    const absolutePath = this.resolveProjectPath(projectRoot, entry.path);
    const currentHash = this.hashCalculator.compute(currentContent);
    const matchesManifest = currentHash.equals(entry.hash);
    const repairMode: RepairMode = matchesManifest ? "mechanical" : "ai-assisted";
    return {
      item: this.item(
        entry.path,
        "delete",
        repairMode,
        this.strategyFor(entry.path, entry.mode),
        true,
        matchesManifest ? `${entry.path}: delete created file` : `${entry.path}: hash mismatch; force required`,
        "- file",
        matchesManifest ? null : SKILL_HINT,
      ),
      needsBackup: !matchesManifest,
      apply: async () => {
        await rm(absolutePath, { force: true });
      },
    };
  }

  private async planMerged(input: RunUninstallInput, entry: DeploymentEntry, currentContent: string, strategy: StrategyType) {
    const currentHash = this.hashCalculator.compute(currentContent);
    const matchesManifest = currentHash.equals(entry.hash);
    try {
      const next = await this.reverseMerged(input.harnessRoot, entry.path, currentContent, strategy);
      if (next === currentContent) {
        return {
          item: this.item(entry.path, "skip", "mechanical", strategy, false, `${entry.path}: managed portion already absent`, "no changes", null),
          needsBackup: false,
          apply: async () => {},
        };
      }
      const repairMode: RepairMode = matchesManifest ? "mechanical" : "ai-assisted";
      return {
        item: this.item(
          entry.path,
          "reverse-merge",
          repairMode,
          strategy,
          true,
          matchesManifest ? `${entry.path}: remove managed portion` : `${entry.path}: hash mismatch; force required`,
          `~ ${currentContent.length} bytes -> ${next.length} bytes`,
          matchesManifest ? null : SKILL_HINT,
        ),
        needsBackup: !matchesManifest,
        apply: async () => {
          await writeFile(this.resolveProjectPath(input.projectRoot, entry.path), next, "utf8");
        },
      };
    } catch {
      return {
        item: this.item(entry.path, "skip", "manual", strategy, false, `${entry.path}: reverse merge requires manual review`, "manual review required", SKILL_HINT),
        needsBackup: false,
        apply: async () => {},
      };
    }
  }

  private async reverseMerged(harnessRoot: string, path: string, currentContent: string, strategy: StrategyType): Promise<string> {
    if (strategy === "shell") return currentContent.includes(SHELL_BEGIN) ? reverseShellMerge(currentContent) : currentContent;
    if (strategy === "markdown-managed") return currentContent.includes(MARKDOWN_BEGIN) ? reverseManagedMarkdown(currentContent) : currentContent;
    if (strategy === "package-json") return reversePackageJsonMerge(currentContent);
    if (strategy === "json") return reverseJsonMerge(currentContent, await readFile(join(harnessRoot, this.templateFor(path)), "utf8"));
    throw new Error(`Unsupported merged strategy: ${strategy}`);
  }

  private strategyFor(path: string, mode: string): StrategyType {
    if (mode === "symlink") return "symlink";
    if (mode === "created") return path.endsWith(".yml") || path.endsWith(".yaml") ? "yaml-add" : "created";
    if (path === "package.json") return "package-json";
    if (path === "AGENTS.md" || path === "CLAUDE.md") return "markdown-managed";
    if (path.endsWith(".json")) return "json";
    if (path.startsWith(".husky/")) return "shell";
    return "unknown";
  }

  private templateFor(path: string): string {
    if (path === ".claude/settings.json") return "templates/.claude/settings.json";
    if (path === ".codex/hooks.json") return "templates/.codex/hooks.json";
    if (path === "CLAUDE.md") return "docs/templates/agent-context/CLAUDE.md.template.md";
    if (path === "AGENTS.md") return "docs/templates/agent-context/AGENTS.md.template.md";
    throw new Error(`No template for ${path}`);
  }

  private async backup(projectRoot: string, relativePath: string, backupDir: string): Promise<void> {
    const source = this.resolveProjectPath(projectRoot, relativePath);
    if (!(await exists(source))) return;
    const target = join(backupDir, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }

  private async cleanupEmptyParents(projectRoot: string, relativePath: string): Promise<void> {
    let current = dirname(this.resolveProjectPath(projectRoot, relativePath));
    const root = resolve(projectRoot);
    while (current.startsWith(root) && current !== root && relative(root, current) !== ".phasegate") {
      try {
        await rmdir(current);
      } catch {
        return;
      }
      current = dirname(current);
    }
  }

  private resolveProjectPath(projectRoot: string, relativePath: string): string {
    const absolutePath = resolve(projectRoot, relativePath);
    const root = resolve(projectRoot);
    if (absolutePath !== root && !absolutePath.startsWith(`${root}/`)) {
      throw new Error(`Manifest entry escapes project root: ${relativePath}`);
    }
    return absolutePath;
  }

  private item(
    path: string,
    action: UninstallAction,
    repairMode: RepairMode,
    strategy: StrategyType,
    changed: boolean,
    summary: string,
    diff: string,
    skillHint: string | null,
  ): UninstallPlanItem {
    return { path, action, repairMode, strategy, changed, protected: this.isProtectedPath(path), summary, diff, skillHint };
  }

  private requiresForce(item: UninstallPlanItem): boolean {
    return item.protected || item.repairMode === "ai-assisted" || item.repairMode === "manual";
  }

  private isProtectedPath(path: string): boolean {
    return PROTECTED_UNINSTALL_PATHS.has(path);
  }
}
