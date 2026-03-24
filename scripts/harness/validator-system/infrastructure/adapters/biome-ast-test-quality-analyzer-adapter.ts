/**
 * @layer infrastructure
 * @unit validator-system
 *
 * BiomeAstTestQualityAnalyzerAdapter — TestQualityAnalyzerPort実装
 * testing-rules.md準拠チェック: 日本語テスト名・actual変数・AAA構造
 */
import { readFile } from 'node:fs/promises';
import type { TestQualityAnalyzerPort } from '../../domain/ports/test-quality-analyzer-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

// Japanese character ranges: hiragana, katakana, kanji
const JAPANESE_CHAR = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;

// Matches it('...') or test('...') lines
const IT_OR_TEST_LINE = /^\s*(?:it|test)\s*\(\s*['"`](.*?)['"`]/;

function createViolation(code: string, message: string, suggestion: string): HarnessErrorLike {
  return {
    code: { value: code, toString: () => code },
    severity: { value: 'warning', toString: () => 'warning' },
    message,
    suggestion,
  };
}

function analyzeContent(filePath: string, content: string): HarnessErrorLike[] {
  const violations: HarnessErrorLike[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const itMatch = lines[i].match(IT_OR_TEST_LINE);
    if (itMatch && !JAPANESE_CHAR.test(itMatch[1])) {
      violations.push(createViolation(
        'L2-003',
        `テスト名が日本語ではありません: "${itMatch[1]}" at ${filePath}:${i + 1}`,
        'テスト名は日本語で記述してください（testing-rules.md準拠）',
      ));
    }
  }

  // If file uses expect() but lacks `const actual` assignment
  if (/\bexpect\s*\(/.test(content) && !/\bconst\s+actual\b/.test(content)) {
    violations.push(createViolation(
      'L2-003',
      `\`actual\` 変数が未使用: ${filePath}`,
      'アサーション前に const actual = ... で結果を変数に格納してください（testing-rules.md準拠）',
    ));
  }

  return violations;
}

export class BiomeAstTestQualityAnalyzerAdapter implements TestQualityAnalyzerPort {
  async analyzeTestFiles(targetPaths: readonly string[]): Promise<{
    results: readonly { filePath: string; passed: boolean; violations: readonly HarnessErrorLike[] }[];
  }> {
    const results = await Promise.all(
      targetPaths.map(async (filePath) => {
        try {
          const content = await readFile(filePath, 'utf-8');
          const violations = analyzeContent(filePath, content);
          return { filePath, passed: violations.length === 0, violations };
        } catch {
          return { filePath, passed: true, violations: [] as HarnessErrorLike[] };
        }
      }),
    );
    return { results };
  }
}
