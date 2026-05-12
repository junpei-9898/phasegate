/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-119
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ImportGraphSourceAnalysisAdapter } from '../../../../validator-system/infrastructure/adapters/import-graph-source-analysis-adapter.js';
import { join } from 'node:path';

const FIXTURES_DIR = join(
  process.cwd(),
  'scripts/harness/__tests__/fixtures/validator-system/g5/import-graph'
);

target('ImportGraphSourceAnalysisAdapter', () => {
  describe('getImportGraph', () => {
    context('getImportGraphを呼んだ場合', () => {
      it('nodesとedgesプロパティを持つオブジェクトが返る (IT-REPO-ImportGraph-001)', async () => {
        // Arrange
        const adapter = new ImportGraphSourceAnalysisAdapter();

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(actual).toEqual({
          nodes: expect.any(Array),
          edges: expect.any(Array),
          unusedExports: expect.any(Array),
          unreachableCode: expect.any(Array),
        });
      });
    });

    context('scripts/harness配下にTypeScriptファイルが存在する場合', () => {
      it('空ではないインポートグラフが返る (IT-REPO-ImportGraph-002)', async () => {
        // Arrange
        const adapter = new ImportGraphSourceAnalysisAdapter();

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(actual.nodes.some((node) => node.filePath.endsWith('biome-ast-engine/composition-root.ts'))).toBe(true);
        expect(actual.edges.some((edge) =>
          edge.from.endsWith('preset-dogfood.integration.test.ts') &&
          edge.to.endsWith('biome-ast-engine/composition-root.ts') &&
          edge.importedNames.includes('createBiomeAstEngineModule')
        )).toBe(true);
      });
    });

    context('fixture root を指定した場合', () => {
      it('未参照 export を検出し barrel re-export 経由の参照は未使用扱いしない (WI-119)', async () => {
        // Arrange
        const adapter = new ImportGraphSourceAnalysisAdapter(FIXTURES_DIR, { includeExcludedFiles: true });

        // Act
        const actual = await adapter.getImportGraph();

        // Assert
        expect(actual.unusedExports).toEqual([
          `${join(FIXTURES_DIR, 'leaf.ts')}::unused (reason: no import/export graph reference)`,
        ]);
        expect(actual.nodes.map((node) => node.filePath).sort()).toEqual([
          join(FIXTURES_DIR, 'barrel.ts'),
          join(FIXTURES_DIR, 'consumer.ts'),
          join(FIXTURES_DIR, 'leaf.ts'),
        ]);
      });
    });
  });
});
