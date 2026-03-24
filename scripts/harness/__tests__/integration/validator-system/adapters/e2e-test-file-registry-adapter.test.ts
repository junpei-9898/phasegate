/**
 * @layer test
 * @unit validator-system
 * @story H08-09
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { E2eTestFileRegistryAdapter } from '../../../../validator-system/infrastructure/adapters/e2e-test-file-registry-adapter.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

target('E2eTestFileRegistryAdapter', () => {

  describe('getE2eTestFiles()', () => {

    context('e2eTestRootオプションが未指定のとき', () => {
      it('空配列を返すこと (IT-VS-TA-E2E-01)', async () => {
        // Arrange
        const adapter = new E2eTestFileRegistryAdapter();
        // Act
        const actual = await adapter.getE2eTestFiles();
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('e2eTestRootにテストファイルが1件ある場合', () => {
      it('.test.tsファイルのパスを返すこと (IT-VS-TA-E2E-02)', async () => {
        // Arrange
        const dir = join(tmpdir(), `harness-e2e-test-${Date.now()}`);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'cli-harness.test.ts'), '// e2e test');
        await writeFile(join(dir, 'not-a-test.ts'), '// source');
        const adapter = new E2eTestFileRegistryAdapter({ e2eTestRoot: dir });

        try {
          // Act
          const actual = await adapter.getE2eTestFiles();
          // Assert
          expect(actual).toHaveLength(1);
          expect(actual[0]).toContain('cli-harness.test.ts');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });

  });

});

// @story-id H08-07