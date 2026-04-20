/**
 * @layer presentation
 * @unit agent-integration
 *
 * Phasegate 状態を context 文字列として組み立てる共有ヘルパー。
 * SessionStart / UserPromptSubmit hook が共通で使用する。
 *
 * 副作用: phasegate.config.json の読み込み / docs/product/construction/ の走査のみ。
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

export interface PhasegateConfig {
  protectedFiles?: {
    patterns?: string[];
    exclude?: string[];
  };
  project?: {
    paths?: {
      docs?: {
        construction?: string;
      };
    };
  };
}

export interface PhasegateStatus {
  configFound: boolean;
  protectedPatterns: readonly string[];
  blockedUnits: readonly string[];
}

const DEFAULT_PROTECTED_PATTERNS = [
  'biome.json',
  '.biome.json',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
] as const;

export async function findConfigPath(startDir: string): Promise<string | null> {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'phasegate.config.json');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
}

async function loadConfig(configPath: string): Promise<PhasegateConfig> {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw) as PhasegateConfig;
  } catch {
    return {};
  }
}

function computeProtectedPatterns(config: PhasegateConfig): string[] {
  const additional = config.protectedFiles?.patterns ?? [];
  const exclude = new Set(config.protectedFiles?.exclude ?? []);
  const base = DEFAULT_PROTECTED_PATTERNS.filter((p) => !exclude.has(p));
  return [...base, ...additional];
}

async function findBlockedUnits(projectRoot: string, config: PhasegateConfig): Promise<string[]> {
  const constructionDir = config.project?.paths?.docs?.construction
    ?? path.join('docs', 'product', 'construction');
  const absConstructionDir = path.isAbsolute(constructionDir)
    ? constructionDir
    : path.join(projectRoot, constructionDir);

  try {
    await fs.access(absConstructionDir);
  } catch {
    return [];
  }

  let unitDirs: string[];
  try {
    const entries = await fs.readdir(absConstructionDir, { withFileTypes: true });
    unitDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const blocked: string[] = [];
  for (const unit of unitDirs) {
    const unitDir = path.join(absConstructionDir, unit);
    const hasLogicalDesign = await fs.access(path.join(unitDir, 'logical_design.md')).then(() => true).catch(() => false);
    const hasDomainModel = await fs.access(path.join(unitDir, 'domain_model.md')).then(() => true).catch(() => false);
    if (!hasLogicalDesign || !hasDomainModel) {
      const missing: string[] = [];
      if (!hasLogicalDesign) missing.push('logical_design.md');
      if (!hasDomainModel) missing.push('domain_model.md');
      blocked.push(`${unit} (missing: ${missing.join(', ')})`);
    }
  }
  return blocked;
}

export async function collectPhasegateStatus(cwd: string): Promise<PhasegateStatus> {
  const configPath = await findConfigPath(cwd);
  const configFound = configPath !== null;
  const config: PhasegateConfig = configFound ? await loadConfig(configPath) : {};
  const projectRoot = configFound ? path.dirname(configPath) : cwd;

  const protectedPatterns = computeProtectedPatterns(config);
  const blockedUnits = await findBlockedUnits(projectRoot, config);

  return { configFound, protectedPatterns, blockedUnits };
}

export function buildSessionStartContext(status: PhasegateStatus): string {
  const lines: string[] = [
    '# Phasegate status (auto-injected by SessionStart hook)',
    '',
    'This project uses Phasegate for AIDLC quality enforcement. Follow these rules:',
    '',
    '- Do NOT write to protected files without going through `/quick-implementor` skill.',
    '- Do NOT create/structurally modify source files under units listed as "blocked" below — the required design docs (logical_design.md / domain_model.md) are missing, and pre-tool-use hooks will block writes.',
    '- Prefer the native `apply_patch` tool for edits, BUT note that Codex\'s apply_patch bypasses pre-edit hooks. Violations surface at pre-commit time.',
    '',
  ];

  if (!status.configFound) {
    lines.push('_(phasegate.config.json not found — using default patterns.)_');
    lines.push('');
  }

  lines.push('## Protected files (pre-tool-use blocks writes to these)');
  if (status.protectedPatterns.length === 0) {
    lines.push('- (none)');
  } else {
    for (const p of status.protectedPatterns) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push('');

  lines.push('## Units currently blocked by phase-gate');
  if (status.blockedUnits.length === 0) {
    lines.push('- (none — all units have required design docs)');
  } else {
    for (const u of status.blockedUnits) {
      lines.push(`- ${u}`);
    }
  }
  lines.push('');
  lines.push('If you attempt to write to a blocked unit, your edit will be rejected. Use the `/story-implementor` skill (Phase 1 planning first) to create the required design docs.');

  return lines.join('\n');
}

export function buildUserPromptSubmitContext(status: PhasegateStatus): string {
  // UserPromptSubmit は毎ターン発火するため、簡潔に最新状態のみを通知する。
  // SessionStart で既に運用ルールは注入済みの前提。
  const lines: string[] = [
    '# Phasegate status refresh',
    '',
    `- Protected files (${status.protectedPatterns.length}): ${
      status.protectedPatterns.length === 0
        ? '(none)'
        : status.protectedPatterns.map((p) => `\`${p}\``).join(', ')
    }`,
  ];

  if (status.blockedUnits.length === 0) {
    lines.push('- Phase-gate: all units unlocked (no missing logical_design.md / domain_model.md)');
  } else {
    lines.push(`- Phase-gate: ${status.blockedUnits.length} unit(s) currently blocked — writes will be rejected:`);
    for (const u of status.blockedUnits) {
      lines.push(`  - ${u}`);
    }
    lines.push('  Use `/story-implementor` to create the missing design docs.');
  }

  return lines.join('\n');
}
