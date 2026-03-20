/**
 * @layer infrastructure
 * @unit validator-system
 *
 * ImportGraphSourceAnalysisAdapter — SourceAnalysisPort実装
 */
import type { SourceAnalysisPort, ImportGraphData } from '../../domain/ports/source-analysis-port.js';

export class ImportGraphSourceAnalysisAdapter implements SourceAnalysisPort {
  async getImportGraph(): Promise<ImportGraphData> {
    // stub実装: 実際の実装ではbiome-ast-engineのImportGraphを使用する
    return { nodes: [], edges: [], unusedExports: [], unreachableCode: [] };
  }
}
