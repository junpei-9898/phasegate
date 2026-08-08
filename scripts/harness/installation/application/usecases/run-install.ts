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
// @work-item-id WI-216
// @work-item-id WI-219
// @work-item-id WI-315
// @work-item-id WI-326
// @work-item-id WI-331
// @work-item-id WI-385
// @work-item-id WI-387

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
import { dirname, join } from "node:path";
import { type AgentTarget, resolveAgentTarget } from "../../domain/agent-target.js";
import { DeploymentEntry } from "../../domain/deployment-entry.js";
import { DeploymentManifest, type InstallationFlags } from "../../domain/deployment-manifest.js";
import type { ManagedBlockInput } from "../../domain/managed-block.js";
import type { RepairMode } from "../../domain/repair-mode.js";
import { getBundledSkillsForSet, type SkillSet } from "../bundled-skill-selection.js";
import { mergeNamedHookJson } from "../named-hook-json.js";
import type { HashCalculatorPort } from "../ports/hash-calculator-port.js";
import type { ManifestRepositoryPort } from "../ports/manifest-repository-port.js";
import type { ModelDelegationPort } from "../ports/model-delegation-port.js";

type InstallAction = "missing" | "will-merge" | "will-skip" | "will-overwrite";
type StrategyType =
  | "json"
  | "json-named"
  | "shell"
  | "yaml-add"
  | "package-json"
  | "markdown-managed"
  | "text-managed"
  | "copy"
  | "copy-dir"
  | "symlink";

export interface InstallPlanItem {
  readonly path: string;
  readonly action: InstallAction;
  readonly repairMode: RepairMode;
  readonly strategy: StrategyType;
  readonly changed: boolean;
  readonly summary: string;
  readonly diff: string;
  readonly skillHint: string | null;
  // Non-null when a target could not be applied cleanly and the user must act
  // (e.g. a pre-existing git hook that phasegate will not overwrite). Surfaces
  // situations that would otherwise be silently skipped.
  readonly warning: string | null;
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
  readonly agent?: AgentTarget;
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
const USER_SECTION_BEGIN = "<!-- phasegate:user-section:start -->";
const USER_SECTION_END = "<!-- phasegate:user-section:end -->";
const USER_SECTION_PLACEHOLDER = "Project-specific agent instructions go here.";
const TEXT_BEGIN = "# phasegate personal install exclude (BEGIN)";
const TEXT_END = "# phasegate personal install exclude (END)";
const PERSONAL_AGENT_RUNTIME_FILES = new Set([
  ".claude/CLAUDE.md",
  ".claude/settings.json",
  "AGENTS.md",
  ".codex/hooks.json",
  ".agents/hooks.json",
]);
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
  const skillsSource = join(harnessRoot, "skills");
  const allowed = new Set(getBundledSkillsForSet(skillSet));
  const entries = await readdir(skillsSource, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && allowed.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

// Canonical, key-order-independent serialization used as a dedup key when
// merging hook arrays. Plain `JSON.stringify` is sensitive to object key order,
// so two structurally identical hook entries authored with different key orders
// would be treated as distinct and appended on every merge, breaking merge
// idempotency. Sorting keys recursively makes the key stable.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = canonicalize(record[key]);
    }
    return sorted;
  }
  return value;
}

function normalizeJsonEntry(value: unknown): string {
  return JSON.stringify(canonicalize(value));
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

function mergeJsonObject(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
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
// migration for those is handled in mergeManagedMarkdown.
function restoreUserSection(block: string, existing: string | null): string {
  const start = block.indexOf(USER_SECTION_BEGIN);
  const end = block.indexOf(USER_SECTION_END);
  if (start === -1 || end === -1 || end < start) return block;
  const preserved = extractUserSectionBody(existing);
  if (preserved === null) return block;
  return `${block.slice(0, start + USER_SECTION_BEGIN.length)}\n${preserved}\n${block.slice(end)}`;
}

function mergeManagedMarkdown(existing: string | null, incoming: string): string {
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

function renderAgentContextTemplate(
  template: string,
  options: {
    readonly agent: AgentTarget;
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
    .replaceAll("{{PHASEGATE_USER_SECTION}}", USER_SECTION_PLACEHOLDER);
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
  if (code === "EPERM")
    return `Review sandbox or filesystem permissions for ${target}, ask the user for write access when needed, then rerun phasegate setup:agent --apply or phasegate install --apply.`;
  if (code === "EACCES") return `Fix ownership or permissions for ${target}, then rerun phasegate install --apply.`;
  if (code === "EROFS")
    return `Move the project to a writable filesystem or rerun in a writable workspace before applying ${target}.`;
  if (code === "EEXIST" || code === "ENOTDIR")
    return `Inspect the parent path for ${target}; if it is user-owned, rename or move it before rerunning phasegate install --dry-run --json and then --apply.`;
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
    private readonly modelDelegation: ModelDelegationPort,
  ) {}

  async execute(input: RunInstallInput): Promise<RunInstallResult> {
    const legacyIncludeClaude = input.includeClaude ?? true;
    const legacyIncludeCodex = input.includeCodex ?? true;
    const includeHusky = input.includeHusky ?? true;
    const includeCi = input.includeCi ?? true;
    const skillSet = input.skillSet ?? "all";
    const workflow = input.workflow ?? "standard";
    const agent =
      input.agent ?? (legacyIncludeClaude && legacyIncludeCodex ? "both" : legacyIncludeCodex ? "codex" : "claude");
    const selection = resolveAgentTarget(agent);
    const personal = input.personal ?? false;
    const targets = personal
      ? this.createPersonalTargets(selection)
      : this.createTargets({ ...selection, includeHusky, includeCi });
    // Persist the effective opt-in state so a later reconcile can honor the
    // original install options. Personal installs never deploy Husky/CI
    // targets, so their effective state is recorded as false regardless of
    // input.
    const installationFlags: InstallationFlags = {
      includeHusky: personal ? false : includeHusky,
      includeCi: personal ? false : includeCi,
      personal,
    };
    const existingManifest = await this.manifestRepository.load(input.projectRoot);
    const baseManifest = existingManifest ?? DeploymentManifest.create(input.phasegateVersion);
    let manifest = baseManifest.withInstallationFlags(installationFlags);
    const plan: InstallPlanItem[] = [];
    const refused: InstallPlanItem[] = [];
    const changed: InstallPlanItem[] = [];
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    let backupDir: string | null = null;

    for (const target of targets) {
      const absolutePath = join(input.projectRoot, target.path);
      const before = await readTextOrNull(absolutePath);
      const rawTemplate = await readFile(join(input.harnessRoot, target.templatePath), "utf8");
      const template =
        target.strategy === "markdown-managed"
          ? renderAgentContextTemplate(rawTemplate, { agent, skillSet, workflow, includeHusky, includeCi })
          : rawTemplate;
      const existingEntry = baseManifest.findEntry(target.path);
      const beforeHash = before === null ? null : this.hashCalculator.compute(before);
      const unmanagedPersonalRuntimeFile =
        input.personal &&
        (PERSONAL_AGENT_RUNTIME_FILES.has(target.path) || target.personalManualIfUnmanaged === true) &&
        before !== null &&
        !before.includes(MARKDOWN_BEGIN) &&
        (existingEntry === null || beforeHash === null || !beforeHash.equals(existingEntry.hash));
      const repairMode = unmanagedPersonalRuntimeFile ? "manual" : this.repairMode(target, before);
      const next = unmanagedPersonalRuntimeFile ? before : this.merge(target, before, template, input.phasegateVersion);
      const didChange = before !== next;
      const action = this.actionFor(before, didChange, input.force);
      // A `copy` target with a pre-existing, non-matching file is left untouched
      // (merge returns `before`). For executable git hooks this means the
      // phasegate hook is NOT wired in — warn instead of skipping silently.
      const preservedExistingHook =
        target.strategy === "copy" &&
        target.executable === true &&
        before !== null &&
        before.trim() !== template.trim() &&
        !input.force;
      const warning = preservedExistingHook
        ? `${target.path}: an existing hook was found and left unchanged; phasegate's checks are NOT wired in. Merge the phasegate hook manually (or rerun with --force to back up and overwrite).`
        : null;
      const item: InstallPlanItem = {
        path: target.path,
        action,
        repairMode,
        strategy: target.strategy,
        changed: didChange,
        summary: unmanagedPersonalRuntimeFile
          ? `${target.path}: existing non-phasegate runtime path requires manual review`
          : warning !== null
            ? warning
            : didChange
              ? `${target.path}: ${action}`
              : `${target.path}: already up to date`,
        diff: unmanagedPersonalRuntimeFile ? "manual review required" : this.diffSummary(before, next),
        skillHint: repairMode === "ai-assisted" ? SKILL_HINT : null,
        warning,
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
      if (manifestEntry?.hash.equals(hash)) {
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
          ...(selection.claudeSkills ? [".claude/skills"] : []),
          ...(selection.codexSkills ? [".codex/skills"] : []),
          ...(selection.antigravitySkills ? [".agents/skills"] : []),
        ]
      : [];
    const selectedPersonalSkills = input.personal ? await listSelectedBundledSkills(input.harnessRoot, skillSet) : [];
    for (const skillPath of personalSkillTargets) {
      const item = await this.planPersonalSkillDirectory(input, skillPath, selectedPersonalSkills, baseManifest);
      plan.push(item);
      if (input.apply && item.changed && item.repairMode === "mechanical") {
        try {
          await copySelectedSkillDirectories(
            this.modelDelegation,
            input.harnessRoot,
            input.projectRoot,
            join(input.projectRoot, skillPath),
            selectedPersonalSkills,
          );
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
          path: `${item.path}/.harness-version`,
          mode: "created",
          contentForHash: this.personalSkillsVersionHashInput(
            item.path,
            input.phasegateVersion,
            skillSet,
            selectedPersonalSkills,
          ),
        });
        for (const skill of selectedPersonalSkills) {
          manifest = this.addManifestEntry(baseManifest, manifest, {
            path: `${item.path}/${skill}`,
            mode: "created",
            contentForHash: this.personalSkillHashInput(item.path, skill, input.phasegateVersion, skillSet),
          });
        }
      }
    }

    if (!input.personal && (selection.claudeSkills || selection.codexSkills || selection.antigravitySkills)) {
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
          ...(selection.claudeSkills ? [{ path: ".claude/skills", target: "../skills" }] : []),
          ...(selection.codexSkills ? [{ path: ".codex/skills", target: "../skills" }] : []),
          ...(selection.antigravitySkills ? [{ path: ".agents/skills", target: "../skills" }] : []),
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
        await symlink(
          linkSpec.target,
          join(input.projectRoot, linkSpec.path),
          process.platform === "win32" ? "junction" : "dir",
        );
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

    if (input.personal && selection.codexHook) {
      plan.push({
        path: "~/.codex/config.toml",
        action: "will-skip",
        repairMode: "manual",
        strategy: "json",
        changed: false,
        summary:
          "~/.codex/config.toml: personal mode does not write user-level Codex feature flags; enable hooks manually when needed",
        diff: "manual Codex hooks feature enablement may be required",
        skillHint: null,
        warning: null,
      });
    }

    // Re-save on apply when the recorded install flags drift from a previous
    // manifest (e.g. re-install with different --with-husky/--with-ci), even
    // if no managed file content changed. A missing manifest with zero changes
    // keeps the legacy behavior of not creating one.
    const flagsDrifted =
      existingManifest !== null && !this.installationFlagsEqual(existingManifest.installationFlags, installationFlags);
    if (input.apply && (changed.length > 0 || flagsDrifted)) {
      try {
        await this.manifestRepository.save(input.projectRoot, manifest);
      } catch (error) {
        return this.withApplyError(
          { plan, refused, changed, backupDir },
          ".phasegate/manifest.json",
          "manifest-save",
          error,
        );
      }
    }

    return { plan, refused, changed, backupDir };
  }

  private installationFlagsEqual(existing: InstallationFlags | undefined, next: InstallationFlags): boolean {
    return (
      existing !== undefined &&
      existing.includeHusky === next.includeHusky &&
      existing.includeCi === next.includeCi &&
      existing.personal === next.personal
    );
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
    readonly claudeHook: boolean;
    readonly claudeContext: boolean;
    readonly codexHook: boolean;
    readonly agentsContext: boolean;
    readonly antigravityHook: boolean;
    readonly includeHusky: boolean;
    readonly includeCi: boolean;
  }): readonly InstallTarget[] {
    return [
      {
        path: "phasegate.config.json",
        strategy: "copy" as const,
        templatePath: "docs/templates/project/phasegate.config.json",
      },
      ...(options.claudeHook
        ? [
            {
              path: ".claude/settings.json",
              strategy: "json" as const,
              templatePath: "templates/.claude/settings.json",
            },
            {
              path: ".claude/scripts/deny-check.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/deny-check.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/format-settings-hook.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/format-settings-hook.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/format-typescript-hook.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/format-typescript-hook.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/analyze-errors-hook.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/analyze-errors-hook.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/hook-config.json",
              strategy: "copy" as const,
              templatePath: "templates/.claude/scripts/hook-config.json",
            },
            ...(options.claudeContext
              ? [
                  {
                    path: "CLAUDE.md",
                    strategy: "markdown-managed" as const,
                    templatePath: "docs/templates/agent-context/CLAUDE.md.template.md",
                    block: { start: MARKDOWN_BEGIN, end: MARKDOWN_END, content: "phasegate CLAUDE.md managed section" },
                  },
                ]
              : []),
          ]
        : []),
      ...(options.codexHook
        ? [{ path: ".codex/hooks.json", strategy: "json" as const, templatePath: "templates/.codex/hooks.json" }]
        : []),
      ...(options.antigravityHook
        ? [
            {
              path: ".agents/hooks.json",
              strategy: "json-named" as const,
              templatePath: "templates/.agents/hooks.json",
            },
          ]
        : []),
      ...(options.agentsContext
        ? [
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

  private createPersonalTargets(options: {
    readonly claudeHook: boolean;
    readonly claudeContext: boolean;
    readonly codexHook: boolean;
    readonly agentsContext: boolean;
    readonly antigravityHook: boolean;
  }): readonly InstallTarget[] {
    return [
      {
        path: ".phasegate-local/phasegate.config.json",
        strategy: "copy" as const,
        templatePath: "docs/templates/personal/phasegate-local-config.json",
      },
      ...(options.claudeHook
        ? [
            ...(options.claudeContext
              ? [
                  {
                    path: ".claude/CLAUDE.md",
                    strategy: "markdown-managed" as const,
                    templatePath: "docs/templates/agent-context/CLAUDE.md.template.md",
                    block: {
                      start: MARKDOWN_BEGIN,
                      end: MARKDOWN_END,
                      content: "phasegate personal .claude/CLAUDE.md managed section",
                    },
                    personalManualIfUnmanaged: true,
                  },
                ]
              : []),
            {
              path: ".claude/settings.json",
              strategy: "copy" as const,
              templatePath: "templates/.claude/settings.json",
            },
            {
              path: ".claude/scripts/deny-check.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/deny-check.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/format-settings-hook.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/format-settings-hook.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/format-typescript-hook.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/format-typescript-hook.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/analyze-errors-hook.sh",
              strategy: "shell" as const,
              templatePath: "templates/.claude/scripts/analyze-errors-hook.sh",
              executable: true,
            },
            {
              path: ".claude/scripts/hook-config.json",
              strategy: "copy" as const,
              templatePath: "templates/.claude/scripts/hook-config.json",
            },
          ]
        : []),
      ...(options.agentsContext
        ? [
            {
              path: "AGENTS.md",
              strategy: "markdown-managed" as const,
              templatePath: "docs/templates/agent-context/AGENTS.md.template.md",
              block: {
                start: MARKDOWN_BEGIN,
                end: MARKDOWN_END,
                content: "phasegate personal AGENTS.md managed section",
              },
              personalManualIfUnmanaged: true,
            },
          ]
        : []),
      ...(options.codexHook
        ? [
            {
              path: ".codex/hooks.json",
              strategy: "copy" as const,
              templatePath: "templates/.codex/hooks.json",
            },
          ]
        : []),
      ...(options.antigravityHook
        ? [
            {
              path: ".agents/hooks.json",
              strategy: "json-named" as const,
              templatePath: "templates/.agents/hooks.json",
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
    if (target.strategy === "json-named") return jsonRepairMode(before);
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
    if (target.strategy === "json-named") {
      const merged = mergeNamedHookJson(isRecord(existing) ? existing : {}, isRecord(incoming) ? incoming : {});
      return `${JSON.stringify(merged, null, 2)}\n`;
    }
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
    skills: readonly string[],
    baseManifest: DeploymentManifest,
  ): Promise<InstallPlanItem> {
    const absolutePath = join(input.projectRoot, relativePath);
    try {
      const stat = await lstat(absolutePath);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        return {
          path: relativePath,
          action: "will-merge",
          repairMode: "manual",
          strategy: "copy-dir",
          changed: false,
          summary: `${relativePath}: existing non-directory skills path requires manual review`,
          diff: "manual review required",
          skillHint: null,
          warning: null,
        };
      }
    } catch {}
    const versionPath = join(absolutePath, ".harness-version");
    const current = await readTextOrNull(versionPath);
    const skillSet = input.skillSet ?? "all";
    const expectedVersion = `"version": "${input.phasegateVersion}"`;
    const expectedSkillSet = `"skillSet": "${skillSet}"`;
    let missingSkill = false;
    for (const skill of skills) {
      if (!(await exists(join(absolutePath, skill, "SKILL.md")))) {
        missingSkill = true;
        break;
      }
    }
    const missingManifest =
      baseManifest.findEntry(`${relativePath}/.harness-version`) === null ||
      skills.some((skill) => baseManifest.findEntry(`${relativePath}/${skill}`) === null);
    const changed =
      current === null ||
      !current.includes(expectedVersion) ||
      !current.includes(expectedSkillSet) ||
      missingSkill ||
      missingManifest;
    return {
      path: relativePath,
      action: changed ? "missing" : "will-skip",
      repairMode: "mechanical",
      strategy: "copy-dir",
      changed,
      summary: changed ? `${relativePath}: deploy bundled skills` : `${relativePath}: already up to date`,
      diff: changed ? `+ ${skills.length} bundled skills (${skillSet})` : "no changes",
      skillHint: null,
      warning: null,
    };
  }

  private personalSkillsVersionHashInput(
    path: string,
    version: string,
    skillSet: "core" | "all",
    skills: readonly string[],
  ): string {
    return `personal-skills-version:${path}:${version}:${skillSet}:${skills.join(",")}`;
  }

  private personalSkillHashInput(path: string, skill: string, version: string, skillSet: "core" | "all"): string {
    return `personal-skill:${path}:${skill}:${version}:${skillSet}`;
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
    const missingManifest =
      baseManifest.findEntry(SHARED_SKILLS_VERSION_PATH) === null ||
      skills.some((skill) => baseManifest.findEntry(`skills/${skill}`) === null);
    const changed =
      current === null ||
      !current.includes(expectedVersion) ||
      !current.includes(expectedSkillSet) ||
      missingSkill ||
      missingManifest;
    return {
      path: "skills",
      action: changed ? "missing" : "will-skip",
      repairMode: "mechanical",
      strategy: "copy-dir",
      changed,
      summary: changed ? "skills: deploy shared bundled skills" : "skills: already up to date",
      diff: changed ? `+ ${skills.length} bundled skills (${skillSet})` : "no changes",
      skillHint: null,
      warning: null,
    };
  }

  private async deploySharedSkills(
    input: RunInstallInput,
    skills: readonly string[],
    skillSet: SkillSet,
  ): Promise<void> {
    const targetRoot = join(input.projectRoot, "skills");
    await copySelectedSkillDirectories(this.modelDelegation, input.harnessRoot, input.projectRoot, targetRoot, skills);
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
    if (existingEntry?.hash.equals(hash)) {
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
          warning: null,
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
        warning: null,
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
            warning: null,
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
        warning: null,
      };
    }
  }

  private diffSummary(before: string | null, next: string): string {
    if (before === next) return "no changes";
    if (before === null) return `+ ${next.split(/\r?\n/).filter(Boolean).length} lines`;
    return `~ ${before.length} bytes -> ${next.length} bytes`;
  }
}
