// @unit agent-integration
// @layer infrastructure
// @story H11-05

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { QuickModeFullModeRequirementAdapter } from '../../../agent-integration/infrastructure/adapters/quick-mode-full-mode-requirement-adapter.js';

function createClassifyUseCaseStub(
  executeImpl: (input: { paths: readonly string[] }) => unknown,
) {
  return {
    execute: vi.fn(executeImpl),
  } as unknown as ReturnType<
    typeof import('../../../quick-mode/composition-root.js').createQuickModeCompositionRoot
  >['classifyUseCase'];
}

target('QuickModeFullModeRequirementAdapter.check', () => {
  describe('classify UseCase の結果変換', () => {
    context('requiresFullMode=true が返る場合', () => {
      // IT-AI-FMR-001
      it('rejectionRule / rejectionReason / dominantCategory が保持されること', async () => {
        // Arrange
        const stub = createClassifyUseCaseStub(() => ({
          dominantCategory: 'domain',
          perFile: [{ path: 'scripts/harness/foo/domain/new.ts', category: 'domain' }],
          fullModeRequired: true,
          rejectionRule: 'NEW_DOMAIN' as const,
          rejectionReason: '新規 domain ファイル',
        }));
        const adapter = new QuickModeFullModeRequirementAdapter({
          classifyUseCaseFactory: () => stub,
        });

        // Act
        const actual = await adapter.check(['scripts/harness/foo/domain/new.ts']);

        // Assert
        expect(actual.requiresFullMode).toBe(true);
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
        expect(actual.rejectionReason).toBe('新規 domain ファイル');
        expect(actual.dominantCategory).toBe('domain');
      });
    });

    context('requiresFullMode=false が返る場合', () => {
      // IT-AI-FMR-002
      it('dominantCategory を保持しつつ requiresFullMode=false を返すこと', async () => {
        // Arrange
        const stub = createClassifyUseCaseStub(() => ({
          dominantCategory: 'bugfix',
          perFile: [{ path: 'scripts/foo.ts', category: 'bugfix' }],
          fullModeRequired: false,
        }));
        const adapter = new QuickModeFullModeRequirementAdapter({
          classifyUseCaseFactory: () => stub,
        });

        // Act
        const actual = await adapter.check(['scripts/foo.ts']);

        // Assert
        expect(actual.requiresFullMode).toBe(false);
        expect(actual.dominantCategory).toBe('bugfix');
        expect(actual.rejectionRule).toBeUndefined();
      });
    });

    context('targetFilePaths が空の場合', () => {
      // IT-AI-FMR-003
      it('usecase を呼ばずに requiresFullMode=false を返すこと', async () => {
        // Arrange
        const stub = createClassifyUseCaseStub(() => {
          throw new Error('呼ばれてはいけない');
        });
        const adapter = new QuickModeFullModeRequirementAdapter({
          classifyUseCaseFactory: () => stub,
        });

        // Act
        const actual = await adapter.check([]);

        // Assert
        expect(actual.requiresFullMode).toBe(false);
        expect(stub.execute).not.toHaveBeenCalled();
      });
    });

    context('classify UseCase が例外を投げる場合', () => {
      // IT-AI-FMR-004
      it('silent に requiresFullMode=false を返して graceful degradation すること', async () => {
        // Arrange
        const stub = createClassifyUseCaseStub(() => {
          throw new Error('config load error');
        });
        const adapter = new QuickModeFullModeRequirementAdapter({
          classifyUseCaseFactory: () => stub,
        });

        // Act
        const actual = await adapter.check(['scripts/foo.ts']);

        // Assert
        expect(actual.requiresFullMode).toBe(false);
      });
    });

    context('classifyUseCaseFactory が例外を投げる場合', () => {
      // IT-AI-FMR-005
      it('silent に requiresFullMode=false を返すこと', async () => {
        // Arrange
        const adapter = new QuickModeFullModeRequirementAdapter({
          classifyUseCaseFactory: () => {
            throw new Error('composition root initialization error');
          },
        });

        // Act
        const actual = await adapter.check(['scripts/foo.ts']);

        // Assert
        expect(actual.requiresFullMode).toBe(false);
      });
    });
  });
});
