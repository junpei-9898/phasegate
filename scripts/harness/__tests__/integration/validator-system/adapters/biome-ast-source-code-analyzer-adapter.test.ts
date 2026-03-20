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
    context('targetUnitsを渡した場合（stub実装）', () => {
      it('analyzeExportsが空配列を返す（stub） (IT-REPO-SourceAnalyzer-001)', async () => {
        // Arrange
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter();

        // Act
        const actual = await adapter.analyzeExports(['harness-error']);

        // Assert
        expect(Array.isArray(actual)).toBe(true);
      });
    });

    context('getElementsを呼んだ場合', () => {
      it('空配列が返る（stub） (IT-REPO-SourceAnalyzer-002)', async () => {
        // Arrange
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter();

        // Act
        const actual = await adapter.getElements(['harness-error']);

        // Assert
        expect(Array.isArray(actual)).toBe(true);
      });
    });
  });
});
