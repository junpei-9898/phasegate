/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-134, WI-135
 *
 * FileSystemArchitectureSemanticSourceAdapter
 * TypeScript source から side-effect capability / decision placement signal を軽量抽出する。
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ArchitectureSemanticSourcePort,
  DecisionSignal,
  EffectCapability,
  SourceSemanticFile,
  SourceSemanticSignal,
} from '../../domain/services/l4/architecture-semantic-analysis-service.js';

export class FileSystemArchitectureSemanticSourceAdapter implements ArchitectureSemanticSourcePort {
  private readonly sourceRoot: string;

  constructor(sourceRoot: string = join(process.cwd(), 'scripts/harness')) {
    this.sourceRoot = sourceRoot;
  }

  async collectSourceSemantics(): Promise<readonly SourceSemanticFile[]> {
    const filePaths = await walkTsFiles(this.sourceRoot);
    const files: SourceSemanticFile[] = [];

    for (const filePath of filePaths) {
      if (isExcluded(filePath)) continue;
      try {
        const content = await readFile(filePath, 'utf8');
        files.push({
          filePath,
          zone: detectZone(filePath, content),
          effects: detectEffects(content),
          decisions: detectDecisions(content),
        });
      } catch {
        continue;
      }
    }

    return files;
  }
}

async function walkTsFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = join(root, entry.name);
      if (entry.isDirectory()) return walkTsFiles(fullPath);
      return fullPath.endsWith('.ts') ? [fullPath] : [];
    }));
    return files.flat();
  } catch {
    return [];
  }
}

function isExcluded(filePath: string): boolean {
  const normalized = filePath.replaceAll('\\', '/');
  return /(^|\/)__tests__\//.test(normalized) || /\.test\.ts$/.test(normalized) || /(^|\/)fixtures?\//.test(normalized);
}

function detectZone(filePath: string, content: string): string {
  const tagMatch = content.match(/@layer\s+([a-z][a-z0-9-]*)/);
  if (tagMatch?.[1]) return tagMatch[1];

  const normalized = filePath.replaceAll('\\', '/');
  for (const zone of ['domain', 'application', 'infrastructure', 'presentation', 'controller', 'service', 'repository', 'core', 'ports', 'adapters']) {
    if (normalized.includes(`/${zone}/`)) return zone;
  }
  return 'application';
}

function detectEffects(content: string): SourceSemanticSignal[] {
  const checks: Array<{ kind: EffectCapability; pattern: RegExp; evidence: string }> = [
    { kind: 'filesystem', pattern: /\bnode:fs\b|\bfrom\s+['"]fs['"]|\b(?:readFileSync|writeFileSync|readdirSync|statSync)\b/, evidence: 'filesystem API reference' },
    { kind: 'network', pattern: /\bfetch\s*\(|\bnode:https?\b|\bfrom\s+['"]https?['"]/, evidence: 'network API reference' },
    { kind: 'database', pattern: /\b(?:prisma|sequelize|knex|sql`|\.query\s*\()/i, evidence: 'database API reference' },
    { kind: 'process-env', pattern: /\bprocess\.env\b/, evidence: 'process.env reference' },
    { kind: 'time', pattern: /\bDate\.now\s*\(|\bnew\s+Date\s*\(/, evidence: 'time source reference' },
    { kind: 'random', pattern: /\bMath\.random\s*\(|\brandomUUID\s*\(/, evidence: 'random source reference' },
    { kind: 'subprocess', pattern: /\bnode:child_process\b|\b(?:execSync|execFileSync|spawnSync)\b/, evidence: 'subprocess API reference' },
    { kind: 'user-io', pattern: /\bnode:readline\b|\bprompt\s*\(/, evidence: 'user I/O reference' },
  ];

  return checks
    .filter((check) => check.pattern.test(content))
    .map((check) => ({ kind: check.kind, evidence: check.evidence, confidence: 0.9 }));
}

function detectDecisions(content: string): SourceSemanticSignal[] {
  const signals: SourceSemanticSignal[] = [];
  const branchCount = (content.match(/\bif\s*\(|\bswitch\s*\(/g) ?? []).length;
  if (branchCount >= 3) {
    signals.push({ kind: 'business-rule-branch', evidence: `branch-count=${branchCount}`, confidence: 0.72 });
  }
  if (/\b(?:validate|isValid|required|invalid)\b/i.test(content) && /\bif\s*\(/.test(content)) {
    signals.push({ kind: 'validation-rule', evidence: 'validation keyword with branch', confidence: 0.7 });
  }
  if (/\b(?:new\s+Error|HarnessError|throw\s+new)\b/.test(content)) {
    signals.push({ kind: 'error-construction', evidence: 'error construction expression', confidence: 0.86 });
  }
  if (/\b(?:state|status)\s*=|transition[A-Z]\w*\s*\(/.test(content)) {
    signals.push({ kind: 'state-transition', evidence: 'state/status transition expression', confidence: 0.78 });
  }
  if (/\bswitch\s*\(|\bselect[A-Z]\w*\s*\(/.test(content)) {
    signals.push({ kind: 'policy-selection', evidence: 'policy selection branch', confidence: 0.68 });
  }
  return signals;
}
