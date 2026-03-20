/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BiomeAstTestQualityAnalyzerAdapter } from '../../../../validator-system/infrastructure/adapters/biome-ast-test-quality-analyzer-adapter.js';

target('BiomeAstTestQualityAnalyzerAdapter', () => {
  describe('analyzeTestFiles', () => {
    context('単一ファイルパスを指定した場合', () => {
      it('results[0].passed=trueかつviolations=[]が返る（stub実装） (IT-REPO-TestQuality-001)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/valid.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results[0].passed).toBe(true);
        expect(actual.results[0].violations).toHaveLength(0);
      });
    });

    context('複数ファイルパスを指定した場合', () => {
      it('全ファイルの結果が返る (IT-REPO-TestQuality-002)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/file1.test.ts', 'tests/file2.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results).toHaveLength(2);
      });
    });

    context('違反なしのファイルを複数渡した場合', () => {
      it('全ファイルのpassed=trueが返る (IT-REPO-TestQuality-003)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/a.test.ts', 'tests/b.test.ts', 'tests/c.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results.every((r) => r.passed === true)).toBe(true);
      });
    });

    context('結果にfilePathが含まれる場合', () => {
      it('results[0].filePathが入力パスと一致する (IT-REPO-TestQuality-004)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = 'tests/target.test.ts';
        const input = [filePath] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results[0].filePath).toBe(filePath);
      });
    });

    context('targetPathsが空の場合', () => {
      it('results=[]が返る (IT-REPO-TestQuality-005)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = [] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results).toHaveLength(0);
      });
    });

    context('violations配列の型チェック', () => {
      it('results[0].violationsはArrayである (IT-REPO-TestQuality-006)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/sample.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(Array.isArray(actual.results[0].violations)).toBe(true);
      });
    });

    context('返却型の確認', () => {
      it('resultsプロパティを含むオブジェクトが返る (IT-REPO-TestQuality-007)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/sample.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual).toHaveProperty('results');
        expect(Array.isArray(actual.results)).toBe(true);
      });
    });
  });
});
