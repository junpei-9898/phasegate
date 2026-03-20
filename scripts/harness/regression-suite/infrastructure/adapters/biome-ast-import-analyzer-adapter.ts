import * as fs from 'node:fs/promises';
import type { ImportAnalyzerPort } from '../../domain/ports/import-analyzer-port.js';

export class BiomeAstImportAnalyzerAdapter implements ImportAnalyzerPort {
  async analyzeImports(targetModule: string): Promise<string[]> {
    try {
      const content = await fs.readFile(targetModule, 'utf-8');
      const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      return importMatches.map((match) => {
        const packageMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        return packageMatch ? packageMatch[1] : '';
      }).filter((s) => s.length > 0);
    } catch {
      return [];
    }
  }
}
