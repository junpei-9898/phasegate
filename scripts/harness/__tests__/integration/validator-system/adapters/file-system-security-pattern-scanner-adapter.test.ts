/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { FileSystemSecurityPatternScannerAdapter } from '../../../../validator-system/infrastructure/adapters/file-system-security-pattern-scanner-adapter.js';
import { join } from 'node:path';

const FIXTURES_DIR = join(
  process.cwd(),
  'scripts/harness/__tests__/fixtures/validator-system'
);

target('FileSystemSecurityPatternScannerAdapter', () => {
  describe('scan', () => {
    context('セキュリティ問題のないファイル群の場合', () => {
      it('passed=trueかつfindings=[]が返る (IT-REPO-Security-001)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'secure-source.ts');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([fixturePath]);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.findings).toHaveLength(0);
      });
    });

    context('ハードコードされたAPIキーを含むファイルの場合', () => {
      it('passed=falseかつfindings[0].code.toString()="L3-001"が返る (IT-REPO-Security-002)', async () => {
        // Arrange
        const fixturePath = join(FIXTURES_DIR, 'insecure-source.ts');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([fixturePath]);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.findings[0].code.toString()).toBe('L3-001');
        expect(actual.findings[0].severity.toString()).toBe('error');
      });
    });

    context('複数ファイルにわたるスキャンの場合', () => {
      it('findings[0]のmessageに問題ファイルのパスが含まれる (IT-REPO-Security-003)', async () => {
        // Arrange
        const securePath = join(FIXTURES_DIR, 'secure-source.ts');
        const insecurePath = join(FIXTURES_DIR, 'insecure-source.ts');
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan([insecurePath, securePath]);

        // Assert
        expect(actual.findings[0].message).toContain('insecure-source.ts');
      });
    });

    context('存在しないファイルパスを渡した場合', () => {
      it('エラーなく実行されfindings=[]が返る（ファイル読み取りエラーはスキップ） (IT-REPO-Security-004)', async () => {
        // Arrange
        const adapter = new FileSystemSecurityPatternScannerAdapter();

        // Act
        const actual = await adapter.scan(['/nonexistent/path/file.ts']);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.findings).toHaveLength(0);
      });
    });
  });
});
