import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemExistenceAdapter } from '../../../ci-governance/infrastructure/adapters/file-system-existence-adapter.js';

target('FileSystemExistenceAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `fs-existence-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('existsテスト', () => {
    // IT-REPO-FileSystemExistence-001
    context('実在するファイルパスに対してexists()を呼ぶ場合', () => {
      it('trueが返る', async () => {
        const filePath = path.join(tmpDir, 'test-file.md');
        await fs.writeFile(filePath, 'content', 'utf-8');
        const adapter = new FileSystemExistenceAdapter(tmpDir);
        const relativePath = 'test-file.md';
        const actual = await adapter.exists(relativePath);
        expect(actual).toBe(true);
      });
    });

    // IT-REPO-FileSystemExistence-002
    context('存在しないファイルパスに対してexists()を呼ぶ場合', () => {
      it('falseが返る', async () => {
        const adapter = new FileSystemExistenceAdapter(tmpDir);
        const actual = await adapter.exists('nonexistent.md');
        expect(actual).toBe(false);
      });
    });
  });
});
