// @unit ci-governance
// @layer test
// @story H12-01

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CreateBaselineUseCase } from '../../../ci-governance/application/usecases/create-baseline-usecase.js';
import type { FileScannerPort } from '../../../ci-governance/domain/ports/file-scanner-port.js';
import type { FileHasherPort } from '../../../ci-governance/domain/ports/file-hasher-port.js';
import type { BaselineRepositoryPort } from '../../../ci-governance/domain/ports/baseline-repository-port.js';

const SHA = (c: string) => c.repeat(40);

function createScanner(files: readonly string[]): FileScannerPort {
  return { scan: vi.fn(async () => files) };
}

function createHasher(hashByPath: Record<string, string>): FileHasherPort {
  return {
    hashFile: vi.fn(async (p: string) => hashByPath[p] ?? SHA('0')),
  };
}

function createRepository(overrides?: Partial<BaselineRepositoryPort>): BaselineRepositoryPort {
  return {
    getPath: vi.fn(() => '/tmp/baseline.json'),
    exists: vi.fn(async () => false),
    save: vi.fn(async () => '/tmp/baseline.json'),
    load: vi.fn(async () => null),
    ...overrides,
  };
}

target('CreateBaselineUseCase', () => {
  describe('正常系', () => {
    context('scanner が 2 ファイル返し、hasher が sha1 を返す', () => {
      it('IT-CG-CB-001a: snapshot に 2 エントリが保存される', async () => {
        const scanner = createScanner(['a.ts', 'b.ts']);
        const hasher = createHasher({ 'a.ts': SHA('a'), 'b.ts': SHA('b') });
        const repo = createRepository();
        const usecase = new CreateBaselineUseCase(
          scanner,
          hasher,
          repo,
          () => new Date('2026-04-21T12:34:56.000Z'),
        );

        const result = await usecase.execute();
        expect(result.entryCount).toBe(2);
        expect(result.dryRun).toBe(false);
        expect(result.overwriteBlocked).toBe(false);
        expect(result.files[0]).toEqual({ path: 'a.ts', sha1: SHA('a') });
        expect(repo.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('dry-run', () => {
    context('input.dryRun=true を渡した場合', () => {
      it('IT-CG-CB-002a: repository.save が呼ばれない', async () => {
        const scanner = createScanner(['a.ts']);
        const hasher = createHasher({ 'a.ts': SHA('a') });
        const repo = createRepository();
        const usecase = new CreateBaselineUseCase(scanner, hasher, repo);

        const result = await usecase.execute({ dryRun: true });
        expect(result.dryRun).toBe(true);
        expect(result.entryCount).toBe(1);
        expect(repo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('overwrite 制御', () => {
    context('既存 baseline があり force=false の場合', () => {
      it('IT-CG-CB-003a: overwriteBlocked=true で scan / save されない', async () => {
        const scanner = createScanner(['a.ts']);
        const hasher = createHasher({ 'a.ts': SHA('a') });
        const repo = createRepository({ exists: vi.fn(async () => true) });
        const usecase = new CreateBaselineUseCase(scanner, hasher, repo);

        const result = await usecase.execute();
        expect(result.overwriteBlocked).toBe(true);
        expect(result.entryCount).toBe(0);
        expect(scanner.scan).not.toHaveBeenCalled();
        expect(repo.save).not.toHaveBeenCalled();
      });
    });

    context('既存 baseline があり force=true の場合', () => {
      it('IT-CG-CB-003b: 上書き保存される', async () => {
        const scanner = createScanner(['a.ts']);
        const hasher = createHasher({ 'a.ts': SHA('a') });
        const repo = createRepository({ exists: vi.fn(async () => true) });
        const usecase = new CreateBaselineUseCase(scanner, hasher, repo);

        const result = await usecase.execute({ force: true });
        expect(result.overwriteBlocked).toBe(false);
        expect(result.entryCount).toBe(1);
        expect(repo.save).toHaveBeenCalledTimes(1);
      });
    });
  });
});
