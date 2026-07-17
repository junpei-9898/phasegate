// @unit installation
// @layer application
// @work-item-id WI-148
// @work-item-id WI-174
// @work-item-id WI-198
// @work-item-id WI-210
// @work-item-id WI-216
// @work-item-id WI-219
// @work-item-id WI-264
// @work-item-id WI-315
// @work-item-id WI-326
// @work-item-id WI-331

import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { DeploymentEntry } from "../../domain/deployment-entry.js";
import { DeploymentManifest } from "../../domain/deployment-manifest.js";
import type { ManagedBlockInput } from "../../domain/managed-block.js";
import type { RepairMode } from "../../domain/repair-mode.js";
import { getBundledSkillsForSet, type SkillSet } from "../bundled-skill-selection.js";
import type { HashCalculatorPort } from "../ports/hash-calculator-port.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";
import type { ModelDelegationPort } from "../ports/model-delegation-port.js";

type ReconcileAction = "missing-manifest" | "update" | "add" | "link" | "skip" | "refuse" | "prune";
type StrategyType =
  | "json"
  | "shell"
  | "yaml-add"
  | "package-json"
  | "markdown-managed"
  | "copy-dir"
  | "symlink"
  | "unknown";

export interface ReconcilePlanItem {
  readonly path: string;
  readonly action: ReconcileAction;
  readonly repairMode: RepairMode;
  readonly strategy: StrategyType;
  readonly changed: boolean;
  readonly summary: string;
  readonly diff: string;
  readonly skillHint: string | null;
}

export interface RunReconcileInput {
  readonly projectRoot: string;
  readonly harnessRoot: string;
  readonly phasegateVersion: string;
  readonly dryRun: boolean;
  readonly apply: boolean;
  readonly force: boolean;
  // Explicit per-run overrides. When omitted, the flags recorded in the
  // manifest at install time (installationFlags) are used; manifests written
  // before WI-326 carry no flags and fall back to the legacy behavior of
  // reconciling every bundled target.
  readonly includeHusky?: boolean;
  readonly includeCi?: boolean;
}

export interface RunReconcileResult {
  readonly plan: readonly ReconcilePlanItem[];
  readonly refused: readonly ReconcilePlanItem[];
  readonly changed: readonly ReconcilePlanItem[];
  readonly backupDir: string | null;
}

interface ReconcileTarget {
  readonly path: string;
  readonly strategy: StrategyType;
  readonly templatePath?: string;
  readonly executable?: boolean;
  readonly block?: ManagedBlockInput;
}

const SKILL_HINT = "invoke /phasegate-config-doctor";
const SHELL_BEGIN = "# === phasegate managed (BEGIN) ===";
const SHELL_END = "# === phasegate managed (END) ===";
const MARKDOWN_BEGIN = "<!-- phasegate:managed-section:start -->";
const MARKDOWN_END = "<!-- phasegate:managed-section:end -->";
const USER_SECTION_BEGIN = "<!-- phasegate:user-section:start -->";
const USER_SECTION_END = "<!-- phasegate:user-section:end -->";
const USER_SECTION_PLACEHOLDER = "Project-specific agent instructions go here.";
const SHARED_SKILLS_VERSION_PATH = "skills/.harness-version";
const HARNESS_VERSION_BASENAME = ".harness-version";
const SKILL_ROOT_PREFIXES = ["skills", ".claude/skills", ".codex/skills"] as const;

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

async function copySelectedSkillDirectories(
  modelDelegation: ModelDelegationPort,
  harnessRoot: string,
  projectRoot: string,
  targetRoot: string,
  skills: readonly string[],
): Promise<void> {
  await mkdir(targetRoot, { recursive: true });
  const modelDelegationPolicy = await modelDelegation.readPolicy(projectRoot);
  for (const skill of skills) {
    const source = join(harnessRoot, "skills", skill);
    const target = join(targetRoot, skill);
    await rm(target, { recursive: true, force: true });
    await copyDirectory(source, target);
    if (modelDelegationPolicy === "none") {
      const skillPath = join(target, "SKILL.md");
      const content = await readFile(skillPath, "utf8");
      await writeFile(skillPath, modelDelegation.renderSkill(content, modelDelegationPolicy), "utf8");
    }
  }
}

async function listSelectedBundledSkills(harnessRoot: string, skillSet: SkillSet): Promise<string[]> {
  const allowed = new Set(getBundledSkillsForSet(skillSet));
  const entries = await readdir(join(harnessRoot, "skills"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && allowed.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function hasRenderedSkillDrift(
  modelDelegation: ModelDelegationPort,
  harnessRoot: string,
  projectRoot: string,
  targetRoot: string,
  skills: readonly string[],
): Promise<boolean> {
  const modelDelegationPolicy = await modelDelegation.readPolicy(projectRoot);
  for (const skill of skills) {
    const current = await readTextOrNull(join(targetRoot, skill, "SKILL.md"));
    if (current === null) return true;
    const source = await readTextOrNull(join(harnessRoot, "skills", skill, "SKILL.md"));
    if (source === null) continue;
    const expected = modelDelegation.renderSkill(source, modelDelegationPolicy);
    if (current !== expected) return true;
  }
  return false;
}

function normalizeJsonEntry(value: unknown): string {
  return JSON.stringify(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phasegateOwnedJsonEntry(entry: unknown): boolean {
  return normalizeJsonEntry(entry).includes("phasegate");
}

function replaceHookArrays(existing: unknown, incoming: unknown): unknown[] {
  const userEntries = (Array.isArray(existing) ? existing : []).filter((entry) => !phasegateOwnedJsonEntry(entry));
  const seen = new Set(userEntries.map((entry) => normalizeJsonEntry(entry)));
  const result = [...userEntries];
  for (const entry of Array.isArray(incoming) ? incoming : []) {
    const key = normalizeJsonEntry(entry);
    if (!seen.has(key)) {
      result.push(entry);
      seen.add(key);
    }
  }
  return result;
}

function reconcileJsonObject(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };
  const existingHooks = isRecord(existing.hooks) ? existing.hooks : {};
  const incomingHooks = isRecord(incoming.hooks) ? incoming.hooks : {};
  const nextHooks: Record<string, unknown> = {};
  const events = new Set([...Object.keys(existingHooks), ...Object.keys(incomingHooks)]);
  for (const event of events) {
    const entries = replaceHookArrays(existingHooks[event], incomingHooks[event]);
    if (entries.length > 0) nextHooks[event] = entries;
  }
  if (Object.keys(nextHooks).length > 0) result.hooks = nextHooks;
  else delete result.hooks;

  const existingPermissions = isRecord(existing.permissions) ? existing.permissions : {};
  const incomingPermissions = isRecord(incoming.permissions) ? incoming.permissions : {};
  const incomingDeny = Array.isArray(incomingPermissions.deny) ? incomingPermissions.deny : [];
  if (Object.keys(existingPermissions).length > 0 || Object.keys(incomingPermissions).length > 0) {
    const existingDeny = Array.isArray(existingPermissions.deny) ? existingPermissions.deny : [];
    const preservedDeny = existingDeny.filter((entry) => typeof entry !== "string" || !incomingDeny.includes(entry));
    result.permissions = {
      ...existingPermissions,
      ...incomingPermissions,
      deny: [...new Set([...preservedDeny, ...incomingDeny])],
    };
  }
  return result;
}

function reconcileShell(existing: string | null, incoming: string): string {
  const incomingBlock = `${SHELL_BEGIN}\n${incoming.trim()}\n${SHELL_END}`;
  if (existing === null || existing.trim().length === 0) return `${incoming.trim()}\n`;
  const pattern = new RegExp(`${escapeRegExp(SHELL_BEGIN)}[\\s\\S]*?${escapeRegExp(SHELL_END)}`);
  if (pattern.test(existing)) return existing.replace(pattern, incomingBlock).replace(/\s*$/, "\n");
  return `${existing.replace(/\s*$/, "\n\n")}${incomingBlock}\n`;
}

function managedMarkdownBlock(content: string): string {
  const start = content.indexOf(MARKDOWN_BEGIN);
  const end = content.indexOf(MARKDOWN_END);
  if (start === -1 || end === -1 || end < start) return content.trim();
  return content.slice(start, end + MARKDOWN_END.length).trim();
}

// Extracts the user-authored body between the user-section markers. Returns
// null when the markers are absent or the body is blank, so callers fall back
// to the template placeholder.
function extractUserSectionBody(content: string | null): string | null {
  if (content === null) return null;
  const start = content.indexOf(USER_SECTION_BEGIN);
  const end = content.indexOf(USER_SECTION_END);
  if (start === -1 || end === -1 || end < start) return null;
  const body = content.slice(start + USER_SECTION_BEGIN.length, end).trim();
  return body.length === 0 ? null : body;
}

function hasUserSectionMarkers(content: string): boolean {
  const start = content.indexOf(USER_SECTION_BEGIN);
  const end = content.indexOf(USER_SECTION_END);
  return start !== -1 && end !== -1 && start < end;
}

// Legacy (pre-WI-331) templates nested the user-section inside the managed
// section, so replacing the managed block wholesale would wipe user-authored
// instructions with the template placeholder. Re-inject the existing
// user-section body into the incoming block. Blocks without user-section
// markers (all current templates) are returned unchanged; the outside-of-block
// migration for those is handled in reconcileManagedMarkdown.
function restoreUserSection(block: string, existing: string | null): string {
  const start = block.indexOf(USER_SECTION_BEGIN);
  const end = block.indexOf(USER_SECTION_END);
  if (start === -1 || end === -1 || end < start) return block;
  const preserved = extractUserSectionBody(existing);
  if (preserved === null) return block;
  return `${block.slice(0, start + USER_SECTION_BEGIN.length)}\n${preserved}\n${block.slice(end)}`;
}

function reconcileManagedMarkdown(existing: string | null, incoming: string): string {
  if (existing === null || existing.trim().length === 0) return `${incoming.trim()}\n`;
  const incomingBlock = managedMarkdownBlock(incoming);
  const pattern = new RegExp(`${escapeRegExp(MARKDOWN_BEGIN)}[\\s\\S]*?${escapeRegExp(MARKDOWN_END)}`);
  if (!pattern.test(existing)) return `${incomingBlock}\n\n${existing.replace(/\s*$/, "\n")}`;

  const blockStart = existing.indexOf(MARKDOWN_BEGIN);
  const blockEnd = existing.indexOf(MARKDOWN_END) + MARKDOWN_END.length;
  const existingBlock = existing.slice(blockStart, blockEnd);
  const outsideBlock = existing.slice(0, blockStart) + existing.slice(blockEnd);
  const block = restoreUserSection(incomingBlock, existing);
  // Replacer function keeps user-authored text (possibly part of the block)
  // from being interpreted as `$`-substitution patterns by String.replace.
  let next = existing.replace(pattern, () => block);

  // Structure migration (WI-331): the existing file nests the user-section
  // inside the managed block (old template shape) while the incoming block
  // keeps it outside. Replacing the block would drop the user-authored body,
  // so relocate it to just after the managed block — the position the current
  // template uses. When a user-section already exists outside the block, keep
  // that one and do not duplicate.
  if (
    hasUserSectionMarkers(existingBlock) &&
    !hasUserSectionMarkers(incomingBlock) &&
    !hasUserSectionMarkers(outsideBlock)
  ) {
    const body = extractUserSectionBody(existingBlock) ?? USER_SECTION_PLACEHOLDER;
    const insertAt = next.indexOf(MARKDOWN_END) + MARKDOWN_END.length;
    const relocated = `\n\n## User Section\n\n${USER_SECTION_BEGIN}\n${body}\n${USER_SECTION_END}`;
    next = `${next.slice(0, insertAt)}${relocated}${next.slice(insertAt)}`;
  }
  return next.replace(/\s*$/, "\n");
}

function renderAgentContextTemplate(template: string): string {
  const commands = [
    "phasegate doctor",
    "phasegate phasegate:check-ready",
    "phasegate validate --layer L2 --format human",
    "phasegate setup:agent --dry-run",
    "phasegate config:plan --intent l4-strict --dry-run",
  ]
    .map((command) => `- \`${command}\``)
    .join("\n");
  return template
    .replaceAll("{{PHASEGATE_AGENT}}", "both")
    .replaceAll("{{PHASEGATE_SKILLS_MODE}}", "all")
    .replaceAll("{{PHASEGATE_WORKFLOW}}", "standard")
    .replaceAll("{{PHASEGATE_HUSKY_STATE}}", "managed")
    .replaceAll("{{PHASEGATE_CI_STATE}}", "managed")
    .replaceAll("{{PHASEGATE_COMMANDS}}", commands)
    .replaceAll("{{PHASEGATE_SKILLS}}", "- `all bundled skills`")
    .replaceAll("{{PHASEGATE_PRESETS}}", "- `minimal`\n- `standard`\n- `full`\n- `custom`")
    .replaceAll("{{PHASEGATE_USER_SECTION}}", USER_SECTION_PLACEHOLDER);
}

function reconcilePackageJson(existing: Record<string, unknown>, version: string): Record<string, unknown> {
  const devDependencies = isRecord(existing.devDependencies) ? existing.devDependencies : {};
  const scripts = isRecord(existing.scripts) ? existing.scripts : {};
  return {
    ...existing,
    scripts: {
      ...scripts,
      "phasegate:lint": "phasegate lint",
      "phasegate:check-ready": "phasegate phasegate:check-ready",
      "phasegate:doctor": "phasegate doctor",
    },
    devDependencies: {
      ...devDependencies,
      phasegate: `^${version}`,
    },
  };
}

export class RunReconcileUseCase {
  constructor(
    private readonly manifestRepository: ManifestRepositoryPort,
    private readonly hashCalculator: HashCalculatorPort,
    private readonly modelDelegation: ModelDelegationPort,
  ) {}

  async execute(input: RunReconcileInput): Promise<RunReconcileResult> {
    const manifest = await this.manifestRepository.load(input.projectRoot);
    if (manifest === null) {
      const item = this.item(
        ".phasegate/manifest.json",
        "missing-manifest",
        "manual",
        "unknown",
        false,
        "manifest missing; run phasegate install before reconcile",
        "manual setup required",
        SKILL_HINT,
      );
      return { plan: [item], refused: [], changed: [], backupDir: null };
    }

    const includeHusky = input.includeHusky ?? manifest.installationFlags?.includeHusky ?? true;
    const includeCi = input.includeCi ?? manifest.installationFlags?.includeCi ?? true;
    const targets = this.createTargets({ includeHusky, includeCi });
    const targetsByPath = new Map(targets.map((target) => [target.path, target]));
    let nextManifest = DeploymentManifest.reconstitute({
      version: input.phasegateVersion,
      installedAt: manifest.installedAt,
      entries: manifest.entries,
      installationFlags: manifest.installationFlags,
    });
    const plan: ReconcilePlanItem[] = [];
    const refused: ReconcilePlanItem[] = [];
    const changed: ReconcilePlanItem[] = [];
    const backupStamp = `reconcile-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    let backupDir: string | null = null;

    const outcomes: Array<{
      readonly item: ReconcilePlanItem;
      readonly needsBackup: boolean;
      readonly prune?: boolean;
      readonly apply: () => Promise<string | null>;
    }> = [];

    for (const entry of manifest.entries) {
      const target = targetsByPath.get(entry.path);
      if (target === undefined) {
        const item = this.item(
          entry.path,
          "skip",
          "manual",
          "unknown",
          false,
          `${entry.path}: no bundled template`,
          "manual review required",
          SKILL_HINT,
        );
        plan.push(item);
        continue;
      }
      const outcome = await this.planManagedEntry(input, entry, target);
      outcomes.push(outcome);
      plan.push(outcome.item);
      if (
        input.apply &&
        outcome.item.changed &&
        (outcome.item.repairMode === "ai-assisted" || outcome.item.repairMode === "manual") &&
        !input.force
      ) {
        refused.push({ ...outcome.item, action: "refuse" });
      }
    }

    for (const target of targets) {
      if (manifest.findEntry(target.path) !== null) continue;
      const outcome = await this.planMissingTarget(input, target);
      outcomes.push(outcome);
      plan.push(outcome.item);
      if (
        input.apply &&
        outcome.item.changed &&
        (outcome.item.repairMode === "ai-assisted" || outcome.item.repairMode === "manual") &&
        !input.force
      ) {
        refused.push({ ...outcome.item, action: "refuse" });
      }
    }

    const personalInstall = this.isPersonalManifest(manifest);
    if (!personalInstall && this.manifestIntendsSharedSkills(manifest)) {
      const sharedSkills = await listSelectedBundledSkills(input.harnessRoot, "all");
      const outcome = await this.planSharedSkills(input, manifest, sharedSkills, "all");
      outcomes.push(outcome);
      plan.push(outcome.item);
    }
    if (personalInstall) {
      const personalSkills = await listSelectedBundledSkills(input.harnessRoot, "all");
      for (const skillPath of this.personalSkillPaths(manifest)) {
        const outcome = await this.planPersonalSkills(input, manifest, skillPath, personalSkills, "all");
        outcomes.push(outcome);
        plan.push(outcome.item);
      }
    }

    for (const outcome of this.planOrphanSkills(input, manifest)) {
      outcomes.push(outcome);
      plan.push(outcome.item);
    }

    if (!input.apply || refused.length > 0) {
      return { plan, refused, changed, backupDir: null };
    }

    for (const outcome of outcomes) {
      if (!outcome.item.changed) continue;
      if (outcome.prune === true) {
        await outcome.apply();
        nextManifest = nextManifest.removeEntry(outcome.item.path);
        changed.push(outcome.item);
        continue;
      }
      if (outcome.needsBackup) {
        backupDir ??= join(input.projectRoot, ".phasegate", "backups", backupStamp);
        await this.backup(input.projectRoot, outcome.item.path, backupDir);
      }
      const hashContent = await outcome.apply();
      changed.push(outcome.item);
      if (hashContent !== null) {
        if (outcome.item.strategy === "copy-dir" && outcome.item.path === "skills") {
          const sharedSkills = await listSelectedBundledSkills(input.harnessRoot, "all");
          nextManifest = nextManifest.addEntry(
            this.createdEntry(
              SHARED_SKILLS_VERSION_PATH,
              this.sharedSkillsVersionHashInput(input.phasegateVersion, "all", sharedSkills),
            ),
          );
          for (const skill of sharedSkills) {
            nextManifest = nextManifest.addEntry(
              this.createdEntry(`skills/${skill}`, this.sharedSkillHashInput(skill, input.phasegateVersion, "all")),
            );
          }
        } else if (
          outcome.item.strategy === "copy-dir" &&
          (outcome.item.path === ".claude/skills" || outcome.item.path === ".codex/skills")
        ) {
          const personalSkills = await listSelectedBundledSkills(input.harnessRoot, "all");
          nextManifest = nextManifest.addEntry(
            this.createdEntry(
              `${outcome.item.path}/.harness-version`,
              this.personalSkillsVersionHashInput(outcome.item.path, input.phasegateVersion, "all", personalSkills),
            ),
          );
          for (const skill of personalSkills) {
            nextManifest = nextManifest.addEntry(
              this.createdEntry(
                `${outcome.item.path}/${skill}`,
                this.personalSkillHashInput(outcome.item.path, skill, input.phasegateVersion, "all"),
              ),
            );
          }
        } else {
          const mode =
            outcome.item.strategy === "symlink"
              ? "symlink"
              : outcome.item.action === "add"
                ? "created"
                : (manifest.findEntry(outcome.item.path)?.mode ?? "merged");
          nextManifest = nextManifest.addEntry(
            DeploymentEntry.create({
              path: outcome.item.path,
              mode,
              block: mode === "merged" ? this.managedBlockFor(outcome.item.path, outcome.item.strategy) : null,
              hash: this.hashCalculator.compute(hashContent),
              deployedAt: new Date().toISOString(),
            }),
          );
        }
      }
    }

    if (changed.length > 0 || manifest.version !== input.phasegateVersion) {
      await this.manifestRepository.save(input.projectRoot, nextManifest);
    }
    return { plan, refused, changed, backupDir };
  }

  private async planManagedEntry(input: RunReconcileInput, entry: DeploymentEntry, target: ReconcileTarget) {
    if (target.strategy === "symlink") return this.planSymlink(input.projectRoot, target.path);
    const absolutePath = this.resolveProjectPath(input.projectRoot, entry.path);
    const before = await readTextOrNull(absolutePath);
    if (before === null) return this.planMissingTarget(input, target);
    const currentHash = this.hashCalculator.compute(before);
    const matchesManifest = currentHash.equals(entry.hash);
    const rawTemplate = target.templatePath ? await readFile(join(input.harnessRoot, target.templatePath), "utf8") : "";
    const template = target.strategy === "markdown-managed" ? renderAgentContextTemplate(rawTemplate) : rawTemplate;
    const next =
      entry.mode === "created" && target.strategy !== "package-json" && target.strategy !== "markdown-managed"
        ? template
        : this.reconcileContent(target, before, template, input.phasegateVersion);
    const changed = before !== next;
    const repairMode: RepairMode = matchesManifest ? "mechanical" : "ai-assisted";
    return {
      item: this.item(
        entry.path,
        changed ? "update" : "skip",
        repairMode,
        target.strategy,
        changed,
        changed ? `${entry.path}: update managed portion` : `${entry.path}: already up to date`,
        this.diffSummary(before, next),
        repairMode === "ai-assisted" ? SKILL_HINT : null,
      ),
      needsBackup: !matchesManifest || input.force,
      apply: async () => {
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, next, "utf8");
        if (target.executable) await chmod(absolutePath, 0o755);
        return next;
      },
    };
  }

  private async planMissingTarget(input: RunReconcileInput, target: ReconcileTarget) {
    if (target.strategy === "symlink") return this.planSymlink(input.projectRoot, target.path);
    const absolutePath = this.resolveProjectPath(input.projectRoot, target.path);
    const before = await readTextOrNull(absolutePath);
    const rawTemplate = target.templatePath ? await readFile(join(input.harnessRoot, target.templatePath), "utf8") : "";
    const template = target.strategy === "markdown-managed" ? renderAgentContextTemplate(rawTemplate) : rawTemplate;
    const next =
      before === null && target.strategy !== "package-json"
        ? template
        : this.reconcileContent(target, before, template, input.phasegateVersion);
    const changed = before !== next;
    const repairMode: RepairMode =
      target.strategy === "shell" && before !== null && !before.includes(SHELL_BEGIN) ? "ai-assisted" : "mechanical";
    return {
      item: this.item(
        target.path,
        before === null ? "add" : changed ? "update" : "skip",
        repairMode,
        target.strategy,
        changed,
        changed ? `${target.path}: add missing managed target` : `${target.path}: already up to date`,
        this.diffSummary(before, next),
        repairMode === "ai-assisted" ? SKILL_HINT : null,
      ),
      needsBackup: before !== null,
      apply: async () => {
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, next, "utf8");
        if (target.executable) await chmod(absolutePath, 0o755);
        return next;
      },
    };
  }

  private async planSymlink(projectRoot: string, relativePath: string) {
    const absolutePath = this.resolveProjectPath(projectRoot, relativePath);
    try {
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink() && (await readlink(absolutePath)) === "../skills") {
        return {
          item: this.item(
            relativePath,
            "skip",
            "mechanical",
            "symlink",
            false,
            `${relativePath}: already linked`,
            "no changes",
            null,
          ),
          needsBackup: false,
          apply: async () => "../skills",
        };
      }
      return {
        item: this.item(
          relativePath,
          "skip",
          "manual",
          "symlink",
          false,
          `${relativePath}: existing non-phasegate path requires manual review`,
          "manual review required",
          SKILL_HINT,
        ),
        needsBackup: false,
        apply: async () => null,
      };
    } catch {
      return {
        item: this.item(
          relativePath,
          "link",
          "mechanical",
          "symlink",
          true,
          `${relativePath}: create symlink`,
          "+ symlink ../skills",
          null,
        ),
        needsBackup: false,
        apply: async () => {
          await mkdir(join(projectRoot, "skills"), { recursive: true });
          await mkdir(dirname(absolutePath), { recursive: true });
          await symlink("../skills", absolutePath, process.platform === "win32" ? "junction" : "dir");
          return "../skills";
        },
      };
    }
  }

  private manifestIntendsSharedSkills(manifest: DeploymentManifest): boolean {
    return (
      manifest.findEntry(".claude/skills") !== null ||
      manifest.findEntry(".codex/skills") !== null ||
      manifest.entries.some((entry) => entry.path.startsWith("skills/"))
    );
  }

  private isPersonalManifest(manifest: DeploymentManifest): boolean {
    // Manifests written since WI-326 record the install mode explicitly;
    // older manifests fall back to the legacy entry-shape heuristic.
    if (manifest.installationFlags !== undefined) return manifest.installationFlags.personal;
    return (
      manifest.findEntry(".phasegate-local/phasegate.config.json") !== null ||
      manifest.entries.some(
        (entry) => (entry.path === ".claude/skills" || entry.path === ".codex/skills") && entry.mode === "created",
      ) ||
      manifest.entries.some(
        (entry) => entry.path.startsWith(".claude/skills/") || entry.path.startsWith(".codex/skills/"),
      )
    );
  }

  private personalSkillPaths(manifest: DeploymentManifest): Array<".claude/skills" | ".codex/skills"> {
    const paths = new Set<".claude/skills" | ".codex/skills">();
    if (
      manifest.findEntry(".claude/skills") !== null ||
      manifest.entries.some((entry) => entry.path.startsWith(".claude/skills/"))
    )
      paths.add(".claude/skills");
    if (
      manifest.findEntry(".codex/skills") !== null ||
      manifest.entries.some((entry) => entry.path.startsWith(".codex/skills/"))
    )
      paths.add(".codex/skills");
    return [...paths].sort();
  }

  private async planSharedSkills(
    input: RunReconcileInput,
    manifest: DeploymentManifest,
    skills: readonly string[],
    skillSet: SkillSet,
  ) {
    const versionContent = await readTextOrNull(this.resolveProjectPath(input.projectRoot, SHARED_SKILLS_VERSION_PATH));
    const expectedVersion = `"version": "${input.phasegateVersion}"`;
    let missingSkill = false;
    for (const skill of skills) {
      if (!(await exists(this.resolveProjectPath(input.projectRoot, `skills/${skill}/SKILL.md`)))) {
        missingSkill = true;
        break;
      }
    }
    const missingManifest =
      manifest.findEntry(SHARED_SKILLS_VERSION_PATH) === null ||
      skills.some((skill) => manifest.findEntry(`skills/${skill}`) === null);
    const renderedSkillDrift = await hasRenderedSkillDrift(
      this.modelDelegation,
      input.harnessRoot,
      input.projectRoot,
      this.resolveProjectPath(input.projectRoot, "skills"),
      skills,
    );
    const changed =
      versionContent === null ||
      !versionContent.includes(expectedVersion) ||
      missingSkill ||
      missingManifest ||
      renderedSkillDrift;
    return {
      item: this.item(
        "skills",
        changed ? "add" : "skip",
        "mechanical",
        "copy-dir",
        changed,
        changed ? "skills: deploy shared bundled skills" : "skills: already up to date",
        changed ? `+ ${skills.length} bundled skills (${skillSet})` : "no changes",
        null,
      ),
      needsBackup: false,
      apply: async () => {
        if (!changed) return null;
        await this.deploySharedSkills(input, skills, skillSet);
        return this.sharedSkillsVersionHashInput(input.phasegateVersion, skillSet, skills);
      },
    };
  }

  private async deploySharedSkills(
    input: RunReconcileInput,
    skills: readonly string[],
    skillSet: SkillSet,
  ): Promise<void> {
    const targetRoot = this.resolveProjectPath(input.projectRoot, "skills");
    await copySelectedSkillDirectories(this.modelDelegation, input.harnessRoot, input.projectRoot, targetRoot, skills);
    await writeFile(
      join(targetRoot, ".harness-version"),
      `${JSON.stringify({ version: input.phasegateVersion, deployedAt: new Date().toISOString(), skillSet }, null, 2)}\n`,
      "utf8",
    );
  }

  private async planPersonalSkills(
    input: RunReconcileInput,
    manifest: DeploymentManifest,
    relativePath: ".claude/skills" | ".codex/skills",
    skills: readonly string[],
    skillSet: SkillSet,
  ) {
    const versionPath = this.resolveProjectPath(input.projectRoot, `${relativePath}/.harness-version`);
    const versionContent = await readTextOrNull(versionPath);
    const expectedVersion = `"version": "${input.phasegateVersion}"`;
    let missingSkill = false;
    for (const skill of skills) {
      if (!(await exists(this.resolveProjectPath(input.projectRoot, `${relativePath}/${skill}/SKILL.md`)))) {
        missingSkill = true;
        break;
      }
    }
    const missingManifest =
      manifest.findEntry(`${relativePath}/.harness-version`) === null ||
      skills.some((skill) => manifest.findEntry(`${relativePath}/${skill}`) === null);
    const renderedSkillDrift = await hasRenderedSkillDrift(
      this.modelDelegation,
      input.harnessRoot,
      input.projectRoot,
      this.resolveProjectPath(input.projectRoot, relativePath),
      skills,
    );
    const changed =
      versionContent === null ||
      !versionContent.includes(expectedVersion) ||
      missingSkill ||
      missingManifest ||
      renderedSkillDrift;
    return {
      item: this.item(
        relativePath,
        changed ? "add" : "skip",
        "mechanical",
        "copy-dir",
        changed,
        changed ? `${relativePath}: deploy bundled skills` : `${relativePath}: already up to date`,
        changed ? `+ ${skills.length} bundled skills (${skillSet})` : "no changes",
        null,
      ),
      needsBackup: false,
      apply: async () => {
        if (!changed) return null;
        const targetRoot = this.resolveProjectPath(input.projectRoot, relativePath);
        await copySelectedSkillDirectories(
          this.modelDelegation,
          input.harnessRoot,
          input.projectRoot,
          targetRoot,
          skills,
        );
        await writeFile(
          join(targetRoot, ".harness-version"),
          `${JSON.stringify({ version: input.phasegateVersion, deployedAt: new Date().toISOString(), skillSet }, null, 2)}\n`,
          "utf8",
        );
        return this.personalSkillsVersionHashInput(relativePath, input.phasegateVersion, skillSet, skills);
      },
    };
  }

  private planOrphanSkills(
    input: RunReconcileInput,
    manifest: DeploymentManifest,
  ): Array<{
    readonly item: ReconcilePlanItem;
    readonly needsBackup: boolean;
    readonly prune: boolean;
    readonly apply: () => Promise<string | null>;
  }> {
    const allowed = new Set(getBundledSkillsForSet("all"));
    const outcomes: Array<{
      readonly item: ReconcilePlanItem;
      readonly needsBackup: boolean;
      readonly prune: boolean;
      readonly apply: () => Promise<string | null>;
    }> = [];
    for (const entry of manifest.entries) {
      if (entry.mode !== "created") continue;
      const skillName = this.orphanSkillName(entry.path, allowed);
      if (skillName === null) continue;
      const absolutePath = this.resolveProjectPath(input.projectRoot, entry.path);
      outcomes.push({
        item: this.item(
          entry.path,
          "prune",
          "mechanical",
          "copy-dir",
          true,
          `${entry.path}: prune orphan skill (not in current bundle)`,
          "- skill directory",
          null,
        ),
        needsBackup: false,
        prune: true,
        apply: async () => {
          await rm(absolutePath, { recursive: true, force: true });
          return null;
        },
      });
    }
    return outcomes;
  }

  private orphanSkillName(entryPath: string, allowed: ReadonlySet<string>): string | null {
    for (const prefix of SKILL_ROOT_PREFIXES) {
      const marker = `${prefix}/`;
      if (!entryPath.startsWith(marker)) continue;
      const remainder = entryPath.slice(marker.length);
      if (remainder.length === 0 || remainder.includes("/")) return null;
      if (remainder === HARNESS_VERSION_BASENAME) return null;
      if (allowed.has(remainder)) return null;
      return remainder;
    }
    return null;
  }

  private createdEntry(path: string, hashInput: string): DeploymentEntry {
    return DeploymentEntry.create({
      path,
      mode: "created",
      block: null,
      hash: this.hashCalculator.compute(hashInput),
      deployedAt: new Date().toISOString(),
    });
  }

  private sharedSkillsVersionHashInput(version: string, skillSet: SkillSet, skills: readonly string[]): string {
    return `shared-skills-version:${version}:${skillSet}:${skills.join(",")}`;
  }

  private sharedSkillHashInput(skill: string, version: string, skillSet: SkillSet): string {
    return `shared-skill:${skill}:${version}:${skillSet}`;
  }

  private personalSkillsVersionHashInput(
    path: string,
    version: string,
    skillSet: SkillSet,
    skills: readonly string[],
  ): string {
    return `personal-skills-version:${path}:${version}:${skillSet}:${skills.join(",")}`;
  }

  private personalSkillHashInput(path: string, skill: string, version: string, skillSet: SkillSet): string {
    return `personal-skill:${path}:${skill}:${version}:${skillSet}`;
  }

  private reconcileContent(target: ReconcileTarget, before: string | null, template: string, version: string): string {
    if (target.strategy === "yaml-add") return template;
    if (target.strategy === "shell") return reconcileShell(before, template);
    if (target.strategy === "markdown-managed") return reconcileManagedMarkdown(before, template);
    if (target.strategy === "package-json") {
      const existing = before === null ? {} : (JSON.parse(before) as unknown);
      return `${JSON.stringify(reconcilePackageJson(isRecord(existing) ? existing : {}, version), null, 2)}\n`;
    }
    const existing = before === null ? {} : (JSON.parse(before) as unknown);
    const incoming = JSON.parse(template) as unknown;
    return `${JSON.stringify(reconcileJsonObject(isRecord(existing) ? existing : {}, isRecord(incoming) ? incoming : {}), null, 2)}\n`;
  }

  private createTargets(options: {
    readonly includeHusky: boolean;
    readonly includeCi: boolean;
  }): readonly ReconcileTarget[] {
    return [
      { path: ".claude/settings.json", strategy: "json", templatePath: "templates/.claude/settings.json" },
      {
        path: "CLAUDE.md",
        strategy: "markdown-managed",
        templatePath: "docs/templates/agent-context/CLAUDE.md.template.md",
        block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate CLAUDE.md managed section" },
      },
      { path: ".codex/hooks.json", strategy: "json", templatePath: "templates/.codex/hooks.json" },
      {
        path: "AGENTS.md",
        strategy: "markdown-managed",
        templatePath: "docs/templates/agent-context/AGENTS.md.template.md",
        block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate AGENTS.md managed section" },
      },
      ...(options.includeHusky
        ? ([
            {
              path: ".husky/pre-commit",
              strategy: "shell",
              templatePath: "docs/templates/hooks/pre-commit",
              executable: true,
              block: { start: SHELL_BEGIN, end: SHELL_END, content: "phasegate pre-commit managed block" },
            },
            {
              path: ".husky/commit-msg",
              strategy: "shell",
              templatePath: "docs/templates/hooks/commit-msg",
              executable: true,
              block: { start: SHELL_BEGIN, end: SHELL_END, content: "phasegate commit-msg managed block" },
            },
            {
              path: ".husky/pre-push",
              strategy: "shell",
              templatePath: "docs/templates/hooks/pre-push",
              executable: true,
              block: { start: SHELL_BEGIN, end: SHELL_END, content: "phasegate pre-push managed block" },
            },
          ] as const satisfies readonly ReconcileTarget[])
        : []),
      ...(options.includeCi
        ? ([
            {
              path: ".github/workflows/phasegate-aidlc-gate.yml",
              strategy: "yaml-add",
              templatePath: "docs/templates/ci/aidlc-gate.yml",
            },
          ] as const satisfies readonly ReconcileTarget[])
        : []),
      { path: "package.json", strategy: "package-json", templatePath: "package.json" },
      { path: ".claude/skills", strategy: "symlink" },
      { path: ".codex/skills", strategy: "symlink" },
    ];
  }

  private async backup(projectRoot: string, relativePath: string, backupDir: string): Promise<void> {
    const source = this.resolveProjectPath(projectRoot, relativePath);
    if (!(await exists(source))) return;
    const target = join(backupDir, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }

  private managedBlockFor(path: string, strategy: StrategyType): ManagedBlockInput | null {
    if (strategy === "shell") return { start: SHELL_BEGIN, end: SHELL_END, content: `phasegate ${path} managed block` };
    if (strategy === "json" || strategy === "package-json" || strategy === "markdown-managed") {
      return { start: "phasegate structured merge", end: "phasegate structured merge", content: `${strategy}:${path}` };
    }
    return null;
  }

  private resolveProjectPath(projectRoot: string, relativePath: string): string {
    const absolutePath = resolve(projectRoot, relativePath);
    const root = resolve(projectRoot);
    if (
      absolutePath !== root &&
      !absolutePath.startsWith(`${root}/`) &&
      relative(root, absolutePath).startsWith("..")
    ) {
      throw new Error(`Manifest entry escapes project root: ${relativePath}`);
    }
    return absolutePath;
  }

  private diffSummary(before: string | null, next: string): string {
    if (before === next) return "no changes";
    if (before === null) return `+ ${next.split(/\r?\n/).filter(Boolean).length} lines`;
    return `~ ${before.length} bytes -> ${next.length} bytes`;
  }

  private item(
    path: string,
    action: ReconcileAction,
    repairMode: RepairMode,
    strategy: StrategyType,
    changed: boolean,
    summary: string,
    diff: string,
    skillHint: string | null,
  ): ReconcilePlanItem {
    return { path, action, repairMode, strategy, changed, summary, diff, skillHint };
  }
}
