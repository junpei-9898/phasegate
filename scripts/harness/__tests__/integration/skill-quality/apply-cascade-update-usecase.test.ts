// @layer test
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ApplyCascadeUpdateUseCase } from '../../../skill-quality/application/usecases/apply-cascade-update-usecase.js';
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
      it('output.errors が空で updatedCount が数値で返る', async () => {
        // Arrange
        const mockFs = createMockFileSystemPort('# existing content');
        const mockConfig = createMockConfigQueryPort(['scripts/a.ts', 'scripts/b.ts']);
        const mockRegistry = createMockValidatorIdRegistryPort(['L1-001', 'L2-001']);
        const cascadeService = new CascadeUpdateService(mockRegistry, mockConfig);
        const usecase = new ApplyCascadeUpdateUseCase(cascadeService, mockFs);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual.errors).toHaveLength(0);
        expect(typeof actual.updatedCount).toBe('number');
      });
    });
  });

  // IT-UC-CascUpd-002
  describe('execute: 対象ファイルがない場合に更新なしで正常終了すること', () => {
    context('CascadeUpdateService.resolve が [] を返す場合', () => {
      it('output.updatedCount=0, errors=[]', async () => {
        // Arrange
        const mockFs = createMockFileSystemPort();
        const mockConfig = createMockConfigQueryPort([]);
        const mockRegistry = createMockValidatorIdRegistryPort([]);
        const cascadeService = new CascadeUpdateService(mockRegistry, mockConfig);
        const usecase = new ApplyCascadeUpdateUseCase(cascadeService, mockFs);
        // Act
        const actual = await usecase.execute({ storyId: 'H12-05' });
        // Assert
        expect(actual.updatedCount).toBe(0);
        expect(actual.errors).toHaveLength(0);
      });
    });
  });

  // IT-UC-CascUpd-003
  describe('execute: 一部ファイルの書き込みが失敗した場合に errors に記録されること', () => {
    context('target1 は成功、target2 の write が失敗する場合', () => {
      it('output.errors.length=1, updatedCount>=1', async () => {
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
        expect(actual.errors).toHaveLength(1);
        expect(actual.updatedCount).toBeGreaterThanOrEqual(1);
      });
    });
  });

});
