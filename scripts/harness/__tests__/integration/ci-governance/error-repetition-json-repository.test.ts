// @layer test
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorRepetitionJsonRepository } from '../../../ci-governance/infrastructure/adapters/error-repetition-json-repository.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('ErrorRepetitionJsonRepository', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `error-repo-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('findByCodeテスト', () => {
    // IT-REPO-ErrorRepetitionJson-001
    context('error-history.jsonが存在しない場合', () => {
      it('findByCodeがnullを返す', async () => {
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        const actual = await repo.findByCode('L1-001');
        expect(actual).toBeNull();
      });
    });

    // IT-REPO-ErrorRepetitionJson-005
    context('スキーマ不正なJSONファイルが存在する場合', () => {
      it('HarnessErrorがスローされる', async () => {
        const filePath = path.join(tmpDir, '.harness', 'error-history.json');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '{ invalid json }', 'utf-8');
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        await expect(repo.findByCode('L1-001')).rejects.toThrow();
      });
    });
  });

  describe('save→findByCodeテスト', () => {
    // IT-REPO-ErrorRepetitionJson-002
    context('save()後にfindByCode()を呼ぶ場合', () => {
      it('同一occurrenceCount・escalatedのインスタンスが取得できる', async () => {
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        let er = ErrorRepetition.create('L1-001');
        er = er.increment();
        await repo.save(er);
        const actual = await repo.findByCode('L1-001');
        expect(actual).not.toBeNull();
        expect(actual!.occurrenceCount).toBe(1);
        expect(actual!.escalated).toBe(false);
      });
    });

    // IT-REPO-ErrorRepetitionJson-003
    context('既存エントリをsave()で更新した場合', () => {
      it('findByCode()で更新後のoccurrenceCountが返る', async () => {
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        let er = ErrorRepetition.create('L1-001');
        er = er.increment().increment();
        await repo.save(er);
        let updated = (await repo.findByCode('L1-001'))!;
        updated = updated.increment();
        await repo.save(updated);
        const actual = await repo.findByCode('L1-001');
        expect(actual!.occurrenceCount).toBe(3);
      });
    });
  });

  describe('deleteByCodeテスト', () => {
    // IT-REPO-ErrorRepetitionJson-004
    context('deleteByCode()で対象エントリを削除した場合', () => {
      it('deleteByCode後のfindByCode()がnullを返す', async () => {
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        const er = ErrorRepetition.create('L1-001');
        await repo.save(er);
        await repo.deleteByCode('L1-001');
        const actual = await repo.findByCode('L1-001');
        expect(actual).toBeNull();
      });
    });
  });
});
