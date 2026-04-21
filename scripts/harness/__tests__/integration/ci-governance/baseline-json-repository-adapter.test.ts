// @unit ci-governance
// @layer test
// @story H12-01

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { BaselineJsonRepositoryAdapter } from '../../../ci-governance/infrastructure/adapters/baseline-json-repository-adapter.js';
import { BaselineSnapshot } from '../../../ci-governance/domain/value-objects/baseline-snapshot.js';
import { BaselineEntry } from '../../../ci-governance/domain/value-objects/baseline-entry.js';

const SHA = (c: string) => c.repeat(40);
const ISO_NOW = '2026-04-21T12:34:56.000Z';

target('BaselineJsonRepositoryAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-baseline-repo-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('save / load', () => {
    context('snapshot を save した直後に load', () => {
      it('IT-CG-BR-001a: 同じ entry が取得できる', async () => {
        const repo = new BaselineJsonRepositoryAdapter(tmpDir);
        const snapshot = BaselineSnapshot.create({
          createdAt: ISO_NOW,
          algorithm: 'sha1',
          entries: [
            BaselineEntry.create({ path: 'a.ts', sha1: SHA('a') }),
            BaselineEntry.create({ path: 'b.ts', sha1: SHA('b') }),
          ],
        });
        const written = await repo.save(snapshot);
        expect(written).toBe(path.join(tmpDir, '.phasegate', 'baseline.json'));

        const loaded = await repo.load();
        expect(loaded).not.toBeNull();
        expect(loaded!.entryCount).toBe(2);
        expect(loaded!.contains('a.ts')).toBe(true);
        expect(loaded!.entries[0].sha1).toBe(SHA('a'));
      });
    });

    context('親ディレクトリが存在しない状態で save', () => {
      it('IT-CG-BR-001b: .phasegate/ が自動作成される', async () => {
        const repo = new BaselineJsonRepositoryAdapter(tmpDir);
        const snapshot = BaselineSnapshot.create({
          createdAt: ISO_NOW,
          algorithm: 'sha1',
          entries: [],
        });
        await repo.save(snapshot);
        const stat = await fs.stat(path.join(tmpDir, '.phasegate'));
        expect(stat.isDirectory()).toBe(true);
      });
    });
  });

  describe('exists', () => {
    it('IT-CG-BR-001c: 未保存なら false / 保存後は true', async () => {
      const repo = new BaselineJsonRepositoryAdapter(tmpDir);
      expect(await repo.exists()).toBe(false);
      await repo.save(
        BaselineSnapshot.create({ createdAt: ISO_NOW, algorithm: 'sha1', entries: [] }),
      );
      expect(await repo.exists()).toBe(true);
    });
  });

  describe('load', () => {
    context('ファイルが存在しない場合', () => {
      it('IT-CG-BR-001d: null を返す', async () => {
        const repo = new BaselineJsonRepositoryAdapter(tmpDir);
        const loaded = await repo.load();
        expect(loaded).toBeNull();
      });
    });

    context('不正 JSON をロードした場合', () => {
      it('IT-CG-BR-002a: エラーをスローする', async () => {
        await fs.mkdir(path.join(tmpDir, '.phasegate'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '.phasegate', 'baseline.json'),
          '{ not: valid json',
          'utf-8',
        );
        const repo = new BaselineJsonRepositoryAdapter(tmpDir);
        await expect(repo.load()).rejects.toThrow(/Invalid baseline JSON/);
      });
    });

    context('schema に合致しない JSON をロード', () => {
      it('IT-CG-BR-002b: schema エラーをスローする', async () => {
        await fs.mkdir(path.join(tmpDir, '.phasegate'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '.phasegate', 'baseline.json'),
          JSON.stringify({ version: '2.0', files: [] }),
          'utf-8',
        );
        const repo = new BaselineJsonRepositoryAdapter(tmpDir);
        await expect(repo.load()).rejects.toThrow(/Invalid baseline JSON schema/);
      });
    });
  });
});
