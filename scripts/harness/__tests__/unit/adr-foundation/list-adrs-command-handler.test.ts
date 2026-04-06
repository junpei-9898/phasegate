// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ListAdrsCommandHandler } from '../../../adr-foundation/presentation/cli/list-adrs-command-handler.js';
import type { ListAdrsOutput } from '../../../adr-foundation/application/usecases/list-adrs-use-case.js';

function createListOutput(count: number): ListAdrsOutput {
  const items = Array.from({ length: count }, (_, i) => ({
    adrRef: `ADR-${String(i + 1).padStart(3, '0')}`,
    title: `Decision ${i + 1}`,
    status: 'Accepted',
    date: '2026-01-01',
    hasArchgate: false,
  }));

  return {
    items,
    summary: {
      total: count,
      proposed: 0,
      accepted: count,
      deprecated: 0,
      superseded: 0,
    },
  };
}

target('ListAdrsCommandHandler', () => {
  describe('execute', () => {
    context('ADRが存在する場合', () => {
      it('終了コード0とADR一覧を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createListOutput(3)),
        };
        const handler = new ListAdrsCommandHandler({
          listAdrsUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({});

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output?.items).toHaveLength(3);
        expect(actual.text).toContain('ADR-001');
        expect(actual.text).toContain('3件');
      });
    });

    context('ステータスフィルタが指定された場合', () => {
      it('ユースケースにフィルタを渡すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createListOutput(0)),
        };
        const handler = new ListAdrsCommandHandler({
          listAdrsUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({
          statuses: ['Proposed', 'Accepted'],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(useCase.execute).toHaveBeenCalledWith({
          statuses: ['Proposed', 'Accepted'],
        });
      });
    });

    context('JSON出力が指定された場合', () => {
      it('JSON形式でテキストを返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createListOutput(1)),
        };
        const handler = new ListAdrsCommandHandler({
          listAdrsUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({ json: true });

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.text);
        expect(parsed.items).toHaveLength(1);
        expect(parsed.summary.total).toBe(1);
      });
    });

    context('ADRが0件の場合', () => {
      it('終了コード0と空一覧を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue(createListOutput(0)),
        };
        const handler = new ListAdrsCommandHandler({
          listAdrsUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({});

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output?.items).toHaveLength(0);
        expect(actual.text).toContain('0件');
      });
    });

    context('ユースケースが例外をスローする場合', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockRejectedValue(new Error('read failed')),
        };
        const handler = new ListAdrsCommandHandler({
          listAdrsUseCase: useCase,
        });

        // Act
        const actual = await handler.execute({});

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toBeNull();
        expect(actual.text).toContain('failed to list ADRs');
      });
    });
  });
});
