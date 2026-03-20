/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { JsonCoverageReportAdapter, CoverageReportNotFoundError } from '../../../../validator-system/infrastructure/adapters/json-coverage-report-adapter.js';
import { join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const FIXTURES_DIR = join(
  process.cwd(),
  'scripts/harness/__tests__/fixtures/validator-system'
);

target('JsonCoverageReportAdapter', () => {
  describe('getCoverage', () => {
    context('coverage-summary.json（overallCoverage=92）が存在する場合', () => {
      it('overallCoverage=92のカバレッジデータが返る (IT-REPO-Coverage-001)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'coverage-summary.json');
        const adapter = new JsonCoverageReportAdapter(fixturePath);

        // Act
        const actual = await adapter.getCoverage();

        // Assert
        expect(actual.overallCoverage).toBe(92);
        expect(actual.perFileCoverage).toBeDefined();
      });
    });

    context('coverage-summary.json（overallCoverage=85）の場合', () => {
      it('overallCoverage=85が値として返る（閾値判定はUseCase側） (IT-REPO-Coverage-002)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'low-coverage-summary.json');
        const adapter = new JsonCoverageReportAdapter(fixturePath);

        // Act
        const actual = await adapter.getCoverage();

        // Assert
        expect(actual.overallCoverage).toBe(85);
      });
    });

    context('カバレッジレポートファイルが存在しない場合', () => {
      it('CoverageReportNotFoundErrorがthrowされる (IT-REPO-Coverage-003)', async () => {
        // Arrange
        const adapter = new JsonCoverageReportAdapter('/nonexistent/coverage.json');

        // Act & Assert
        await expect(adapter.getCoverage()).rejects.toThrow(CoverageReportNotFoundError);
      });
    });

    context('不正なJSONフォーマットの場合', () => {
      it('パースエラーがthrowされる (IT-REPO-Coverage-004)', async () => {
        // Arrange
        const tmpPath = join(tmpdir(), `test-coverage-${Date.now()}.json`);
        await writeFile(tmpPath, '{ invalid json }', 'utf-8');
        const adapter = new JsonCoverageReportAdapter(tmpPath);

        // Act & Assert
        await expect(adapter.getCoverage()).rejects.toThrow();

        // Cleanup
        await unlink(tmpPath).catch(() => {});
      });
    });
  });
});
