// @unit skill-quality
// @layer test
// @story H12-05
// @work-item-id WI-192
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ApplyCascadeUpdateUseCase } from '../../../skill-quality/application/usecases/apply-cascade-update-usecase.js';
import { ApplyCascadeUpdateHandler } from '../../../skill-quality/presentation/handlers/apply-cascade-update-handler.js';
import { CascadeUpdateService } from '../../../skill-quality/domain/services/cascade-update-service.js';

function createMockValidatorIdRegistryPort(ids: string[] = ['L1-001', 'L2-001']) {
  return { list: vi.fn().mockResolvedValue(ids) };
}

function createMockConfigQueryPort(cascadePatterns: string[] = ['scripts/**/*.ts']) {
  return {
    getCoverageThreshold: vi.fn().mockResolvedValue({ requirement: 100, code: 80 }),
    isAgentLessonCollectionEnabled: vi.fn().mockResolvedValue(true),
    getCascadeUpdateTargetPatterns: vi.fn().mockResolvedValue(cascadePatterns),
  };
}

function createMockFileSystemPort(content = '# content') {
  return {
    read: vi.fn().mockResolvedValue(content),
    write: vi.fn().mockResolvedValue(undefined),
    glob: vi.fn().mockResolvedValue([]),
  };
}

target('ApplyCascadeUpdateUseCase', () => {

  // IT-UC-CascUpd-001
  describe('execute: 対象ファイルに @story-id が付与されること', () => {
    context('CascadeUpdateService.resolve が targets を返し FileSystemPort が成功する場合', () => {
      it('2件の対象を更新しエラーなしの結果を返す', async () => {
        // Arrange
        const mockFs = createMockFileSystemPort('# existing content');
        const mockConfig = createMockConfigQueryPort(['scripts/a.ts', 'scripts/b.ts']);
        const mockRegistry = createMockValidatorIdRegistryPort(['L1-001', 'L2-001']);
        const cascadeService = new CascadeUpdateService(mockRegistry, mockConfig);
        const usecase = new ApplyCascadeUpdateUseCase(cascadeService, mockFs);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual).toEqual({
          updatedCount: 2,
          appliedStoryIds: ['@story-id H12-05'],
          errors: [],
        });
      });
    });
  });

  // IT-UC-CascUpd-002
  describe('execute: 対象ファイルがない場合に更新なしで正常終了すること', () => {
    context('CascadeUpdateService.resolve が [] を返す場合', () => {
      it('対象がない場合は更新0件でエラーなしの結果を返す', async () => {
        // Arrange
        const mockFs = createMockFileSystemPort();
        const mockConfig = createMockConfigQueryPort([]);
        const mockRegistry = createMockValidatorIdRegistryPort([]);
        const cascadeService = new CascadeUpdateService(mockRegistry, mockConfig);
        const usecase = new ApplyCascadeUpdateUseCase(cascadeService, mockFs);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual).toEqual({
          updatedCount: 0,
          appliedStoryIds: [],
          errors: [],
        });
      });
    });
  });

  // IT-UC-CascUpd-003
  describe('execute: 一部ファイルの書き込みが失敗した場合に errors に記録されること', () => {
    context('target1 は成功、target2 の write が失敗する場合', () => {
      it('2件目の書き込み失敗をエラー内容として返す', async () => {
        // Arrange
        let writeCallCount = 0;
        const mockFs = {
          read: vi.fn().mockResolvedValue('# content'),
          write: vi.fn().mockImplementation(async () => {
            writeCallCount++;
            if (writeCallCount === 2) throw new Error('write failed');
          }),
          glob: vi.fn().mockResolvedValue([]),
        };
        const mockConfig = createMockConfigQueryPort(['scripts/a.ts', 'scripts/b.ts']);
        const mockRegistry = createMockValidatorIdRegistryPort(['L1-001']);
        const cascadeService = new CascadeUpdateService(mockRegistry, mockConfig);
        const usecase = new ApplyCascadeUpdateUseCase(cascadeService, mockFs);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual.updatedCount).toBe(1);
        expect(actual.appliedStoryIds).toEqual(['@story-id H12-05']);
        expect(actual.errors).toEqual(['Failed to update scripts/b.ts: write failed']);
      });
    });
  });

  describe('execute: dry-run の場合', () => {
    it('対象ファイルを読み取るが write しない', async () => {
      const mockFs = {
        read: vi.fn().mockResolvedValue('# existing content'),
        write: vi.fn().mockRejectedValue(new Error('dry-run wrote file')),
        glob: vi.fn().mockResolvedValue([]),
      };
      const mockConfig = createMockConfigQueryPort(['scripts/a.ts']);
      const mockRegistry = createMockValidatorIdRegistryPort(['L1-001']);
      const cascadeService = new CascadeUpdateService(mockRegistry, mockConfig);
      const usecase = new ApplyCascadeUpdateUseCase(cascadeService, mockFs);

      const actual = await usecase.execute({ storyId: 'H12-05', dryRun: true });

      expect(actual).toEqual({
        updatedCount: 1,
        appliedStoryIds: ['@story-id H12-05'],
        errors: [],
      });
    });

    it('human output は preview wording を使う', async () => {
      const usecase = {
        execute: vi.fn().mockResolvedValue({
          updatedCount: 1,
          appliedStoryIds: ['@story-id H12-05'],
          errors: [],
        }),
      };
      const handler = new ApplyCascadeUpdateHandler(usecase as any);

      const actual = await handler.handle({ storyId: 'H12-05', dryRun: true });

      expect(actual.message).toContain('Would update 1 files');
    });

    it('json output は dryRun=true を返す', async () => {
      const usecase = {
        execute: vi.fn().mockResolvedValue({
          updatedCount: 1,
          appliedStoryIds: ['@story-id H12-05'],
          errors: [],
        }),
      };
      const handler = new ApplyCascadeUpdateHandler(usecase as any);

      const actual = await handler.handle({ storyId: 'H12-05', dryRun: true, format: 'json' });

      expect(actual.message).toContain('"dryRun": true');
      expect(actual.message).toContain('"updatedCount": 1');
    });
  });

});
