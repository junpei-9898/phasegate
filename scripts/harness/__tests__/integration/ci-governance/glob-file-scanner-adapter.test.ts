// @unit ci-governance
// @layer test
// @story H12-01

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { GlobFileScannerAdapter } from '../../../ci-governance/infrastructure/adapters/glob-file-scanner-adapter.js';

target('GlobFileScannerAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-baseline-scan-'));
    await fs.mkdir(path.join(tmpDir, 'scripts', 'harness'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'scripts', 'harness', 'main.ts'), 'x', 'utf-8');
    await fs.writeFile(path.join(tmpDir, 'scripts', 'harness', 'util.ts'), 'y', 'utf-8');
    await fs.mkdir(path.join(tmpDir, 'scripts', 'harness', '__tests__'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmpDir, 'scripts', 'harness', '__tests__', 'foo.test.ts'),
      'z',
      'utf-8',
    );
    await fs.mkdir(path.join(tmpDir, 'node_modules', 'picomatch'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'node_modules', 'picomatch', 'index.ts'),
      'n',
      'utf-8',
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('scan', () => {
    context('デフォルト includes で scripts/**/*.ts を指定', () => {
      it('UT-CG-GS-001a: scripts 配下の .ts を拾い node_modules は除外する', async () => {
        const adapter = new GlobFileScannerAdapter(tmpDir);
        const files = await adapter.scan({
          include: ['scripts/**/*.ts'],
          exclude: [],
        });
        expect(files).toContain('scripts/harness/main.ts');
        expect(files).toContain('scripts/harness/util.ts');
        expect(files.some((f) => f.includes('node_modules'))).toBe(false);
      });
    });

    context('excludes に **/__tests__/** を指定', () => {
      it('UT-CG-GS-001b: __tests__ 配下が除外される', async () => {
        const adapter = new GlobFileScannerAdapter(tmpDir);
        const files = await adapter.scan({
          include: ['scripts/**/*.ts'],
          exclude: ['**/__tests__/**'],
        });
        expect(files.some((f) => f.includes('__tests__'))).toBe(false);
        expect(files).toContain('scripts/harness/main.ts');
      });
    });

    context('存在しない baseDir を指定', () => {
      it('UT-CG-GS-001c: 例外を投げず空配列を返す', async () => {
        const adapter = new GlobFileScannerAdapter(path.join(tmpDir, 'does-not-exist'));
        const files = await adapter.scan({ include: ['**/*.ts'], exclude: [] });
        expect(files).toEqual([]);
      });
    });

    context('結果ソート', () => {
      it('UT-CG-GS-001d: 結果が昇順でソートされている', async () => {
        const adapter = new GlobFileScannerAdapter(tmpDir);
        const files = await adapter.scan({
          include: ['scripts/**/*.ts'],
          exclude: ['**/__tests__/**'],
        });
        const sorted = [...files].sort();
        expect(files).toEqual(sorted);
      });
    });
  });
});
