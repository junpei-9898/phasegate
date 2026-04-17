/**
 * @layer infrastructure
 *
 * Harnessスキルのデプロイメントインフラ。
 * パッケージルートの skills/ を対象プロジェクトの .claude/skills/ にコピーする。
 * harness init / harness update-skills コマンドから呼び出される。
 *
 * Note: import.meta.url を使わず、呼び出し元 (main.ts) がパスを解決して渡す設計。
 */

import { join } from 'node:path';
import { promises as fs } from 'node:fs';

const HARNESS_VERSION_FILE = '.harness-version';
const SKILLS_SOURCE_DIR = 'skills';
const SKILLS_TARGET_DIR = join('.claude', 'skills');
const HARNESS_CONFIG_FILE = 'phasegate.config.json';
const HOOKS_TEMPLATE_DIR = join('templates', '.claude');
const HOOKS_TARGET_DIR = '.claude';

// ── Skill Category Map ──

export type SkillCategory = 'core' | 'aidlc' | 'utility';
export type SkillSet = 'core' | 'all';

export const SKILL_CATEGORIES: Record<SkillCategory, readonly string[]> = {
  core: [
    'cascade-updater',
    'codebase-mapper',
    'consistency-checker',
    'doc-freshness-checker',
    'engineering-perspective',
    'implementation-readiness-checker',
    'pointer-validator',
    'test-coverage-checker',
  ],
  aidlc: [
    'domain-designer',
    'environment-designer',
    'implementation-planner',
    'it-test-designer',
    'it-test-logic-designer',
    'logical-designer',
    'mock-designer',
    'product-architect',
    'quick-implementor',
    'scenario-test-designer',
    'scenario-test-logic-designer',
    'story-implementor',
    'story-mapper',
    'story-writer',
    'uiux-designer',
    'unit-designer',
    'unit-test-designer',
    'unit-test-logic-designer',
  ],
  utility: [
    'codex-delegator',
    'skill-creator',
  ],
} as const;

/**
 * 指定された SkillSet に含まれるスキル名の一覧を返す。
 */
export function getSkillsForSet(skillSet: SkillSet): string[] {
  if (skillSet === 'core') {
    return [...SKILL_CATEGORIES.core];
  }
  return [
    ...SKILL_CATEGORIES.core,
    ...SKILL_CATEGORIES.aidlc,
    ...SKILL_CATEGORIES.utility,
  ];
}

/**
 * スキル名からカテゴリを逆引きする。未知のスキルは null を返す。
 */
export function getCategoryForSkill(skillName: string): SkillCategory | null {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if ((skills as readonly string[]).includes(skillName)) {
      return category as SkillCategory;
    }
  }
  return null;
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
  const packageJsonPath = join(harnessRoot, 'package.json');
  const content = await fs.readFile(packageJsonPath, 'utf-8');
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

/**
 * skills/ ディレクトリを対象プロジェクトの .claude/skills/ にデプロイする。
 * 既存ファイルは上書きされる（update-skills でも同じ関数を使う）。
 *
 * @param harnessRoot - harnessパッケージのルートディレクトリ（skills/がある場所）
 * @param projectRoot - デプロイ先プロジェクトのルートディレクトリ
 */
export async function deploySkills(
  harnessRoot: string,
  projectRoot: string,
  skillSet: SkillSet = 'all',
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
  await fs.writeFile(
    join(skillsTarget, HARNESS_VERSION_FILE),
    JSON.stringify(versionInfo, null, 2) + '\n',
    'utf-8',
  );

  return { deployedSkills: skills, targetDir: skillsTarget, version, deployedAt, skillSet };
}

/**
 * デプロイ済みバージョン情報を読み取る。
 * .harness-version ファイルが存在しない場合は null を返す。
 */
export async function getDeployedVersion(projectRoot: string): Promise<VersionInfo | null> {
  const versionFile = join(projectRoot, SKILLS_TARGET_DIR, HARNESS_VERSION_FILE);
  try {
    const content = await fs.readFile(versionFile, 'utf-8');
    const info: VersionInfo = JSON.parse(content);
    return info;
  } catch {
    return null;
  }
}

export interface DeployHooksResult {
  scriptsDeployed: number;
  settingsCreated: boolean;
}

/**
 * templates/.claude/scripts/ を対象プロジェクトの .claude/scripts/ にデプロイする。
 * templates/.claude/settings.json も存在しなければ作成する。
 * 既存のスクリプトは上書き、settings.json は既存があればスキップ。
 *
 * @param harnessRoot - harnessパッケージのルートディレクトリ
 * @param projectRoot - デプロイ先プロジェクトのルートディレクトリ
 */
export async function deployHookScripts(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployHooksResult> {
  const templateDir = join(harnessRoot, HOOKS_TEMPLATE_DIR);
  const targetDir = join(projectRoot, HOOKS_TARGET_DIR);

  // scripts/ ディレクトリをコピー
  const scriptsSource = join(templateDir, 'scripts');
  const scriptsTarget = join(targetDir, 'scripts');
  let scriptsDeployed = 0;

  try {
    await fs.access(scriptsSource);
    scriptsDeployed = await copyDirectory(scriptsSource, scriptsTarget);

    // シェルスクリプトに実行権限を付与
    const entries = await fs.readdir(scriptsTarget);
    for (const entry of entries) {
      if (entry.endsWith('.sh')) {
        await fs.chmod(join(scriptsTarget, entry), 0o755);
      }
    }
  } catch {
    // テンプレートが存在しない場合はスキップ
  }

  // settings.json を作成（既存があればスキップ）
  const settingsSource = join(templateDir, 'settings.json');
  const settingsTarget = join(targetDir, 'settings.json');
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
    } catch {
      // テンプレートが存在しない場合はスキップ
    }
  }

  return { scriptsDeployed, settingsCreated };
}

/**
 * phasegate.config.json のデフォルトテンプレートを生成する。
 * 対象プロジェクトに phasegate.config.json が存在しない場合のみ作成する。
 */
export async function initHarnessConfig(
  projectRoot: string,
  projectName: string,
  phasePreset?: 'full' | 'standard' | 'minimal' | 'custom',
): Promise<{ created: boolean; path: string }> {
  const configPath = join(projectRoot, HARNESS_CONFIG_FILE);
  try {
    await fs.access(configPath);
    return { created: false, path: configPath };
  } catch {
    // ファイルが存在しない場合はテンプレートを作成
  }

  const template = {
    project: {
      name: projectName,
      preset: 'standard',
    },
    layers: {},
    quickMode: {},
    phaseDependencies: {
      preset: phasePreset ?? 'default',
      override: false,
      customRules: [],
    },
    planningMode: {
      default: 'interactive',
      perPhase: {},
    },
    harnesses: {},
    paths: {
      designDocs: 'docs/product/construction',
      inceptionDocs: 'docs/inception',
    },
    reporting: {
      format: 'json',
      outputDir: 'reports',
    },
  };

  await fs.writeFile(configPath, JSON.stringify(template, null, 2) + '\n', 'utf-8');
  return { created: true, path: configPath };
}

export interface DeployDesignDocsResult {
  copiedFiles: string[];
  skippedFiles: string[];
}

/**
 * 設計原則ドキュメントを対象プロジェクトの docs/ にデプロイする。
 * - docs/folder_management_rules.md → <projectRoot>/docs/folder_management_rules.md
 * - docs/principles/*.md → <projectRoot>/docs/principles/*.md
 * 既存ファイルは上書きせずスキップする。
 */
export async function deployDesignDocs(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployDesignDocsResult> {
  const copiedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const docsTargetDir = join(projectRoot, 'docs');
  const principlesTargetDir = join(docsTargetDir, 'principles');

  await fs.mkdir(docsTargetDir, { recursive: true });
  await fs.mkdir(principlesTargetDir, { recursive: true });

  const folderRulesRelativePath = join('docs', 'folder_management_rules.md');
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

  const principlesSourceDir = join(harnessRoot, 'docs', 'principles');

  try {
    const principleEntries = await fs.readdir(principlesSourceDir, { withFileTypes: true });
    const principleFiles = principleEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort();

    for (const principleFile of principleFiles) {
      const relativePath = join('docs', 'principles', principleFile);
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

/**
 * husky pre-commit フックを対象プロジェクトの .husky/ にデプロイする。
 * 既存があればスキップする。実行権限 0o755 を付与する。
 */
export async function deployHuskyHook(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployHuskyHookResult> {
  const targetPath = join(projectRoot, '.husky', 'pre-commit');

  try {
    await fs.access(targetPath);
    return { created: false, path: targetPath };
  } catch {
    // 配置先が存在しない場合は新規作成
  }

  const sourcePath = join(harnessRoot, 'templates', '.husky', 'pre-commit');
  await fs.mkdir(join(projectRoot, '.husky'), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.chmod(targetPath, 0o755);

  return { created: true, path: targetPath };
}
