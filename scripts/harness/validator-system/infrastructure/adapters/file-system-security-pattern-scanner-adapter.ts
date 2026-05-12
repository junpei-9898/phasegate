/**
 * @layer infrastructure
 * @unit validator-system
 *
 * FileSystemSecurityPatternScannerAdapter — SecurityPatternScannerPort実装
 */
import type { SecurityPatternScannerPort } from '../../domain/ports/security-pattern-scanner-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import { readFile } from 'node:fs/promises';

const ALLOWLIST_MARKER = 'phasegate-allow-secret-fixture';

interface SecurityPattern {
  readonly ruleId: string;
  readonly pattern: RegExp;
  readonly description: string;
}

const SECURITY_PATTERNS: readonly SecurityPattern[] = Object.freeze([
  { ruleId: 'secret.openai', pattern: /\b(?:sk|rk|sess)-[a-zA-Z0-9_-]{20,}\b/g, description: 'OpenAI token family' },
  { ruleId: 'secret.github', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, description: 'GitHub token family' },
  { ruleId: 'secret.aws-access-key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, description: 'AWS access key id' },
  { ruleId: 'secret.npm', pattern: /\bnpm_[A-Za-z0-9]{24,}\b/g, description: 'npm token family' },
  { ruleId: 'secret.slack', pattern: /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/g, description: 'Slack token family' },
  {
    ruleId: 'secret.keyword-context',
    pattern: /\b(?:API_KEY|api_key|apikey|password|PASSWORD|passwd|secret|token)\b\s*[:=]\s*["'][^"']{8,}["']/g,
    description: 'keyword-context secret',
  },
]);

export class FileSystemSecurityPatternScannerAdapter implements SecurityPatternScannerPort {
  async scan(targetPaths: readonly string[]): Promise<{
    passed: boolean;
    findings: readonly HarnessErrorLike[];
  }> {
    const findings: HarnessErrorLike[] = [];

    for (const filePath of targetPaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        if (content.includes(ALLOWLIST_MARKER)) {
          continue;
        }
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (isAllowlisted(line, content)) {
            return;
          }
          for (const { pattern, description, ruleId } of SECURITY_PATTERNS) {
            pattern.lastIndex = 0;
            const matches = [...line.matchAll(pattern)];
            for (const match of matches) {
              const secretValue = match[0] ?? '';
              findings.push({
                code: { value: 'L3-001', toString: () => 'L3-001' },
                severity: { value: 'error', toString: () => 'error' },
                message: `セキュリティ問題: ${description} (${ruleId}) at ${filePath}:${idx + 1} value=${redactSecret(secretValue)}`,
                suggestion: `${ruleId}: 秘密情報は環境変数または秘密管理サービスを使用してください。fixture/docs のダミー値は ${ALLOWLIST_MARKER} を明示してください。`,
              });
            }
          }
        });
      } catch {
        // ファイル読み取りエラーはスキップ
      }
    }

    return { passed: findings.length === 0, findings };
  }
}

function isAllowlisted(line: string, content: string): boolean {
  if (line.includes(ALLOWLIST_MARKER)) return true;
  return /@example|dummy|placeholder/i.test(line) && content.includes(ALLOWLIST_MARKER);
}

function redactSecret(secretValue: string): string {
  const value = secretValue.trim();
  if (value.length <= 8) return '<redacted>';
  return `${value.slice(0, 3)}...<redacted:${value.length}>`;
}
