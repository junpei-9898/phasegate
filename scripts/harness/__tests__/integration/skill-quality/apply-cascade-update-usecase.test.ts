// @unit skill-quality
// @layer test
// @story H12-05
// @work-item-id WI-192
// @work-item-id WI-220
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

  describe('変更の事実と意味レビューの境界', () => {
    it.each([
      { storyId: 'WI-22', existing: '@story-id WI-220', added: '@work-item-id WI-22' },
      { storyId: 'H12-05', existing: '@story-id H12-050', added: '@story-id H12-05' },
    ])('似たIDを対象IDの反映と誤認せず正しいタグを追記すること（$storyId）', async ({ storyId, existing, added }) => {
      const fs = createMockFileSystemPort(existing);
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/a.md']));
      const usecase = new ApplyCascadeUpdateUseCase(service, fs);

      const actual = await usecase.execute({ storyId });

      expect(actual).toEqual({ updatedCount: 1, appliedStoryIds: [added], errors: [] });
      expect(fs.write).toHaveBeenCalledWith('docs/a.md', `${existing}\n${added}`);
    });

    it.each([
      { storyId: 'WI-22', content: '<!-- @work-item-id WI-220, WI-22 -->' },
      { storyId: 'WI-22', content: '@story-id WI-22' },
      { storyId: 'WI-22', content: '@work-item-id\tWI-22\r\n' },
      { storyId: 'H12-05', content: '<!-- @story-id H12-01, H12-05 -->' },
      { storyId: 'ISSUE-21', content: '@issue-id ISSUE-20 ISSUE-21' },
    ])('列挙や旧形式の対象タグは書き換えず保持すること（$content）', async ({ storyId, content }) => {
      const fs = createMockFileSystemPort(content);
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/a.md']));

      const actual = await new ApplyCascadeUpdateUseCase(service, fs).execute({ storyId });

      expect(actual).toEqual({ updatedCount: 0, appliedStoryIds: [], errors: [] });
      expect(fs.write).not.toHaveBeenCalled();
    });

    it.each([false, true])('対象が重複しても一つのファイルの変更として報告すること（dryRun=%s）', async (dryRun) => {
      let content = '# original';
      const fs = {
        read: vi.fn(async () => content),
        write: vi.fn(async (_path: string, updated: string) => { content = updated; }),
        glob: async () => ['docs/a.md', 'docs/a.md'],
      };
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/*.md', 'docs/a.md']));

      const actual = await new ApplyCascadeUpdateUseCase(service, fs).execute({ storyId: 'H12-05', dryRun });

      expect(actual).toEqual({ updatedCount: 1, appliedStoryIds: ['@story-id H12-05'], errors: [] });
      expect(content).toBe(dryRun ? '# original' : '# original\n@story-id H12-05');
      expect(fs.read).toHaveBeenCalledTimes(1);
      expect(fs.write).toHaveBeenCalledTimes(dryRun ? 0 : 1);
    });

    it('重複対象の失敗を反復せず原因解消後の明示実行で追記できること', async () => {
      let readable = false;
      let content = '# original';
      const fs = {
        read: vi.fn(async () => { if (!readable) throw new Error('read denied'); return content; }),
        write: async (_path: string, updated: string) => { content = updated; },
        glob: async () => ['docs/a.md', 'docs/a.md'],
      };
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/*.md', 'docs/a.md']));
      const usecase = new ApplyCascadeUpdateUseCase(service, fs);

      const failed = await usecase.execute({ storyId: 'H12-05' });
      expect(failed).toEqual({ updatedCount: 0, appliedStoryIds: [], errors: ['Failed to update docs/a.md: read denied'] });
      expect(content).toBe('# original');
      expect(fs.read).toHaveBeenCalledTimes(1);

      readable = true;
      const actual = await usecase.execute({ storyId: 'H12-05' });
      expect(actual).toEqual({ updatedCount: 1, appliedStoryIds: ['@story-id H12-05'], errors: [] });
      expect(content).toBe('# original\n@story-id H12-05');
    });

    it.each([false, true])('すでにタグがある本文は更新件数に含めず保持すること（dryRun=%s）', async (dryRun) => {
      const mockFs = createMockFileSystemPort('# content\n@story-id H12-05');
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/a.md']));
      const usecase = new ApplyCascadeUpdateUseCase(service, mockFs);

      const actual = await usecase.execute({ storyId: 'H12-05', dryRun });

      expect(actual).toEqual({ updatedCount: 0, appliedStoryIds: [], errors: [] });
      expect(mockFs.write).not.toHaveBeenCalled();
    });

    it('追記後の再実行は更新0件となり本文を重複させないこと', async () => {
      let content = '# content';
      const fs = {
        read: async () => content,
        write: async (_path: string, updated: string) => { content = updated; },
        glob: async () => [],
      };
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/a.md']));
      const usecase = new ApplyCascadeUpdateUseCase(service, fs);

      const first = await usecase.execute({ storyId: 'H12-05' });
      expect(first.updatedCount).toBe(1);
      expect(content).toBe('# content\n@story-id H12-05');
      const actual = await usecase.execute({ storyId: 'H12-05' });
      expect(actual).toEqual({ updatedCount: 0, appliedStoryIds: [], errors: [] });
      expect(content).toBe('# content\n@story-id H12-05');
    });

    it.each([{ errors: [] }, { errors: ['read failed'] }])('JSONでタグ操作と意味レビュー未実施を明示し終了状態を保持すること（errors=$errors）', async ({ errors }) => {
      const usecase = { execute: vi.fn().mockResolvedValue({ updatedCount: 0, appliedStoryIds: [], errors }) };
      const handler = new ApplyCascadeUpdateHandler(usecase as unknown as ApplyCascadeUpdateUseCase);

      const actual = await handler.handle({ storyId: 'H12-05', format: 'json' });

      expect(actual.exitCode).toBe(errors.length ? 1 : 0);
      expect(JSON.parse(actual.message)).toMatchObject({ operation: 'traceability-tag-update', semanticReviewPerformed: false, errors });
    });

    it('human出力は設計の意味的反映を保証しないと説明すること', async () => {
      const service = new CascadeUpdateService(createMockValidatorIdRegistryPort(), createMockConfigQueryPort(['docs/a.md']));
      const handler = new ApplyCascadeUpdateHandler(new ApplyCascadeUpdateUseCase(service, createMockFileSystemPort()));

      const actual = await handler.handle({ storyId: 'H12-05' });

      expect(actual.exitCode).toBe(0);
      expect(actual.message).toContain('意味レビューは未実施');
    });
  });

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
