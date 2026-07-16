// @unit regression-suite
// @layer infrastructure
// @story H15-01
import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemV0SpecReaderAdapter } from '../../../regression-suite/infrastructure/adapters/file-system-v0-spec-reader-adapter.js';

target('FileSystemV0SpecReaderAdapter（実 FS 走査）', () => {
  // IT-ADP-V0SpecReader-001
  describe('readAll: baseDir 配下の .test.ts ファイルを V0TestId[] として返すこと', () => {
    context('実 FS に 3 件の .test.ts が存在する場合', () => {
      it('actual.length=3・各要素の value が実ファイルパスを保持すること', async () => {
        // Arrange: 実一時ディレクトリに .test.ts を 3 件配置
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-v0spec-'));
        try {
          await writeFile(path.join(baseDir, 'alpha.test.ts'), 'export {};', 'utf-8');
          await writeFile(path.join(baseDir, 'beta.test.ts'), 'export {};', 'utf-8');
          await mkdir(path.join(baseDir, 'nested'), { recursive: true });
          await writeFile(path.join(baseDir, 'nested', 'gamma.test.ts'), 'export {};', 'utf-8');
          const adapter = new FileSystemV0SpecReaderAdapter(baseDir);

          // Act
          const actual = await adapter.readAll();

          // Assert
          expect(actual).toHaveLength(3);
          const values = actual.map((id) => id.value).sort();
          expect(values).toContain(path.join(baseDir, 'alpha.test.ts'));
          expect(values).toContain(path.join(baseDir, 'nested', 'gamma.test.ts'));
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-V0SpecReader-002
  describe('readAll: .test.ts 以外のファイルを対象外にすること', () => {
    context('.test.ts・.spec.ts・.ts が混在する場合', () => {
      it('.test.ts の 1 件のみを返し .spec.ts / .ts を含めないこと', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-v0spec-filter-'));
        try {
          await writeFile(path.join(baseDir, 'included.test.ts'), 'export {};', 'utf-8');
          await writeFile(path.join(baseDir, 'excluded.spec.ts'), 'export {};', 'utf-8');
          await writeFile(path.join(baseDir, 'plain.ts'), 'export {};', 'utf-8');
          const adapter = new FileSystemV0SpecReaderAdapter(baseDir);

          // Act
          const actual = await adapter.readAll();

          // Assert
          expect(actual).toHaveLength(1);
          expect(actual[0].value).toBe(path.join(baseDir, 'included.test.ts'));
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-V0SpecReader-003
  describe('readAll: baseDir が存在しない場合に V0SpecReadError をスローすること', () => {
    context('実 FS 上に存在しないディレクトリを指定する場合', () => {
      it('V0SpecReadError を含むエラーがスローされること', async () => {
        // Arrange
        const missingDir = path.join(tmpdir(), `phasegate-wi277-missing-${Date.now()}`);
        const adapter = new FileSystemV0SpecReaderAdapter(missingDir);

        // Act / Assert
        await expect(adapter.readAll()).rejects.toThrow('V0SpecReadError');
      });
    });
  });
});
