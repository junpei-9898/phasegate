/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AstPerformanceScannerAdapter } from '../../../../validator-system/infrastructure/adapters/ast-performance-scanner-adapter.js';

target('AstPerformanceScannerAdapter', () => {
  describe('scan', () => {
    context('パフォーマンス問題のないファイル群の場合', () => {
      it('passed=trueかつfindings=[]が返る（stub実装） (IT-REPO-Perf-001)', async () => {
        // Arrange
        const adapter = new AstPerformanceScannerAdapter();
        const targetPaths = ['src/clean.ts'] as readonly string[];
        const thresholds = { bundleSizeLimit: 512000 };

        // Act
        const actual = await adapter.scan(targetPaths, thresholds);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.findings).toHaveLength(0);
      });
    });

    context('空のtargetPathsを渡した場合', () => {
      it('passed=trueかつfindings=[]が返る (IT-REPO-Perf-002)', async () => {
        // Arrange
        const adapter = new AstPerformanceScannerAdapter();
        const targetPaths = [] as readonly string[];
        const thresholds = {};

        // Act
        const actual = await adapter.scan(targetPaths, thresholds);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.findings).toHaveLength(0);
      });
    });

    context('thresholdsが空オブジェクトの場合', () => {
      it('エラーなく実行されfindings=[]が返る (IT-REPO-Perf-003)', async () => {
        // Arrange
        const adapter = new AstPerformanceScannerAdapter();
        const targetPaths = ['src/'] as readonly string[];
        const thresholds = {};

        // Act
        const actual = await adapter.scan(targetPaths, thresholds);

        // Assert
        expect(Array.isArray(actual.findings)).toBe(true);
      });
    });
  });
});
