/**
 * @layer presentation
 * @unit agent-integration
 *
 * SessionStart Hook Adapter (ISSUE-013 Wave 3 / C-4)
 *
 * Codex CLI (および今後 SessionStart をサポートするエージェント) のセッション開始時に
 * 動的 phase-gate 状態を `hookSpecificOutput.additionalContext` として注入する。
 *
 * 出力スキーマ (Codex 公式):
 *   {
 *     "hookSpecificOutput": {
 *       "hookEventName": "SessionStart",
 *       "additionalContext": "<developer context を string で>"
 *     }
 *   }
 *
 * 注入内容:
 *   - AIDLC / phase-gate の運用ルール (保護ファイルへの書き込み禁止 等)
 *   - 現在の保護ファイルパターン (phasegate.config.json から)
 *   - logical_design.md / domain_model.md が未整備で書き込みがブロックされる Unit 一覧
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

interface PhasegateConfig {
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

const DEFAULT_PROTECTED_PATTERNS = [
  'biome.json',
  '.biome.json',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
];

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function findConfigPath(startDir: string): Promise<string | null> {
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
    const logicalDesign = path.join(unitDir, 'logical_design.md');
    const domainModel = path.join(unitDir, 'domain_model.md');
    const hasLogicalDesign = await fs.access(logicalDesign).then(() => true).catch(() => false);
    const hasDomainModel = await fs.access(domainModel).then(() => true).catch(() => false);
    if (!hasLogicalDesign || !hasDomainModel) {
      const missing: string[] = [];
      if (!hasLogicalDesign) missing.push('logical_design.md');
      if (!hasDomainModel) missing.push('domain_model.md');
      blocked.push(`${unit} (missing: ${missing.join(', ')})`);
    }
  }
  return blocked;
}

function buildAdditionalContext(params: {
  protectedPatterns: string[];
  blockedUnits: string[];
  configFound: boolean;
}): string {
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

  if (!params.configFound) {
    lines.push('_(phasegate.config.json not found — using default patterns.)_');
    lines.push('');
  }

  lines.push('## Protected files (pre-tool-use blocks writes to these)');
  if (params.protectedPatterns.length === 0) {
    lines.push('- (none)');
  } else {
    for (const p of params.protectedPatterns) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push('');

  lines.push('## Units currently blocked by phase-gate');
  if (params.blockedUnits.length === 0) {
    lines.push('- (none — all units have required design docs)');
  } else {
    for (const u of params.blockedUnits) {
      lines.push(`- ${u}`);
    }
  }
  lines.push('');
  lines.push('If you attempt to write to a blocked unit, your edit will be rejected. Use the `/story-implementor` skill (Phase 1 planning first) to create the required design docs.');

  return lines.join('\n');
}

async function main(): Promise<void> {
  // stdin を読むが、SessionStart では使用しない (将来のため consume のみ)
  try {
    await readStdin();
  } catch {
    // stdin が無くても続行
  }

  const cwd = process.cwd();
  const configPath = await findConfigPath(cwd);
  const configFound = configPath !== null;
  const config: PhasegateConfig = configFound ? await loadConfig(configPath) : {};
  const projectRoot = configFound ? path.dirname(configPath) : cwd;

  const protectedPatterns = computeProtectedPatterns(config);
  const blockedUnits = await findBlockedUnits(projectRoot, config);

  const additionalContext = buildAdditionalContext({
    protectedPatterns,
    blockedUnits,
    configFound,
  });

  const output = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  };

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`SessionStart hook error: ${String(error)}\n`);
  // SessionStart で失敗してもセッション継続できるよう exit 0
  process.exit(0);
});
