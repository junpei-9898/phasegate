/**
 * @layer test
 * @unit validator-system
 * @story H08-08
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { SourceFileTextScannerAdapter } from '../../../../validator-system/infrastructure/adapters/source-file-text-scanner-adapter.js';
import { StubCommentDetectionService } from '../../../../validator-system/domain/services/stub-comment-detection-service.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

target('SourceFileTextScannerAdapter', () => {

  describe('scanForPattern()', () => {

    context('targetPathsを指定したファイルにパターンが一致する行がある場合', () => {
      it('一致した行のマッチ情報を返すこと (IT-VS-TA-SC-01)', async () => {
        // Arrange
        const dir = join(tmpdir(), `harness-test-${Date.now()}`);
        await mkdir(dir, { recursive: true });
        const file = join(dir, 'adapter.ts');
        await writeFile(file, `line1\n// stub実装: TODO\nline3\n`);
        const adapter = new SourceFileTextScannerAdapter();

        try {
          // Act
          const actual = await adapter.scanForPattern(StubCommentDetectionService.STUB_COMMENT_PATTERN, [file]);
          // Assert
          expect(actual).toHaveLength(1);
          expect(actual[0].lineNumber).toBe(2);
          expect(actual[0].lineContent).toContain('stub実装');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });

    context('targetPathsを指定したファイルにパターンが一致しない場合', () => {
      it('空配列を返すこと (IT-VS-TA-SC-02)', async () => {
        // Arrange
        const dir = join(tmpdir(), `harness-test-${Date.now()}`);
        await mkdir(dir, { recursive: true });
        const file = join(dir, 'clean.ts');
        await writeFile(file, `const x = 1;\nconst y = 2;\n`);
        const adapter = new SourceFileTextScannerAdapter();

        try {
          // Act
          const actual = await adapter.scanForPattern(StubCommentDetectionService.STUB_COMMENT_PATTERN, [file]);
          // Assert
          expect(actual).toHaveLength(0);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });

    context('sourceRootオプション未指定かつtargetPaths未指定の場合', () => {
      it('空配列を返すこと (IT-VS-TA-SC-03)', async () => {
        // Arrange
        const adapter = new SourceFileTextScannerAdapter();
        // Act
        const actual = await adapter.scanForPattern(/stub/);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

  });

});

// @story-id H08-07