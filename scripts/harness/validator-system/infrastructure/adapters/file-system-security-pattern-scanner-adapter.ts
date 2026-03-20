/**
 * @layer infrastructure
 * @unit validator-system
 *
 * FileSystemSecurityPatternScannerAdapter — SecurityPatternScannerPort実装
 */
import type { SecurityPatternScannerPort } from '../../domain/ports/security-pattern-scanner-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import { readFile } from 'node:fs/promises';

const SECURITY_PATTERNS = [
  { pattern: /(?:API_KEY|api_key|apikey)\s*=\s*["'][^"']{8,}["']/gi, description: 'ハードコードAPIキー' },
  { pattern: /(?:password|PASSWORD|passwd)\s*=\s*["'][^"']{4,}["']/gi, description: 'ハードコードパスワード' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, description: 'OpenAI APIキー形式' },
];

export class FileSystemSecurityPatternScannerAdapter implements SecurityPatternScannerPort {
  async scan(targetPaths: readonly string[]): Promise<{
    passed: boolean;
    findings: readonly HarnessErrorLike[];
  }> {
    const findings: HarnessErrorLike[] = [];

    for (const filePath of targetPaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          for (const { pattern, description } of SECURITY_PATTERNS) {
            if (pattern.test(line)) {
              findings.push({
                code: { value: 'L3-001', toString: () => 'L3-001' },
                severity: { value: 'error', toString: () => 'error' },
                message: `セキュリティ問題: ${description} at ${filePath}:${idx + 1}`,
                suggestion: '秘密情報は環境変数または秘密管理サービスを使用してください',
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
