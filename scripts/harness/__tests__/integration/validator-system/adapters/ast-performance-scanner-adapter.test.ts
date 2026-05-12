/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 * @work-item-id WI-121
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AstPerformanceScannerAdapter } from '../../../../validator-system/infrastructure/adapters/ast-performance-scanner-adapter.js';
import { join } from 'node:path';

const FIXTURES_DIR = join(
  process.cwd(),
  'scripts/harness/__tests__/fixtures/validator-system/g5'
);

target('AstPerformanceScannerAdapter', () => {
  describe('scan', () => {
    context('パフォーマンス問題のないファイル群の場合', () => {
      it('存在しないファイルはgraceful skipされる (IT-REPO-Perf-001)', async () => {
        // Arrange
        const adapter = new AstPerformanceScannerAdapter();
        const targetPaths = ['src/clean.ts'] as readonly string[];
        const thresholds = { bundleSizeLimit: 512000 };

        // Act
        const actual = await adapter.scan(targetPaths, thresholds);

        // Assert
        expect(actual).toEqual({ passed: true, findings: [] });
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
        expect(actual).toEqual({ passed: true, findings: [] });
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
        expect(actual).toEqual({ passed: true, findings: [] });
      });
    });

    context('同期I/Oを含むファイルの場合', () => {
      it('L3-002 finding を返す (WI-121)', async () => {
        // Arrange
        const filePath = join(FIXTURES_DIR, 'perf-sync-io.ts');
        const adapter = new AstPerformanceScannerAdapter();

        // Act
        const actual = await adapter.scan([filePath], {});

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings.map((finding) => finding.message)).toEqual([
          `同期I/O呼び出しを検出しました: ${filePath} metric=sync-io threshold=0`,
        ]);
      });
    });

    context('performance suppression marker を含む場合', () => {
      it('許容済み batch/migration smell を抑制する (WI-121)', async () => {
        // Arrange
        const filePath = join(FIXTURES_DIR, 'perf-suppressed.ts');
        const adapter = new AstPerformanceScannerAdapter();

        // Act
        const actual = await adapter.scan([filePath], {});

        // Assert
        expect(actual).toEqual({ passed: true, findings: [] });
      });
    });
  });
});
