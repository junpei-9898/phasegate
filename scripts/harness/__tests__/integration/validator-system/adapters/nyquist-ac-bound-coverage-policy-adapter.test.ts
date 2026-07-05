/**
 * @layer test
 * @unit validator-system
 * @story H16-03
 */
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { NyquistAcBoundCoveragePolicyAdapter } from '../../../../validator-system/infrastructure/adapters/nyquist-ac-bound-coverage-policy-adapter.js';

/** HF2-05 が全 AC ac-bound な最小マトリクス */
function matrixAllAcBound(): unknown {
  return {
    stories: [
      {
        storyId: 'HF2-05',
        storyMappings: [
          { acId: 'AC-1', testReferences: [{ filePath: 'a.test.ts', testType: 'it', binding: 'ac' }] },
          { acId: 'AC-2', testReferences: [{ filePath: 'b.test.ts', testType: 'it', binding: 'ac' }, { filePath: 'c.test.ts', testType: 'it', binding: 'file' }] },
        ],
      },
      {
        storyId: 'H99-99',
        storyMappings: [
          { acId: 'AC-1', testReferences: [{ filePath: 'd.test.ts', testType: 'it', binding: 'file' }] },
        ],
      },
    ],
  };
}

/** HF2-05 の AC-2 が fileFallbackOnly なマトリクス */
function matrixFileFallbackOnly(): unknown {
  return {
    stories: [
      {
        storyId: 'HF2-05',
        storyMappings: [
          { acId: 'AC-1', testReferences: [{ filePath: 'a.test.ts', testType: 'it', binding: 'ac' }] },
          { acId: 'AC-2', testReferences: [{ filePath: 'c.test.ts', testType: 'it', binding: 'file' }] },
        ],
      },
    ],
  };
}

target('NyquistAcBoundCoveragePolicyAdapter', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'l3-005-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeMatrix(data: unknown): Promise<string> {
    const p = join(dir, 'requirement-test-matrix.json');
    await writeFile(p, JSON.stringify(data), 'utf8');
    return p;
  }

  describe('checkAcBoundCoverage', () => {
    context('HF2-05 の全 AC が ac-bound な場合', () => {
      it('passed=true を返すこと (IT-L3005-001)', async () => {
        // Arrange
        const matrixFilePath = await writeMatrix(matrixAllAcBound());
        const adapter = new NyquistAcBoundCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkAcBoundCoverage({ matrixFilePath, acBoundStories: ['HF2-05'] });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });

    context('スコープ内 story の AC が file-fallback のみの場合', () => {
      it('fail-closed で passed=false かつ L3-005 エラーを返すこと (IT-L3005-002)', async () => {
        // Arrange
        const matrixFilePath = await writeMatrix(matrixFileFallbackOnly());
        const adapter = new NyquistAcBoundCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkAcBoundCoverage({ matrixFilePath, acBoundStories: ['HF2-05'] });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(actual.errors[0]?.code.value).toBe('L3-005');
      });
    });

    context('matrix が存在しない場合', () => {
      it('fail-closed で passed=false を返すこと (IT-L3005-003)', async () => {
        // Arrange
        const adapter = new NyquistAcBoundCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkAcBoundCoverage({ matrixFilePath: join(dir, 'missing.json'), acBoundStories: ['HF2-05'] });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0]?.code.value).toBe('L3-005');
      });
    });

    context('matrix が parse 不能な場合', () => {
      it('fail-closed で passed=false を返すこと (IT-L3005-004)', async () => {
        // Arrange
        const p = join(dir, 'requirement-test-matrix.json');
        await writeFile(p, '{ this is not json', 'utf8');
        const adapter = new NyquistAcBoundCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkAcBoundCoverage({ matrixFilePath: p, acBoundStories: ['HF2-05'] });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0]?.code.value).toBe('L3-005');
      });
    });

    context('スコープ外 story のみが file-fallback な場合', () => {
      it('スコープ外は無視され passed=true を返すこと (IT-L3005-005)', async () => {
        // Arrange — H99-99 は file-fallback だが acBoundStories に含めない
        const matrixFilePath = await writeMatrix(matrixAllAcBound());
        const adapter = new NyquistAcBoundCoveragePolicyAdapter();

        // Act
        const actual = await adapter.checkAcBoundCoverage({ matrixFilePath, acBoundStories: ['HF2-05'] });

        // Assert
        expect(actual.passed).toBe(true);
      });
    });
  });
});
