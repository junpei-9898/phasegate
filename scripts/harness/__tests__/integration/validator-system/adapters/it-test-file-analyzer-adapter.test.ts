/**
 * @layer test
 * @unit validator-system
 * @story H08-07
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ItTestFileAnalyzerAdapter } from '../../../../validator-system/infrastructure/adapters/it-test-file-analyzer-adapter.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

target('ItTestFileAnalyzerAdapter', () => {

  describe('findMockCallsInItTests()', () => {

    context('targetPathsを指定したファイルにvi.mockがある場合', () => {
      it('vi.mockの呼び出しを検出すること (IT-VS-TA-IM-01)', async () => {
        // Arrange
        const dir = join(tmpdir(), `harness-test-${Date.now()}`);
        await mkdir(dir, { recursive: true });
        const file = join(dir, 'test.ts');
        await writeFile(file, `vi.mock('./internal-service')\nvi.mock('node:fs')\n`);
        const adapter = new ItTestFileAnalyzerAdapter();

        try {
          // Act
          const actual = await adapter.findMockCallsInItTests([file]);
          // Assert
          expect(actual).toHaveLength(2);
          const modules = actual.map((c) => c.mockedModule);
          expect(modules).toContain('./internal-service');
          expect(modules).toContain('node:fs');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });

    context('targetPathsを指定したファイルにvi.mockがない場合', () => {
      it('空配列を返すこと (IT-VS-TA-IM-02)', async () => {
        // Arrange
        const dir = join(tmpdir(), `harness-test-${Date.now()}`);
        await mkdir(dir, { recursive: true });
        const file = join(dir, 'test.ts');
        await writeFile(file, `describe('test', () => { it('passes', () => {}) })\n`);
        const adapter = new ItTestFileAnalyzerAdapter();

        try {
          // Act
          const actual = await adapter.findMockCallsInItTests([file]);
          // Assert
          expect(actual).toHaveLength(0);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });

    context('itTestRootオプション未指定かつtargetPaths未指定の場合', () => {
      it('空配列を返すこと (IT-VS-TA-IM-03)', async () => {
        // Arrange
        const adapter = new ItTestFileAnalyzerAdapter();
        // Act
        const actual = await adapter.findMockCallsInItTests();
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

  });

});

// @story-id H08-07