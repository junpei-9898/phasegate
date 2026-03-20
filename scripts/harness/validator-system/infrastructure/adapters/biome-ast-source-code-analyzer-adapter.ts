/**
 * @layer infrastructure
 * @unit validator-system
 *
 * BiomeAstSourceCodeAnalyzerAdapter — SourceCodeAnalyzerPort実装
 */
import type { SourceCodeAnalyzerPort, SourceAnalysisResult } from '../../domain/ports/source-code-analyzer-port.js';

export class BiomeAstSourceCodeAnalyzerAdapter implements SourceCodeAnalyzerPort {
  async analyzeExports(targetUnits?: readonly string[]): Promise<readonly SourceAnalysisResult[]> {
    // stub実装: 実際の実装ではbiome-ast-engineを使用する
    return [];
  }

  async getElements(targetUnits?: readonly string[]): Promise<string[]> {
    return [];
  }
}
