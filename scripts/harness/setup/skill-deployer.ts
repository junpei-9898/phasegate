// @unit harness-api
// @layer infrastructure
// @work-item-id WI-086 / WI-087
// @work-item-id WI-127
// @work-item-id WI-184
// @work-item-id WI-202
// Note: import.meta.url を使わず、呼び出し元 (main.ts) がパスを解決して渡す設計。

import { promises as fs } from "node:fs";
import { join } from "node:path";

const HARNESS_VERSION_FILE = ".harness-version";
const SKILLS_SOURCE_DIR = "skills";
const SKILLS_TARGET_DIR = "skills";
const SKILLS_LINK_TARGET = "../skills";
const CLAUDE_SKILLS_LINK_DIR = ".claude";
const CODEX_SKILLS_LINK_DIR = ".codex";
const HARNESS_CONFIG_FILE = "phasegate.config.json";
const HOOKS_TEMPLATE_DIR = join("templates", ".claude");
const HOOKS_TARGET_DIR = ".claude";

// ── Skill Category Map ──

export type SkillCategory = "core" | "aidlc" | "utility" | "guidance";
export type SkillSet = "core" | "all";

export const SKILL_CATEGORIES: Record<SkillCategory, readonly string[]> = {
  core: [
    "cascade-updater",
    "codebase-mapper",
    "consistency-checker",
    "doc-freshness-checker",
    "engineering-perspective",
    "implementation-readiness-checker",
    "pointer-validator",
    "test-coverage-checker",
  ],
  aidlc: [
    "domain-designer",
    "environment-designer",
    "implementation-planner",
    "it-test-designer",
    "it-test-logic-designer",
    "logical-designer",
    "mock-designer",
    "product-architect",
    "quick-implementor",
    "scenario-test-designer",
    "scenario-test-logic-designer",
    "story-implementor",
    "story-mapper",
    "story-writer",
    "uiux-designer",
    "unit-designer",
    "unit-test-designer",
    "unit-test-logic-designer",
  ],
  utility: ["codex-delegator", "skill-creator"],
  guidance: ["phasegate-toolkit-guide", "phasegate-config-doctor"],
} as const;

export function getSkillsForSet(skillSet: SkillSet): string[] {
  if (skillSet === "core") {
    return [...SKILL_CATEGORIES.core];
  }
  return [
    ...SKILL_CATEGORIES.core,
    ...SKILL_CATEGORIES.aidlc,
    ...SKILL_CATEGORIES.utility,
    ...SKILL_CATEGORIES.guidance,
  ];
}

export function getCategoryForSkill(skillName: string): SkillCategory | null {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if ((skills as readonly string[]).includes(skillName)) {
      return category as SkillCategory;
    }
  }
  return null;
}

export function getSkillMarkdownPath(harnessRoot: string, skillName: string): string {
  return join(harnessRoot, SKILLS_SOURCE_DIR, skillName, "SKILL.md");
}

export async function listAvailableSkillNames(harnessRoot: string): Promise<string[]> {
  const skillsRoot = join(harnessRoot, SKILLS_SOURCE_DIR);
  let entries;
  try {
    entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await fs.access(getSkillMarkdownPath(harnessRoot, entry.name));
      skills.push(entry.name);
    } catch {
      // Directories without SKILL.md are not catalog entries.
    }
  }

  return skills.sort();
}

export interface DeployResult {
  deployedSkills: string[];
  targetDir: string;
  version: string;
  deployedAt: string;
  skillSet: SkillSet;
}

export interface VersionInfo {
  version: string;
  deployedAt: string;
  skillSet?: SkillSet;
}

interface PkgJson {
  version: string;
}

export async function getHarnessVersion(harnessRoot: string): Promise<string> {
  const packageJsonPath = join(harnessRoot, "package.json");
  const content = await fs.readFile(packageJsonPath, "utf-8");
  const pkg: PkgJson = JSON.parse(content);
  return pkg.version;
}

async function copyDirectory(src: string, dest: string): Promise<number> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      count += await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
      count++;
    }
  }
  return count;
}

export async function deploySkills(
  harnessRoot: string,
  projectRoot: string,
  skillSet: SkillSet = "all",
): Promise<DeployResult> {
  const skillsSource = join(harnessRoot, SKILLS_SOURCE_DIR);
  const skillsTarget = join(projectRoot, SKILLS_TARGET_DIR);
  const version = await getHarnessVersion(harnessRoot);
  const deployedAt = new Date().toISOString();

  const skillDirs = await fs.readdir(skillsSource, { withFileTypes: true });
  const allSkills = skillDirs.filter((d) => d.isDirectory()).map((d) => d.name);
  const allowedSkills = getSkillsForSet(skillSet);
  const skills = allSkills.filter((s) => allowedSkills.includes(s));

  await fs.mkdir(skillsTarget, { recursive: true });

  for (const skill of skills) {
    const srcSkillDir = join(skillsSource, skill);
    const destSkillDir = join(skillsTarget, skill);
    await copyDirectory(srcSkillDir, destSkillDir);
  }

  const versionInfo: VersionInfo = { version, deployedAt, skillSet };
  await fs.writeFile(join(skillsTarget, HARNESS_VERSION_FILE), JSON.stringify(versionInfo, null, 2) + "\n", "utf-8");

  return { deployedSkills: skills, targetDir: skillsTarget, version, deployedAt, skillSet };
}

export async function getDeployedVersion(projectRoot: string): Promise<VersionInfo | null> {
  const versionFile = join(projectRoot, SKILLS_TARGET_DIR, HARNESS_VERSION_FILE);
  try {
    const content = await fs.readFile(versionFile, "utf-8");
    const info: VersionInfo = JSON.parse(content);
    return info;
  } catch {
    return null;
  }
}

export interface AgentSkillLinkResult {
  created: boolean;
  path: string;
}

export interface DeployAgentSkillLinksResult {
  claude: AgentSkillLinkResult | null;
  codex: AgentSkillLinkResult | null;
}

async function ensureSkillLink(projectRoot: string, agentDir: string): Promise<AgentSkillLinkResult> {
  const parentDir = join(projectRoot, agentDir);
  const targetPath = join(parentDir, "skills");

  try {
    const stats = await fs.lstat(targetPath);
    if (stats.isSymbolicLink()) {
      const existingTarget = await fs.readlink(targetPath);
      if (existingTarget === SKILLS_LINK_TARGET) {
        return { created: false, path: targetPath };
      }
    }
    return { created: false, path: targetPath };
  } catch {}

  await fs.mkdir(parentDir, { recursive: true });
  await fs.symlink(SKILLS_LINK_TARGET, targetPath, process.platform === "win32" ? "junction" : "dir");
  return { created: true, path: targetPath };
}

export async function deployAgentSkillLinks(
  projectRoot: string,
  agents: {
    claude: boolean;
    codex: boolean;
  },
): Promise<DeployAgentSkillLinksResult> {
  const claude = agents.claude ? await ensureSkillLink(projectRoot, CLAUDE_SKILLS_LINK_DIR) : null;
  const codex = agents.codex ? await ensureSkillLink(projectRoot, CODEX_SKILLS_LINK_DIR) : null;
  return { claude, codex };
}

export interface DeployHooksResult {
  scriptsDeployed: number;
  settingsCreated: boolean;
  hookConfigGenerated: boolean;
  detectedTargetDirs: string[];
  detectedFormatter: string | null;
}

// pnpm-workspace.yaml の packages: 配列を line-based でパースする最小実装。
// 依存追加を避けつつ pnpm の workspace 定義を扱う。
function parsePnpmWorkspacePackages(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const packages: string[] = [];
  let inPackages = false;
  let packagesIndent = -1;
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").replace(/\s+$/, "");
    if (line.length === 0) continue;
    const indent = line.length - line.trimStart().length;
    if (!inPackages) {
      if (/^packages\s*:\s*$/.test(line)) {
        inPackages = true;
        packagesIndent = indent;
      }
      continue;
    }
    if (indent <= packagesIndent) {
      // packages: ブロックを抜けた
      inPackages = false;
      continue;
    }
    const itemMatch = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/);
    if (itemMatch) {
      packages.push(itemMatch[1].trim());
    }
  }
  return packages;
}

// 単純な末尾 `*` glob (`pkg/*`) のみを展開する。`**` 等のネストパターンは対象外。
async function expandWorkspaceGlobs(projectRoot: string, patterns: string[]): Promise<string[]> {
  const expanded = new Set<string>();
  for (const pattern of patterns) {
    if (pattern.includes("**")) {
      // 安全のため、再帰 glob は無視（無限ループ・性能を避ける）
      continue;
    }
    if (pattern.endsWith("/*")) {
      const baseDir = pattern.slice(0, -2);
      try {
        const entries = await fs.readdir(join(projectRoot, baseDir), { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".")) {
            expanded.add(`${baseDir}/${entry.name}`);
          }
        }
      } catch {}
    } else {
      // glob なし: そのまま採用（ディレクトリ存在チェックは後段で実施）
      expanded.add(pattern);
    }
  }
  return [...expanded];
}

export async function detectWorkspaceTargetDirs(projectRoot: string): Promise<string[]> {
  let patterns: string[] = [];

  // 1. pnpm-workspace.yaml
  try {
    const yamlContent = await fs.readFile(join(projectRoot, "pnpm-workspace.yaml"), "utf-8");
    patterns = parsePnpmWorkspacePackages(yamlContent);
  } catch {}

  // 2. package.json の workspaces (npm/yarn)
  if (patterns.length === 0) {
    try {
      const pkgRaw = await fs.readFile(join(projectRoot, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgRaw) as { workspaces?: string[] | { packages?: string[] } };
      const workspaces = pkg.workspaces;
      if (Array.isArray(workspaces)) {
        patterns = workspaces;
      } else if (workspaces && Array.isArray(workspaces.packages)) {
        patterns = workspaces.packages;
      }
    } catch {}
  }

  // 3. lerna.json
  if (patterns.length === 0) {
    try {
      const lernaRaw = await fs.readFile(join(projectRoot, "lerna.json"), "utf-8");
      const lerna = JSON.parse(lernaRaw) as { packages?: string[] };
      if (Array.isArray(lerna.packages)) {
        patterns = lerna.packages;
      }
    } catch {}
  }

  if (patterns.length === 0) {
    return ["src"];
  }

  const workspaceDirs = await expandWorkspaceGlobs(projectRoot, patterns);
  const targetDirs: string[] = [];
  for (const ws of workspaceDirs) {
    try {
      const stats = await fs.stat(join(projectRoot, ws, "src"));
      if (stats.isDirectory()) {
        targetDirs.push(`${ws}/src`);
      }
    } catch {}
  }

  // workspace 定義は見つかったが src/ を持つものが一切ない場合は ["src"] にフォールバック
  return targetDirs.length > 0 ? targetDirs.sort() : ["src"];
}

export interface DetectedFormatter {
  formatter: string | null;
  formatterArgs: string[];
}

export async function detectFormatter(projectRoot: string): Promise<DetectedFormatter> {
  try {
    const pkgRaw = await fs.readFile(join(projectRoot, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw) as {
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (allDeps["@biomejs/biome"]) {
      return { formatter: "biome", formatterArgs: ["check", "--write"] };
    }
    if (allDeps["prettier"]) {
      return { formatter: "eslint-prettier", formatterArgs: [] };
    }
  } catch {}
  return { formatter: null, formatterArgs: [] };
}

export async function deployHookScripts(harnessRoot: string, projectRoot: string): Promise<DeployHooksResult> {
  const templateDir = join(harnessRoot, HOOKS_TEMPLATE_DIR);
  const targetDir = join(projectRoot, HOOKS_TARGET_DIR);

  const scriptsSource = join(templateDir, "scripts");
  const scriptsTarget = join(targetDir, "scripts");
  const hookConfigPath = join(scriptsTarget, "hook-config.json");

  // copyDirectory で全 scripts/ を上書きするため、ユーザーカスタマイズを尊重するには
  // 事前に hook-config.json の既存内容を捕捉して後で復元する。
  let preexistingHookConfig: string | null = null;
  try {
    preexistingHookConfig = await fs.readFile(hookConfigPath, "utf-8");
  } catch {}

  let scriptsDeployed = 0;

  try {
    await fs.access(scriptsSource);
    scriptsDeployed = await copyDirectory(scriptsSource, scriptsTarget);

    // シェルスクリプトに実行権限を付与
    const entries = await fs.readdir(scriptsTarget);
    for (const entry of entries) {
      if (entry.endsWith(".sh")) {
        await fs.chmod(join(scriptsTarget, entry), 0o755);
      }
    }
  } catch {}

  // hook-config.json の決定:
  //   既存あり → ユーザーカスタマイズ尊重で元の内容を書き戻し
  //   既存なし → 検出結果を反映して新規生成
  const detectedTargetDirs = await detectWorkspaceTargetDirs(projectRoot);
  const { formatter, formatterArgs } = await detectFormatter(projectRoot);
  let hookConfigGenerated = false;

  if (scriptsDeployed > 0) {
    if (preexistingHookConfig !== null) {
      await fs.writeFile(hookConfigPath, preexistingHookConfig, "utf-8");
    } else {
      const hookConfig: Record<string, unknown> = {
        targetDirs: detectedTargetDirs,
      };
      if (formatter !== null) {
        hookConfig.formatter = formatter;
        hookConfig.formatterArgs = formatterArgs;
      }
      await fs.writeFile(hookConfigPath, JSON.stringify(hookConfig, null, 2) + "\n", "utf-8");
      hookConfigGenerated = true;
    }
  }

  // settings.json を作成（既存があればスキップ）
  const settingsSource = join(templateDir, "settings.json");
  const settingsTarget = join(targetDir, "settings.json");
  let settingsCreated = false;

  try {
    await fs.access(settingsTarget);
    // 既存あり → スキップ
  } catch {
    try {
      await fs.access(settingsSource);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.copyFile(settingsSource, settingsTarget);
      settingsCreated = true;
    } catch {}
  }

  return {
    scriptsDeployed,
    settingsCreated,
    hookConfigGenerated,
    detectedTargetDirs,
    detectedFormatter: formatter,
  };
}

export interface InitHarnessConfigOptions {
  ciEnabled?: boolean;
  workflow?: "standard" | "strict";
}

export async function initHarnessConfig(
  projectRoot: string,
  projectName: string,
  phasePreset?: "full" | "standard" | "minimal" | "custom",
  options: InitHarnessConfigOptions = {},
): Promise<{ created: boolean; path: string }> {
  const configPath = join(projectRoot, HARNESS_CONFIG_FILE);
  try {
    await fs.access(configPath);
    return { created: false, path: configPath };
  } catch {
    // ファイルが存在しない場合はテンプレートを作成
  }

  const strictWorkflow = options.workflow === "strict";
  const template = {
    project: {
      name: projectName,
      preset: "standard",
    },
    architecture: {
      preset: "clean",
    },
    layers: {},
    quickMode: strictWorkflow
      ? {
          allowedCategories: ["bugfix", "docs", "test", "config"],
          relaxedGates: [],
        }
      : {},
    phaseDependencies: {
      preset: phasePreset ?? "default",
      override: false,
      customRules: [],
    },
    planningMode: {
      default: "interactive",
      perPhase: {},
    },
    harnesses: {},
    paths: {
      designDocs: "docs/product/construction",
      inceptionDocs: "docs/inception",
    },
    reporting: {
      format: "json",
      outputDir: "reports",
    },
    ...(options.ciEnabled ? { ci: { enabled: true } } : {}),
  };

  await fs.writeFile(configPath, JSON.stringify(template, null, 2) + "\n", "utf-8");
  return { created: true, path: configPath };
}

export interface DeployDesignDocsResult {
  copiedFiles: string[];
  skippedFiles: string[];
}

export async function deployDesignDocs(harnessRoot: string, projectRoot: string): Promise<DeployDesignDocsResult> {
  const copiedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const docsTargetDir = join(projectRoot, "docs");
  const principlesTargetDir = join(docsTargetDir, "principles");

  await fs.mkdir(docsTargetDir, { recursive: true });
  await fs.mkdir(principlesTargetDir, { recursive: true });

  const folderRulesRelativePath = join("docs", "folder_management_rules.md");
  const folderRulesSource = join(harnessRoot, folderRulesRelativePath);
  const folderRulesTarget = join(projectRoot, folderRulesRelativePath);

  try {
    await fs.access(folderRulesTarget);
    skippedFiles.push(folderRulesRelativePath);
  } catch {
    try {
      await fs.access(folderRulesSource);
      await fs.copyFile(folderRulesSource, folderRulesTarget);
      copiedFiles.push(folderRulesRelativePath);
    } catch {
      // 配置元が存在しない場合はスキップ
    }
  }

  const principlesSourceDir = join(harnessRoot, "docs", "principles");

  try {
    const principleEntries = await fs.readdir(principlesSourceDir, { withFileTypes: true });
    const principleFiles = principleEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();

    for (const principleFile of principleFiles) {
      const relativePath = join("docs", "principles", principleFile);
      const sourcePath = join(principlesSourceDir, principleFile);
      const targetPath = join(projectRoot, relativePath);

      try {
        await fs.access(targetPath);
        skippedFiles.push(relativePath);
      } catch {
        await fs.copyFile(sourcePath, targetPath);
        copiedFiles.push(relativePath);
      }
    }
  } catch {
    // principles ディレクトリが存在しない場合はスキップ
  }

  return { copiedFiles, skippedFiles };
}

export interface DeployHuskyHookResult {
  created: boolean;
  path: string;
}

export interface DeployCiWorkflowsResult {
  copiedFiles: string[];
  skippedFiles: string[];
}

export async function deployCiWorkflows(harnessRoot: string, projectRoot: string): Promise<DeployCiWorkflowsResult> {
  const copiedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const workflows = [
    {
      relativeSource: join("docs", "templates", "ci", "aidlc-gate.yml"),
      relativeTarget: join(".github", "workflows", "aidlc-gate.yml"),
    },
    {
      relativeSource: join("docs", "templates", "ci", "consistency-check.yml"),
      relativeTarget: join(".github", "workflows", "consistency-check.yml"),
    },
    {
      relativeSource: join("docs", "templates", "ci", "agent-context-refresh.yml"),
      relativeTarget: join(".github", "workflows", "agent-context-refresh.yml"),
    },
  ];

  await fs.mkdir(join(projectRoot, ".github", "workflows"), { recursive: true });

  for (const workflow of workflows) {
    const sourcePath = join(harnessRoot, workflow.relativeSource);
    const targetPath = join(projectRoot, workflow.relativeTarget);

    try {
      await fs.access(targetPath);
      skippedFiles.push(workflow.relativeTarget);
      continue;
    } catch {
      // ファイルが存在しない場合のみコピーする
    }

    await fs.copyFile(sourcePath, targetPath);
    copiedFiles.push(workflow.relativeTarget);
  }

  return { copiedFiles, skippedFiles };
}

export async function deployHuskyHook(harnessRoot: string, projectRoot: string): Promise<DeployHuskyHookResult> {
  const targetPath = join(projectRoot, ".husky", "pre-commit");

  try {
    await fs.access(targetPath);
    return { created: false, path: targetPath };
  } catch {}

  const sourcePath = join(harnessRoot, "docs", "templates", "hooks", "pre-commit");
  await fs.mkdir(join(projectRoot, ".husky"), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.chmod(targetPath, 0o755);

  return { created: true, path: targetPath };
}

export async function deployHuskyCommitMsgHook(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployHuskyHookResult> {
  const targetPath = join(projectRoot, ".husky", "commit-msg");

  try {
    await fs.access(targetPath);
    return { created: false, path: targetPath };
  } catch {}

  const sourcePath = join(harnessRoot, "docs", "templates", "hooks", "commit-msg");
  await fs.mkdir(join(projectRoot, ".husky"), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.chmod(targetPath, 0o755);

  return { created: true, path: targetPath };
}

export async function deployHuskyPrePushHook(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployHuskyHookResult> {
  const targetPath = join(projectRoot, ".husky", "pre-push");

  try {
    await fs.access(targetPath);
    return { created: false, path: targetPath };
  } catch {}

  const sourcePath = join(harnessRoot, "docs", "templates", "hooks", "pre-push");
  await fs.mkdir(join(projectRoot, ".husky"), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.chmod(targetPath, 0o755);

  return { created: true, path: targetPath };
}

export interface DeployCodexHooksResult {
  created: boolean;
  path: string;
}

export async function deployCodexHooks(harnessRoot: string, projectRoot: string): Promise<DeployCodexHooksResult> {
  const targetPath = join(projectRoot, ".codex", "hooks.json");

  try {
    await fs.access(targetPath);
    return { created: false, path: targetPath };
  } catch {}

  const sourcePath = join(harnessRoot, "templates", ".codex", "hooks.json");
  await fs.mkdir(join(projectRoot, ".codex"), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);

  return { created: true, path: targetPath };
}
