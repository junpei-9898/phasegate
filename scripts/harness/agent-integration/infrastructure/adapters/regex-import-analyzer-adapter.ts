/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * RegexImportAnalyzerAdapter (TsMorphImportAnalyzerAdapter の代替実装)
 * ts-morph が利用不可のため、正規表現ベースの import 解析を実装する
 *
 * 設計注意: ts-morph は package.json に含まれていないため、
 * node:fs/promises + 正規表現で @anthropic-ai/claude-code の import を検出する
 */

import * as fs from 'node:fs/promises';
import type { ImportAnalyzerPort, ImportAnalysisResult } from '../../domain/ports/import-analyzer-port.js';

/** エージェント固有APIのパターン */
const AGENT_API_PATTERNS = [
  '@anthropic-ai/claude-code',
  'claude-code',
];

/**
 * TypeScript ファイルから import 文を解析し、
 * エージェント固有APIの import を検出する
 */
function detectAgentImportsInContent(content: string): string[] {
  const detected: string[] = [];
  // import { ... } from '...' または import ... from '...' のパターン
  const importRegex = /import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const modulePath = match[1];
    if (modulePath && AGENT_API_PATTERNS.some((pattern) => modulePath === pattern || modulePath.startsWith(`${pattern}/`))) {
      if (!detected.includes(modulePath)) {
        detected.push(modulePath);
      }
    }
  }

  return detected;
}

export class RegexImportAnalyzerAdapter implements ImportAnalyzerPort {
  async analyzeAgentApiImports(targetFilePaths: string[]): Promise<ImportAnalysisResult[]> {
    if (targetFilePaths.length === 0) {
      return [];
    }

    const results: ImportAnalysisResult[] = [];

    for (const filePath of targetFilePaths) {
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        // ファイルが存在しない場合はエラーを再スロー
        throw new Error(`ファイルの読み取りに失敗しました: ${filePath}: ${String(error)}`);
      }

      const agentApiImports = detectAgentImportsInContent(content);
      results.push({ filePath, agentApiImports });
    }

    return results;
  }
}

// TsMorphImportAnalyzerAdapter として同じクラスを re-export
export { RegexImportAnalyzerAdapter as TsMorphImportAnalyzerAdapter };
