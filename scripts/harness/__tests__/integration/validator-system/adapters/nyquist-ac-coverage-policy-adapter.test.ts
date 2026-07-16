/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 * @work-item-id WI-292
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { NyquistAcCoveragePolicyAdapter } from '../../../../validator-system/infrastructure/adapters/nyquist-ac-coverage-policy-adapter.js';

const tempDirectories: string[] = [];

async function writeMatrix(testReferences: readonly unknown[]): Promise<string> {
  const directory = join(tmpdir(), `l3-004-lifecycle-${randomUUID()}`);
  tempDirectories.push(directory);
  await mkdir(directory, { recursive: true });
  const matrixFilePath = join(directory, 'requirement-test-matrix.json');
  await writeFile(matrixFilePath, JSON.stringify({
    version: '1.2',
    generatedAt: '2026-07-16T00:00:00.000Z',
    stories: [{
      storyId: 'H17-07',
      coverageStatus: 'planned',
      coverageLifecycle: ['planned'],
      storyMappings: [{ acId: 'AC-1', testReferences }],
    }],
  }));
  return matrixFilePath;
}

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

target('NyquistAcCoveragePolicyAdapter', () => {
  describe('checkCoverage', () => {
    context('matrixFilePathを省略して呼ぶ場合', () => {
      it('例外なく呼び出せること (IT-REPO-Nyquist-001)', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkCoverage({ matrixFilePath: undefined });

        // Assert
        expect(typeof actual.passed).toBe('boolean');
        expect(Array.isArray(actual.errors)).toBe(true);
      });
    });

    context('存在しないmatrixFilePathを渡す場合（FAIL-CLOSED）', () => {
      it('検査失敗をpassed=falseとして扱いエラーを1件以上返すこと (IT-REPO-Nyquist-002)', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkCoverage({ matrixFilePath: '/path/to/missing-matrix.json' });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(actual.errors[0]?.code.value).toBe('L3-004');
      });
    });

    context('planned Story を含む schema 1.2 matrix の場合', () => {
      it('test reference がなければ可視な未カバーACをblockingしないこと', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();
        const matrixFilePath = await writeMatrix([]);

        // Act
        const actual = await adapter.checkCoverage({ matrixFilePath });

        // Assert
        expect(actual).toEqual({ passed: true, errors: [] });
      });

      it('test reference があれば required への遷移漏れとしてfail-closedにすること', async () => {
        // Arrange
        const adapter = new NyquistAcCoveragePolicyAdapter();
        const matrixFilePath = await writeMatrix([{
          filePath: 'scripts/harness/__tests__/unit/example.test.ts',
          testType: 'unit',
        }]);

        // Act
        const actual = await adapter.checkCoverage({ matrixFilePath });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0]?.code.value).toBe('L3-004');
        expect(actual.errors[0]?.message).toContain('transition');
      });
    });
  });
});
