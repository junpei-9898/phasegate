/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

    context('デフォルト除外パターンがある場合', () => {
      it('__tests__配下のexportを解析対象から除外する (IT-REPO-SourceAnalyzer-003)', async () => {
        // Arrange
        const sourceRoot = join(tmpdir(), `phasegate-source-analyzer-${Date.now()}`);
        await mkdir(join(sourceRoot, 'sample'), { recursive: true });
        await mkdir(join(sourceRoot, '__tests__'), { recursive: true });
        await writeFile(join(sourceRoot, 'sample', 'production.ts'), 'export class ProductionService {}\n');
        await writeFile(join(sourceRoot, '__tests__', 'helper.ts'), 'export class TestOnlyHelper {}\n');
        const adapter = new BiomeAstSourceCodeAnalyzerAdapter({ sourceRoot });

        try {
          // Act
          const actual = await adapter.getElements();

          // Assert
          expect(actual).toContain('ProductionService');
          expect(actual).not.toContain('TestOnlyHelper');
        } finally {
          await rm(sourceRoot, { recursive: true, force: true });
        }
      });
    });
  });
});
