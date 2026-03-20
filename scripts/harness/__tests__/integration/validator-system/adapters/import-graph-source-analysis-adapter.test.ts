/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ImportGraphSourceAnalysisAdapter } from '../../../../validator-system/infrastructure/adapters/import-graph-source-analysis-adapter.js';

target('ImportGraphSourceAnalysisAdapter', () => {
  describe('getImportGraph', () => {
    context('getImportGraphを呼んだ場合（stub実装）', () => {
      it('nodesとedgesプロパティを持つオブジェクトが返る (IT-REPO-ImportGraph-001)', async () => {
        // Arrange
        const adapter = new ImportGraphSourceAnalysisAdapter();

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(Array.isArray(actual.nodes)).toBe(true);
        expect(Array.isArray(actual.edges)).toBe(true);
      });
    });

    context('stub実装が空グラフを返す場合', () => {
      it('nodes=[]かつedges=[]が返る (IT-REPO-ImportGraph-002)', async () => {
        // Arrange
        const adapter = new ImportGraphSourceAnalysisAdapter();

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(actual.nodes).toHaveLength(0);
        expect(actual.edges).toHaveLength(0);
      });
    });
  });
});
