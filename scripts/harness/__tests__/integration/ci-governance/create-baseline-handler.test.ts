// @unit ci-governance
// @layer test
// @story H12-01

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CreateBaselineHandler } from '../../../ci-governance/presentation/handlers/create-baseline-handler.js';
import type { CreateBaselineUseCase } from '../../../ci-governance/application/usecases/create-baseline-usecase.js';

function createUseCaseStub(
  output: Awaited<ReturnType<CreateBaselineUseCase['execute']>>,
): CreateBaselineUseCase {
  return {
    execute: vi.fn(async () => output),
  } as unknown as CreateBaselineUseCase;
}

target('CreateBaselineHandler', () => {
  describe('正常系', () => {
    context('保存成功', () => {
      it('IT-CG-CH-001a: exitCode=0 で output に保存先とエントリ数を含む', async () => {
        const useCase = createUseCaseStub({
          savedPath: '/repo/.phasegate/baseline.json',
          entryCount: 12,
          dryRun: false,
          overwriteBlocked: false,
          entries: [],
        });
        const handler = new CreateBaselineHandler(useCase);
        const result = await handler.handle({});
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('baseline を保存しました');
        expect(result.output).toContain('/repo/.phasegate/baseline.json');
        expect(result.output).toContain('12');
      });
    });
  });

  describe('dry-run', () => {
    context('dryRun=true の結果', () => {
      it('IT-CG-CH-002a: exitCode=0 で output に dry run 表記', async () => {
        const useCase = createUseCaseStub({
          savedPath: '/repo/.phasegate/baseline.json',
          entryCount: 3,
          dryRun: true,
          overwriteBlocked: false,
          entries: [],
        });
        const handler = new CreateBaselineHandler(useCase);
        const result = await handler.handle({ dryRun: true });
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('[dry run]');
      });
    });
  });

  describe('overwrite block', () => {
    context('既存 baseline があり force なし', () => {
      it('IT-CG-CH-003a: exitCode=2 で --force 誘導メッセージ', async () => {
        const useCase = createUseCaseStub({
          savedPath: '/repo/.phasegate/baseline.json',
          entryCount: 0,
          dryRun: false,
          overwriteBlocked: true,
          entries: [],
        });
        const handler = new CreateBaselineHandler(useCase);
        const result = await handler.handle({});
        expect(result.exitCode).toBe(2);
        expect(result.output).toContain('--force');
        expect(result.output).toContain('既に存在');
      });
    });
  });

  describe('json format', () => {
    it('IT-CG-CH-004a: format=json で JSON 出力', async () => {
      const useCase = createUseCaseStub({
        savedPath: '/x.json',
        entryCount: 1,
        dryRun: false,
        overwriteBlocked: false,
        entries: [{ path: 'a.ts', sha1: 'a'.repeat(40) }],
      });
      const handler = new CreateBaselineHandler(useCase);
      const result = await handler.handle({ format: 'json' });
      const parsed = JSON.parse(result.output);
      expect(parsed.entryCount).toBe(1);
      expect(parsed.entries[0].path).toBe('a.ts');
    });
  });
});
