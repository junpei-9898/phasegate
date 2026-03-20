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
const HARNESS_CONFIG_FILE = 'harness.config.json';

export interface DeployResult {
  deployedSkills: string[];
  targetDir: string;
  version: string;
  deployedAt: string;
}

export interface VersionInfo {
  version: string;
  deployedAt: string;
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
export async function deploySkills(harnessRoot: string, projectRoot: string): Promise<DeployResult> {
  const skillsSource = join(harnessRoot, SKILLS_SOURCE_DIR);
  const skillsTarget = join(projectRoot, SKILLS_TARGET_DIR);
  const version = await getHarnessVersion(harnessRoot);
  const deployedAt = new Date().toISOString();

  const skillDirs = await fs.readdir(skillsSource, { withFileTypes: true });
  const skills = skillDirs.filter((d) => d.isDirectory()).map((d) => d.name);

  await fs.mkdir(skillsTarget, { recursive: true });

  for (const skill of skills) {
    const srcSkillDir = join(skillsSource, skill);
    const destSkillDir = join(skillsTarget, skill);
    await copyDirectory(srcSkillDir, destSkillDir);
  }

  const versionInfo: VersionInfo = { version, deployedAt };
  await fs.writeFile(
    join(skillsTarget, HARNESS_VERSION_FILE),
    JSON.stringify(versionInfo, null, 2) + '\n',
    'utf-8',
  );

  return { deployedSkills: skills, targetDir: skillsTarget, version, deployedAt };
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

/**
 * harness.config.json のデフォルトテンプレートを生成する。
 * 対象プロジェクトに harness.config.json が存在しない場合のみ作成する。
 */
export async function initHarnessConfig(
  projectRoot: string,
  projectName: string,
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
      preset: 'default',
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
