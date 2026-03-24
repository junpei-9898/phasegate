/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BiomeAstSourceCodeAnalyzerAdapter } from '../../../../validator-system/infrastructure/adapters/biome-ast-source-code-analyzer-adapter.js';

target('BiomeAstSourceCodeAnalyzerAdapter', () => {
  describe('analyzeExports', () => {
    context('targetUnitsを渡した場合', () => {
      it('対象Unit配下のソース解析結果が返る (IT-REPO-SourceAnalyzer-001)', async () => {
        // Arrange
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter();

        // Act
        const actual = await adapter.analyzeExports(['harness-error']);

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual.every((entry) => entry.unitName === 'harness-error')).toBe(true);
      });
    });

    context('getElementsを呼んだ場合', () => {
      it('抽出したexport名一覧が返る (IT-REPO-SourceAnalyzer-002)', async () => {
        // Arrange
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter();

        // Act
        const actual = await adapter.getElements(['harness-error']);

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual).toContain('HarnessError');
      });
    });
  });
});
